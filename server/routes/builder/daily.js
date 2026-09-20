// Builder: the daily question's schedule and how each day went.
// GET                        -> { schedule: [{ day, questionId, stem, isVoid, answered, percentRight, avgSeconds }] }
// PATCH { day, action }      -> void | unvoid a day (a voided day doesn't count
//                               against anyone's average and never breaks a streak)
// The queue itself (upcoming questions) comes from the questions route, kind "daily".
import { sql } from '../../db.js';
import { ensureSchema } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { body, isDay, methodNotAllowed, serverError } from '../../http.js';

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const isTest = req.query?.test === '1';
      const { rows } = await sql`
        SELECT s.day::text AS day, s.question_id, s.is_void, q.data->>'stem' AS stem,
               count(a.device_id)::int AS answered,
               count(a.device_id) FILTER (WHERE a.correct)::int AS right_count,
               avg(a.time_ms)::float AS avg_ms
        FROM daily_schedule s
        JOIN questions q ON q.id = s.question_id
        LEFT JOIN daily_answers a ON a.day = s.day AND a.is_test = ${isTest}
        GROUP BY s.day, s.question_id, s.is_void, q.data
        ORDER BY s.day DESC
        LIMIT 120
      `;
      return res.status(200).json({
        schedule: rows.map((r) => ({
          day: r.day,
          questionId: r.question_id,
          stem: r.stem,
          isVoid: r.is_void,
          answered: r.answered,
          percentRight: r.answered ? Math.round((r.right_count / r.answered) * 100) : null,
          avgSeconds: r.avg_ms == null ? null : Math.round(r.avg_ms / 100) / 10,
        })),
      });
    }

    if (req.method === 'PATCH') {
      const b = body(req);
      if (!isDay(b.day) || !['void', 'unvoid'].includes(b.action)) return res.status(400).json({ error: 'invalid update' });
      const { rows } = await sql`
        UPDATE daily_schedule SET is_void = ${b.action === 'void'} WHERE day = ${b.day}::date RETURNING day
      `;
      if (!rows.length) return res.status(404).json({ error: 'no question went out that day' });
      return res.status(200).json({ ok: true });
    }

    return methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
