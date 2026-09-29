// Builder: store an uploaded image and return its public URL.
// POST { filename, contentType, data } where data is the file as base64.
// The builder shrinks and converts images before sending, so they're small.
import { requireBuilder } from '../../auth.js';
import { body, methodNotAllowed, serverError } from '../../http.js';
import { storeImage, ImageProblem } from '../../blob.js';

export default async function handler(req, res) {
  if (!requireBuilder(req, res)) return undefined;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const b = body(req);
    const saved = await storeImage({ folder: 'questions', filename: b.filename, contentType: b.contentType, data: b.data });
    return res.status(200).json({ url: saved.url });
  } catch (err) {
    if (err instanceof ImageProblem) return res.status(err.status).json({ error: err.message });
    return serverError(res, err);
  }
}
