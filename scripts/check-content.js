import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkContent, checkCopy } from './content-rules.js';

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
