// Vite plugin for `npm run dev`: serves the api/ routes locally, the same
// files Vercel runs in production, so the quiz, leaderboard and builder all
// work on your machine.
//
// With no DATABASE_URL (or POSTGRES_URL) set, it runs an in-process Postgres
// (PGlite) that keeps its data in .localdb/, and saves builder uploads to
// .localdb/uploads/. Set DATABASE_URL in .env.local to use a real database.
// BUILDER_PASSWORD comes from .env.local too.
//
// Routes load through Vite's module graph, so editing any file under api/
// or server/ takes effect on the next request, no restart needed.
// /api/builder/<route> goes to api/builder.js with ?route=<route>, the same
// rewrite vercel.json does in production.
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LOCAL_DIR = path.join(ROOT, '.localdb');
const UPLOAD_PREFIX = '/__local-uploads/';
const DEV_IMAGES_PREFIX = '/dev-images/';
const CONTENT_TYPES = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', avif: 'image/avif' };

async function startLocalDatabase() {
  const { PGlite } = await import('@electric-sql/pglite');
  await mkdir(path.join(LOCAL_DIR, 'pg'), { recursive: true });
  const db = new PGlite(path.join(LOCAL_DIR, 'pg'));
  // Same calling style as the Neon driver: sql`... ${value} ...` -> { rows }.
  return (strings, ...values) => db.query(strings.reduce((text, part, i) => `${text}$${i}${part}`), values);
}

async function saveLocalUpload(pathname, buffer) {
  const name = pathname.replace(/\.(\w+)$/, `-${Date.now().toString(36)}.$1`);
  const file = path.join(LOCAL_DIR, 'uploads', name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  return { url: `${UPLOAD_PREFIX}${name}` };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Gives Node's plain req/res the helpers Vercel adds (req.query, req.body,
// res.status, res.json).
function vercelStyle(req, res, url, raw, extraQuery) {
  req.query = { ...Object.fromEntries(url.searchParams), ...extraQuery };
  const type = req.headers['content-type'] ?? '';
  if (raw.length === 0) req.body = undefined;
  else if (type.includes('application/json')) req.body = JSON.parse(raw.toString('utf8'));
  else if (type.startsWith('text/')) req.body = raw.toString('utf8');
  else req.body = raw;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (value) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
    return res;
  };
  res.send = (value) => {
    res.end(value);
    return res;
  };
}

// Serves a file from a folder, refusing anything that climbs out of it.
async function serveFrom(dir, name, res) {
  const file = path.join(dir, name);
  if (!file.startsWith(dir)) return false;
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', CONTENT_TYPES[path.extname(file).slice(1)] ?? 'application/octet-stream');
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

// Which api/ file handles a path, mirroring Vercel's file routing plus the
// builder rewrite in vercel.json.
function resolveRoute(route) {
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/i.test(route)) return null;
  const direct = path.join(ROOT, 'api', `${route}.js`);
  if (existsSync(direct)) return { file: direct, query: {} };
  const [first, ...rest] = route.split('/');
  if (first === 'builder' && rest.length === 1) return { file: path.join(ROOT, 'api', 'builder.js'), query: { route: rest[0] } };
  return null;
}

export default function localApi() {
  return {
    name: 'made-that-way-local-api',
    apply: 'serve',
    config: () => ({ server: { watch: { ignored: ['**/.localdb/**', '**/.tmp/**', '**/images/**', '**/dev-images/**'] } } }),
    async configureServer(server) {
      const env = loadEnv(server.config.mode, ROOT, '');
      for (const [key, value] of Object.entries(env)) if (process.env[key] === undefined) process.env[key] = value;

      const hasRealDatabase = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING);
      if (!hasRealDatabase) globalThis.__MTW_LOCAL_SQL__ ??= await startLocalDatabase();
      globalThis.__MTW_LOCAL_BLOB__ ??= saveLocalUpload;

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');

        if (url.pathname.startsWith(UPLOAD_PREFIX)) {
          const name = decodeURIComponent(url.pathname.slice(UPLOAD_PREFIX.length));
          return (await serveFrom(path.join(LOCAL_DIR, 'uploads'), name, res)) ? undefined : next();
        }
        // Placeholder images: shown locally, never deployed (see scripts/optimize-images.js).
        if (url.pathname.startsWith(DEV_IMAGES_PREFIX)) {
          const name = decodeURIComponent(url.pathname.slice(DEV_IMAGES_PREFIX.length));
          return (await serveFrom(path.join(ROOT, 'dev-images'), name, res)) ? undefined : next();
        }

        if (!url.pathname.startsWith('/api/')) return next();
        const target = resolveRoute(url.pathname.slice('/api/'.length).replace(/\/+$/, ''));
        if (!target) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.end(JSON.stringify({ error: 'no such route' }));
        }

        try {
          vercelStyle(req, res, url, await readBody(req), target.query);
        } catch {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'invalid JSON' }));
        }

        try {
          const mod = await server.ssrLoadModule(target.file);
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(`[api] ${url.pathname}: ${err.stack ?? err}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'server error' }));
          }
        }
        return undefined;
      });
    },
  };
}
