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

let flushing = null;

export function flush() {
  flushing ??= (async () => {
    try {
      let items = read();
      while (items.length) {
        const [item] = items;
        let res;
        try {
          res = await fetch(item.url, {
            method: item.method ?? 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.body),
          });
        } catch {
          return; // Offline: try again later.
        }
        if (res.status >= 500 || res.status === 429 || res.status === 408) return;
        items = read().filter((i) => i.id !== item.id);
        write(items);
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

let counter = 0;

// Queues a request and starts sending. Resolves once the queue has been
// tried, whether or not this item made it.
export function send(url, body) {
  counter += 1;
  write([...read(), { id: `${Date.now()}-${counter}`, url, body }]);
  return flush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flush());
}
