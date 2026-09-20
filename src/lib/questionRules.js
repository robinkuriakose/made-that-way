// Rules for a single question. Used by the content check script, by the API
// before saving anything from the builder, and by the builder form to show
// problems while you type. Pure: no DOM, no Node APIs.

// Topics are internal: they keep a run balanced and mark myth busters.
// Players choose by theme instead (src/data/themes.json, stored in the
// database), and a question can belong to several themes.
export const TOPICS = ['everyday-object', 'industrial', 'furniture', 'ui', 'myth-buster'];
// Run questions appear in runs. Daily questions only ever appear as the
// question of the day, and never repeat.
export const KINDS = ['run', 'daily'];
export const CONFIDENCE = ['accurate', 'high confidence', 'medium confidence', 'deduction'];

// Length should say nothing about which answer is right.
export const MAX_CORRECT_LEAD_WORDS = 2;
export const MAX_CORRECT_LEAD_CHARS = 10;
export const MAX_SPREAD_WORDS = 8;

export const BANNED_TEXT = [
  { pattern: new RegExp(String.fromCharCode(0x2014)), label: 'an em dash' },
  { pattern: new RegExp(String.fromCharCode(0x2013)), label: 'an en dash' },
  { pattern: /cognitive load/i, label: '"cognitive load"' },
  { pattern: /wayfinding/i, label: '"wayfinding"' },
];

const REQUIRED_TEXT = [
  ['id', 'an id'],
  ['stem', 'the question'],
  ['hint', 'a hint'],
  ['explanationRight', 'the explanation for the right answer'],
  ['sourceName', 'a source name'],
  ['sourceUrl', 'a source link'],
];

export const wordCount = (s) => (typeof s === 'string' && s.trim() ? s.trim().split(/\s+/).length : 0);

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

// Turns a question into a short, readable id, e.g. "why-are-manhole-covers-round".
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter((w) => !['why', 'do', 'does', 'is', 'are', 'the', 'a', 'an', 'of', 'on', 'in', 'so', 'many', 'most'].includes(w))
    .slice(0, 6)
    .join('-');
}

// Fields the server manages. They're never stored inside a question's data.
const MANAGED_FIELDS = ['status', 'origin', 'feedback', 'createdAt', 'updatedAt', 'kind', 'position', 'day', 'stats'];

const trimmed = (v) => (typeof v === 'string' ? v.trim() : v);

// Tidies a question before it's checked or saved: trims text, drops empty
// optional parts (image, tidbit, group), dedupes tags, and nulls the
// wrong-answer explanation slot of the correct option.
export function normalizeQuestion(input) {
  const q = { ...input };
  for (const k of MANAGED_FIELDS) delete q[k];
  for (const k of ['id', 'topic', 'stem', 'hint', 'explanationRight', 'confidence', 'sourceName', 'sourceUrl']) {
    q[k] = trimmed(q[k]);
  }
  if (Array.isArray(q.options)) q.options = q.options.map(trimmed);
  if (Array.isArray(q.explanationWrong)) {
    q.explanationWrong = q.explanationWrong.map((e, i) => (i === q.correctIndex ? null : trimmed(e)));
  }
  if (Array.isArray(q.tags)) {
    q.tags = [...new Set(q.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  }
  if (Array.isArray(q.themes)) q.themes = [...new Set(q.themes.map((t) => String(t).trim()).filter(Boolean))];
  if (q.group == null || !String(q.group).trim()) delete q.group;
  else q.group = String(q.group).trim();

  if (!q.image || !trimmed(q.image.src)) delete q.image;
  else {
    const credit = trimmed(q.image.credit);
    const thumb = trimmed(q.image.thumb);
    q.image = {
      src: trimmed(q.image.src),
      alt: trimmed(q.image.alt) ?? '',
      ...(thumb ? { thumb } : {}),
      ...(credit ? { credit } : {}),
      // A stand-in shown only when running locally, never on the live site.
      ...(q.image.placeholder ? { placeholder: true } : {}),
    };
  }
  if (!q.tidbit || !trimmed(q.tidbit.text)) delete q.tidbit;
  else q.tidbit = { id: q.tidbit.id || `tidbit-${q.id}`, text: trimmed(q.tidbit.text) };
  return q;
}

// Every string anywhere in the question, with a readable path, for the
// banned text check.
function* strings(value, path) {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (let i = 0; i < value.length; i++) yield* strings(value[i], `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* strings(v, path ? `${path}.${k}` : k);
}

// Returns { errors, warnings } as plain sentences. Errors block saving;
// warnings are worth a look but don't.
//
// options.themeIds: the themes that exist (from the database or
// themes.json). options.kind: 'daily' questions have no timer, so no hint.
export function checkQuestion(q, { themeIds = null, kind = 'run' } = {}) {
  const errors = [];
  const warnings = [];
  if (!q || typeof q !== 'object') return { errors: ['Not a question.'], warnings };

  for (const [field, label] of REQUIRED_TEXT) {
    if (field === 'hint' && kind === 'daily') continue;
    if (!isText(q[field])) errors.push(`Missing ${label}.`);
  }
  if (!Array.isArray(q.themes) || q.themes.length === 0 || !q.themes.every(isText)) {
    errors.push('Pick at least one topic. Players choose which topics to play.');
  } else if (themeIds) {
    const unknown = q.themes.filter((t) => !themeIds.includes(t));
    if (unknown.length) errors.push(`Unknown topic: ${unknown.join(', ')}.`);
  }
  if (isText(q.id) && !/^[a-z0-9][a-z0-9-]{1,63}$/.test(q.id)) {
    errors.push('The id should be lowercase letters, numbers and dashes, up to 64 characters.');
  }
  if (!TOPICS.includes(q.topic)) errors.push('Pick a topic.');
  if (!CONFIDENCE.includes(q.confidence)) errors.push('Pick a confidence level.');
  if (isText(q.sourceUrl) && !/^https?:\/\/\S+$/.test(q.sourceUrl.trim())) errors.push('The source link should start with http:// or https://.');
  if (!Array.isArray(q.tags) || q.tags.length === 0 || !q.tags.every(isText)) {
    errors.push('Add at least one tag. Redeem uses tags to find related questions.');
  }
  if (q.group !== undefined && q.group !== null && !isText(q.group)) errors.push('The group should be text, or left empty.');

  const optionsOk = Array.isArray(q.options) && q.options.length === 4 && q.options.every(isText);
  if (!optionsOk) errors.push('Fill in all four options.');
  const indexOk = Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3;
  if (!indexOk) errors.push('Mark which option is correct.');

  if (!Array.isArray(q.explanationWrong) || q.explanationWrong.length !== 4) {
    errors.push('Each wrong option needs its own explanation.');
  } else if (indexOk) {
    q.explanationWrong.forEach((text, i) => {
      if (i === q.correctIndex && text !== null) errors.push(`Option ${'ABCD'[i]} is the right one, so it shouldn't have a wrong-answer explanation.`);
      if (i !== q.correctIndex && !isText(text)) errors.push(`Option ${'ABCD'[i]} needs an explanation of why it's wrong.`);
    });
  }

  if (optionsOk && indexOk) {
    const words = q.options.map(wordCount);
    const chars = q.options.map((o) => o.trim().length);
    const others = (list) => list.filter((_, i) => i !== q.correctIndex);
    const wordLead = words[q.correctIndex] - Math.max(...others(words));
    const charLead = chars[q.correctIndex] - Math.max(...others(chars));
    if (wordLead > MAX_CORRECT_LEAD_WORDS) {
      errors.push(`The right option is ${wordLead} words longer than the longest wrong one. Keep it within ${MAX_CORRECT_LEAD_WORDS}, or length gives the answer away.`);
    } else if (charLead > MAX_CORRECT_LEAD_CHARS) {
      warnings.push(`The right option is ${charLead} characters longer than any wrong one, which can stand out.`);
    }
    if (Math.max(...words) - Math.min(...words) > MAX_SPREAD_WORDS) {
      warnings.push(`Options range from ${Math.min(...words)} to ${Math.max(...words)} words. Closer is better.`);
    }
    const lower = q.options.map((o) => o.trim().toLowerCase());
    if (new Set(lower).size !== 4) errors.push('Two options are the same.');
  }

  if (q.image) {
    if (!isText(q.image.src)) errors.push('The image has no file.');
    if (!isText(q.image.alt)) errors.push('Describe the image in the alt text, for people who can\'t see it.');
    if (!isText(q.image.credit)) warnings.push('The image has no credit line yet.');
  }
  if (q.tidbit && !isText(q.tidbit.text)) errors.push('The tidbit is empty. Remove it or add text.');

  for (const [path, text] of strings(q, '')) {
    for (const { pattern, label } of BANNED_TEXT) {
      if (pattern.test(text)) errors.push(`${path || 'Text'} contains ${label}.`);
    }
  }

  return { errors, warnings };
}
