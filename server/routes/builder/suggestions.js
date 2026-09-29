// Builder: questions players suggested.
// GET ?status=new|accepted|rejected|all&test=1 -> { suggestions } newest first
// PATCH { id, action, questionId? }             -> accept | reject | reopen
//
// A suggestion is never turned into a live question by itself: accepting a
// full one opens the question form filled in with it, and the question is
// saved (and checked) from there, credited to the player's name.
import { sql } from '../../db.js';
import { ensureSchema, isoTime, asObject } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { body, isText, methodNotAllowed, serverError } from '../../http.js';

const STATUSES = ['new', 'accepted', 'rejected'];
const ACTIONS = { accept: 'accepted', reject: 'rejected', reopen: 'new' };

const toSuggestion = (r) => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  data: asObject(r.data),
  status: r.status,
  questionId: r.question_id,
  isTest: r.is_test,
  createdAt: isoTime(r.created_at),
  reviewedAt: isoTime(r.reviewed_at),
});

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const t = req.query?.test === '1';
      const status = STATUSES.includes(req.query?.status) ? req.query.status : null;
      const { rows } = await sql`
        SELECT * FROM suggestions
        WHERE is_test = ${t} AND (${status}::text IS NULL OR status = ${status})
        ORDER BY created_at DESC LIMIT 300
      `;
      return res.status(200).json({ suggestions: rows.map(toSuggestion) });
    }
    if (req.method === 'PATCH') {
      const b = body(req);
      const to = ACTIONS[b.action];
      if (!isText(b.id, 64) || !to) return res.status(400).json({ error: 'invalid update' });
      const questionId = isText(b.questionId, 64) ? b.questionId : null;
      const { rows } = await sql`
        UPDATE suggestions SET status = ${to}, reviewed_at = CASE WHEN ${to} = 'new' THEN NULL ELSE now() END,
          question_id = coalesce(${questionId}, question_id)
        WHERE id = ${b.id} RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: 'no such suggestion' });
      return res.status(200).json({ suggestion: toSuggestion(rows[0]) });
    }
    return methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
