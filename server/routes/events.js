// Public: light activity events, for the overview analytics.
// POST { type, deviceId, runId?, test?, data? }  or  { events: [ ... ] }
//
// run_started also registers the run. Saving a session, flagging a question
// and signing the leaderboard all require a registered run, and its server
// side start time is what the finished run's timing is checked against.
import { sql } from '../db.js';
import { ensureSchema } from '../schema.js';
import { body, isId, methodNotAllowed, serverError, sizeOf } from '../http.js';
import { hit, tooMany } from '../limits.js';

const MAX_PER_REQUEST = 20;
const DEVICES = ['phone', 'tablet', 'desktop'];

// Only these keys are kept from an event's data, each checked.
function cleanData(data) {
  const out = {};
  if (!data || typeof data !== 'object') return out;
  if (DEVICES.includes(data.device)) out.device = data.device;
  if (Number.isInteger(data.position) && data.position >= 1 && data.position <= 50) out.position = data.position;
  if (typeof data.questionId === 'string' && data.questionId.length <= 64) out.questionId = data.questionId;
  if (Array.isArray(data.themes) && data.themes.length <= 30) out.themes = data.themes.filter((t) => typeof t === 'string' && t.length <= 40);
  return out;
}

async function record(e) {
  const test = e.test === true;
  const data = cleanData(e.data);
  const runId = isId(e.runId) ? e.runId : null;

  if (e.type === 'run_started') {
    if (!runId) return;
    await sql`
      INSERT INTO runs (id, device_id, is_test, themes)
      VALUES (${runId}, ${e.deviceId}, ${test}, ${data.themes ? JSON.stringify(data.themes) : null}::jsonb)
      ON CONFLICT (id) DO NOTHING
    `;
  } else if (e.type === 'run_left' || e.type === 'run_restarted') {
    if (!runId) return;
    const status = e.type === 'run_left' ? 'left' : 'restarted';
    await sql`
      UPDATE runs SET status = ${status}, last_position = ${data.position ?? 1}, ended_at = now()
      WHERE id = ${runId} AND device_id = ${e.deviceId} AND status IN ('started', 'left')
    `;
  } else if (e.type === 'run_resumed') {
    if (!runId) return;
    await sql`UPDATE runs SET status = 'started', ended_at = NULL WHERE id = ${runId} AND device_id = ${e.deviceId} AND status IN ('left', 'restarted')`;
  }

  await sql`
    INSERT INTO events (type, device_id, run_id, is_test, data)
    VALUES (${e.type}, ${e.deviceId}, ${runId}, ${test}, ${JSON.stringify(data)}::jsonb)
  `;
}

const TYPES = new Set(['page_opened', 'run_started', 'run_left', 'run_restarted', 'run_resumed', 'daily_opened']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const b = body(req);
    if (sizeOf(b) > 8000) return res.status(413).json({ error: 'too large' });
    const list = (Array.isArray(b.events) ? b.events : [b]).slice(0, MAX_PER_REQUEST);
    const valid = list.filter((e) => e && TYPES.has(e.type) && isId(e.deviceId));
    if (!valid.length) return res.status(400).json({ error: 'invalid event' });

    await ensureSchema();
    if (!(await hit(req, 'events'))) return tooMany(res);
    if (valid.some((e) => e.type === 'run_started') && !(await hit(req, 'runStart'))) return tooMany(res);

    for (const e of valid) await record(e);
    return res.status(200).json({ ok: true, recorded: valid.length });
  } catch (err) {
    return serverError(res, err);
  }
}
