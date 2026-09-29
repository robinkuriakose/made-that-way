// Builder: the Legends wall, for review. Signatures are drawings, so the
// owner looks them over and hides any that shouldn't be there.
// GET ?test=1              -> { legends } newest first
// PATCH { runId, action }  -> hide | unhide
import { sql } from '../../db.js';
import { ensureSchema, isoTime } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { body, isId, methodNotAllowed, serverError } from '../../http.js';

const toLegend = (r) => ({
  runId: r.run_id,
  name: r.name,
  score: r.score,
  level: r.level,
  durationMs: Number(r.duration_ms),
  signature: r.signature,
  hidden: r.hidden,
  isTest: r.is_test,
  createdAt: isoTime(r.created_at),
});

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const t = req.query?.test === '1';
      const { rows } = await sql`SELECT * FROM legends WHERE is_test = ${t} ORDER BY created_at DESC LIMIT 300`;
      return res.status(200).json({ legends: rows.map(toLegend) });
    }
    if (req.method === 'PATCH') {
      const b = body(req);
      if (!isId(b.runId) || !['hide', 'unhide'].includes(b.action)) return res.status(400).json({ error: 'invalid update' });
      const { rows } = await sql`UPDATE legends SET hidden = ${b.action === 'hide'} WHERE run_id = ${b.runId} RETURNING *`;
      if (!rows.length) return res.status(404).json({ error: 'no such legend' });
      return res.status(200).json({ legend: toLegend(rows[0]) });
    }
    return methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
