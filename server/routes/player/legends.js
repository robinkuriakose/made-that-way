// Public: the Legends wall, for players who finished every level there is.
//
// GET   ?deviceId&limit               -> { legends, lastLevel }
// POST  { deviceId, runId, name, signature, test } -> put a finished run up
//
// A run goes up only if it checks out like a leaderboard entry (server/runs.js)
// and cleared the last level in src/data/level-plan.json. The signature is
// the player's drawing, as SVG path data. Test entries (test mode, or a name
// with a word starting "test") show for two minutes, like on the board. The
// builder can hide any entry.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { sql } from '../../db.js';
import { ensureSchema, isoTime } from '../../schema.js';
import { body, isId, methodNotAllowed, serverError } from '../../http.js';
import { hit, tooMany } from '../../limits.js';
import { checkedRun } from '../../runs.js';
import { replay } from '../../../src/lib/scoring.js';
import { cleanName, isTestName, nameProblem } from '../../../src/lib/names.js';

const require = createRequire(import.meta.url);
const plan = require('../../../src/data/level-plan.json');

const DEFAULT_LIMIT = 24;
const TEST_VISIBLE = '2 minutes';
// Moves and lines only, with plain numbers: a drawing, never markup.
const SIGNATURE = /^[MLQ0-9., -]*$/;
const MAX_SIGNATURE = 40000;

const publicId = (runId) => createHash('sha256').update(runId).digest('hex').slice(0, 12);

const entry = (r, deviceId) => ({
  id: publicId(r.run_id),
  name: r.name,
  score: r.score,
  level: r.level,
  durationMs: Number(r.duration_ms),
  signature: r.signature,
  createdAt: isoTime(r.created_at),
  isMe: Boolean(deviceId) && r.device_id === deviceId,
  isTest: Boolean(r.is_test),
});

async function list(req, res) {
  const deviceId = isId(req.query?.deviceId) ? req.query.deviceId : null;
  const limit = Math.min(60, Math.max(1, Number.parseInt(req.query?.limit, 10) || DEFAULT_LIMIT));
  const { rows } = await sql`
    SELECT * FROM legends
    WHERE NOT hidden AND (NOT is_test OR created_at > now() - ${TEST_VISIBLE}::interval)
    ORDER BY created_at DESC LIMIT ${limit}
  `;
  const { rows: count } = await sql`SELECT count(*)::int AS n FROM legends WHERE NOT hidden AND NOT is_test`;
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ legends: rows.map((r) => entry(r, deviceId)), total: count[0].n, lastLevel: plan.lastLevel });
}

async function add(req, res) {
  const b = body(req);
  if (!isId(b.deviceId) || !isId(b.runId)) return res.status(400).json({ error: 'invalid request' });
  const signature = typeof b.signature === 'string' ? b.signature.trim() : '';
  if (signature.length > MAX_SIGNATURE || !SIGNATURE.test(signature)) return res.status(400).json({ error: "That signature couldn't be read. Try again." });
  const name = cleanName(b.name);
  if (!name) return res.status(400).json({ error: 'Add your name.' });
  const problem = nameProblem(name);
  if (problem) return res.status(422).json({ error: problem });
  if (!(await hit(req, 'legend'))) return tooMany(res);

  const checked = await checkedRun(b.runId, b.deviceId);
  if (checked.error) return res.status(checked.status).json({ error: checked.error });
  const cleared = replay(checked.session.questions)?.levelsCleared ?? 0;
  if (cleared < plan.lastLevel) return res.status(422).json({ error: `The Legends wall is for runs that clear all ${plan.lastLevel} levels.` });

  const isTest = checked.run.is_test || checked.sessionIsTest || b.test === true || isTestName(name);
  await sql`
    INSERT INTO legends (run_id, device_id, name, score, level, duration_ms, signature, is_test)
    VALUES (${b.runId}, ${b.deviceId}, ${name}, ${checked.verified.score}, ${cleared}, ${checked.verified.durationMs},
            ${signature || null}, ${isTest})
    ON CONFLICT (run_id) DO NOTHING
  `;
  return res.status(200).json({ ok: true, isTest });
}

export default async function handler(req, res) {
  try {
    await ensureSchema();
    if (req.method === 'GET') return await list(req, res);
    if (req.method === 'POST') return await add(req, res);
    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    return serverError(res, err);
  }
}
