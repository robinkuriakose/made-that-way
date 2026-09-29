// Checking a finished run before anything public is built on it (the weekly
// board, the Legends wall). A run must have been registered by this device
// when it started, saved with timing that fits the server's clock, and its
// answers must replay to the same score against the version of each question
// the player actually saw (question_history).
import { sql } from './db.js';
import { asObject, isoTime } from './schema.js';
import { verifySession, sessionQuestionIds } from '../src/lib/verifySession.js';

// Every version of each question this run could have seen: the current one,
// plus any replaced since the run started.
export async function versionsFor(session, startedAt) {
  const list = JSON.stringify(sessionQuestionIds(session));
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

// Resolves to { run, session, verified } or { status, error } with a plain
// reason a player can read.
export async function checkedRun(runId, deviceId) {
  const { rows: runRows } = await sql`SELECT device_id, is_test, started_at FROM runs WHERE id = ${runId}`;
  const run = runRows[0];
  if (!run || run.device_id !== deviceId) return { status: 409, error: "That run isn't known here." };

  const { rows: sessionRows } = await sql`SELECT data, verified, is_test FROM sessions WHERE id = ${runId}`;
  if (!sessionRows.length) return { status: 404, error: 'Still saving your run. Try again in a moment.' };
  const row = sessionRows[0];
  if (!row.verified) return { status: 422, error: "This run can't go up: its timing didn't check out." };

  const session = asObject(row.data);
  const verified = verifySession(session, await versionsFor(session, isoTime(run.started_at)));
  if (!verified) return { status: 422, error: "This run can't go up: its answers didn't check out." };
  return { run, session, sessionIsTest: row.is_test, verified };
}
