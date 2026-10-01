// Sharing. One question (its link preview shows the picture and the
// question, never the answer: server/share.js), or a spoiler-free line about
// today's question. Phones open their share sheet; elsewhere the message is
// copied, ready to paste.
import { track } from './events.js';
import { cleanName, nameProblem } from './names.js';

const site = () => window.location.origin;

export function questionLink(id, from = null) {
  const url = new URL(`/q/${encodeURIComponent(id)}`, site());
  if (from) url.searchParams.set('from', from);
  return url.toString();
}

export const dailyLink = (day) => new URL(`/daily/${day}`, site()).toString();

// The line that goes with a day's result. Never says what the answer was.
export function dailyText({ correct, streak }) {
  const streakWords = streak > 1 ? ` ${streak} days in a row.` : '';
  return correct ? `I worked out today's why on Made That Way.${streakWords} Can you?` : "Today's why on Made That Way got me. Can you work it out?";
}

// Resolves to 'shared', 'copied', 'cancelled' or 'failed'.
export async function share({ text, url, kind, questionId = null }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Made That Way', text, url });
      track('shared', { data: { kind, questionId, how: 'shared' } });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    track('shared', { data: { kind, questionId, how: 'copied' } });
    return 'copied';
  } catch {
    return 'failed';
  }
}

// Arriving from a shared link: /q/<id>?from=<name> or /daily/<day>. Read once,
// before the app starts, and the address goes back to the home page so a
// reload starts fresh. A sharer's name that wouldn't be allowed on the board
// isn't shown.
export function readArrival() {
  const { pathname, search } = window.location;
  const q = pathname.match(/^\/q\/([a-z0-9][a-z0-9-]{1,63})\/?$/);
  const d = pathname.match(/^\/daily\/(\d{4}-\d{2}-\d{2})\/?$/);
  let arrival = null;
  if (q) {
    const name = cleanName(new URLSearchParams(search).get('from') ?? '');
    arrival = { kind: 'question', id: q[1], from: name && !nameProblem(name) ? name : null };
  } else if (d) {
    arrival = { kind: 'daily', day: d[1] };
  }
  if (arrival) {
    window.history.replaceState(null, '', '/');
    // The page came with the link preview's title; the app is the plain site.
    document.title = 'Made That Way';
  }
  return arrival;
}
