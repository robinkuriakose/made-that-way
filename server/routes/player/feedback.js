// Public: the feedback form. POST { deviceId, runId?, ratings, more, moreOther, recommend, note, test }
// The questions and the check are shared with the quiz (src/lib/feedbackForm.js).
import { sql } from '../../db.js';
import { ensureSchema } from '../../schema.js';
import { body, isId, methodNotAllowed, serverError, sizeOf } from '../../http.js';
import { hit, tooMany } from '../../limits.js';
import { cleanFeedback } from '../../../src/lib/feedbackForm.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const b = body(req);
    if (sizeOf(b) > 8000 || !isId(b.deviceId)) return res.status(400).json({ error: 'invalid request' });
    const clean = cleanFeedback(b);
    if (!clean) return res.status(400).json({ error: 'Answer at least one question.' });
    await ensureSchema();
    if (!(await hit(req, 'feedback'))) return tooMany(res);
    await sql`
      INSERT INTO feedback (device_id, run_id, answers, note, is_test)
      VALUES (${b.deviceId}, ${isId(b.runId) ? b.runId : null}, ${JSON.stringify(clean.answers)}::jsonb, ${clean.note}, ${b.test === true})
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    return serverError(res, err);
  }
}
