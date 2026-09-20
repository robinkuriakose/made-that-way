// Converts every image dropped in images/ (any format: jpg, png, webp, avif,
// gif, whatever the extension claims) into WebP, capped at MAX_WIDTH, plus a
// small thumbnail for places like the home screen. Animated GIFs stay
// animated. Run after adding or replacing images:  npm run images
//
// Where each file goes is read from the question data, not listed here:
// - normally public/images/<id>.webp, which ships with the site;
// - dev-images/<id>.webp when that question marks its image as a
//   placeholder (image.placeholder: true), for example a watermarked stand-in.
//   dev-images/ is only served by `npm run dev` and never deployed.
import { readdir, mkdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIR = path.join(ROOT, 'images');
const PUBLIC_DIR = path.join(ROOT, 'public', 'images');
const DEV_DIR = path.join(ROOT, 'dev-images');
const MAX_WIDTH = 1600;
const THUMB_WIDTH = 360;
const QUALITY = 80;
const IMAGE_FILE = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i;
const DATA_FILES = ['questions.json', 'pending-questions.json', 'daily-questions.json'];

async function placeholderIds() {
  const ids = new Set();
  for (const file of DATA_FILES) {
    try {
      const data = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', file), 'utf8'));
      for (const q of data.questions ?? []) if (q.image?.placeholder) ids.add(q.id);
    } catch {
      // A data file that doesn't exist yet has no placeholders.
    }
  }
  return ids;
}

const placeholders = await placeholderIds();
const files = (await readdir(SOURCE_DIR)).filter((f) => IMAGE_FILE.test(f));

let before = 0;
let after = 0;
for (const file of files) {
  const input = path.join(SOURCE_DIR, file);
  const name = path.parse(file).name;
  const outDir = placeholders.has(name) ? DEV_DIR : PUBLIC_DIR;
  await mkdir(path.join(outDir, 'thumbs'), { recursive: true });
  const output = path.join(outDir, `${name}.webp`);
  const thumb = path.join(outDir, 'thumbs', `${name}.webp`);

  const meta = await sharp(input, { animated: true }).metadata();
  const animated = (meta.pages ?? 1) > 1;
  await sharp(input, { animated })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(output);
  // Thumbnails are stills: a moving tile on the home screen would distract.
  await sharp(input).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 72, effort: 5 }).toFile(thumb);

  const inSize = (await stat(input)).size;
  const outSize = (await stat(output)).size;
  const outMeta = await sharp(output).metadata();
  before += inSize;
  after += outSize;
  console.log(
    `${name.padEnd(28)} ${meta.format.padEnd(5)} ${String(Math.round(inSize / 1024)).padStart(5)} KB -> ` +
      `${String(Math.round(outSize / 1024)).padStart(4)} KB  ${outMeta.width}x${outMeta.pageHeight ?? outMeta.height}` +
      `${animated ? '  animated' : ''}${outDir === DEV_DIR ? '  placeholder, local only' : ''}`,
  );
}
console.log(`\n${files.length} images, ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
