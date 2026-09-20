// Builder sign-in. One shared password, kept in the BUILDER_PASSWORD
// environment variable (never in the code). Signing in returns a token that
// expires after TOKEN_TTL_MS; builder routes check it on every request.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function password() {
  const value = process.env.BUILDER_PASSWORD;
  if (!value) throw new Error('BUILDER_PASSWORD is not set. Add it in the Vercel dashboard under Settings, Environment Variables.');
  return value;
}

const digest = (text) => createHash('sha256').update(String(text)).digest();
const sign = (payload) => createHmac('sha256', `mtw-builder:${password()}`).update(payload).digest('base64url');

export function checkPassword(attempt) {
  return timingSafeEqual(digest(attempt ?? ''), digest(password()));
}

export function issueToken(now = Date.now()) {
  const expiresAt = now + TOKEN_TTL_MS;
  const payload = `v1.${expiresAt}`;
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

export function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`));
  const given = Buffer.from(parts[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Sends a 401 and returns false unless the request carries a valid token.
export function requireBuilder(req, res) {
  const header = req.headers?.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (verifyToken(token)) return true;
  res.status(401).json({ error: 'Sign in to the builder first.' });
  return false;
}
