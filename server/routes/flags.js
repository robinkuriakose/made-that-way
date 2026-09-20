// Public: a player flags a problem with a question.
// POST { questionId, reason, details, chosenIndex, wasCorrect, runId, deviceId, questionVersion, test }
// runId is the run the question was in, or "daily-YYYY-MM-DD" for the daily
// question. One flag per device, question and run; sending again updates it.
//
// Against spam: the run must be registered to this device (or the daily
// question answered by it), the question must exist, a run can carry at
// most MAX_PER_RUN flags, and each network is rate limited.
import { sql } from '../db.js';
import { ensureSchema } from '../schema.js';
import { body, isId, isText, methodNotAllowed, serverError } from '../http.js';
import { hit, tooMany } from '../limits.js';
import { FLAG_REASONS, FLAG_DETAILS_MAX } from '../../src/lib/flags.js';

const MAX_PER_RUN = 10;
const DAILY_RUN = /^daily-(\d{4}-\d{2}-\d{2})$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const b = body(req);
    const details = typeof b.details === 'string' ? b.details.trim().slice(0, FLAG_DETAILS_MAX) : '';
    const reason = FLAG_REASONS.find((r) => r.id === b.reason);
    const dailyDay = typeof b.runId === 'string' ? DAILY_RUN.exec(b.runId)?.[1] : null;
    const valid =
      reason &&
      isText(b.questionId, 64) &&
      (isId(b.runId) || dailyDay) &&
      isId(b.deviceId) &&
      (!reason.needsDetails || details.length > 0) &&
      (b.chosenIndex == null || (Number.isInteger(b.chosenIndex) && b.chosenIndex >= 0 && b.chosenIndex <= 3)) &&
      (b.wasCorrect == null || typeof b.wasCorrect === 'boolean') &&
      (b.questionVersion == null || isText(b.questionVersion, 40));
    if (!valid) return res.status(400).json({ error: 'invalid flag' });

    await ensureSchema();
    if (!(await hit(req, 'flag'))) return tooMany(res, 'Too many flags from this network. Try again later.');

    let isTest = b.test === true;
    if (dailyDay) {
      const { rows } = await sql`
        SELECT is_test FROM daily_answers WHERE device_id = ${b.deviceId} AND day = ${dailyDay}::date AND question_id = ${b.questionId} LIMIT 1
      `;
      if (!rows.length) return res.status(409).json({ error: 'answer the question first' });
      isTest = isTest || rows[0].is_test;
    } else {
      const { rows } = await sql`SELECT device_id, is_test FROM runs WHERE id = ${b.runId}`;
      if (!rows.length || rows[0].device_id !== b.deviceId) return res.status(409).json({ error: 'unknown run' });
      isTest = isTest || rows[0].is_test;
    }

    const { rows: question } = await sql`SELECT 1 FROM questions WHERE id = ${b.questionId}`;
    if (!question.length) return res.status(404).json({ error: 'no such question' });

    const { rows: count } = await sql`
      SELECT count(*)::int AS n FROM flags WHERE run_id = ${b.runId} AND device_id = ${b.deviceId} AND question_id <> ${b.questionId}
    `;
    if (count[0].n >= MAX_PER_RUN) return res.status(429).json({ error: 'That run has as many flags as it can take.' });

    const id = `${b.deviceId}:${b.runId}:${b.questionId}`.slice(0, 200);
    await sql`
      INSERT INTO flags (id, question_id, reason, details, chosen_index, was_correct, run_id, device_id, question_version, is_test)
      VALUES (${id}, ${b.questionId}, ${reason.id}, ${details || null}, ${b.chosenIndex ?? null}, ${b.wasCorrect ?? null},
              ${b.runId}, ${b.deviceId}, ${b.questionVersion ?? null}, ${isTest})
      ON CONFLICT (device_id, question_id, run_id) DO UPDATE SET
        reason = EXCLUDED.reason,
        details = EXCLUDED.details,
        status = 'open',
        resolved_at = NULL,
        created_at = now()
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    return serverError(res, err);
  }
}
