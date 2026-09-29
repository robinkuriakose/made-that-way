// Builder: what players said in the feedback form. Averages and counts are
// worked out in the database; the latest answers come back in full.
// GET ?test=1 -> { summary, responses }
import { sql } from '../../db.js';
import { ensureSchema, isoTime, asObject } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { methodNotAllowed, serverError } from '../../http.js';

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    await ensureSchema();
    const t = req.query?.test === '1';
    const { rows: ratings } = await sql`
      SELECT r.key AS id, round(avg(r.value::int), 1)::float AS average, count(*)::int AS n
      FROM feedback f CROSS JOIN LATERAL jsonb_each_text(coalesce(f.answers->'ratings', '{}'::jsonb)) AS r
      WHERE f.is_test = ${t}
      GROUP BY 1
    `;
    const { rows: more } = await sql`
      SELECT m AS id, count(*)::int AS n
      FROM feedback f CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(f.answers->'more', '[]'::jsonb)) AS m
      WHERE f.is_test = ${t}
      GROUP BY 1 ORDER BY 2 DESC
    `;
    const { rows: recommend } = await sql`
      SELECT answers->>'recommend' AS id, count(*)::int AS n FROM feedback
      WHERE is_test = ${t} AND answers ? 'recommend' GROUP BY 1
    `;
    const { rows: total } = await sql`SELECT count(*)::int AS n FROM feedback WHERE is_test = ${t}`;
    const { rows } = await sql`SELECT * FROM feedback WHERE is_test = ${t} ORDER BY created_at DESC LIMIT 200`;
    return res.status(200).json({
      summary: {
        responses: total[0].n,
        ratings: Object.fromEntries(ratings.map((r) => [r.id, { average: r.average, n: r.n }])),
        more: Object.fromEntries(more.map((r) => [r.id, r.n])),
        recommend: Object.fromEntries(recommend.map((r) => [r.id, r.n])),
      },
      responses: rows.map((r) => ({ id: String(r.id), answers: asObject(r.answers), note: r.note, createdAt: isoTime(r.created_at) })),
    });
  } catch (err) {
    return serverError(res, err);
  }
}
