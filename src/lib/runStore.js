// In-progress run state, so a reload does not throw away a half finished run.
// Test mode keeps its own, so testing never disturbs a real run.
import { storageKey } from './testMode.js';

const RUN_KEY = 'madeThatWay.run.v1';

export function loadRun() {
  try {
    const raw = window.localStorage.getItem(storageKey(RUN_KEY));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRun(run) {
  try {
    if (run) window.localStorage.setItem(storageKey(RUN_KEY), JSON.stringify(run));
    else window.localStorage.removeItem(storageKey(RUN_KEY));
  } catch {
    // Ignore. The run still works in memory.
  }
}
