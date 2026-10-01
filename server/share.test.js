import test from 'node:test';
import assert from 'node:assert/strict';
import { previewFor, sharePicture, withPreview } from './share.js';

const page = `<!doctype html><html><head>
    <title>Made That Way</title>
    <meta name="description" content="old" />
    <meta property="og:title" content="old" />
    <meta property="og:image" content="https://x/og.jpg" />
    <meta name="twitter:card" content="summary" />
  </head><body><div id="root"></div></body></html>`;

test('a shared question previews its picture and wording, never the answer', () => {
  const question = {
    stem: 'Why do sachets have a "tiny" V-cut?',
    options: ['A', 'The secret answer', 'C', 'D'],
    correctIndex: 1,
    explanationRight: 'The secret explanation',
    image: { src: '/images/daily-sachet-tear-notch.webp' },
  };
  const p = previewFor({ origin: 'https://site', path: '/q/daily-sachet-tear-notch?from=Robin', question, from: 'Robin' });
  assert.equal(p.title, question.stem);
  assert.equal(p.description, 'Robin worked this one out. Can you?');
  assert.equal(p.image, 'https://site/images/share/daily-sachet-tear-notch.jpg');
  const html = withPreview(page, p);
  assert.ok(!html.includes('secret'));
  assert.ok(html.includes('&quot;tiny&quot;'));
  assert.equal((html.match(/og:title/g) ?? []).length, 1);
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
  assert.ok(html.includes('<div id="root"></div>'));
});

test('the picture for a preview: its share card, the published one, or the picture', () => {
  assert.equal(sharePicture({ src: 'https://blob/q.webp', share: 'https://blob/q-share.jpg' }), 'https://blob/q-share.jpg');
  assert.equal(sharePicture({ src: '/images/manhole-round.webp' }), '/images/share/manhole-round.jpg');
  assert.equal(sharePicture({ src: 'https://blob/q.webp' }), 'https://blob/q.webp');
  assert.equal(sharePicture({ src: '/dev-images/x.webp', placeholder: true }), null);
  assert.equal(sharePicture(null), null);
});

test('no question: the site preview', () => {
  const p = previewFor({ origin: 'https://site', path: '/q/gone', question: null });
  assert.equal(p.image, 'https://site/og.jpg');
  assert.match(p.title, /thousand times/);
});
