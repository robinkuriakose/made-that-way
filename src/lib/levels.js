// Which questions a run asks, a level at a time. Pure, so it can be tested
// and reused.
//
// A run isn't picked up front any more. Each level is built when the one
// before it is cleared, from the questions the run hasn't used yet:
//   - the level plan (src/data/level-plan.json) says how many easy, medium
//     and hard questions each level has; a tier that runs out borrows from
//     the nearest one;
//   - within a tier, questions this device hasn't seen come before ones it
//     has, the player's chosen topics before the rest, then the ones players
//     get right most often;
//   - near duplicates (the same `group`) never share a run;
//   - neighbours differ in topic, and a level has at most one myth buster.
// Each level after the first can carry a tidbit: a clue shown at the level
// break, for a question in the level about to start.
import { LEVEL_SIZE } from './scoring.js';
import { DIFFICULTIES } from './questionRules.js';

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

// A question with no difficulty yet counts as medium.
export const tierOf = (q) => (DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : 'medium');

// How many easy, medium and hard questions a level has, from the plan.
export function mixFor(plan, level) {
  const bands = plan?.bands ?? [];
  const band = bands.find((b) => level >= b.from && level <= b.to) ?? bands.at(-1);
  return band ? { easy: band.easy ?? 0, medium: band.medium ?? 0, hard: band.hard ?? 0 } : null;
}

// Where a tier looks when it runs out: the nearest tier first.
const BORROW = { easy: ['medium', 'hard'], medium: ['easy', 'hard'], hard: ['medium', 'easy'] };

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

// Fills a level slot by slot. Each slot names a tier; it takes the first
// question of that tier (in the order given) that fits, and borrows from the
// nearest tier when its own has nothing left. Fits means: a group not already
// in the level, one myth buster at most, and no more than two from one topic
// while that's possible, so neighbours can always differ. `taken` are
// questions already in the level (a picked first question).
function fillSlots(slots, byTier, taken = []) {
  const attempt = (perTopic) => {
    const out = [];
    const used = new Set(taken.map((q) => q.id));
    const groups = new Set(taken.map((q) => q.group).filter(Boolean));
    const topics = new Map();
    for (const q of taken) topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
    const fits = (q) =>
      !used.has(q.id) &&
      !(q.group && groups.has(q.group)) &&
      !(q.topic === MYTH_TOPIC && topics.get(MYTH_TOPIC)) &&
      (topics.get(q.topic) ?? 0) < perTopic;
    for (const slot of slots) {
      let q = null;
      for (const t of [slot, ...BORROW[slot]]) {
        q = (byTier[t] ?? []).find(fits);
        if (q) break;
      }
      if (!q) continue;
      used.add(q.id);
      if (q.group) groups.add(q.group);
      topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
      out.push(q);
    }
    return out;
  };
  const capped = attempt(2);
  return capped.length === slots.length ? capped : attempt(Infinity);
}

// Builds the next level. questions: the pool the run plays from (in the
// quiz, questions with a picture). usedIds: every question the run has
// asked, queued or used as a redeem. tidbits: [{ id, tidbitFor, text }].
// firstId: a question the player picked to start with (from the pictures on
// the home screen); it opens the level and takes one slot of its own tier.
// mix: { easy, medium, hard } for this level (mixFor); without one, the level
// is simply the best-placed questions, whatever their tier.
// Returns { ids, tidbitId }; ids is empty when nothing is left.
export function buildLevel({
  questions,
  usedIds: usedBefore = [],
  firstId = null,
  mix = null,
  tidbits = [],
  usedTidbitIds = [],
  withTidbit = false,
  themeIds = null,
  seen = null,
  random = Math.random,
}) {
  const first = firstId ? openQuestions(questions, usedBefore).find((q) => q.id === firstId) ?? null : null;
  const usedIds = first ? [...usedBefore, first.id] : usedBefore;
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

  // The slots to fill, one tier each. Hard and medium are placed first, so
  // the scarcer tiers get their pick before easy fills the rest.
  let slots = mix
    ? ['hard', 'medium', 'easy'].flatMap((t) => Array.from({ length: mix[t] ?? 0 }, () => t))
    : Array.from({ length: LEVEL_SIZE }, () => 'medium');
  if (first) {
    const own = mix ? slots.indexOf(tierOf(first)) : 0;
    const drop = own >= 0 ? own : slots.length - 1;
    slots = slots.filter((_, i) => i !== drop);
  }
  // Each tier's questions in order: a shuffled window of the best placed, so
  // levels vary from run to run, then the rest. Without a mix, every
  // question sits in one tier.
  const orderOf = (list, count) => {
    const w = Math.max(WINDOW, count * 2);
    return [...shuffle(list.slice(0, w), random), ...list.slice(w)];
  };
  const byTier = mix
    ? Object.fromEntries(DIFFICULTIES.map((t) => [t, orderOf(ranked.filter((q) => tierOf(q) === t), slots.filter((x) => x === t).length)]))
    : { medium: orderOf(ranked, slots.length) };
  let chosen = fillSlots(slots, byTier, taken);

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
      // It replaces the last question of its own tier, so the mix holds.
      const lastOfTier = (q) => (mix ? chosen.map(tierOf).lastIndexOf(tierOf(q)) : chosen.length - 1);
      const swap = ranked.find((q) => {
        const at = lastOfTier(q);
        if (chosenIds.has(q.id) || at < 0 || !unused.some((t) => t.tidbitFor === q.id)) return false;
        const rest = [...taken, ...chosen.filter((_, i) => i !== at)];
        return !(q.group && rest.some((c) => c.group === q.group)) && !(q.topic === MYTH_TOPIC && rest.some((c) => c.topic === MYTH_TOPIC));
      });
      if (swap) {
        const at = lastOfTier(swap);
        chosen = chosen.map((q, i) => (i === at ? swap : q));
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

// How many easy, medium and hard questions (with pictures) a run needs to
// get through every level up to lastLevel without repeats.
export function planNeeds(plan, lastLevel = plan?.lastLevel ?? 1) {
  const need = { easy: 0, medium: 0, hard: 0 };
  for (let level = 1; level <= lastLevel; level++) {
    const mix = mixFor(plan, level);
    if (mix) for (const t of DIFFICULTIES) need[t] += mix[t];
  }
  return need;
}

// Answers needed before a question's tag is worth second-guessing.
export const MIN_ASKED_TO_FLAG = 10;

// Flags a question whose answers don't match its tag, for the owner to
// look at. Never changes anything by itself. Returns a short sentence, or
// null when it plays as tagged (or hasn't enough answers yet).
export function tierMismatch(question) {
  const asked = question?.stats?.asked ?? 0;
  if (asked < MIN_ASKED_TO_FLAG || !DIFFICULTIES.includes(question?.difficulty)) return null;
  const pct = Math.round(((question.stats.right ?? 0) / asked) * 100);
  const d = question.difficulty;
  if (d === 'easy' && pct < 50) return `Plays harder than easy: ${pct}% right`;
  if (d === 'medium' && pct < 30) return `Plays harder than medium: ${pct}% right`;
  if (d === 'medium' && pct > 85) return `Plays easier than medium: ${pct}% right`;
  if (d === 'hard' && pct > 75) return `Plays easier than hard: ${pct}% right`;
  return null;
}
