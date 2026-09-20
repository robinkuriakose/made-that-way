// Builder: finished runs, for export (JSON or CSV in the Analytics tab).
// GET ?test=1&limit=  -> [ session, ... ] newest first. The numbers on the
// dashboard are worked out in the database (see analytics.js), so this is
// only for taking the raw data elsewhere.
import { sql } from '../../db.js';
import { ensureSchema, asObject } from '../../schema.js';
import { requireBuilder } from '../../auth.js';
import { methodNotAllowed, serverError } from '../../http.js';

const MAX_EXPORT = 10000;

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    await ensureSchema();
    const isTest = req.query?.test === '1';
    const limit = Math.min(MAX_EXPORT, Math.max(1, Number.parseInt(req.query?.limit, 10) || MAX_EXPORT));
    const { rows } = await sql`
      SELECT data, verified FROM sessions WHERE is_test = ${isTest} ORDER BY created_at DESC LIMIT ${limit}
    `;
    return res.status(200).json(rows.map((r) => ({ ...asObject(r.data), verified: r.verified })));
  } catch (err) {
    return serverError(res, err);
  }
}
