// Builder: names on the leaderboard, for moderation.
// GET ?q=                       -> { players } newest first (up to 300), or matching q
// PATCH { id, action }          -> hide | unhide a player (id is the public id).
//                                  A hidden player vanishes from every board.
import { sql } from '../../db.js';
import { ensureSchema, isoTime } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { body, isText, methodNotAllowed, serverError } from '../../http.js';

const toPlayer = (r) => ({
  id: r.public_id,
  name: r.name,
  hidden: r.hidden,
  nameChanges: r.name_changes,
  bestScore: r.best_score,
  bestCorrect: r.best_correct,
  bestTotal: r.best_total,
  runsSigned: r.runs_signed,
  createdAt: isoTime(r.created_at),
  updatedAt: isoTime(r.updated_at),
});

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const q = typeof req.query?.q === 'string' ? req.query.q.trim().slice(0, 40) : '';
      const { rows } = await sql`
        SELECT p.*, (SELECT count(*)::int FROM signed_runs s WHERE s.device_id = p.device_id AND NOT s.is_test) AS runs_signed
        FROM players p
        WHERE ${q} = '' OR p.name ILIKE ${`%${q}%`}
        ORDER BY p.updated_at DESC
        LIMIT 300
      `;
      return res.status(200).json({ players: rows.map(toPlayer) });
    }

    if (req.method === 'PATCH') {
      const b = body(req);
      if (!isText(b.id, 40) || !['hide', 'unhide'].includes(b.action)) return res.status(400).json({ error: 'invalid update' });
      const { rows } = await sql`
        UPDATE players SET hidden = ${b.action === 'hide'}, updated_at = now() WHERE public_id = ${b.id}
        RETURNING *, 0 AS runs_signed
      `;
      if (!rows.length) return res.status(404).json({ error: 'no such player' });
      return res.status(200).json({ player: toPlayer(rows[0]) });
    }

    return methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
