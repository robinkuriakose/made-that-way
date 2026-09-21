// Shared database connection for the API routes.
//
// In production this is Neon, connected from the Vercel dashboard (Storage).
// Vercel names the connection variable DATABASE_URL or POSTGRES_URL, or puts
// a prefix in front if one was chosen when connecting (STORAGE_DATABASE_URL,
// for example), so any of those is found.
//
// The connection is made on first use, not when a route loads: if nothing is
// connected yet, requests get a plain 503 saying so (see http.js), instead of
// every function crashing before it can answer.
//
// Locally, `npm run dev` runs these same routes against an in-process
// Postgres (PGlite, see tools/local-api.js), handed over through globalThis.
import { neon } from '@neondatabase/serverless';

// A setting the site needs hasn't been added yet. http.js turns this into a
// 503 with the message, since it's about setup, not a bug.
export class NotConfigured extends Error {
  constructor(message) {
    super(message);
    this.code = 'NOT_CONFIGURED';
  }
}

export function connectionString(env = process.env) {
  for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING']) if (env[key]) return env[key];
  const prefixed = Object.keys(env).find((key) => /(DATABASE_URL|POSTGRES_URL)$/.test(key) && /^postgres(ql)?:\/\//.test(env[key] ?? ''));
  return prefixed ? env[prefixed] : null;
}

let client = null;

function getClient() {
  if (client) return client;
  const local = globalThis.__MTW_LOCAL_SQL__;
  if (local) return (client = local);
  const url = connectionString();
  if (!url) {
    throw new NotConfigured('The database is not connected yet. Connect Neon in the Vercel dashboard (Storage), then redeploy.');
  }
  // fullResults matches node-postgres's shape ({ rows, ... }), which the rest
  // of the API code is written against. The local stand-in returns the same.
  return (client = neon(url, { fullResults: true }));
}

// Used as a tagged template: sql`SELECT ... ${value}` -> { rows }.
export const sql = (strings, ...values) => getClient()(strings, ...values);
