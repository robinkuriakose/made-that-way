import { tierOf } from './levels.js';

export const REDEEM_CHOICES = 3;
// Questions the run's levels still need (in the quiz, the ones with a
// picture) are offered only when they fit much better, so redeems don't use
// up the levels still to come.
const KEEP_FOR_LEVELS = 8;

// How closely a candidate relates to the question that was missed: shared
// group first (the near duplicates, where what the player just learned
// applies straight away), then shared tags, then the same topic.
function relatedness(missed, candidate) {
  const tags = new Set(missed.tags ?? []);
  const sharedTags = (candidate.tags ?? []).filter((t) => tags.has(t)).length;
  const sameGroup = missed.group && candidate.group === missed.group ? 1 : 0;
  const sameTopic = candidate.topic === missed.topic ? 1 : 0;
  return sameGroup * 20 + sharedTags * 6 + sameTopic * 3;
}

// Picks the questions offered after a wrong answer. Candidates are never
// part of the run (usedIds: asked, queued or redeemed already), so a redeem
// never spoils a question still to come. Questions offered earlier in the
// run are used only if nothing else is left. keepIds are questions the
// levels still need. Hard questions are left out while there are enough
// others, so a second chance stays fair. The random nudge is smaller than one
// step of relatedness, so it only shuffles questions that are equally related.
export function pickRedeemQuestions({ missed, questions, usedIds, alreadyOffered = [], keepIds = [], random = Math.random }) {
  const blocked = new Set([...usedIds, missed.id]);
  const offered = new Set(alreadyOffered);
  const keep = new Set(keepIds);
  const open = questions.filter((q) => !blocked.has(q.id));
  const fair = open.filter((q) => tierOf(q) !== 'hard');
  const pool = fair.length >= REDEEM_CHOICES ? fair : open;
  const fresh = pool.filter((q) => !offered.has(q.id));
  const source = fresh.length >= REDEEM_CHOICES ? fresh : pool;

  return source
    .map((q) => ({ id: q.id, score: relatedness(missed, q) - (keep.has(q.id) ? KEEP_FOR_LEVELS : 0) + random() * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, REDEEM_CHOICES)
    .map((c) => c.id);
}
