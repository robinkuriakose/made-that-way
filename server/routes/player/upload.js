// Public: a picture for a suggested question. POST { deviceId, filename, contentType, data }
// The quiz shrinks and converts the picture first. Limited per network; the
// picture is only ever shown in the builder until a question built from it
// is accepted.
import { body, isId, methodNotAllowed, serverError } from '../../http.js';
import { ensureSchema } from '../../schema.js';
import { hit, tooMany } from '../../limits.js';
import { storeImage, ImageProblem } from '../../blob.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const b = body(req);
    if (!isId(b.deviceId)) return res.status(400).json({ error: 'invalid request' });
    await ensureSchema();
    if (!(await hit(req, 'suggestUpload'))) return tooMany(res);
    const saved = await storeImage({ folder: 'suggestions', filename: b.filename, contentType: b.contentType, data: b.data });
    return res.status(200).json({ url: saved.url });
  } catch (err) {
    if (err instanceof ImageProblem) return res.status(err.status).json({ error: err.message });
    return serverError(res, err);
  }
}
