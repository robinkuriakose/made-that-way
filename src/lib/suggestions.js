// Questions players suggest, in two shapes. Pure, shared by the form and the
// server.
//   quick: one line, a question and its answer or just a fact.
//   full:  the question, the right answer, three wrong ones, and optionally
//          a hint, a source link and a picture.
// Every suggestion is credited to a name: the one the player types on the
// last step, or their placeholder name if they'd rather stay mysterious.

export const QUICK_MAX = 280;
export const FIELD_MAX = 200;
export const SOURCE_MAX = 400;

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Returns { data } or { error } with a sentence a player can act on.
export function cleanSuggestion(kind, input) {
  if (kind === 'quick') {
    const t = text(input?.text, QUICK_MAX);
    if (t.length < 10) return { error: 'Write a little more: a question and its answer, or the fact itself.' };
    return { data: { text: t } };
  }
  if (kind === 'full') {
    const question = text(input?.question, FIELD_MAX);
    const answer = text(input?.answer, FIELD_MAX);
    const wrong = Array.isArray(input?.wrong) ? input.wrong.map((w) => text(w, FIELD_MAX)) : [];
    if (question.length < 8) return { error: 'Add the question.' };
    if (!answer) return { error: 'Add the right answer.' };
    if (wrong.length !== 3 || wrong.some((w) => !w)) return { error: 'Add three wrong answers.' };
    const all = [answer, ...wrong].map((a) => a.toLowerCase());
    if (new Set(all).size !== 4) return { error: 'Two of the answers are the same.' };
    const source = text(input?.source, SOURCE_MAX);
    if (source && !/^https?:\/\/\S+$/.test(source)) return { error: 'The source should be a link starting with http:// or https://.' };
    const hint = text(input?.hint, FIELD_MAX);
    const image = typeof input?.image === 'string' && /^(https?:)?\/\/?\S+$/.test(input.image) ? input.image.slice(0, 500) : '';
    return { data: { question, answer, wrong, ...(hint ? { hint } : {}), ...(source ? { source } : {}), ...(image ? { image } : {}) } };
  }
  return { error: 'Pick a kind of suggestion.' };
}
