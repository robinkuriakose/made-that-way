import { checkQuestion, TOPICS, BANNED_TEXT } from '../src/lib/questionRules.js';

export const MIN_QUESTIONS = 40;
// Every topic players can pick should be able to carry a run on its own.
export const MIN_PER_THEME = 8;

// Across the whole set, the right option should be the longest (or shortest)
// only about as often as chance would give. (Where the right answer sits no
// longer matters: options are shuffled for every player.)
const MAX_SHARE_CORRECT_LONGEST = 0.3;
const MAX_SHARE_CORRECT_SHORTEST = 0.3;

const words = (s) => s.trim().split(/\s+/).length;

// Checks the bundled content: the live questions and tidbits in
// questions.json, the pending batch waiting for review, and the daily
// questions. Returns { errors, warnings, stats }.
export function checkContent(data, pending = { questions: [] }, { themes = [], daily = { questions: [] } } = {}) {
  const errors = [];
  const warnings = [];
  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const pendingQuestions = Array.isArray(pending?.questions) ? pending.questions : [];
  const dailyQuestions = Array.isArray(daily?.questions) ? daily.questions : [];
  const tidbits = Array.isArray(data?.tidbits) ? data.tidbits : [];
  const themeIds = themes.map((t) => t.id);
  const ids = new Set();
  let correctLongest = 0;
  let correctShortest = 0;
  let missingCredits = 0;

  if (questions.length < MIN_QUESTIONS) {
    errors.push(`Expected at least ${MIN_QUESTIONS} questions, found ${questions.length}.`);
  }

  const all = [
    ...questions.map((q) => ({ q, where: `Question "${q.id ?? '(no id)'}"`, live: true, kind: 'run' })),
    ...pendingQuestions.map((q) => ({ q, where: `Pending "${q.id ?? '(no id)'}"`, live: false, kind: 'run' })),
    ...dailyQuestions.map((q) => ({ q, where: `Daily "${q.id ?? '(no id)'}"`, live: false, kind: 'daily' })),
  ];

  for (const { q, where, live, kind } of all) {
    if (q.id) {
      if (ids.has(q.id)) errors.push(`${where}: duplicate id.`);
      ids.add(q.id);
    }
    const result = checkQuestion(q, { themeIds: themeIds.length ? themeIds : null, kind });
    for (const e of result.errors) errors.push(`${where}: ${e}`);
    for (const w of result.warnings) {
      if (w.startsWith('The image has no credit')) missingCredits += 1;
      else warnings.push(`${where}: ${w}`);
    }

    if (!live) continue;
    if (Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correctIndex)) {
      const counts = q.options.map(words);
      const correct = counts[q.correctIndex];
      const wrong = counts.filter((_, i) => i !== q.correctIndex);
      if (correct > Math.max(...wrong)) correctLongest += 1;
      if (correct < Math.min(...wrong)) correctShortest += 1;
    }
  }

  if (missingCredits) warnings.push(`${missingCredits} images have no credit line yet (see docs/owner-checklist.md).`);

  if (questions.length) {
    const share = (n) => n / questions.length;
    if (share(correctLongest) > MAX_SHARE_CORRECT_LONGEST) {
      warnings.push(`The correct option is the longest in ${correctLongest} of ${questions.length} questions, which players can learn.`);
    }
    if (share(correctShortest) > MAX_SHARE_CORRECT_SHORTEST) {
      warnings.push(`The correct option is the shortest in ${correctShortest} of ${questions.length} questions, which players can learn.`);
    }
  }

  const perTheme = Object.fromEntries(themeIds.map((id) => [id, 0]));
  for (const q of questions) for (const t of q.themes ?? []) if (t in perTheme) perTheme[t] += 1;
  for (const [id, n] of Object.entries(perTheme)) {
    if (n < MIN_PER_THEME) warnings.push(`Topic "${id}" has ${n} live questions; ${MIN_PER_THEME} or more keeps its runs fresh.`);
  }

  const myths = questions.filter((q) => q.topic === 'myth-buster').length;
  if (myths === 0) warnings.push('No myth buster questions, so no run will include one.');
  for (const topic of TOPICS) {
    if (!questions.some((q) => q.topic === topic)) warnings.push(`No live questions in topic "${topic}".`);
  }

  const seeded = new Set();
  for (const t of tidbits) {
    const where = `Tidbit "${t.id ?? '(no id)'}"`;
    if (!t.id || typeof t.text !== 'string' || !t.text.trim()) errors.push(`${where}: needs an id and text.`);
    if (!questions.some((q) => q.id === t.tidbitFor)) errors.push(`${where}: tidbitFor "${t.tidbitFor}" is not a live question id.`);
    if (seeded.has(t.tidbitFor)) errors.push(`${where}: another tidbit already seeds "${t.tidbitFor}".`);
    seeded.add(t.tidbitFor);
    if (questions.find((q) => q.id === t.tidbitFor)?.topic === 'myth-buster') {
      warnings.push(`${where}: seeds a myth buster, which is missing from about half of runs.`);
    }
  }

  return {
    errors,
    warnings,
    stats: {
      questions: questions.length,
      pending: pendingQuestions.length,
      daily: dailyQuestions.length,
      perTheme,
      correctLongest,
      correctShortest,
    },
  };
}

// The copy rules apply to what players and the owner read on screen too, not
// only to questions. Checks source files with comments removed, so a dash in
// a code comment doesn't count.
export function checkCopy(files) {
  const errors = [];
  for (const { path, text } of files) {
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    code.split('\n').forEach((line, i) => {
      for (const { pattern, label } of BANNED_TEXT) {
        if (pattern.test(line)) errors.push(`${path}:${i + 1} contains ${label}.`);
      }
    });
  }
  return errors;
}
