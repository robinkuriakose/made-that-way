// Things the quiz sends that must not be lost if the network drops: run
// starts, finished runs and activity events. Each is written to this
// device's outbox first, then sent in order. Anything that couldn't be sent
// stays and goes out on the next visit or when the connection comes back.
//
// The server refuses bad data with a 4xx; that's dropped rather than retried
// forever. Only network failures, server errors and rate limits are kept.
import { storageKey } from './testMode.js';

const BASE_KEY = 'madeThatWay.outbox.v1';
const MAX_ITEMS = 60;

function read() {
  try {
    const items = JSON.parse(window.localStorage.getItem(storageKey(BASE_KEY)));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    window.localStorage.setItem(storageKey(BASE_KEY), JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    // Storage full or blocked: the item is sent now or not at all.
  }
}

// Sends queued items in order until the queue is empty (true) or one can't
// be sent right now (false).
async function drain() {
  for (let items = read(); items.length; items = read()) {
    const [item] = items;
    let res;
    try {
      res = await fetch(item.url, {
        method: item.method ?? 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });
    } catch {
      return false; // Offline: try again later.
    }
    if (res.status >= 500 || res.status === 429 || res.status === 408) return false;
    write(read().filter((i) => i.id !== item.id));
  }
  return true;
}

let flushing = null;

// One drain at a time; callers during a drain share it. The reset happens in
// .finally, which always runs after `flushing` is assigned. (Resetting inside
// the drain itself once let an empty queue finish before the assignment,
// leaving `flushing` set for good, so nothing queued afterwards was ever sent.)
export function flush() {
  if (!flushing) {
    flushing = drain().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

let counter = 0;

// Queues a request and sends it. If it was queued just as another drain was
// finishing, that drain may have missed it, so it gets a second go.
export async function send(url, body) {
  counter += 1;
  const id = `${Date.now()}-${counter}`;
  write([...read(), { id, url, body }]);
  const sent = await flush();
  if (sent && read().some((i) => i.id === id)) await flush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flush());
}
