// The picture a chat app shows when someone shares a question: 1200 by 630,
// the question's photo in a white print on the left, "Can you work out
// why?" and the logo on the right. Never the answer, never the question's
// wording (that's the link's title, and it can be edited later).
//
// Made with sharp when pictures are published (npm run images), so text is
// drawn with the fonts on the machine that runs it. The builder makes the
// same card in the browser for pictures uploaded there (src/lib/imagePrep.js).
import sharp from 'sharp';

export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;

const INK = '#16150f';
const PAPER = '#f6f5f1';
const LIME = '#cfe957';
const FONT = "font-family='Poppins, Arial, Helvetica, sans-serif'";

const mark = (x, y, size) => {
  const s = size / 64;
  return `<g transform='translate(${x} ${y}) scale(${s})'>
    <rect x='2' y='2' width='60' height='60' rx='14' fill='${PAPER}'/>
    <rect x='7' y='4' width='50' height='46' rx='10' fill='${LIME}'/>
    <rect x='23' y='38' width='18' height='4.5' rx='2.25' fill='${INK}'/>
  </g>`;
};

const escapeXml = (t) => String(t).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c]);

// headline: up to three short lines; sub: up to two.
export async function shareCard(input, { headline = ['Can you work', 'out why?'], sub = ['Quick picture questions', 'about everyday design.'], size = 66 } = {}) {
  const step = Math.round(size * 1.12);
  const PW = 560;
  const PH = 540;
  const PAD = 18;
  const BOTTOM = 58;
  const picture = await sharp(input)
    .rotate()
    .resize(PW - PAD * 2, PH - PAD - BOTTOM, { fit: 'contain', background: PAPER })
    .toBuffer();
  const pill = Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='104' height='40'><rect width='104' height='40' rx='20' fill='${LIME}'/><text x='52' y='27' text-anchor='middle' ${FONT} font-size='20' font-weight='600' fill='${INK}'>Why?</text></svg>`,
  );
  const print = await sharp({ create: { width: PW, height: PH, channels: 4, background: '#ffffff' } })
    .composite([
      { input: picture, left: PAD, top: PAD },
      { input: pill, left: PW - PAD - 104, top: PH - 49 },
    ])
    .png()
    .toBuffer();
  const tilted = await sharp(print).rotate(-3, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const { width: tw, height: th } = await sharp(tilted).metadata();

  const lines = headline
    .map((l, i) => `<text x='690' y='${292 + i * step}' ${FONT} font-size='${size}' font-weight='700' fill='${PAPER}'>${escapeXml(l)}</text>`)
    .join('');
  const subs = sub
    .map((l, i) => `<text x='692' y='${300 + headline.length * step + 40 + i * 38}' ${FONT} font-size='27' fill='#a9a79e'>${escapeXml(l)}</text>`)
    .join('');
  const text = Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${SHARE_WIDTH}' height='${SHARE_HEIGHT}'>
      ${mark(690, 88, 58)}
      <text x='764' y='128' ${FONT} font-size='30' font-weight='600' fill='${PAPER}'>Made That Way</text>
      ${lines}
      ${subs}
    </svg>`,
  );
  const shadow = Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${tw}' height='${th}'><rect x='30' y='40' width='${tw - 60}' height='${th - 60}' rx='12' fill='#000' opacity='0.45'/></svg>`,
  );
  const left = Math.round(330 - tw / 2);
  const top = Math.round((SHARE_HEIGHT - th) / 2);
  const blurred = await sharp(shadow).blur(18).png().toBuffer();
  return sharp({ create: { width: SHARE_WIDTH, height: SHARE_HEIGHT, channels: 3, background: INK } })
    .composite([
      { input: blurred, left, top: top + 10 },
      { input: tilted, left, top },
      { input: text, left: 0, top: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
