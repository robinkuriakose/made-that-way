import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectionString } from './db.js';

test('the database is found under any name Vercel gives it', () => {
  assert.equal(connectionString({ DATABASE_URL: 'postgres://a' }), 'postgres://a');
  assert.equal(connectionString({ POSTGRES_URL: 'postgres://b' }), 'postgres://b');
  assert.equal(connectionString({ STORAGE_DATABASE_URL: 'postgresql://c' }), 'postgresql://c', 'a prefix chosen when connecting');
  assert.equal(connectionString({ MY_POSTGRES_URL: 'not a url' }), null, 'only real connection strings');
  assert.equal(connectionString({}), null);
});

test('with no database connected, a route answers 503 with a plain reason instead of crashing', async () => {
  for (const key of Object.keys(process.env)) if (/(DATABASE_URL|POSTGRES_URL)/.test(key)) delete process.env[key];
  const { default: questions } = await import('./routes/questions.js');
  let status = null;
  let body = null;
  const res = {
    setHeader() {},
    status(code) {
      status = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };
  await questions({ method: 'GET', headers: {} }, res);
  assert.equal(status, 503);
  assert.match(body.error, /not connected/);
});
