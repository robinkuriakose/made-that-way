// Public: the shared leaderboard. It's weekly: it starts again every Monday
// at midnight, India time (lib/week.js), so a newcomer always has a chance.
// A player's all-time best is theirs alone: it comes back as player.best,
// never on a public board.
//
// GET   ?deviceId&limit          -> { week, player }
//        week is { entries, me, startsAt }; me is this device's row when
//        it's below the top `limit`. player is this device's name, how many
//        name changes it has left, and its best run.
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
import { createRequire } from 'node:module';
import { sql } from '../db.js';
import { ensureSchema, isoTime } from '../schema.js';
import { body, isId, methodNotAllowed, serverError } from '../http.js';
import { hit, tooMany } from '../limits.js';
import { isBetterRun } from '../../src/lib/ranking.js';
import { cleanName, isTestName, nameProblem, NAME_CHANGE_LIMIT } from '../../src/lib/names.js';
import { checkedRun } from '../runs.js';
import { levelOf } from '../../src/lib/scoring.js';
import { weekStart } from '../../src/lib/week.js';
import { boardMedal } from '../../src/lib/rewards.js';

const require = createRequire(import.meta.url);
const plan = require('../../src/data/level-plan.json');

const DEFAULT_LIMIT = 10;
const TEST_VISIBLE = '2 minutes';

const entryFrom = (row, deviceId) => ({
  id: row.public_id ?? `test-${row.run_id}`,
  name: row.name,
  score: row.score,
  correct: row.correct,
  total: row.total,
  level: levelOf(row.total),
  // The furthest this player got this week, as a medal (silver, gold, legend).
  medal: boardMedal(row.top_cleared ?? row.levels_cleared ?? 0, plan),
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

async function board(deviceId, limit) {
  const since = weekStart().toISOString();
  const { rows: week } = await sql`
    WITH best AS (
      SELECT DISTINCT ON (s.device_id) s.device_id, s.score, s.correct, s.total, s.duration_ms, s.finished_at, p.public_id, p.name,
        max(s.levels_cleared) OVER (PARTITION BY s.device_id) AS top_cleared
      FROM signed_runs s JOIN players p ON p.device_id = s.device_id
      WHERE NOT s.is_test AND NOT p.hidden AND s.created_at >= ${since}::timestamptz
      ORDER BY s.device_id, s.score DESC, s.correct DESC, s.duration_ms ASC
    ), ranked AS (
      SELECT *, rank() OVER (ORDER BY score DESC, correct DESC, duration_ms ASC) AS rank FROM best
    )
    SELECT * FROM ranked WHERE rank <= ${limit} OR device_id = ${deviceId ?? ''} ORDER BY rank
  `;
  const { rows: tests } = await sql`
    SELECT run_id, device_id, test_name AS name, score, correct, total, duration_ms, finished_at, levels_cleared
    FROM signed_runs WHERE is_test AND created_at > now() - ${TEST_VISIBLE}::interval
  `;
  return { ...withTests(week, tests, limit, deviceId), startsAt: since };
}

async function playerFor(deviceId) {
  if (!deviceId) return null;
  const { rows } = await sql`SELECT * FROM players WHERE device_id = ${deviceId}`;
  return rows[0] ?? null;
}

const publicPlayer = (p) =>
  p
    ? {
        name: p.name,
        nameChangesLeft: Math.max(0, NAME_CHANGE_LIMIT - p.name_changes),
        best: p.best_run_id ? { score: p.best_score, level: levelOf(p.best_total), finishedAt: isoTime(p.best_finished_at) } : null,
      }
    : null;

async function sign(req, res) {
  const b = body(req);
  if (!isId(b.deviceId) || !isId(b.runId)) return res.status(400).json({ error: 'invalid request' });
  if (!(await hit(req, 'sign'))) return tooMany(res);

  const checked = await checkedRun(b.runId, b.deviceId);
  if (checked.error) return res.status(checked.status).json({ error: checked.error });
  const { run, verified } = checked;
  const session = { is_test: checked.sessionIsTest };

  const { rows: already } = await sql`SELECT 1 FROM signed_runs WHERE run_id = ${b.runId}`;
  const player = await playerFor(b.deviceId);
  const given = cleanName(b.name);
  const isTest = run.is_test || session.is_test || b.test === true || isTestName(given || player?.name);

  if (isTest) {
    if (!already.length) {
      await sql`
        INSERT INTO signed_runs (run_id, device_id, score, correct, total, duration_ms, finished_at, is_test, test_name, levels_cleared)
        VALUES (${b.runId}, ${b.deviceId}, ${verified.score}, ${verified.correct}, ${verified.total}, ${verified.durationMs},
                ${verified.finishedAt}::timestamptz, true, ${given || player?.name || 'Test'}, ${verified.levelsCleared})
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
      INSERT INTO signed_runs (run_id, device_id, score, correct, total, duration_ms, finished_at, levels_cleared)
      VALUES (${b.runId}, ${b.deviceId}, ${verified.score}, ${verified.correct}, ${verified.total}, ${verified.durationMs},
              ${verified.finishedAt}::timestamptz, ${verified.levelsCleared})
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
      const [week, player] = await Promise.all([board(deviceId, limit), playerFor(deviceId)]);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ week, player: publicPlayer(player) });
    }
    if (req.method === 'POST') return await sign(req, res);
    if (req.method === 'PATCH') return await rename(req, res);
    return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  } catch (err) {
    return serverError(res, err);
  }
}
