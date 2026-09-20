// The question of the day, as the home screen uses it. The server picks the
// question and checks the answer (server/routes/daily.js); this keeps the
// last state per day on the device, so the card appears instantly on the
// next visit and still shows today's result offline.
import { flush } from './outbox.js';
import { getDeviceId } from './device.js';
import { isTestMode, storageKey } from './testMode.js';
import { localDay } from './daily.js';

const CACHE_KEY = 'madeThatWay.daily.v1';

export function cachedDaily(day = localDay()) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey(CACHE_KEY)));
    return saved?.day === day ? saved : null;
  } catch {
    return null;
  }
}

function remember(state) {
  try {
    window.localStorage.setItem(storageKey(CACHE_KEY), JSON.stringify(state));
  } catch {
    // Storage blocked: the card just loads from the server each time.
  }
}

export async function fetchDaily(day = localDay()) {
  const params = new URLSearchParams({ day, deviceId: getDeviceId() });
  if (isTestMode()) params.set('test', '1');
  const res = await fetch(`/api/daily?${params}`);
  if (!res.ok) throw new Error('daily unavailable');
  const state = await res.json();
  remember(state);
  return state;
}

// chosenIndex is in the question's original option order.
export async function answerDaily({ day, chosenIndex, timeMs }) {
  await flush();
  const res = await fetch('/api/daily', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, deviceId: getDeviceId(), chosenIndex, timeMs, test: isTestMode() }),
  });
  if (!res.ok) throw new Error('answer not saved');
  const state = await res.json();
  remember(state);
  return state;
}
