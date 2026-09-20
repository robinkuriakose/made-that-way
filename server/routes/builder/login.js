// Builder sign-in. POST { password } -> { token, expiresAt }.
//
// Guessing is slowed two ways: every wrong try waits FAILURE_DELAY_MS, and a
// network gets LIMITS.loginFailure wrong tries (5 per 15 minutes) before it's
// refused outright. The password itself never leaves the server.
import { checkPassword, issueToken } from '../../auth.js';
import { ensureSchema } from '../../schema.js';
import { body, methodNotAllowed, serverError } from '../../http.js';
import { hit, isBlocked, tooMany } from '../../limits.js';

const FAILURE_DELAY_MS = 700;

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    await ensureSchema();
    if (await isBlocked(req, 'loginFailure')) {
      return tooMany(res, 'Too many wrong passwords from this network. Wait 15 minutes and try again.');
    }
    if (!checkPassword(body(req).password)) {
      await hit(req, 'loginFailure');
      await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
      return res.status(401).json({ error: "That password didn't work." });
    }
    return res.status(200).json(issueToken());
  } catch (err) {
    return serverError(res, err);
  }
}
