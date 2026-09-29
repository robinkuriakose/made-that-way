// The player routes, as the quiz uses them (server/routes/player): this
// device's profile, the Legends wall, the feedback form and suggested
// questions. Every call resolves, never throws: { ok, ...data } or
// { ok: false, error } with a sentence a player can read.
import { flush } from './outbox.js';
import { getDeviceId } from './device.js';
import { isTestMode } from './testMode.js';
import { prepareImage } from './imagePrep.js';

const OFFLINE = "Couldn't reach the server. Check your connection and try again.";

async function call(path, { method = 'GET', body = null, query = {} } = {}) {
  try {
    const params = new URLSearchParams({ deviceId: getDeviceId(), ...(isTestMode() ? { test: '1' } : {}), ...query });
    const url = method === 'GET' ? `/api/player/${path}?${params}` : `/api/player/${path}`;
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify({ deviceId: getDeviceId(), test: isTestMode(), ...body }) : undefined,
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      // No body: fall through to a plain error.
    }
    if (!res.ok) return { ok: false, error: data.error || "Something went wrong. Try again." };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: OFFLINE };
  }
}

export const fetchProfile = () => call('profile');
export const fetchLegends = (limit = 24) => call('legends', { query: { limit: String(limit) } });
export const sendFeedback = (answers, runId = null) => call('feedback', { method: 'POST', body: { ...answers, runId } });
export const sendSuggestion = ({ name, kind, data }) => call('suggest', { method: 'POST', body: { name, kind, data } });

// Puts a finished run on the Legends wall. Waits for the run to finish
// saving first (it may still be in the outbox), and tries once more if the
// server hasn't seen it yet.
export async function signLegend({ runId, name, signature }) {
  await flush();
  let result = await call('legends', { method: 'POST', body: { runId, name, signature } });
  if (!result.ok && /Still saving/.test(result.error)) {
    await new Promise((r) => setTimeout(r, 1500));
    await flush();
    result = await call('legends', { method: 'POST', body: { runId, name, signature } });
  }
  return result;
}

// A picture for a suggested question: shrunk in the browser, then stored.
export async function uploadSuggestionImage(file) {
  try {
    const { full } = await prepareImage(file);
    return await call('upload', { method: 'POST', body: { filename: file.name, ...full } });
  } catch (err) {
    return { ok: false, error: err.message || OFFLINE };
  }
}
