// GET /q/<id>?from=<name> and /daily/<day>, rewritten here by vercel.json:
// the app's own page, with a link preview for that question in place of the
// site's. Chat apps read the preview; people get the app, which opens the
// question (src/lib/share.js, readArrival). Only questions already out can
// be previewed: never a daily question before its day, never one in review.
import { sql } from '../../db.js';
import { ensureSchema, asObject } from '../../schema.js';
import { isDay } from '../../http.js';
import { previewFor, withPreview } from '../../share.js';
import { cleanName, nameProblem } from '../../../src/lib/names.js';

const originOf = (req) => {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const proto = req.headers['x-forwarded-proto'] ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
};

async function findQuestion({ id, day }) {
  if (day) {
    const { rows } = await sql`
      SELECT q.data FROM daily_schedule s JOIN questions q ON q.id = s.question_id
      WHERE s.day = ${day}::date AND NOT s.is_void
    `;
    return rows[0] ? asObject(rows[0].data) : null;
  }
  const { rows } = await sql`SELECT data FROM questions WHERE id = ${id} AND status IN ('live', 'used')`;
  return rows[0] ? asObject(rows[0].data) : null;
}

export default async function handler(req, res) {
  const origin = originOf(req);
  const id = typeof req.query?.q === 'string' && /^[a-z0-9][a-z0-9-]{1,63}$/.test(req.query.q) ? req.query.q : null;
  const day = isDay(req.query?.day) ? req.query.day : null;
  const given = cleanName(req.query?.from ?? '');
  const from = given && !nameProblem(given) ? given : null;
  const path = id ? `/q/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}` : day ? `/daily/${day}` : '/';

  let page;
  try {
    const r = await fetch(`${origin}/index.html`);
    page = await r.text();
  } catch {
    // Without the app's page there's nothing to add a preview to: send people home.
    res.setHeader('Location', '/');
    return res.status(302).end();
  }

  let question = null;
  try {
    if (id || day) {
      await ensureSchema();
      question = await findQuestion({ id, day });
    }
  } catch {
    // The site's own preview will do.
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(withPreview(page, previewFor({ origin, path, question, from, daily: Boolean(day) })));
}
