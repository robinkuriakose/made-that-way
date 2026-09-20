// The question bank as the app and the database see it. In the database
// each question carries its own tidbit (question.tidbit = { id, text }); the
// run logic wants tidbits as a separate list ({ id, tidbitFor, text }). These
// convert between the two. Pure, so both the client and the API use them.

export const STATUSES = ['live', 'hidden', 'pending', 'rejected'];

// Attaches each tidbit to the question it seeds.
export function mergeTidbits(questions, tidbits = []) {
  const byQuestion = new Map(tidbits.map((t) => [t.tidbitFor, t]));
  return questions.map((q) => {
    const t = byQuestion.get(q.id);
    return t ? { ...q, tidbit: { id: t.id, text: t.text } } : q;
  });
}

// Pulls tidbits back out into the list the run logic uses.
export function splitTidbits(questions) {
  const tidbits = questions
    .filter((q) => q.tidbit && typeof q.tidbit.text === 'string' && q.tidbit.text.trim())
    .map((q) => ({ id: q.tidbit.id || `tidbit-${q.id}`, tidbitFor: q.id, text: q.tidbit.text }));
  return { questions, tidbits };
}
