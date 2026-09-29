// The feedback form, as data: the questions, and the check both the quiz and
// the server run on an answer. Pure. A new question is an entry here.

export const RATINGS = [
  { id: 'overall', label: 'How was it, overall?' },
  { id: 'questions', label: 'How were the questions?' },
  { id: 'pictures', label: 'And the pictures?' },
];

export const MORE_OF = [
  { id: 'everyday', label: 'Everyday objects' },
  { id: 'screens', label: 'Apps and screens' },
  { id: 'signs', label: 'Signs and symbols' },
  { id: 'places', label: 'Buildings and places' },
  { id: 'packaging', label: 'Packaging and food' },
  { id: 'travel', label: 'Cars and travel' },
  { id: 'india', label: 'Things from India' },
  { id: 'stories', label: 'Famous design stories' },
];

export const RECOMMEND = [
  { id: 'yes', label: 'Yes' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'no', label: 'No' },
];

export const NOTE_MAX = 1000;

// Returns { answers, note } with only the known parts, or null when nothing
// was answered at all.
export function cleanFeedback(input) {
  const answers = {};
  for (const { id } of RATINGS) {
    const v = input?.ratings?.[id];
    if (Number.isInteger(v) && v >= 1 && v <= 5) (answers.ratings ??= {})[id] = v;
  }
  const more = Array.isArray(input?.more) ? input.more.filter((m) => MORE_OF.some((o) => o.id === m)) : [];
  if (more.length) answers.more = [...new Set(more)];
  if (typeof input?.moreOther === 'string' && input.moreOther.trim()) answers.moreOther = input.moreOther.trim().slice(0, 200);
  if (RECOMMEND.some((r) => r.id === input?.recommend)) answers.recommend = input.recommend;
  const note = typeof input?.note === 'string' ? input.note.trim().slice(0, NOTE_MAX) : '';
  if (!Object.keys(answers).length && !note) return null;
  return { answers, note: note || null };
}
