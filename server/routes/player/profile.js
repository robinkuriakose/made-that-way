// Public, but only ever about the asking device: this player's own numbers.
// GET ?deviceId&test -> { totals, levels, runs, suggestions, legend }
//
// Built from the runs this device has saved (V2 runs only: levels and
// lives), worked out in the database. No question is ever sent, only
// numbers: best level, best score, how often they're right, and how each
// level has gone.
import { sql } from '../../db.js';
import { ensureSchema, isoTime, asObject } from '../../schema.js';
import { isId, methodNotAllowed, serverError } from '../../http.js';
import { hit, tooMany } from '../../limits.js';
import { LEVEL_SIZE } from '../../../src/lib/scoring.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const deviceId = req.query?.deviceId;
    if (!isId(deviceId)) return res.status(400).json({ error: 'invalid request' });
    const t = req.query?.test === '1';
    await ensureSchema();
    if (!(await hit(req, 'profile'))) return tooMany(res);

    const { rows: totals } = await sql`
      SELECT count(*)::int AS runs,
             coalesce(max(score), 0)::int AS best_score,
             coalesce(max(jsonb_array_length(data->'questions')), 0)::int AS most_answers,
             coalesce(sum((data->>'durationMs')::bigint), 0)::bigint AS total_ms
      FROM sessions
      WHERE device_id = ${deviceId} AND is_test = ${t} AND data->>'format' = '2'
    `;
    const { rows: levels } = await sql`
      SELECT ((a->>'position')::int - 1) / ${LEVEL_SIZE} + 1 AS level,
             count(*)::int AS asked,
             count(*) FILTER (WHERE (a->>'correct')::boolean)::int AS right_count,
             count(DISTINCT s.id)::int AS runs
      FROM sessions s CROSS JOIN LATERAL jsonb_array_elements(s.data->'questions') AS a
      WHERE s.device_id = ${deviceId} AND s.is_test = ${t} AND s.data->>'format' = '2'
      GROUP BY 1 ORDER BY 1
    `;
    const { rows: runs } = await sql`
      SELECT s.id, s.created_at, s.score, (s.data->>'durationMs')::bigint AS duration_ms, s.data->>'endReason' AS end_reason,
             jsonb_array_length(s.data->'questions') AS answered,
             (SELECT count(*) FROM jsonb_array_elements(s.data->'questions') AS a WHERE (a->>'correct')::boolean)::int AS right_count
      FROM sessions s
      WHERE s.device_id = ${deviceId} AND s.is_test = ${t} AND s.data->>'format' = '2'
      ORDER BY s.created_at DESC LIMIT 10
    `;
    const { rows: suggestions } = await sql`
      SELECT id, kind, data, status, created_at FROM suggestions
      WHERE device_id = ${deviceId} AND is_test = ${t}
      ORDER BY created_at DESC LIMIT 20
    `;
    const { rows: legend } = await sql`
      SELECT score, level, duration_ms, created_at FROM legends
      WHERE device_id = ${deviceId} AND is_test = ${t} ORDER BY score DESC LIMIT 1
    `;

    const asked = levels.reduce((sum, l) => sum + l.asked, 0);
    const right = levels.reduce((sum, l) => sum + l.right_count, 0);
    const levelOfAnswers = (n) => (n > 0 ? Math.floor((n - 1) / LEVEL_SIZE) + 1 : 0);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      totals: {
        runs: totals[0].runs,
        bestScore: totals[0].best_score,
        bestLevel: levelOfAnswers(totals[0].most_answers),
        percentRight: asked ? Math.round((right / asked) * 100) : null,
        answered: asked,
        timePlayedMs: Number(totals[0].total_ms),
      },
      levels: levels.map((l) => ({
        level: l.level,
        runs: l.runs,
        asked: l.asked,
        percentRight: l.asked ? Math.round((l.right_count / l.asked) * 100) : null,
      })),
      runs: runs.map((r) => ({
        id: r.id,
        finishedAt: isoTime(r.created_at),
        score: r.score,
        durationMs: r.duration_ms == null ? null : Number(r.duration_ms),
        level: levelOfAnswers(r.answered),
        answered: r.answered,
        right: r.right_count,
        legend: r.end_reason === 'legend',
      })),
      suggestions: suggestions.map((r) => {
        const d = asObject(r.data) ?? {};
        return { id: r.id, kind: r.kind, text: d.text ?? d.question ?? '', status: r.status, createdAt: isoTime(r.created_at) };
      }),
      legend: legend[0]
        ? { score: legend[0].score, level: legend[0].level, durationMs: Number(legend[0].duration_ms), at: isoTime(legend[0].created_at) }
        : null,
    });
  } catch (err) {
    return serverError(res, err);
  }
}
