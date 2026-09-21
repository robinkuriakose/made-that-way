// Builder: store an uploaded image and return its public URL.
// POST { filename, contentType, data } where data is the file as base64.
// The builder shrinks and converts images before sending, so they're small.
import { put } from '@vercel/blob';
import { requireBuilder } from '../../auth.js';
import { body, isText, methodNotAllowed, serverError } from '../../http.js';

// Vercel names it BLOB_READ_WRITE_TOKEN, or puts a prefix in front if one
// was chosen when connecting the store.
function blobToken(env = process.env) {
  if (env.BLOB_READ_WRITE_TOKEN) return env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(env).find((k) => k.endsWith('READ_WRITE_TOKEN'));
  return key ? env[key] : undefined;
}

const MAX_BYTES = 3 * 1024 * 1024; // Vercel caps a request at 4.5 MB, and base64 adds a third.
const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/avif': 'avif' };

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const b = body(req);
    const ext = TYPES[b.contentType];
    if (!ext || !isText(b.data)) return res.status(400).json({ error: 'Send a JPG, PNG, WebP, AVIF or GIF image.' });
    const buffer = Buffer.from(b.data, 'base64');
    if (buffer.length === 0) return res.status(400).json({ error: 'That file is empty.' });
    if (buffer.length > MAX_BYTES) return res.status(413).json({ error: 'That image is over 3 MB. Try a smaller one.' });

    const base = String(b.filename ?? 'image').replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 60) || 'image';
    const pathname = `questions/${base}.${ext}`;

    // Locally, `npm run dev` saves uploads to .localdb instead (tools/local-api.js).
    const local = globalThis.__MTW_LOCAL_BLOB__;
    const saved = local
      ? await local(pathname, buffer, b.contentType)
      : await put(pathname, buffer, { access: 'public', addRandomSuffix: true, contentType: b.contentType, token: blobToken() });
    return res.status(200).json({ url: saved.url });
  } catch (err) {
    if (String(err?.message).includes('BLOB_READ_WRITE_TOKEN') || String(err?.message).includes('token')) {
      console.error(err);
      return res.status(500).json({ error: 'Image storage is not connected. Add a Blob store in the Vercel dashboard (Storage tab), then redeploy.' });
    }
    return serverError(res, err);
  }
}
