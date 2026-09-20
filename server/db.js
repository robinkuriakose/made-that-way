// Shared database connection for the API routes.
//
// In production this is Neon (Vercel's Postgres integration). Vercel sets one
// of these variables depending on how the database was connected; which one
// has changed over the product's history, so this tries them in order. If
// your Vercel dashboard shows a different name than all three, add it below.
//
// Locally, `npm run dev` runs these same routes against an in-process
// Postgres (PGlite, see tools/local-api.js), which it hands over through
// globalThis before any route is loaded.
import { neon } from '@neondatabase/serverless';

const local = globalThis.__MTW_LOCAL_SQL__;
const CONNECTION_STRING =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

if (!local && !CONNECTION_STRING) {
  throw new Error(
    'No database connection string found (checked DATABASE_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING). ' +
      "Connect a Postgres database to this project from the Vercel dashboard's Storage tab, then redeploy.",
  );
}

// fullResults matches node-postgres's shape ({ rows, ... }), which the rest
// of the API code is written against. The local stand-in returns the same.
export const sql = local ?? neon(CONNECTION_STRING, { fullResults: true });
