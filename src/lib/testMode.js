// Test mode: play the quiz from the builder without touching real numbers.
//
// The builder opens the quiz at /?test=1. That only switches test mode on
// when this browser is signed in to the builder, so a player can't stumble
// into it. In test mode everything is kept apart: a separate device id, run,
// name and seen list on this device, and every run, flag, event and daily
// answer is saved marked as a test, which analytics show separately and the
// leaderboard shows for two minutes only.
import { readToken } from '../builder/api.js';

const FLAG_KEY = 'madeThatWay.testMode';

export function initTestMode() {
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('test');
    if (param === null) return;
    if (param === '1' && readToken()) window.sessionStorage.setItem(FLAG_KEY, '1');
    if (param === '0') window.sessionStorage.removeItem(FLAG_KEY);
    url.searchParams.delete('test');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // No storage: test mode just stays off.
  }
}

export function isTestMode() {
  try {
    return window.sessionStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function exitTestMode() {
  try {
    window.sessionStorage.removeItem(FLAG_KEY);
  } catch {
    // Nothing to clear.
  }
}

// Every piece of player state on this device goes through this, so test
// mode can never mix with the real thing.
export const storageKey = (base) => (isTestMode() ? `${base}.test` : base);
