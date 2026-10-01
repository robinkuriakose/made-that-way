import { prepareImage } from '../lib/imagePrep.js';

// A question's picture, from the builder: shrunk, stored, and given its
// thumbnail and its share card (what chat apps show when the question is
// shared). Resolves to { src, thumb, share } for the question's image.
export async function uploadPicture(api, name, file) {
  const { full, thumb, share } = await prepareImage(file, { share: true });
  const put = (filename, part) => api('/api/builder/upload', { method: 'POST', body: { filename, ...part } }).then((r) => r.url);
  const [src, thumbUrl, shareUrl] = await Promise.all([put(name, full), put(`${name}-thumb`, thumb), put(`${name}-share`, share)]);
  return { src, thumb: thumbUrl, share: shareUrl };
}
