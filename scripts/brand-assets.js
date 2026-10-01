// The site's own brand files, made from the placeholder logo (the keycap in
// src/components/Logo.jsx): the favicon, the icon a phone uses when the site
// is saved to the home screen, and the preview card for links to the home
// page. Run again when the logo changes:  node scripts/brand-assets.js
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { shareCard } from './share-card.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

const markSvg = (size) => `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 64 64'>
  <rect x='2' y='2' width='60' height='60' rx='14' fill='#16150f'/>
  <rect x='7' y='4' width='50' height='46' rx='10' fill='#cfe957'/>
  <rect x='23' y='38' width='18' height='4.5' rx='2.25' fill='#16150f'/>
</svg>
`;

await writeFile(path.join(PUBLIC, 'favicon.svg'), markSvg(64));

// A phone's home screen icon has no transparency, so the mark sits on the
// page's background colour.
const icon = await sharp(Buffer.from(markSvg(140))).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 3, background: '#f6f5f1' } })
  .composite([{ input: icon, left: 20, top: 20 }])
  .png()
  .toFile(path.join(PUBLIC, 'apple-touch-icon.png'));

// The home page's link preview: the F and J keys, and the headline.
const og = await shareCard(path.join(PUBLIC, 'images', 'keyboard-bumps.webp'), {
  headline: ["You've seen it a", 'thousand times.', "Let's ask why."],
  sub: ['Quick picture questions.', 'No clock, no sign-up.'],
  size: 50,
});
await writeFile(path.join(PUBLIC, 'og.jpg'), og);
console.log('favicon.svg, apple-touch-icon.png, og.jpg');
