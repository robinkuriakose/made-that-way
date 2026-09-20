// A random id for this browser, so the leaderboard can remember a personal
// best without accounts. It identifies an installation, not a person:
// clearing site data or switching browsers starts a fresh one. The server
// never shows it to anyone else; the board uses a separate public id.
// Test mode gets its own id, so test play never mixes with the real player.
import { makeId } from './id.js';
import { storageKey } from './testMode.js';

const DEVICE_KEY = 'madeThatWay.deviceId.v1';
let fallback = null;

export function getDeviceId() {
  try {
    const key = storageKey(DEVICE_KEY);
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = makeId();
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    // Storage blocked: one id for this visit, so this visit's actions still line up.
    fallback ??= makeId();
    return fallback;
  }
}
