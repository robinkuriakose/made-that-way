// Builder: flags players have raised.
// GET ?test=1                  -> { flags } (real players, or test mode only)
// PATCH { id, status, note }   -> mark a flag resolved (with an optional note) or reopen it
import { sql } from '../../db.js';
import { ensureSchema, isoTime } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { body, isText, methodNotAllowed, serverError } from '../../http.js';

function toFlag(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    reason: row.reason,
    details: row.details,
    chosenIndex: row.chosen_index,
    wasCorrect: row.was_correct,
    runId: row.run_id,
    questionVersion: row.question_version,
    isTest: row.is_test,
    status: row.status,
    note: row.note,
    createdAt: isoTime(row.created_at),
    resolvedAt: isoTime(row.resolved_at),
  };
}

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const isTest = req.query?.test === '1';
      const { rows } = await sql`SELECT * FROM flags WHERE is_test = ${isTest} ORDER BY created_at DESC LIMIT 1000`;
      return res.status(200).json({ flags: rows.map(toFlag) });
    }

    if (req.method === 'PATCH') {
      const b = body(req);
      if (!isText(b.id, 200) || !['open', 'resolved'].includes(b.status)) return res.status(400).json({ error: 'invalid update' });
      const note = isText(b.note, 1000) ? b.note.trim() : null;
      const resolvedAt = b.status === 'resolved' ? new Date().toISOString() : null;
      const { rows } = await sql`
        UPDATE flags SET status = ${b.status}, note = ${note}, resolved_at = ${resolvedAt}::timestamptz
        WHERE id = ${b.id}
        RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: 'no such flag' });
      return res.status(200).json({ flag: toFlag(rows[0]) });
    }

    return methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
