// Rate limits, kept in the database so they hold across every server
// instance. Each limit counts requests from one network (a hashed address)
// in a fixed window. Nothing here needs an account or a CAPTCHA; it just
// makes scripting the public routes slow and cheap to absorb.
import { sql } from './db.js';
import { clientKey } from './http.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Per network. Generous for a person, tight for a script.
export const LIMITS = {
  events: { limit: 240, windowMs: HOUR },
  runStart: { limit: 40, windowMs: HOUR },
  session: { limit: 40, windowMs: HOUR },
  flag: { limit: 20, windowMs: HOUR },
  sign: { limit: 20, windowMs: HOUR },
  rename: { limit: 10, windowMs: HOUR },
  daily: { limit: 60, windowMs: HOUR },
  loginFailure: { limit: 5, windowMs: 15 * MINUTE },
};

const windowStart = (windowMs, now) => new Date(Math.floor(now / windowMs) * windowMs).toISOString();

// Counts this request and says whether it's allowed. Old windows are
// cleared now and then, so the table stays small.
export async function hit(req, name, now = Date.now()) {
  const { limit, windowMs } = LIMITS[name];
  const key = `${name}:${clientKey(req)}`;
  const start = windowStart(windowMs, now);
  const { rows } = await sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${start}::timestamptz, 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start = EXCLUDED.window_start THEN rate_limits.count + 1 ELSE 1 END,
      window_start = EXCLUDED.window_start
    RETURNING count
  `;
  if (Math.random() < 0.01) await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
  return rows[0].count <= limit;
}

// Reads a count without adding to it (for sign-in, where only failures count).
export async function isBlocked(req, name, now = Date.now()) {
  const { limit, windowMs } = LIMITS[name];
  const key = `${name}:${clientKey(req)}`;
  const start = windowStart(windowMs, now);
  const { rows } = await sql`SELECT count FROM rate_limits WHERE key = ${key} AND window_start = ${start}::timestamptz`;
  return (rows[0]?.count ?? 0) >= limit;
}

export function tooMany(res, message = 'Too many tries from this network. Try again later.') {
  return res.status(429).json({ error: message });
}
