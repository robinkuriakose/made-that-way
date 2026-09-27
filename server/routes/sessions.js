// Public: save one finished run. POST { ...session, test? }
//
// Checked before anything is stored: size, shape, that the run was
// registered when it started (by this device), and that every question in
// it is real. "verified" also needs the timing to fit the server's own
// clock: a run can't take longer than the time since it was registered, or
// go faster than a person could read its questions. Only verified runs can
// go on the leaderboard, and only they count towards how easy each question
// has proved (question_stats); every registered run counts in analytics.
import { sql } from '../db.js';
import { ensureSchema } from '../schema.js';
import { body, isId, isText, methodNotAllowed, serverError, sizeOf } from '../http.js';
import { hit, tooMany } from '../limits.js';
import { MAX_ANSWERS, MAX_POINTS } from '../../src/lib/scoring.js';
import { sessionQuestionIds } from '../../src/lib/verifySession.js';

const MAX_BYTES = 160 * 1024;
const MIN_RUN_MS = 10 * 1000;
// Nobody reads a question, looks at its picture and answers in under two seconds.
const MIN_MS_PER_ANSWER = 2000;
const CLOCK_SLACK_MS = 15 * 1000;

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const optionIndex = (v) => Number.isInteger(v) && v >= 0 && v <= 3;

function answerOk(a) {
  return (
    a &&
    isText(a.id, 64) &&
    isText(a.topic, 40) &&
    Number.isInteger(a.position) &&
    a.position >= 1 &&
    a.position <= MAX_ANSWERS &&
    (a.chosenIndex === null || optionIndex(a.chosenIndex)) &&
    typeof a.correct === 'boolean' &&
    (a.hintUsed === undefined || typeof a.hintUsed === 'boolean') &&
    (a.redeemQuestionId == null || isText(a.redeemQuestionId, 64)) &&
    (a.redeemChosenIndex == null || optionIndex(a.redeemChosenIndex)) &&
    finite(a.points) &&
    a.points >= 0 &&
    a.points <= MAX_POINTS
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
      s.questions.length <= MAX_ANSWERS &&
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

    const ids = sessionQuestionIds(s);
    const { rows: known } = await sql`
      SELECT count(*)::int AS n FROM questions WHERE id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    `;
    if (known[0].n !== ids.length) return res.status(422).json({ error: 'unknown question' });

    const fastest = Math.max(MIN_RUN_MS, s.questions.length * MIN_MS_PER_ANSWER);
    const verified = Number(run.age_ms) + CLOCK_SLACK_MS >= s.durationMs && s.durationMs >= fastest;
    const isTest = run.is_test || s.test === true;
    const score = s.questions.reduce((sum, a) => sum + a.points, 0);
    const { test, ...data } = s;

    const { rows: inserted } = await sql`
      INSERT INTO sessions (id, device_id, is_test, verified, score, data)
      VALUES (${s.id}, ${s.deviceId}, ${isTest}, ${verified}, ${score}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    await sql`
      UPDATE runs SET status = 'finished', ended_at = now(), last_position = ${s.questions.length}
      WHERE id = ${s.id}
    `;
    // Counted once per run, in one statement, redeem answers included.
    if (inserted.length && verified) {
      const answers = s.questions.flatMap((a) => [
        { id: a.id, ok: a.correct },
        ...(a.redeemUsed && a.redeemQuestionId ? [{ id: a.redeemQuestionId, ok: Boolean(a.redeemPassed) }] : []),
      ]);
      await sql`
        INSERT INTO question_stats (question_id, is_test, asked, right_count)
        SELECT a->>'id', ${isTest}, count(*)::int, count(*) FILTER (WHERE (a->>'ok')::boolean)::int
        FROM jsonb_array_elements(${JSON.stringify(answers)}::jsonb) AS a
        GROUP BY 1
        ON CONFLICT (question_id, is_test) DO UPDATE SET
          asked = question_stats.asked + EXCLUDED.asked,
          right_count = question_stats.right_count + EXCLUDED.right_count,
          updated_at = now()
      `;
    }
    return res.status(200).json({ ok: true, verified });
  } catch (err) {
    return serverError(res, err);
  }
}
