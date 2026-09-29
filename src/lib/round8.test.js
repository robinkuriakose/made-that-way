import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom, optionOrder, viewOf, toOriginal, toDisplay } from './shuffle.js';
import { cleanName, isTestName, nameProblem } from './names.js';
import { computeStreak, isPlausibleDay } from './daily.js';
import { checkQuestion } from './questionRules.js';
import { checkCopy } from '../../scripts/content-rules.js';

const question = {
  id: 'q',
  options: ['a', 'b', 'c', 'd'],
  correctIndex: 2,
  explanationWrong: ['wa', 'wb', null, 'wd'],
};

test('a shuffled view keeps each option with its own explanation and the right answer', () => {
  const order = [3, 2, 0, 1];
  const view = viewOf(question, order);
  assert.deepEqual(view.options, ['d', 'c', 'a', 'b']);
  assert.equal(view.options[view.correctIndex], 'c');
  assert.deepEqual(view.explanationWrong, ['wd', null, 'wa', 'wb']);
  for (let shown = 0; shown < 4; shown++) assert.equal(toDisplay(order, toOriginal(order, shown)), shown);
  assert.equal(toDisplay(order, null), null, 'no answer stays no answer');
});

test('shuffles are seeded where they need to repeat, and always a full permutation', () => {
  assert.deepEqual(optionOrder(4, seededRandom('device:2026-09-20')), optionOrder(4, seededRandom('device:2026-09-20')));
  for (let i = 0; i < 50; i++) assert.deepEqual([...optionOrder()].sort(), [0, 1, 2, 3]);
});

test('test names are words starting with "test", not any word containing it', () => {
  for (const name of ['test', 'Test 2', 'Robin test', 'testing', 'my_test']) assert.equal(isTestName(name), true, name);
  for (const name of ['Protest', 'Contest', 'Attested', 'Robin']) assert.equal(isTestName(name), false, name);
});

test('names with links, handles or blocked words are refused; normal names pass', () => {
  assert.ok(nameProblem('visit www.spam.com'));
  assert.ok(nameProblem('@spammer'));
  assert.ok(nameProblem('me@mail.com'));
  assert.ok(nameProblem('F.u.c.k'));
  assert.equal(nameProblem('Ada Lovelace'), null);
  assert.equal(nameProblem('Priya S.'), null);
  assert.equal(cleanName('  Ada\nLovelace '), 'Ada Lovelace');
});

test('a streak counts back over days that had a question, and gaps without one never break it', () => {
  const scheduled = (days) => days.map((day) => ({ day, isVoid: false }));
  const s = scheduled(['2026-09-20', '2026-09-19', '2026-09-17', '2026-09-16']);
  // 18th had no question at all, so 16, 17, 19 answered makes a streak of 3.
  assert.equal(computeStreak(s, new Set(['2026-09-19', '2026-09-17', '2026-09-16']), '2026-09-20'), 3, 'today unanswered does not break it');
  assert.equal(computeStreak(s, new Set(['2026-09-20', '2026-09-19', '2026-09-17', '2026-09-16']), '2026-09-20'), 4);
  assert.equal(computeStreak(s, new Set(['2026-09-20', '2026-09-17']), '2026-09-20'), 1, 'a missed day breaks it');
  const voided = [{ day: '2026-09-20', isVoid: false }, { day: '2026-09-19', isVoid: true }, { day: '2026-09-18', isVoid: false }];
  assert.equal(computeStreak(voided, new Set(['2026-09-20', '2026-09-18']), '2026-09-20'), 2, 'a voided day never breaks it');
});

test('only days within a day of the server date are accepted', () => {
  const now = Date.parse('2026-09-20T10:00:00Z');
  assert.equal(isPlausibleDay('2026-09-20', now), true);
  assert.equal(isPlausibleDay('2026-09-21', now), true);
  assert.equal(isPlausibleDay('2026-09-19', now), true);
  assert.equal(isPlausibleDay('2026-09-17', now), false);
  assert.equal(isPlausibleDay('2027-01-01', now), false);
});

test('questions need a known topic; daily questions need no hint', () => {
  const base = {
    id: 'daily-x',
    topic: 'ui',
    difficulty: 'medium',
    tags: ['t'],
    themes: ['screens'],
    stem: 'Why is it so?',
    options: ['One way', 'Another way', 'A third way', 'A fourth way'],
    correctIndex: 0,
    explanationRight: 'Because.',
    explanationWrong: [null, 'No.', 'No.', 'No.'],
    confidence: 'accurate',
    sourceName: 'Source',
    sourceUrl: 'https://example.org',
  };
  assert.deepEqual(checkQuestion(base, { themeIds: ['screens'], kind: 'daily' }).errors, []);
  assert.ok(checkQuestion(base, { themeIds: ['screens'] }).errors.some((e) => e.includes('hint')));
  assert.ok(checkQuestion({ ...base, themes: ['nope'] }, { themeIds: ['screens'], kind: 'daily' }).errors.some((e) => e.includes('Unknown topic')));
  assert.ok(checkQuestion({ ...base, themes: [] }, { kind: 'daily' }).errors.some((e) => e.includes('topic')));
});

test('on-screen copy is checked for dashes, but code comments are not', () => {
  const dash = String.fromCharCode(0x2014);
  const errors = checkCopy([
    { path: 'a.jsx', text: `// a comment ${dash} fine\nconst label = 'Best ${dash} ever';` },
    { path: 'b.jsx', text: `/* block ${dash} fine */\nconst url = 'https://example.org';` },
  ]);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].startsWith('a.jsx:2'));
});
