// Link previews for shared questions: the tags chat apps (WhatsApp, iMessage,
// Slack, X) read to show a card. Pure, so it's tested without a server.
//
// A preview shows the question's picture and its wording, never the answer
// or any option.

const escapeHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// The picture a preview shows: the share card made for it (a JPEG every chat
// app can show), else the one made when the picture was published, else the
// picture itself.
export function sharePicture(image) {
  if (!image?.src || image.placeholder) return null;
  if (image.share) return image.share;
  if (image.src.startsWith('/images/')) return image.src.replace(/^\/images\//, '/images/share/').replace(/\.\w+$/, '.jpg');
  return image.src;
}

const absolute = (origin, url) => (url && url.startsWith('/') ? `${origin}${url}` : url);

// { title, description, image, url } for one shared question, or for a day's
// question. `from` is the sharer's name, already checked.
export function previewFor({ origin, path, question, from = null, daily = false }) {
  const site = {
    title: "You've seen it a thousand times. Let's ask why.",
    description: 'Quick picture questions about why everyday things are made the way they are. No clock, no sign-up.',
    image: `${origin}/og.jpg`,
    url: `${origin}${path}`,
  };
  if (!question?.stem) return site;
  const description = daily
    ? "Today's question on Made That Way. Can you work out why?"
    : from
      ? `${from} worked this one out. Can you?`
      : 'Can you work out why? Quick picture questions about everyday design.';
  return {
    title: question.stem,
    description,
    image: absolute(origin, sharePicture(question.image)) ?? site.image,
    url: site.url,
  };
}

// The app's page with the preview tags in place of its own.
export function withPreview(html, p) {
  const tags = [
    `<title>${escapeHtml(p.title)} | Made That Way</title>`,
    `<meta name="description" content="${escapeHtml(p.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Made That Way" />`,
    `<meta property="og:title" content="${escapeHtml(p.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(p.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(p.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${escapeHtml(p.url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(p.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(p.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(p.image)}" />`,
  ].join('\n    ');
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/gi, '');
  return cleaned.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}
