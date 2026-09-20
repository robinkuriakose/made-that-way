// Which questions this device has already been shown, newest last. Runs
// prefer questions not seen yet, so returning players meet new ones first
// however large the bank grows.
import { storageKey } from './testMode.js';

const BASE_KEY = 'madeThatWay.seen.v1';
const MAX_REMEMBERED = 500;

export function seenIds() {
  try {
    const list = JSON.parse(window.localStorage.getItem(storageKey(BASE_KEY)));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function markSeen(ids) {
  try {
    const next = [...seenIds().filter((id) => !ids.includes(id)), ...ids].slice(-MAX_REMEMBERED);
    window.localStorage.setItem(storageKey(BASE_KEY), JSON.stringify(next));
  } catch {
    // Storage blocked: runs just can't prefer unseen questions.
  }
}
