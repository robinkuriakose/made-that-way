// Public: the shared leaderboard.
//
// GET   ?deviceId&limit          -> { allTime, week, player }
//        each board is { entries, me }; me is this device's row when it's
//        below the top `limit`. player is this device's name and how many
//        name changes it has left.
// POST  { deviceId, runId, name?, test? } -> sign a finished run
// PATCH { deviceId, name }        -> change this device's name (3 times at most)
//
// Trust: the score is never taken from the client. Signing looks up the
// registered run and its saved session, which must be verified (timing
// checked against the server's clock), and recomputes the score from the
// session's own answers. The board shows a random public id per player;
// device ids never leave the server.
//
// Test runs (test mode in the builder, or a name with a word starting
// "test") are kept apart: they show on the board for two minutes, never
// touch a player's real name or best, and their session is marked as a test
// so analytics leave it out.
import { randomBytes } from 'node:crypto';
import { sql } from '../db.js';
import { ensureSchema, asObject, isoTime } from '../schema.js';
import { body, isId, methodNotAllowed, serverError } from '../http.js';
import { hit, tooMany } from '../limits.js';
import { isBetterRun } from '../../src/lib/ranking.js';
import { cleanName, isTestName, nameProblem, NAME_CHANGE_LIMIT } from '../../src/lib/names.js';
import { verifySession } from '../../src/lib/verifySession.js';

const DEFAULT_LIMIT = 10;
const TEST_VISIBLE = '2 minutes';

const entryFrom = (row, deviceId) => ({
  id: row.public_id ?? `test-${row.run_id}`,
  name: row.name,
  score: row.score,
  correct: row.correct,
  total: row.total,
  durationMs: Number(row.duration_ms),
  finishedAt: isoTime(row.finished_at),
  rank: row.rank == null ? null : Number(row.rank),
  isMe: Boolean(deviceId) && row.device_id === deviceId,
  isTest: Boolean(row.is_test),
});

// Test entries sit among the real ones for their two minutes, so a tester
// sees exactly what a player would; ranks are renumbered to include them.
function withTests(rows, tests, limit, deviceId) {
  const real = rows.map((r) => entryFrom(r, deviceId));
  const top = real.filter((e) => e.rank <= limit);
  const me = real.find((e) => e.isMe && e.rank > limit) ?? null;
  const merged = [...top, ...tests.map((t) => entryFrom({ ...t, is_test: true }, deviceId))]
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.durationMs - b.durationMs)
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  return { entries: merged, me };
}

async function boards(deviceId, limit) {
  const { rows: allTime } = await sql`
    WITH ranked AS (
      SELECT device_id, public_id, name, best_score AS score, best_correct AS correct, best_total AS total,
             best_duration_ms AS duration_ms, best_finished_at AS finished_at,
             rank() OVER (ORDER BY best_score DESC, best_correct DESC, best_duration_ms ASC) AS rank
      FROM players WHERE best_run_id IS NOT NULL AND NOT hidden
    )
    SELECT * FROM ranked WHERE rank <= ${limit} OR device_id = ${deviceId ?? ''} ORDER BY rank
  `;
  const { rows: week } = await sql`
    WITH best AS (
      SELECT DISTINCT ON (s.device_id) s.device_id, s.score, s.correct, s.total, s.duration_ms, s.finished_at, p.public_id, p.name
      FROM signed_runs s JOIN players p ON p.device_id = s.device_id
      WHERE NOT s.is_test AND NOT p.hidden AND s.created_at > now() - interval '7 days'
      ORDER BY s.device_id, s.score DESC, s.correct DESC, s.duration_ms ASC
    ), ranked AS (
      SELECT *, rank() OVER (ORDER BY score DESC, correct DESC, duration_ms ASC) AS rank FROM best
    )
    SELECT * FROM ranked WHERE rank <= ${limit} OR device_id = ${deviceId ?? ''} ORDER BY rank
  `;
  const { rows: tests } = await sql`
    SELECT run_id, device_id, test_name AS name, score, correct, total, duration_ms, finished_at
    FROM signed_runs WHERE is_test AND created_at > now() - ${TEST_VISIBLE}::interval
  `;
  return { allTime: withTests(allTime, tests, limit, deviceId), week: withTests(week, tests, limit, deviceId) };
}

async function playerFor(deviceId) {
  if (!deviceId) return null;
  const { rows } = await sql`SELECT * FROM players WHERE device_id = ${deviceId}`;
  return rows[0] ?? null;
}

const publicPlayer = (p) => (p ? { name: p.name, nameChangesLeft: Math.max(0, NAME_CHANGE_LIMIT - p.name_changes) } : null);

// Every version of each question this run could have seen: the current one,
// plus any replaced since the run started.
async function versionsFor(session, startedAt) {
  const ids = [...new Set((session?.questions ?? []).map((q) => q?.id).filter((id) => typeof id === 'string'))];
  const list = JSON.stringify(ids);
  const { rows: current } = await sql`
    SELECT id, data FROM questions WHERE id IN (SELECT jsonb_array_elements_text(${list}::jsonb))
  `;
  const { rows: older } = await sql`
    SELECT question_id AS id, data FROM question_history
    WHERE question_id IN (SELECT jsonb_array_elements_text(${list}::jsonb))
      AND replaced_at >= ${startedAt}::timestamptz - interval '1 minute'
  `;
  const byId = {};
  for (const r of [...current, ...older]) (byId[r.id] ??= []).push({ ...asObject(r.data), id: r.id });
  return byId;
}

async function sign(req, res) {
  const b = body(req);
  if (!isId(b.deviceId) || !isId(b.runId)) return res.status(400).json({ error: 'invalid request' });
  if (!(await hit(req, 'sign'))) return tooMany(res);

  const { rows: runRows } = await sql`SELECT device_id, is_test, started_at FROM runs WHERE id = ${b.runId}`;
  const run = runRows[0];
  if (!run || run.device_id !== b.deviceId) return res.status(409).json({ error: "That run isn't known here." });

  const { rows: sessionRows } = await sql`SELECT data, verified, is_test FROM sessions WHERE id = ${b.runId}`;
  if (!sessionRows.length) return res.status(404).json({ error: 'Still saving your run. Try again in a moment.' });
  const session = sessionRows[0];
  if (!session.verified) return res.status(422).json({ error: "This run can't go on the board: its timing didn't check out." });

  const verified = verifySession(asObject(session.data), await versionsFor(asObject(session.data), isoTime(run.started_at)));
  if (!verified) return res.status(422).json({ error: "This run can't go on the board: its answers didn't check out." });

  const { rows: already } = await sql`SELECT 1 FROM signed_runs WHERE run_id = ${b.runId}`;
  const player = await playerFor(b.deviceId);
  const given = cleanName(b.name);
  const isTest = run.is_test || session.is_test || b.test === true || isTestName(given || player?.name);

  if (isTest) {
    if (!already.length) {
      await sql`
        INSERT INTO signed_runs (run_id, device_id, score, correct, total, duration_ms, finished_at, is_test, test_name)
        VALUES (${b.runId}, ${b.deviceId}, ${verified.score}, ${verified.correct}, ${verified.total}, ${verified.durationMs},
                ${verified.finishedAt}::timestamptz, true, ${given || player?.name || 'Test'})
      `;
      await sql`UPDATE sessions SET is_test = true WHERE id = ${b.runId}`;
    }
    return res.status(200).json({ isTest: true, isNewBest: false, player: publicPlayer(player) });
  }

  const name = player?.name ?? given;
  if (!name) return res.status(400).json({ error: 'Add a name first.' });
  const problem = player ? null : nameProblem(name);
  if (problem) return res.status(422).json({ error: problem });

  if (!player) {
    await sql`
      INSERT INTO players (device_id, public_id, name)
      VALUES (${b.deviceId}, ${randomBytes(9).toString('base64url')}, ${name})
      ON CONFLICT (device_id) DO NOTHING
    `;
  }
  if (!already.length) {
    await sql`
      INSERT INTO signed_runs (run_id, device_id, score, correct, total, duration_ms, finished_at)
      VALUES (${b.runId}, ${b.deviceId}, ${verified.score}, ${verified.correct}, ${verified.total}, ${verified.durationMs},
              ${verified.finishedAt}::timestamptz)
      ON CONFLICT (run_id) DO NOTHING
    `;
  }

  const current = await playerFor(b.deviceId);
  const best = current.best_run_id
    ? { score: current.best_score, correct: current.best_correct, durationMs: Number(current.best_duration_ms) }
    : null;
  const isNewBest = current.best_run_id === b.runId || isBetterRun(verified, best);
  if (isNewBest && current.best_run_id !== b.runId) {
    await sql`
      UPDATE players SET best_run_id = ${b.runId}, best_score = ${verified.score}, best_correct = ${verified.correct},
        best_total = ${verified.total}, best_duration_ms = ${verified.durationMs},
        best_finished_at = ${verified.finishedAt}::timestamptz, updated_at = now()
      WHERE device_id = ${b.deviceId}
    `;
  }
  return res.status(200).json({ isTest: false, isNewBest, player: publicPlayer(current) });
}

async function rename(req, res) {
  const b = body(req);
  if (!isId(b.deviceId)) return res.status(400).json({ error: 'invalid request' });
  if (!(await hit(req, 'rename'))) return tooMany(res);
  const name = cleanName(b.name);
  const problem = nameProblem(name);
  if (problem) return res.status(422).json({ error: problem });
  if (isTestName(name)) return res.status(422).json({ error: 'Names with "test" in them are kept for test runs. Pick another.' });

  const player = await playerFor(b.deviceId);
  if (!player) return res.status(404).json({ error: 'Sign a run first.' });
  if (player.name === name) return res.status(200).json({ player: publicPlayer(player) });
  if (player.name_changes >= NAME_CHANGE_LIMIT) {
    return res.status(409).json({ error: `You've used all ${NAME_CHANGE_LIMIT} name changes.`, player: publicPlayer(player) });
  }
  const { rows } = await sql`
    UPDATE players SET name = ${name}, name_changes = name_changes + 1, updated_at = now()
    WHERE device_id = ${b.deviceId} AND name_changes < ${NAME_CHANGE_LIMIT}
    RETURNING *
  `;
  return res.status(200).json({ player: publicPlayer(rows[0] ?? player) });
}

export default async function handler(req, res) {
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const deviceId = isId(req.query?.deviceId) ? req.query.deviceId : null;
      const limit = Math.min(50, Math.max(1, Number.parseInt(req.query?.limit, 10) || DEFAULT_LIMIT));
      const [board, player] = await Promise.all([boards(deviceId, limit), playerFor(deviceId)]);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ...board, player: publicPlayer(player) });
    }
    if (req.method === 'POST') return await sign(req, res);
    if (req.method === 'PATCH') return await rename(req, res);
    return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
