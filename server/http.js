// Small helpers shared by every route.
import { createHash } from 'node:crypto';

// Vercel parses JSON bodies for us; the local dev server does the same. This
// only covers the case where a body arrives as a string anyway.
export function body(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body && typeof req.body === 'object' ? req.body : {};
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ error: 'method not allowed' });
}

export function serverError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'server error' });
}

export const isText = (v, max = Infinity) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

// Run ids and device ids are random strings made by the browser.
export const isId = (v) => typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v);

// Days are sent as the player's own calendar date, YYYY-MM-DD.
export const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// Where a request came from, as a one-way hash. Only used to rate limit, so
// no address is ever stored.
export function clientKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim();
  const ip = forwarded || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
  return createHash('sha256').update(`mtw:${ip}`).digest('base64url').slice(0, 22);
}

// How big a JSON body is, so oversized posts can be refused before any work.
export const sizeOf = (value) => {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Infinity;
  }
};
