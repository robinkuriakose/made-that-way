export const REDEEM_CHOICES = 3;

// How closely a candidate relates to the question that was missed: shared
// group first (the near duplicates), then shared tags, then the same topic.
function relatedness(missed, candidate) {
  const tags = new Set(missed.tags ?? []);
  const sharedTags = (candidate.tags ?? []).filter((t) => tags.has(t)).length;
  const sameGroup = missed.group && candidate.group === missed.group ? 1 : 0;
  const sameTopic = candidate.topic === missed.topic ? 1 : 0;
  return sameGroup * 20 + sharedTags * 6 + sameTopic * 3;
}

// Picks the questions offered after a wrong answer. Candidates come from
// outside the run, so a redeem never spoils a question still to come.
// Questions already offered earlier in the run are used only if nothing else
// is left. The random nudge is smaller than one step of relatedness, so it
// only shuffles questions that are equally related.
export function pickRedeemQuestions({ missed, questions, runIds, alreadyOffered = [], random = Math.random }) {
  const blocked = new Set([...runIds, missed.id]);
  const offered = new Set(alreadyOffered);
  const pool = questions.filter((q) => !blocked.has(q.id));
  const fresh = pool.filter((q) => !offered.has(q.id));
  const source = fresh.length >= REDEEM_CHOICES ? fresh : pool;

  return source
    .map((q) => ({ id: q.id, score: relatedness(missed, q) + random() * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, REDEEM_CHOICES)
    .map((c) => c.id);
}
