import { RUN_LENGTH } from './scoring.js';

export const MYTH_TOPIC = 'myth-buster';
export const WRONG_STREAK_FOR_TIDBIT = 3;
export const TIDBIT_OFFSET = 3;

// Per run, as [min, max]. Interface questions get a little more room.
const TOPIC_LIMITS = { ui: [3, 4] };
const DEFAULT_TOPIC_LIMITS = [2, 3];
const MIN_SEEDED_IN_RUN = 3;
// The earliest a tidbit can fire is after question index 2, which seeds index 5.
const FIRST_USEFUL_SEEDED_INDEX = WRONG_STREAK_FOR_TIDBIT - 1 + TIDBIT_OFFSET;

export const topicLimits = (topic) => TOPIC_LIMITS[topic] ?? DEFAULT_TOPIC_LIMITS;

function shuffle(list, random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function seededQuestionIds(tidbits) {
  return new Set(tidbits.map((t) => t.tidbitFor));
}

// Takes questions in order, skipping any whose group is already taken, so
// near duplicates (such as the keypad questions) never share a run.
function takeDistinct(list, count) {
  const groups = new Set();
  const out = [];
  for (const q of list) {
    if (out.length === count) break;
    if (q.group && groups.has(q.group)) continue;
    if (q.group) groups.add(q.group);
    out.push(q);
  }
  return out;
}

const inThemes = (q, themeIds) => !themeIds || (q.themes ?? []).some((t) => themeIds.includes(t));

// The questions a run draws from. With topics chosen, that's the questions in
// those topics, topped up (quietly) with others if the choice can't fill a
// run on its own, so a small topic never shows the player an error or a
// repeat-heavy run.
export function questionPool(questions, themeIds = null, random = Math.random) {
  if (!themeIds) return questions;
  const inside = questions.filter((q) => inThemes(q, themeIds));
  if (inside.length >= RUN_LENGTH * 2) return inside;
  // Top up with the closest relatives first: questions sharing the most tags.
  const insideTags = new Set(inside.flatMap((q) => q.tags ?? []));
  const related = (q) => (q.tags ?? []).filter((t) => insideTags.has(t)).length;
  const outside = shuffle(questions.filter((q) => !inThemes(q, themeIds)), random).sort((a, b) => related(b) - related(a));
  return [...inside, ...outside.slice(0, RUN_LENGTH * 2 - inside.length)];
}

// Unseen questions first (in random order), then seen ones, so returning
// players meet new questions before repeats.
function freshFirst(list, seen, random) {
  if (!seen?.size) return shuffle(list, random);
  return [...shuffle(list.filter((q) => !seen.has(q.id)), random), ...shuffle(list.filter((q) => seen.has(q.id)), random)];
}

// Pick the questions for one run. Topics stay balanced, enough questions with
// a paired tidbit are included, and a myth buster appears in about one run in
// two, never more than one. `seen` (a Set of ids) is preferred against.
export function selectQuestions(questions, tidbits, random = Math.random, { seen = null } = {}) {
  const seeded = seededQuestionIds(tidbits);
  const myths = questions.filter((q) => q.topic === MYTH_TOPIC);
  const regular = questions.filter((q) => q.topic !== MYTH_TOPIC);
  const topics = [...new Set(regular.map((q) => q.topic))];

  const includeMyth = myths.length > 0 && random() < 0.5;
  const regularCount = Math.min(RUN_LENGTH - (includeMyth ? 1 : 0), regular.length);

  let best = [];
  let bestPenalty = Infinity;
  for (let attempt = 0; attempt < 400 && bestPenalty > 0; attempt++) {
    const picked = takeDistinct(freshFirst(regular, seen, random), regularCount);
    let penalty = (regularCount - picked.length) * 10;
    for (const topic of topics) {
      const [min, max] = topicLimits(topic);
      const n = picked.filter((q) => q.topic === topic).length;
      if (n < min) penalty += min - n;
      if (n > max) penalty += n - max;
    }
    const seededCount = picked.filter((q) => seeded.has(q.id)).length;
    if (seededCount < MIN_SEEDED_IN_RUN) penalty += MIN_SEEDED_IN_RUN - seededCount;
    if (penalty < bestPenalty) {
      best = picked;
      bestPenalty = penalty;
    }
  }

  const chosen = best.slice();
  if (includeMyth) chosen.push(freshFirst(myths, seen, random)[0]);
  return chosen;
}

// Deal questions out one at a time so that no two neighbours share a topic.
// Topics with more questions left are more likely to be picked, and a topic
// is forced when leaving it any longer would make a clash unavoidable.
function arrangeByTopic(chosen, random) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pools = new Map();
    for (const q of shuffle(chosen, random)) {
      if (!pools.has(q.topic)) pools.set(q.topic, []);
      pools.get(q.topic).push(q);
    }

    const out = [];
    let lastTopic = null;
    while (out.length < chosen.length) {
      const remaining = chosen.length - out.length;
      const open = [...pools.entries()].filter(([topic, list]) => list.length > 0 && topic !== lastTopic);
      if (open.length === 0) break;

      const urgent = open.find(([, list]) => list.length * 2 >= remaining + 1);
      let pick = urgent;
      if (!pick) {
        const weight = open.reduce((sum, [, list]) => sum + list.length, 0);
        let roll = random() * weight;
        pick = open.find(([, list]) => (roll -= list.length) < 0) ?? open[open.length - 1];
      }
      out.push(pick[1].pop());
      lastTopic = pick[0];
    }
    if (out.length === chosen.length) return out;
  }
  return shuffle(chosen, random);
}

// Mix topics so neighbours differ, then move seeded questions out of the
// first few slots, where no tidbit could ever point at them. Moves only swap
// questions of the same topic, so neighbours still differ.
export function orderQuestions(chosen, tidbits, random = Math.random) {
  const seeded = seededQuestionIds(tidbits);
  const order = arrangeByTopic(chosen, random);

  for (let i = 0; i < Math.min(FIRST_USEFUL_SEEDED_INDEX, order.length); i++) {
    if (!seeded.has(order[i].id)) continue;
    for (let j = order.length - 1; j >= FIRST_USEFUL_SEEDED_INDEX; j--) {
      if (order[j].topic === order[i].topic && !seeded.has(order[j].id)) {
        [order[i], order[j]] = [order[j], order[i]];
        break;
      }
    }
  }
  return order;
}

// The whole run is selected and ordered before it starts. themeIds (null for
// every topic) narrows the pool; seen (a Set) is preferred against.
export function buildRun(questions, tidbits, random = Math.random, { themeIds = null, seen = null } = {}) {
  const pool = questionPool(questions, themeIds, random);
  const poolIds = new Set(pool.map((q) => q.id));
  const poolTidbits = tidbits.filter((t) => poolIds.has(t.tidbitFor));
  const chosen = selectQuestions(pool, poolTidbits, random, { seen });
  return orderQuestions(chosen, poolTidbits, random).map((q) => q.id);
}

// When a player leaves a question and comes back, they've had time to look
// the answer up, so that question is swapped for a fresh one. Picks from
// questions not in the run, not offered as a redeem, not sharing a group
// with anything in the run, preferring (in order) the run's topics, the same
// topic as the one replaced (so neighbours still differ), and unseen ones.
// Returns an id, or null if nothing fits.
export function replacementFor({ replacedId, runIds, excludeIds = [], questions, themeIds = null, seen = null, random = Math.random }) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const replaced = byId.get(replacedId);
  const taken = new Set([...runIds, ...excludeIds]);
  const groups = new Set(runIds.filter((id) => id !== replacedId).map((id) => byId.get(id)?.group).filter(Boolean));
  const candidates = questions.filter(
    (q) =>
      !taken.has(q.id) &&
      !(q.group && groups.has(q.group)) &&
      (q.topic === MYTH_TOPIC) === (replaced?.topic === MYTH_TOPIC),
  );
  if (!candidates.length) return null;
  const score = (q) =>
    (inThemes(q, themeIds) ? 0 : 4) + (replaced && q.topic === replaced.topic ? 0 : 2) + (seen?.has(q.id) ? 1 : 0);
  const bestScore = Math.min(...candidates.map(score));
  const best = candidates.filter((q) => score(q) === bestScore);
  return best[Math.floor(random() * best.length)].id;
}

// Called after the question at `afterIndex` was the third wrong answer in a
// row. Finds a tidbit whose question has not been asked yet and moves that
// question to afterIndex + 3 by swapping it with whatever sits there. Both
// swapped questions are still unasked, so the set in the run never changes.
// Prefers, in this order: a tidbit whose question is on a different topic
// from the missed ones, a swap that doesn't put two questions of the same
// topic next to each other, and the smallest move. Returns null when nothing
// fits, including when afterIndex + 3 falls past the end of the run.
export function planTidbit({ order, afterIndex, missedIds, questionsById, tidbits, usedTidbitIds = [] }) {
  const target = afterIndex + TIDBIT_OFFSET;
  if (target >= order.length) return null;

  const missedTopics = new Set(missedIds.map((id) => questionsById[id]?.topic));
  const positions = new Map(order.map((id, i) => [id, i]));
  const topicAt = (list, i) => questionsById[list[i]]?.topic;

  const candidates = tidbits
    .filter((t) => !usedTidbitIds.includes(t.id) && !missedIds.includes(t.tidbitFor))
    .map((t) => {
      const position = positions.get(t.tidbitFor);
      if (position === undefined || position <= afterIndex) return null;
      const nextOrder = order.slice();
      [nextOrder[position], nextOrder[target]] = [nextOrder[target], nextOrder[position]];
      let clashes = 0;
      for (let i = afterIndex + 1; i < nextOrder.length; i++) {
        if (topicAt(nextOrder, i) === topicAt(nextOrder, i - 1)) clashes += 1;
      }
      const topicPenalty = missedTopics.has(questionsById[t.tidbitFor]?.topic) ? 1000 : 0;
      return { tidbit: t, nextOrder, score: topicPenalty + clashes * 50 + Math.abs(position - target) };
    })
    .filter(Boolean);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.score - b.score);
  const { tidbit, nextOrder } = candidates[0];
  return { tidbit, order: nextOrder, seededIndex: target };
}
