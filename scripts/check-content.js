import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkContent, checkCopy } from './content-rules.js';
import { checkQuestion, normalizeQuestion } from '../src/lib/questionRules.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', file), 'utf8'));
const readOptional = (file, fallback) => {
  try {
    return read(file);
  } catch {
    return fallback;
  }
};

const data = read('questions.json');
const pending = read('pending-questions.json');
const { themes } = read('themes.json');
const daily = readOptional('daily-questions.json', { questions: [] });
const { errors, warnings, stats } = checkContent(data, pending, { themes, daily });

// Pictures that ship with the site for questions in the database: each needs
// its published file, its thumbnail and a description.
const siteImages = readOptional('site-images.json', { images: [] });
for (const img of siteImages.images ?? []) {
  for (const file of [`public/images/${img.id}.webp`, `public/images/thumbs/${img.id}.webp`]) {
    try {
      statSync(path.join(ROOT, file));
    } catch {
      errors.push(`site-images.json: ${img.id} has no ${file} (drop images/${img.id}.jpg in and run npm run images).`);
    }
  }
  if (!img.alt?.trim()) errors.push(`site-images.json: ${img.id} needs "alt", a description of the picture.`);
}

// A question whose picture ships with the site needs that file and its thumbnail.
for (const q of [...data.questions, ...pending.questions, ...(daily.questions ?? [])]) {
  const src = q.image?.src;
  if (!src?.startsWith('/images/') || q.image.placeholder) continue;
  // Its share card too: what chat apps show when the question is shared.
  const card = src.replace(/^\/images\//, '/images/share/').replace(/\.\w+$/, '.jpg');
  const files = [src, q.image.thumb, card].filter(Boolean).map((p) => path.join('public', p));
  for (const file of files) {
    try {
      statSync(path.join(ROOT, file));
    } catch {
      errors.push(`${q.id}: its picture ${file.replaceAll('\\', '/')} is missing (drop images/${q.id}.png in and run npm run images).`);
    }
  }
}

// Proposed edits: each for a question that exists, and the question as it
// would read after the edit passes the same checks, length limits included.
const questionEdits = readOptional('question-edits.json', { edits: [] });
const themeIds = themes.map((t) => t.id);
const byId = new Map([
  ...data.questions.map((q) => [q.id, { q, kind: 'run' }]),
  ...pending.questions.map((q) => [q.id, { q, kind: 'run' }]),
  ...(daily.questions ?? []).map((q) => [q.id, { q, kind: 'daily' }]),
]);
const edited = new Set();
for (const e of questionEdits.edits ?? []) {
  const found = byId.get(e.id);
  if (!found) {
    errors.push(`question-edits.json: no question with the id "${e.id}".`);
    continue;
  }
  if (edited.has(e.id)) errors.push(`question-edits.json: "${e.id}" has two proposals; keep one.`);
  edited.add(e.id);
  const after = normalizeQuestion({ ...found.q, ...e.changes });
  const result = checkQuestion(after, { themeIds, kind: found.kind });
  for (const err of result.errors) errors.push(`question-edits.json: "${e.id}" after the edit: ${err}`);
  for (const w of result.warnings.filter((x) => /words/.test(x))) errors.push(`question-edits.json: "${e.id}" after the edit: ${w}`);
}

// Every source file that can put words on screen.
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    // questionRules.js is where the banned words are defined, so it's skipped.
    return /\.(jsx?|html)$/.test(name) && !name.endsWith('.test.js') && name !== 'questionRules.js' ? [full] : [];
  });
}
const copyErrors = checkCopy(
  [...sourceFiles(path.join(ROOT, 'src')), path.join(ROOT, 'index.html')].map((file) => ({
    path: path.relative(ROOT, file).replaceAll('\\', '/'),
    text: readFileSync(file, 'utf8'),
  })),
);
errors.push(...copyErrors);

for (const w of warnings) console.warn(`warning  ${w}`);
for (const e of errors) console.error(`error    ${e}`);

console.log(
  `\n${stats.questions} live questions, ${stats.pending} pending, ${stats.daily} daily, ${data.tidbits.length} tidbits, ${errors.length} errors, ${warnings.length} warnings`,
);
console.log(`live questions per topic: ${Object.entries(stats.perTheme).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`correct option longest in ${stats.correctLongest}, shortest in ${stats.correctShortest}`);
process.exit(errors.length ? 1 : 0);
