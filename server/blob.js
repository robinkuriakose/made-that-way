// Stores an uploaded image and returns its public URL: in the Vercel Blob
// store when deployed, in .localdb when running locally (tools/local-api.js).
// Used by the builder's upload and by players suggesting a question.
import { put } from '@vercel/blob';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // Vercel caps a request at 4.5 MB, and base64 adds a third.
export const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/avif': 'avif' };

// Vercel names it BLOB_READ_WRITE_TOKEN, or puts a prefix in front if one
// was chosen when connecting the store.
export function blobToken(env = process.env) {
  if (env.BLOB_READ_WRITE_TOKEN) return env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(env).find((k) => k.endsWith('READ_WRITE_TOKEN'));
  return key ? env[key] : undefined;
}

export class ImageProblem extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// { folder, filename, contentType, data (base64) } -> { url }
export async function storeImage({ folder, filename, contentType, data }) {
  const ext = IMAGE_TYPES[contentType];
  if (!ext || typeof data !== 'string' || !data) throw new ImageProblem('Send a JPG, PNG, WebP, AVIF or GIF image.');
  const buffer = Buffer.from(data, 'base64');
  if (buffer.length === 0) throw new ImageProblem('That file is empty.');
  if (buffer.length > MAX_IMAGE_BYTES) throw new ImageProblem('That image is over 3 MB. Try a smaller one.', 413);

  const base = String(filename ?? 'image').replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 60) || 'image';
  const pathname = `${folder}/${base}.${ext}`;

  const local = globalThis.__MTW_LOCAL_BLOB__;
  if (local) return local(pathname, buffer, contentType);
  const token = blobToken();
  if (!token) {
    throw new ImageProblem('Image storage is not connected. Add a Blob store in the Vercel dashboard (Storage tab), then redeploy.', 503);
  }
  try {
    return await put(pathname, buffer, { access: 'public', addRandomSuffix: true, contentType, token });
  } catch (err) {
    console.error(err);
    // Say what the store said, so a setup problem (a private store, a token
    // from a deleted store) can be told apart from a missing connection.
    throw new ImageProblem(`Image storage refused the file: ${String(err?.message ?? 'unknown reason').slice(0, 200)}`, 502);
  }
}
