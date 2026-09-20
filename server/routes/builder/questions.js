// Builder: every question, of either kind and any status, plus editing and review.
//
// GET                              -> { questions, openFlags, themes }
// POST  { data, status, kind }     -> create. Run questions: live, hidden or
//                                     pending. Daily questions join the end of the queue.
// PATCH { id, action, ... }        -> one of:
//   update           { data, expectedUpdatedAt }  replace the content. If the
//                    question changed since expectedUpdatedAt, nothing is saved (409),
//                    so two people (or you and Claude) can't overwrite each other.
//   accept | reject | restore | hide | unhide     change status (see TRANSITIONS)
//   move             { direction: up | down }     reorder the daily queue
//   feedback         { text }                     add a review note to this question only
//   resolveFeedback  { feedbackId, response }     mark a note as addressed
//
// Every edit keeps the version it replaced in question_history.
import { randomUUID } from 'node:crypto';
import { sql } from '../../db.js';
import { ensureSchema, toQuestion, asObject, loadThemes } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { body, isText, methodNotAllowed, serverError } from '../../http.js';
import { checkQuestion, normalizeQuestion, KINDS } from '../../../src/lib/questionRules.js';

const CREATE_STATUSES = ['live', 'hidden', 'pending'];
const TRANSITIONS = {
  run: {
    accept: ['pending', 'live'],
    reject: ['pending', 'rejected'],
    restore: ['rejected', 'pending'],
    hide: ['live', 'hidden'],
    unhide: ['hidden', 'live'],
  },
  daily: {
    hide: ['queued', 'hidden'],
    unhide: ['hidden', 'queued'],
  },
};
const NOTE_MAX = 2000;

async function load(id) {
  const { rows } = await sql`SELECT * FROM questions WHERE id = ${id}`;
  return rows[0] ? toQuestion(rows[0]) : null;
}

async function validate(data, kind) {
  const themeIds = (await loadThemes()).map((t) => t.id);
  const q = normalizeQuestion(data);
  const { errors, warnings } = checkQuestion(q, { themeIds, kind });
  return { q, errors, warnings };
}

async function remember(current) {
  const data = normalizeQuestion(current);
  await sql`
    INSERT INTO question_history (question_id, status, data, valid_from)
    VALUES (${current.id}, ${current.status}, ${JSON.stringify(data)}::jsonb, ${current.updatedAt}::timestamptz)
  `;
}

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM questions ORDER BY kind, position NULLS LAST, created_at, id`;
      const { rows: flagRows } = await sql`
        SELECT question_id, count(*)::int AS n FROM flags WHERE status = 'open' AND NOT is_test GROUP BY question_id
      `;
      const openFlags = Object.fromEntries(flagRows.map((r) => [r.question_id, r.n]));
      return res.status(200).json({ questions: rows.map(toQuestion), openFlags, themes: await loadThemes() });
    }

    if (req.method === 'POST') {
      const b = body(req);
      const kind = KINDS.includes(b.kind) ? b.kind : 'run';
      const { q, errors, warnings } = await validate(b.data ?? {}, kind);
      if (errors.length) return res.status(422).json({ errors, warnings });
      const status = kind === 'daily' ? 'queued' : CREATE_STATUSES.includes(b.status) ? b.status : 'live';
      const { rows } = await sql`
        INSERT INTO questions (id, kind, status, origin, position, data)
        VALUES (${q.id}, ${kind}, ${status}, 'builder', NULL, ${JSON.stringify(q)}::jsonb)
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `;
      if (!rows.length) return res.status(409).json({ errors: [`A question with the id "${q.id}" already exists.`], warnings });
      if (kind === 'daily') {
        await sql`
          UPDATE questions SET position = (SELECT coalesce(max(position), 0) + 1 FROM questions WHERE kind = 'daily')
          WHERE id = ${q.id}
        `;
      }
      return res.status(201).json({ question: await load(q.id), warnings });
    }

    if (req.method === 'PATCH') {
      const b = body(req);
      if (!isText(b.id, 64)) return res.status(400).json({ error: 'which question?' });
      const current = await load(b.id);
      if (!current) return res.status(404).json({ error: 'no such question' });

      if (b.action === 'update') {
        if (b.expectedUpdatedAt && b.expectedUpdatedAt !== current.updatedAt) {
          return res.status(409).json({
            error: 'This question changed since you opened it. Your edits are kept here; reopen it to see the latest, then apply them again.',
            conflict: true,
            question: current,
          });
        }
        const { q, errors, warnings } = await validate({ ...(b.data ?? {}), id: current.id }, current.kind);
        if (errors.length) return res.status(422).json({ errors, warnings });
        await remember(current);
        await sql`UPDATE questions SET data = ${JSON.stringify(q)}::jsonb, updated_at = now() WHERE id = ${current.id}`;
        return res.status(200).json({ question: await load(current.id), warnings });
      }

      const transitions = TRANSITIONS[current.kind] ?? {};
      if (transitions[b.action]) {
        const [from, to] = transitions[b.action];
        if (current.status !== from) {
          return res.status(409).json({ error: `Only a ${from} question can be ${b.action}ed; this one is ${current.status}.` });
        }
        if (to === 'live' || to === 'queued') {
          const { errors } = await validate(current, current.kind);
          if (errors.length) return res.status(422).json({ errors, warnings: [] });
        }
        await sql`UPDATE questions SET status = ${to}, updated_at = now() WHERE id = ${current.id}`;
        return res.status(200).json({ question: await load(current.id) });
      }

      if (b.action === 'move') {
        if (current.kind !== 'daily' || current.status !== 'queued') return res.status(409).json({ error: 'Only queued daily questions can move.' });
        const up = b.direction === 'up';
        const { rows } = up
          ? await sql`SELECT id, position FROM questions WHERE kind = 'daily' AND status = 'queued' AND position < ${current.position} ORDER BY position DESC LIMIT 1`
          : await sql`SELECT id, position FROM questions WHERE kind = 'daily' AND status = 'queued' AND position > ${current.position} ORDER BY position ASC LIMIT 1`;
        if (rows[0]) {
          await sql`UPDATE questions SET position = ${rows[0].position} WHERE id = ${current.id}`;
          await sql`UPDATE questions SET position = ${current.position} WHERE id = ${rows[0].id}`;
        }
        return res.status(200).json({ question: await load(current.id) });
      }

      if (b.action === 'feedback') {
        if (!isText(b.text, NOTE_MAX)) return res.status(400).json({ error: 'Write some feedback first.' });
        const note = { id: randomUUID(), text: b.text.trim(), createdAt: new Date().toISOString(), status: 'open' };
        await sql`
          UPDATE questions SET feedback = feedback || ${JSON.stringify([note])}::jsonb, updated_at = now()
          WHERE id = ${current.id}
        `;
        return res.status(200).json({ question: await load(current.id) });
      }

      if (b.action === 'resolveFeedback') {
        if (!isText(b.feedbackId, 64)) return res.status(400).json({ error: 'which note?' });
        const notes = asObject(current.feedback) ?? [];
        const note = notes.find((n) => n.id === b.feedbackId);
        if (!note) return res.status(404).json({ error: 'no such note' });
        note.status = 'addressed';
        note.addressedAt = new Date().toISOString();
        if (isText(b.response, NOTE_MAX)) note.response = b.response.trim();
        await sql`UPDATE questions SET feedback = ${JSON.stringify(notes)}::jsonb, updated_at = now() WHERE id = ${current.id}`;
        return res.status(200).json({ question: await load(current.id) });
      }

      return res.status(400).json({ error: 'unknown action' });
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
