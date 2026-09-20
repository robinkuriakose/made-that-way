// The leaderboard, as the quiz uses it. The board lives on the server
// (server/routes/leaderboard.js), which never trusts a score from here: it
// recomputes it from the run's saved session.
//
// A device has one name. It's set the first time a run is signed, and can be
// changed from the home screen up to NAME_CHANGE_LIMIT times. The name is
// also kept on the device, so it shows before the board has loaded.
import { flush } from './outbox.js';
import { isTestMode, storageKey } from './testMode.js';
import { getDeviceId } from './device.js';
import { cleanName } from './names.js';

export { cleanName, NAME_MAX_LENGTH, NAME_CHANGE_LIMIT } from './names.js';
export { rankEntries, isBetterRun } from './ranking.js';

const NAME_KEY = 'madeThatWay.playerName.v1';
const EMPTY = { allTime: { entries: [], me: null }, week: { entries: [], me: null }, player: null };

async function parse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// Both boards (this week, all time) and this device's name, in one call.
export async function readBoards(limit = 10) {
  try {
    const res = await fetch(`/api/leaderboard?deviceId=${encodeURIComponent(getDeviceId())}&limit=${limit}`);
    if (!res.ok) return EMPTY;
    const data = await res.json();
    if (data.player?.name) writeLocalName(data.player.name);
    return { ...EMPTY, ...data };
  } catch {
    return EMPTY;
  }
}

// Signs a finished run. Waits for the run to finish saving first (it may
// still be in the outbox), then retries once if the server hasn't seen it yet.
// Resolves to { ok, isNewBest, isTest, player } or { ok: false, error }.
export async function signRun({ runId, name }) {
  const clean = cleanName(name);
  const attempt = () =>
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), runId, name: clean || undefined, test: isTestMode() }),
    });
  try {
    await flush();
    let res = await attempt();
    if (res.status === 404) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await flush();
      res = await attempt();
    }
    const data = await parse(res);
    if (!res.ok) return { ok: false, error: data.error || "Couldn't add your score. Try again." };
    if (clean && !data.isTest) writeLocalName(data.player?.name ?? clean);
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Couldn't reach the board. Check your connection and try again." };
  }
}

// Changes this device's name everywhere it shows. Resolves to
// { ok, player } or { ok: false, error, player }.
export async function renamePlayer(name) {
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), name: cleanName(name) }),
    });
    const data = await parse(res);
    if (!res.ok) return { ok: false, error: data.error || "Couldn't change your name. Try again.", player: data.player ?? null };
    if (data.player?.name) writeLocalName(data.player.name);
    return { ok: true, player: data.player };
  } catch {
    return { ok: false, error: "Couldn't reach the board. Check your connection and try again.", player: null };
  }
}

export function writeLocalName(name) {
  try {
    window.localStorage.setItem(storageKey(NAME_KEY), name);
  } catch {
    // Ignore. The name box just starts empty next time.
  }
}

export function readLocalName() {
  try {
    return window.localStorage.getItem(storageKey(NAME_KEY)) ?? '';
  } catch {
    return '';
  }
}
