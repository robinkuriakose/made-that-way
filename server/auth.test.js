import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.BUILDER_PASSWORD = 'test-password';
const { checkPassword, issueToken, verifyToken, TOKEN_TTL_MS } = await import('./auth.js');

test('only the right password is accepted', () => {
  assert.equal(checkPassword('test-password'), true);
  assert.equal(checkPassword('Test-password'), false);
  assert.equal(checkPassword(''), false);
  assert.equal(checkPassword(undefined), false);
});

test('a token works until it expires, and not after', () => {
  const now = Date.now();
  const { token } = issueToken(now);
  assert.equal(verifyToken(token, now + 1000), true);
  assert.equal(verifyToken(token, now + TOKEN_TTL_MS + 1), false);
});

test('a tampered or foreign token is refused', () => {
  const { token } = issueToken();
  const [v, exp, sig] = token.split('.');
  assert.equal(verifyToken(`${v}.${Number(exp) + 999999}.${sig}`), false);
  assert.equal(verifyToken(`${v}.${exp}.${sig.slice(0, -2)}aa`), false);
  assert.equal(verifyToken('nonsense'), false);
  assert.equal(verifyToken(null), false);
  process.env.BUILDER_PASSWORD = 'a-new-password';
  assert.equal(verifyToken(token), false, 'changing the password signs everyone out');
  process.env.BUILDER_PASSWORD = 'test-password';
});
