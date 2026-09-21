import { test } from 'node:test';
import assert from 'node:assert/strict';

// A browser, as far as the outbox needs one.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {},
};
const sent = [];
let failNext = 0;
globalThis.fetch = async (url, init) => {
  if (failNext > 0) {
    failNext -= 1;
    return { status: 500 };
  }
  sent.push({ url, body: JSON.parse(init.body) });
  return { status: 200 };
};

const { flush, send } = await import('./outbox.js');
const queued = () => JSON.parse(store.get('madeThatWay.outbox.v1') ?? '[]');

test('an empty flush never blocks what is queued after it', async () => {
  // The real path that broke: answering the daily question (or signing)
  // flushes an empty queue, then a run starts.
  await flush();
  await flush();
  await send('/api/events', { type: 'run_started', runId: 'r1' });
  await send('/api/sessions', { id: 'r1' });
  assert.deepEqual(
    sent.map((s) => s.body.type ?? s.body.id),
    ['run_started', 'r1'],
  );
  assert.deepEqual(queued(), []);
});

test('a failed send stays queued, in order, and goes out on the next flush', async () => {
  sent.length = 0;
  failNext = 1;
  await send('/api/events', { type: 'run_started', runId: 'r2' });
  assert.equal(queued().length, 1, 'kept after a server error');
  await send('/api/sessions', { id: 'r2' });
  assert.deepEqual(
    sent.map((s) => s.body.type ?? s.body.id),
    ['run_started', 'r2'],
    'the start goes before the finish',
  );
  assert.deepEqual(queued(), []);
});
