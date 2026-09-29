// Getting a picture ready to upload, in the browser: shrunk to at most
// MAX_WIDTH wide and re-encoded as WebP whatever it came in as (JPG, PNG,
// AVIF, WebP, HEIC where the browser can read it), plus a small still
// thumbnail. GIFs are sent as they are, so animation survives; their
// thumbnail is the first frame. Used by the builder and by players
// suggesting a question.

const MAX_WIDTH = 1600;
const THUMB_WIDTH = 360;
const MAX_GIF_BYTES = 3 * 1024 * 1024;

export function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function encode(bitmap, width, quality) {
  const scale = Math.min(1, width / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error("Couldn't process that image.");
  return { contentType: blob.type || 'image/webp', data: await toBase64(blob) };
}

// Resolves to { full, thumb }, each { contentType, data (base64) }.
export async function prepareImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This browser can't read that image format. Try a JPG or PNG.");
  }
  const thumb = await encode(bitmap, THUMB_WIDTH, 0.72);
  if (file.type === 'image/gif') {
    if (file.size > MAX_GIF_BYTES) throw new Error('That GIF is over 3 MB. Try a shorter or smaller one.');
    return { full: { contentType: 'image/gif', data: await toBase64(file) }, thumb };
  }
  return { full: await encode(bitmap, MAX_WIDTH, 0.82), thumb };
}

// The question id a picture file is meant for: its name without any image
// extension ("daily-lift-mirrors.jpg.webp" is "daily-lift-mirrors").
export const idFromFilename = (name) =>
  String(name ?? '')
    .replace(/(\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif))+$/i, '')
    .trim()
    .toLowerCase();
