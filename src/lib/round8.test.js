import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom, optionOrder, viewOf, toOriginal, toDisplay } from './shuffle.js';
import { cleanName, isTestName, nameProblem } from './names.js';
import { computeStreak, isPlausibleDay } from './daily.js';
import { buildRun, questionPool, replacementFor } from './run.js';
import { verifySession } from './verifySession.js';
import { checkQuestion } from './questionRules.js';
import { checkCopy } from '../../scripts/content-rules.js';
import { RUN_LENGTH } from './scoring.js';

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

// A bank of 60 questions over three themes and four topics.
function bank() {
  const topics = ['everyday-object', 'industrial', 'furniture', 'ui'];
  return Array.from({ length: 60 }, (_, i) => ({
    id: `q${i}`,
    topic: topics[i % 4],
    themes: [['a', 'b', 'c'][i % 3]],
    tags: [`t${i % 5}`],
  }));
}

test('a narrow topic choice is quietly topped up to a full pool from related questions', () => {
  const questions = bank();
  const onlyA = questionPool(questions, ['a'], seededRandom('x'));
  assert.equal(onlyA.length, 20, 'a stays at its 20');
  const tiny = questions.slice(0, 12);
  const pool = questionPool(tiny, ['a'], seededRandom('x'));
  assert.ok(pool.length >= Math.min(tiny.length, RUN_LENGTH), 'enough to build a run');
});

test('runs keep to chosen topics and prefer questions not seen yet', () => {
  const questions = bank();
  const order = buildRun(questions, [], seededRandom('run'), { themeIds: ['a', 'b'] });
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
  assert.equal(order.length, RUN_LENGTH);
  assert.ok(order.every((id) => ['a', 'b'].includes(byId[id].themes[0])));
  const seen = new Set(questions.filter((q) => q.themes[0] !== 'c').map((q) => q.id).slice(0, 30));
  const fresh = buildRun(questions, [], seededRandom('fresh'), { seen });
  assert.ok(fresh.filter((id) => seen.has(id)).length <= 2, 'mostly unseen questions');
});

test('a swapped-in question is new to the run, shares no group, and keeps the topic when it can', () => {
  const questions = [
    { id: 'a', topic: 'ui', group: 'g' },
    { id: 'b', topic: 'ui' },
    { id: 'c', topic: 'ui', group: 'g' },
    { id: 'd', topic: 'furniture' },
    { id: 'e', topic: 'ui' },
    { id: 'm', topic: 'myth-buster' },
  ];
  const pick = replacementFor({ replacedId: 'b', runIds: ['a', 'b', 'd'], questions, random: seededRandom('s') });
  assert.equal(pick, 'e', 'c shares a group with a, d is in the run, m is a myth');
  assert.equal(replacementFor({ replacedId: 'b', runIds: ['a', 'b', 'd', 'e'], excludeIds: ['c'], questions }), null);
});

test('a run checks out against the version of a question its player saw', () => {
  const answers = Array.from({ length: RUN_LENGTH }, (_, i) => ({
    id: `v${i}`,
    topic: 'ui',
    chosenIndex: 0,
    correct: true,
    elapsedSeconds: 5,
    points: 10,
  }));
  const session = { questions: answers, timestamp: '2026-09-20T10:00:00.000Z', finishedAt: '2026-09-20T10:05:00.000Z', durationMs: 300000 };
  const current = Object.fromEntries(answers.map((a) => [a.id, { id: a.id, topic: 'ui', correctIndex: 0 }]));
  // v0's answer was changed to option 3 after this run started.
  const edited = { ...current, v0: [{ id: 'v0', topic: 'ui', correctIndex: 3 }] };
  assert.equal(verifySession(session, edited), null, 'without the old version it fails');
  const withHistory = { ...current, v0: [{ id: 'v0', topic: 'ui', correctIndex: 3 }, { id: 'v0', topic: 'ui', correctIndex: 0 }] };
  assert.equal(verifySession(session, withHistory).score, 100);
});

test('questions need a known topic; daily questions need no hint', () => {
  const base = {
    id: 'daily-x',
    topic: 'ui',
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
