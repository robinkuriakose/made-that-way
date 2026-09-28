// Which questions a run asks, a level at a time. Pure, so it can be tested
// and reused.
//
// A run isn't picked up front any more. Each level is built when the one
// before it is cleared, from the questions the run hasn't used yet:
//   - questions this device hasn't seen come before ones it has, and the
//     player's chosen topics before the rest;
//   - within that, easier ones first, so level 1 builds momentum and later
//     levels get harder by themselves as the easy ones are used up;
//   - near duplicates (the same `group`) never share a run;
//   - neighbours differ in topic, and a level has at most one myth buster.
// Each level after the first can carry a tidbit: a clue shown at the level
// break, for a question in the level about to start.
import { LEVEL_SIZE } from './scoring.js';

export const MYTH_TOPIC = 'myth-buster';
// How many of the best-placed questions a level is drawn from, so levels
// vary from run to run while still rising in difficulty.
const WINDOW = LEVEL_SIZE * 2;
// Answers needed before "how many got this right" is worth showing.
export const MIN_ASKED_TO_SHOW = 10;

// How easy a question has proved: the share of players who got it right,
// pulled towards a half while there are few answers, so one lucky answer
// doesn't make a question look easy. stats = { asked, right }.
export function easeOf(question) {
  const asked = question?.stats?.asked ?? 0;
  const right = question?.stats?.right ?? 0;
  return (right + 2) / (asked + 4);
}

// The share who got it right, once enough people have answered.
export function percentRight(question) {
  const asked = question?.stats?.asked ?? 0;
  if (asked < MIN_ASKED_TO_SHOW) return null;
  return Math.round(((question.stats.right ?? 0) / asked) * 100);
}

function shuffle(list, random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const inThemes = (q, themeIds) => !themeIds || (q.themes ?? []).some((t) => themeIds.includes(t));

// The questions still open to this run: not used, not a near duplicate of
// one that was.
export function openQuestions(questions, usedIds) {
  const used = new Set(usedIds);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const groups = new Set([...used].map((id) => byId.get(id)?.group).filter(Boolean));
  return questions.filter((q) => !used.has(q.id) && !(q.group && groups.has(q.group)));
}

// Deal questions out so no two neighbours share a topic, when that's possible.
// `after` is a question that comes just before the first one.
function arrangeByTopic(chosen, random, after = null) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const order = shuffle(chosen, random);
    if (order.every((q, i) => q.topic !== (i === 0 ? after?.topic : order[i - 1].topic))) return order;
  }
  return shuffle(chosen, random);
}

// Picks up to `count` from a ranked list: distinct groups, one myth buster at
// most, and no more than two from one topic while that's possible, so
// neighbours can always differ. `taken` are questions already in the level
// (a picked first question).
function takeLevel(ranked, count, taken = []) {
  const attempt = (perTopic) => {
    const out = [];
    const groups = new Set(taken.map((q) => q.group).filter(Boolean));
    const topics = new Map();
    for (const q of taken) topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
    for (const q of ranked) {
      if (out.length === count) break;
      if (q.group && groups.has(q.group)) continue;
      if (q.topic === MYTH_TOPIC && topics.get(MYTH_TOPIC)) continue;
      if ((topics.get(q.topic) ?? 0) >= perTopic) continue;
      if (q.group) groups.add(q.group);
      topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
      out.push(q);
    }
    return out;
  };
  const capped = attempt(2);
  return capped.length === count ? capped : attempt(Infinity);
}

// Builds the next level. questions: the pool the run plays from (in the
// quiz, questions with a picture). usedIds: every question the run has
// asked, queued or used as a redeem. tidbits: [{ id, tidbitFor, text }].
// firstId: a question the player picked to start with (from the pictures on
// the home screen); it opens the level and the other four are built round it.
// Returns { ids, tidbitId }; ids is empty when nothing is left.
export function buildLevel({
  questions,
  usedIds: usedBefore = [],
  firstId = null,
  tidbits = [],
  usedTidbitIds = [],
  withTidbit = false,
  themeIds = null,
  seen = null,
  random = Math.random,
}) {
  const first = firstId ? openQuestions(questions, usedBefore).find((q) => q.id === firstId) ?? null : null;
  const usedIds = first ? [...usedBefore, first.id] : usedBefore;
  const size = first ? LEVEL_SIZE - 1 : LEVEL_SIZE;
  const taken = first ? [first] : [];
  const open = openQuestions(questions, usedIds);
  // Tiers first (unseen in the chosen topics, unseen elsewhere, seen in the
  // topics, seen elsewhere), then ease within a tier. Ease is 0 to 1, so a
  // tier step of 10 always wins.
  const tier = (q) => (seen?.has(q.id) ? 2 : 0) + (inThemes(q, themeIds) ? 0 : 1);
  const place = (q) => easeOf(q) - tier(q) * 10 + random() * 0.02;
  const ranked = open
    .map((q) => ({ q, p: place(q) }))
    .sort((a, b) => b.p - a.p)
    .map((x) => x.q);

  let chosen = takeLevel(shuffle(ranked.slice(0, WINDOW), random), size, taken);
  if (chosen.length < size) chosen = takeLevel(ranked, size, taken);

  let tidbitId = null;
  if (withTidbit && chosen.length) {
    const unused = tidbits.filter((t) => !usedTidbitIds.includes(t.id));
    const inLevel = unused.find((t) => chosen.some((q) => q.id === t.tidbitFor));
    if (inLevel) {
      tidbitId = inLevel.id;
    } else {
      // Swap in the best-placed question that has a clue, in place of the
      // last one picked, as long as it doesn't clash with the level.
      const chosenIds = new Set(chosen.map((q) => q.id));
      const swap = ranked.find(
        (q) =>
          !chosenIds.has(q.id) &&
          unused.some((t) => t.tidbitFor === q.id) &&
          !(q.group && chosen.slice(0, -1).some((c) => c.group === q.group)) &&
          !(q.topic === MYTH_TOPIC && chosen.slice(0, -1).some((c) => c.topic === MYTH_TOPIC)),
      );
      if (swap) {
        chosen = [...chosen.slice(0, -1), swap];
        tidbitId = unused.find((t) => t.tidbitFor === swap.id).id;
      }
    }
  }

  const ids = arrangeByTopic(chosen, random, first).map((q) => q.id);
  return { ids: first ? [first.id, ...ids] : ids, tidbitId };
}

// When a player leaves a question and comes back, they've had time to look
// the answer up, so it's swapped for a fresh one. Prefers, in order: the
// player's topics, the same topic as the one replaced (so neighbours still
// differ), questions not seen yet, and easier ones. Returns an id, or null.
export function replacementFor({ replacedId, usedIds, questions, themeIds = null, seen = null, random = Math.random }) {
  const replaced = questions.find((q) => q.id === replacedId);
  // The replaced question counts as used, so its near duplicates stay out too.
  const candidates = openQuestions(questions, [...usedIds, replacedId]).filter(
    (q) => (q.topic === MYTH_TOPIC) === (replaced?.topic === MYTH_TOPIC),
  );
  if (!candidates.length) return null;
  const scored = candidates.map((q) => ({
    id: q.id,
    s: (inThemes(q, themeIds) ? 0 : 4) + (replaced && q.topic === replaced.topic ? 0 : 2) + (seen?.has(q.id) ? 1 : 0) - easeOf(q) - random() * 0.01,
  }));
  return scored.reduce((best, c) => (c.s < best.s ? c : best)).id;
}
