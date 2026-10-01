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

// The card a chat app shows when a question is shared, drawn the same way
// as scripts/share-card.js does for published pictures: 1200 by 630, the
// picture in a white print, "Can you work out why?" and the logo. A JPEG,
// which every chat app can show.
async function shareCard(bitmap) {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  try {
    await Promise.all([document.fonts.load('700 66px Poppins'), document.fonts.load('600 30px Poppins'), document.fonts.load('400 27px Poppins')]);
  } catch {
    // The fallback font will do.
  }
  const font = (weight, size) => `${weight} ${size}px Poppins, Arial, sans-serif`;
  c.fillStyle = '#16150f';
  c.fillRect(0, 0, W, H);

  // The print, turned a little, with a soft shadow.
  const PW = 560;
  const PH = 540;
  const PAD = 18;
  const BOTTOM = 58;
  c.save();
  c.translate(330, H / 2);
  c.rotate((-3 * Math.PI) / 180);
  c.shadowColor = 'rgba(0, 0, 0, 0.45)';
  c.shadowBlur = 36;
  c.shadowOffsetY = 12;
  c.fillStyle = '#ffffff';
  c.fillRect(-PW / 2, -PH / 2, PW, PH);
  c.shadowColor = 'transparent';
  const boxW = PW - PAD * 2;
  const boxH = PH - PAD - BOTTOM;
  c.fillStyle = '#f6f5f1';
  c.fillRect(-PW / 2 + PAD, -PH / 2 + PAD, boxW, boxH);
  const scale = Math.min(boxW / bitmap.width, boxH / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  c.drawImage(bitmap, -PW / 2 + PAD + (boxW - w) / 2, -PH / 2 + PAD + (boxH - h) / 2, w, h);
  c.fillStyle = '#cfe957';
  c.beginPath();
  c.roundRect(PW / 2 - PAD - 104, PH / 2 - 49, 104, 40, 20);
  c.fill();
  c.fillStyle = '#16150f';
  c.font = font(600, 20);
  c.textAlign = 'center';
  c.fillText('Why?', PW / 2 - PAD - 52, PH / 2 - 22);
  c.restore();

  // The logo and the words.
  c.save();
  c.translate(690, 88);
  c.scale(58 / 64, 58 / 64);
  const rect = (x, y, rw, rh, r, fill) => {
    c.fillStyle = fill;
    c.beginPath();
    c.roundRect(x, y, rw, rh, r);
    c.fill();
  };
  rect(2, 2, 60, 60, 14, '#f6f5f1');
  rect(7, 4, 50, 46, 10, '#cfe957');
  rect(23, 38, 18, 4.5, 2.25, '#16150f');
  c.restore();
  c.textAlign = 'left';
  c.fillStyle = '#f6f5f1';
  c.font = font(600, 30);
  c.fillText('Made That Way', 764, 128);
  c.font = font(700, 66);
  c.fillText('Can you work', 690, 292);
  c.fillText('out why?', 690, 366);
  c.fillStyle = '#a9a79e';
  c.font = font(400, 27);
  c.fillText('Quick picture questions', 692, 488);
  c.fillText('about everyday design.', 692, 526);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error("Couldn't make the share picture.");
  return { contentType: 'image/jpeg', data: await toBase64(blob) };
}

// Resolves to { full, thumb }, each { contentType, data (base64) }, and with
// { share: true } also the share card, `share`.
export async function prepareImage(file, { share = false } = {}) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This browser can't read that image format. Try a JPG or PNG.");
  }
  const thumb = await encode(bitmap, THUMB_WIDTH, 0.72);
  const card = share ? await shareCard(bitmap) : null;
  if (file.type === 'image/gif') {
    if (file.size > MAX_GIF_BYTES) throw new Error('That GIF is over 3 MB. Try a shorter or smaller one.');
    return { full: { contentType: 'image/gif', data: await toBase64(file) }, thumb, ...(card ? { share: card } : {}) };
  }
  return { full: await encode(bitmap, MAX_WIDTH, 0.82), thumb, ...(card ? { share: card } : {}) };
}

// The question id a picture file is meant for: its name without any image
// extension ("daily-lift-mirrors.jpg.webp" is "daily-lift-mirrors").
export const idFromFilename = (name) =>
  String(name ?? '')
    .replace(/(\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif))+$/i, '')
    .trim()
    .toLowerCase();
