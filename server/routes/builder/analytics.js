// Builder: the analytics dashboard's numbers, all worked out in the database
// so they stay quick however many runs pile up.
//
// GET ?range=7d|30d|90d|all&test=1&tz=Area/City
//   test=1 shows only test data (test mode in the builder, or names with
//   "test" in them); otherwise test data is left out entirely.
//   tz is the viewer's time zone, so days and hours read the way they'd expect.
import { sql } from '../../db.js';
import { ensureSchema } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { methodNotAllowed, serverError } from '../../http.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = { '7d': 7, '30d': 30, '90d': 90, all: null };
const EPOCH = '1970-01-01T00:00:00Z';

function validZone(tz) {
  try {
    if (typeof tz !== 'string' || tz.length > 64) return 'UTC';
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

async function kpis(t, from, to, tz) {
  const { rows } = await sql`
    SELECT
      (SELECT count(DISTINCT device_id)::int FROM events
        WHERE type = 'page_opened' AND is_test = ${t} AND created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz) AS visitors,
      (SELECT count(*)::int FROM runs
        WHERE is_test = ${t} AND started_at >= ${from}::timestamptz AND started_at < ${to}::timestamptz) AS started,
      (SELECT count(*)::int FROM sessions
        WHERE verified AND is_test = ${t} AND created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz) AS finished,
      (SELECT avg(score)::float FROM sessions
        WHERE verified AND is_test = ${t} AND created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz) AS avg_score,
      (SELECT count(*)::int FROM signed_runs
        WHERE is_test = ${t} AND created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz) AS signed,
      (SELECT count(*)::int FROM daily_answers
        WHERE is_test = ${t} AND answered_at >= ${from}::timestamptz AND answered_at < ${to}::timestamptz) AS daily_answers,
      (SELECT count(*)::int FROM flags
        WHERE is_test = ${t} AND created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz) AS flags,
      (SELECT count(*)::int FROM (
        SELECT device_id FROM events
        WHERE type = 'page_opened' AND is_test = ${t} AND created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz
        GROUP BY device_id HAVING count(DISTINCT (created_at AT TIME ZONE ${tz})::date) >= 2
      ) r) AS returning
  `;
  const k = rows[0];
  return {
    visitors: k.visitors,
    started: k.started,
    finished: k.finished,
    completion: k.started ? k.finished / k.started : null,
    avgScore: k.avg_score,
    signed: k.signed,
    dailyAnswers: k.daily_answers,
    flags: k.flags,
    returning: k.returning,
  };
}

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    await ensureSchema();
    const q = req.query ?? {};
    const range = q.range in RANGES ? q.range : '30d';
    const t = q.test === '1';
    const tz = validZone(q.tz);
    const now = Date.now();
    const days = RANGES[range];
    const since = days ? new Date(now - days * DAY_MS).toISOString() : EPOCH;
    const until = new Date(now + 60 * 1000).toISOString();
    const before = days ? new Date(now - 2 * days * DAY_MS).toISOString() : null;

    const current = await kpis(t, since, until, tz);
    const previous = before ? await kpis(t, before, since, tz) : null;

    const { rows: funnel } = await sql`
      SELECT
        (SELECT count(DISTINCT device_id)::int FROM events WHERE type = 'page_opened' AND is_test = ${t} AND created_at >= ${since}::timestamptz) AS opened,
        (SELECT count(DISTINCT device_id)::int FROM runs WHERE is_test = ${t} AND started_at >= ${since}::timestamptz) AS started,
        (SELECT count(DISTINCT device_id)::int FROM sessions WHERE verified AND is_test = ${t} AND created_at >= ${since}::timestamptz) AS finished,
        (SELECT count(DISTINCT device_id)::int FROM signed_runs WHERE is_test = ${t} AND created_at >= ${since}::timestamptz) AS signed
    `;

    const { rows: visitsByDay } = await sql`
      SELECT (created_at AT TIME ZONE ${tz})::date::text AS day, count(DISTINCT device_id)::int AS n
      FROM events WHERE type = 'page_opened' AND is_test = ${t} AND created_at >= ${since}::timestamptz
      GROUP BY 1
    `;
    const { rows: runsByDay } = await sql`
      SELECT (started_at AT TIME ZONE ${tz})::date::text AS day, count(*)::int AS n
      FROM runs WHERE is_test = ${t} AND started_at >= ${since}::timestamptz
      GROUP BY 1
    `;
    const { rows: finishedByDay } = await sql`
      SELECT (created_at AT TIME ZONE ${tz})::date::text AS day, count(*)::int AS n
      FROM sessions WHERE verified AND is_test = ${t} AND created_at >= ${since}::timestamptz
      GROUP BY 1
    `;

    const { rows: dropOff } = await sql`
      SELECT last_position AS position, count(*)::int AS n FROM runs
      WHERE is_test = ${t} AND started_at >= ${since}::timestamptz AND status IN ('left', 'restarted')
      GROUP BY 1 ORDER BY 1
    `;
    const { rows: quiet } = await sql`
      SELECT count(*)::int AS n FROM runs
      WHERE is_test = ${t} AND started_at >= ${since}::timestamptz AND status = 'started' AND started_at < now() - interval '1 day'
    `;

    const { rows: scoreStats } = await sql`
      SELECT count(*)::int AS n, avg(score)::float AS avg,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY score)::float AS median
      FROM sessions WHERE verified AND is_test = ${t} AND created_at >= ${since}::timestamptz
    `;
    const { rows: scoreBuckets } = await sql`
      SELECT least(floor(score / 10.0), 9)::int AS bucket, count(*)::int AS n
      FROM sessions WHERE verified AND is_test = ${t} AND created_at >= ${since}::timestamptz AND score IS NOT NULL
      GROUP BY 1
    `;

    const { rows: questionStats } = await sql`
      SELECT a->>'id' AS id,
             count(*)::int AS asked,
             count(*) FILTER (WHERE (a->>'correct')::boolean)::int AS correct,
             avg((a->>'timeToAnswerMs')::float)::float AS avg_ms,
             count(*) FILTER (WHERE (a->>'hintUsed')::boolean)::int AS hints,
             count(*) FILTER (WHERE (a->>'redeemUsed')::boolean)::int AS redeems,
             count(*) FILTER (WHERE (a->>'redeemPassed')::boolean)::int AS redeem_passes,
             coalesce(sum((a->>'points')::float), 0)::float AS points
      FROM sessions s CROSS JOIN LATERAL jsonb_array_elements(s.data->'questions') AS a
      WHERE s.verified AND s.is_test = ${t} AND s.created_at >= ${since}::timestamptz
      GROUP BY 1
    `;
    const { rows: offered } = await sql`
      SELECT o AS id, count(*)::int AS n
      FROM sessions s
      CROSS JOIN LATERAL jsonb_array_elements(s.data->'questions') AS a
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(a->'redeemOffered') = 'array' THEN a->'redeemOffered' ELSE '[]'::jsonb END
      ) AS o
      WHERE s.verified AND s.is_test = ${t} AND s.created_at >= ${since}::timestamptz
      GROUP BY 1
    `;
    const { rows: picked } = await sql`
      SELECT a->>'redeemQuestionId' AS id, count(*)::int AS n,
             count(*) FILTER (WHERE (a->>'redeemPassed')::boolean)::int AS right_count
      FROM sessions s CROSS JOIN LATERAL jsonb_array_elements(s.data->'questions') AS a
      WHERE s.verified AND s.is_test = ${t} AND s.created_at >= ${since}::timestamptz AND a->>'redeemQuestionId' IS NOT NULL
      GROUP BY 1
    `;
    const { rows: tidbits } = await sql`
      SELECT coalesce(sum(jsonb_array_length(
        CASE WHEN jsonb_typeof(data->'tidbitsShown') = 'array' THEN data->'tidbitsShown' ELSE '[]'::jsonb END
      )), 0)::int AS n
      FROM sessions WHERE verified AND is_test = ${t} AND created_at >= ${since}::timestamptz
    `;

    const { rows: daily } = await sql`
      SELECT s.day::text AS day, s.question_id, q.data->>'stem' AS stem, s.is_void,
             count(a.device_id)::int AS answered,
             count(a.device_id) FILTER (WHERE a.correct)::int AS right_count,
             avg(a.time_ms)::float AS avg_ms
      FROM daily_schedule s
      JOIN questions q ON q.id = s.question_id
      LEFT JOIN daily_answers a ON a.day = s.day AND a.is_test = ${t}
      WHERE s.day >= (${since}::timestamptz AT TIME ZONE ${tz})::date
      GROUP BY s.day, s.question_id, q.data, s.is_void
      ORDER BY s.day DESC
      LIMIT 90
    `;

    const { rows: devices } = await sql`
      SELECT coalesce(data->>'device', 'unknown') AS device, count(DISTINCT device_id)::int AS n
      FROM events WHERE type = 'page_opened' AND is_test = ${t} AND created_at >= ${since}::timestamptz
      GROUP BY 1
    `;
    const { rows: hours } = await sql`
      SELECT extract(hour FROM (started_at AT TIME ZONE ${tz}))::int AS hour, count(*)::int AS n
      FROM runs WHERE is_test = ${t} AND started_at >= ${since}::timestamptz
      GROUP BY 1
    `;
    const { rows: themeRows } = await sql`
      SELECT th AS theme, count(*)::int AS n
      FROM runs r CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(r.themes) = 'array' THEN r.themes ELSE '[]'::jsonb END
      ) AS th
      WHERE r.is_test = ${t} AND r.started_at >= ${since}::timestamptz
      GROUP BY 1
    `;
    const { rows: allTopics } = await sql`
      SELECT count(*)::int AS n FROM runs
      WHERE is_test = ${t} AND started_at >= ${since}::timestamptz AND (themes IS NULL OR jsonb_typeof(themes) <> 'array')
    `;
    const { rows: openFlags } = await sql`SELECT count(*)::int AS n FROM flags WHERE status = 'open' AND is_test = ${t}`;

    // One row per day in the range (every day, even quiet ones), for the chart.
    const byDay = new Map();
    const bump = (rows, key) => rows.forEach((r) => byDay.set(r.day, { ...(byDay.get(r.day) ?? {}), [key]: r.n }));
    bump(visitsByDay, 'visitors');
    bump(runsByDay, 'started');
    bump(finishedByDay, 'finished');
    const known = [...byDay.keys()].sort();
    const firstDay = days ? new Date(now - (days - 1) * DAY_MS) : known.length ? new Date(`${known[0]}T12:00:00Z`) : new Date(now);
    const activity = [];
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    for (let d = firstDay.getTime(); d <= now; d += DAY_MS) {
      const day = fmt.format(new Date(d));
      if (activity.at(-1)?.day === day) continue;
      activity.push({ day, visitors: 0, started: 0, finished: 0, ...byDay.get(day) });
    }

    const buckets = Array(10).fill(0);
    for (const r of scoreBuckets) buckets[Math.max(0, Math.min(9, r.bucket))] = r.n;
    const hourCounts = Array(24).fill(0);
    for (const r of hours) hourCounts[r.hour] = r.n;

    return res.status(200).json({
      range,
      test: t,
      tz,
      generatedAt: new Date(now).toISOString(),
      kpis: { current, previous },
      funnel: funnel[0],
      activity,
      dropOff: { positions: dropOff, quiet: quiet[0].n },
      scores: { n: scoreStats[0].n, avg: scoreStats[0].avg, median: scoreStats[0].median, buckets },
      questions: questionStats.map((r) => ({
        id: r.id,
        asked: r.asked,
        correct: r.correct,
        avgSeconds: r.avg_ms == null ? null : r.avg_ms / 1000,
        hints: r.hints,
        redeems: r.redeems,
        redeemPasses: r.redeem_passes,
        points: r.points,
      })),
      redeemUse: {
        offered: Object.fromEntries(offered.map((r) => [r.id, r.n])),
        picked: Object.fromEntries(picked.map((r) => [r.id, { n: r.n, right: r.right_count }])),
      },
      tidbitsShown: tidbits[0].n,
      daily: daily.map((r) => ({
        day: r.day,
        questionId: r.question_id,
        stem: r.stem,
        isVoid: r.is_void,
        answered: r.answered,
        percentRight: r.answered ? Math.round((r.right_count / r.answered) * 100) : null,
        avgSeconds: r.avg_ms == null ? null : r.avg_ms / 1000,
      })),
      devices: Object.fromEntries(devices.map((r) => [r.device, r.n])),
      hours: hourCounts,
      themes: { counts: Object.fromEntries(themeRows.map((r) => [r.theme, r.n])), allTopics: allTopics[0].n },
      openFlags: openFlags[0].n,
    });
  } catch (err) {
    return serverError(res, err);
  }
}
