// Talking to the builder API. The sign-in token lives in this browser's
// localStorage until it expires (7 days) or you lock the builder.
const TOKEN_KEY = 'madeThatWay.builderToken.v1';

export class AuthError extends Error {}

export function readToken() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TOKEN_KEY));
    if (saved?.token && saved.expiresAt > Date.now()) return saved.token;
  } catch {
    // Nothing usable saved.
  }
  return null;
}

export function saveToken(session) {
  try {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: you'll just be asked to sign in again next time.
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

async function parse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function login(password) {
  const res = await fetch('/api/builder/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await parse(res);
  if (!res.ok) throw new Error(data.error || "Couldn't sign in. Try again.");
  saveToken(data);
  return data.token;
}

// Throws AuthError when the token is missing or expired, so the builder can
// send you back to the sign-in screen. Other failures carry the server's
// message, and data.errors / data.warnings when a question failed its checks.
export async function call(path, { method = 'GET', body, token }) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection.");
  }
  const data = await parse(res);
  if (res.status === 401) throw new AuthError(data.error || 'Sign in again.');
  if (!res.ok) {
    const err = new Error(data.error || data.errors?.[0] || `Something went wrong (${res.status}).`);
    err.data = data;
    throw err;
  }
  return data;
}
