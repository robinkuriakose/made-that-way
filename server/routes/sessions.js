// Public: save one finished run. POST { ...session, test? }
//
// Checked before anything is stored: size, shape, that the run was
// registered when it started (by this device), and that every question in
// it is real. "verified" also needs the timing to fit the server's own
// clock: a run can't take longer than the time since it was registered, or
// be finished faster than a person could read ten questions. Only verified
// runs can go on the leaderboard; every registered run counts in analytics.
import { sql } from '../db.js';
import { ensureSchema } from '../schema.js';
import { body, isId, isText, methodNotAllowed, serverError, sizeOf } from '../http.js';
import { hit, tooMany } from '../limits.js';
import { RUN_LENGTH } from '../../src/lib/scoring.js';

const MAX_BYTES = 32 * 1024;
const MIN_RUN_MS = 10 * 1000;
const CLOCK_SLACK_MS = 15 * 1000;

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

function answerOk(a) {
  return (
    a &&
    isText(a.id, 64) &&
    isText(a.topic, 40) &&
    Number.isInteger(a.position) &&
    (a.chosenIndex === null || (Number.isInteger(a.chosenIndex) && a.chosenIndex >= 0 && a.chosenIndex <= 3)) &&
    typeof a.correct === 'boolean' &&
    finite(a.elapsedSeconds) &&
    finite(a.points) &&
    a.points >= 0 &&
    a.points <= 10
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const s = body(req);
    if (sizeOf(s) > MAX_BYTES) return res.status(413).json({ error: 'too large' });
    const valid =
      isId(s.id) &&
      isId(s.deviceId) &&
      Array.isArray(s.questions) &&
      s.questions.length >= 1 &&
      s.questions.length <= RUN_LENGTH &&
      s.questions.every(answerOk) &&
      finite(s.durationMs) &&
      s.durationMs >= 0;
    if (!valid) return res.status(400).json({ error: 'invalid session' });

    await ensureSchema();
    if (!(await hit(req, 'session'))) return tooMany(res);

    const { rows: runRows } = await sql`
      SELECT device_id, is_test, (extract(epoch FROM (now() - started_at)) * 1000)::bigint AS age_ms
      FROM runs WHERE id = ${s.id}
    `;
    const run = runRows[0];
    if (!run || run.device_id !== s.deviceId) return res.status(409).json({ error: 'unknown run' });

    const ids = [...new Set(s.questions.map((a) => a.id))];
    const { rows: known } = await sql`
      SELECT count(*)::int AS n FROM questions WHERE id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    `;
    if (known[0].n !== ids.length) return res.status(422).json({ error: 'unknown question' });

    const verified = Number(run.age_ms) + CLOCK_SLACK_MS >= s.durationMs && s.durationMs >= MIN_RUN_MS;
    const isTest = run.is_test || s.test === true;
    const score = s.questions.reduce((sum, a) => sum + a.points, 0);
    const { test, ...data } = s;

    await sql`
      INSERT INTO sessions (id, device_id, is_test, verified, score, data)
      VALUES (${s.id}, ${s.deviceId}, ${isTest}, ${verified}, ${score}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      UPDATE runs SET status = 'finished', ended_at = now(), last_position = ${s.questions.length}
      WHERE id = ${s.id}
    `;
    return res.status(200).json({ ok: true, verified });
  } catch (err) {
    return serverError(res, err);
  }
}
