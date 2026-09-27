import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pointsFor,
  replay,
  levelOf,
  levelMultiplier,
  comboMultiplier,
  levelSlices,
  isPerfectLevel,
  LEVEL_SIZE,
  START_LIVES,
  MAX_LIVES,
  MAX_POINTS,
} from './scoring.js';
import { buildLevel, replacementFor, openQuestions, easeOf, percentRight, MYTH_TOPIC } from './levels.js';
import { pickRedeemQuestions } from './redeem.js';
import { verifySession, sessionQuestionIds } from './verifySession.js';
import { levelBadges, whysBadges, streakBadges, beatsBest } from './rewards.js';
import { weekStart, resetWords } from './week.js';
import { firstSentence } from './text.js';
import { seededRandom } from './shuffle.js';

// Scoring

test('points grow with the level and the combo, and a hint halves them', () => {
  assert.equal(pointsFor({ correct: true, level: 1, streak: 1 }), 10);
  assert.equal(pointsFor({ correct: true, level: 2, streak: 1 }), 12);
  assert.equal(pointsFor({ correct: true, level: 3, streak: 1 }), 15);
  assert.equal(pointsFor({ correct: true, level: 99, streak: 1 }), 30, 'the level multiplier stops at x3');
  assert.equal(pointsFor({ correct: true, level: 1, streak: 3 }), 15, 'three in a row is x1.5');
  assert.equal(pointsFor({ correct: true, level: 1, streak: 5 }), 20, 'five in a row is x2');
  assert.equal(pointsFor({ correct: true, level: 1, streak: 1, hintUsed: true }), 5);
  assert.equal(pointsFor({ correct: false, level: 3, streak: 0 }), 0);
  assert.equal(pointsFor({ correct: true, level: 99, streak: 99 }), MAX_POINTS);
  assert.equal(MAX_POINTS, 60);
  assert.deepEqual([1, 5, 6, 10, 11].map(levelOf), [1, 1, 2, 2, 3]);
  assert.equal(levelMultiplier(4), 2);
  assert.deepEqual([0, 2, 3, 4, 5, 9].map(comboMultiplier), [1, 1, 1.5, 1.5, 2, 2]);
});

const right = (extra = {}) => ({ correct: true, ...extra });
const wrong = (extra = {}) => ({ correct: false, ...extra });

test('a wrong answer costs a life, a passed redeem keeps it, and a cleared level adds one', () => {
  const r = replay([right(), wrong(), wrong({ redeemPassed: true }), right(), right()]);
  assert.equal(r.lives, START_LIVES - 1 + 1, 'lost one, won one back, then cleared the level');
  assert.equal(r.levelsCleared, 1);
  assert.equal(r.steps[4].lifeGained, true);

  const capped = replay(Array.from({ length: 20 }, () => right()));
  assert.equal(capped.lives, MAX_LIVES, 'lives never pass the cap');
  assert.equal(capped.steps.at(-1).lifeGained, false);
});

test('the combo resets on a wrong answer, and scores add up across levels', () => {
  const r = replay([right(), right(), right(), wrong(), right(), right()]);
  assert.deepEqual(r.steps.map((s) => s.points), [10, 10, 15, 0, 10, 12]);
  assert.equal(r.score, 57);
  assert.equal(r.correct, 5);
  assert.equal(r.level, 2);
});

test('a run can not carry on after its last life, or claim a redeem on a right answer', () => {
  assert.equal(replay([wrong(), wrong(), wrong(), right()]), null);
  assert.equal(replay([right({ redeemPassed: true })]), null);
  const out = replay([wrong(), wrong(), wrong()]);
  assert.equal(out.lives, 0);
  const lastOfLevel = replay([right(), right(), wrong(), wrong(), wrong()]);
  assert.equal(lastOfLevel.lives, 0, 'no bonus life for a level you died on');
  assert.equal(lastOfLevel.levelsCleared, 0);
});

test('a perfect level is five right without a hint', () => {
  const slices = levelSlices([right(), right(), right(), right(), right(), right({ hintUsed: true })]);
  assert.equal(slices.length, 2);
  assert.equal(isPerfectLevel(slices[0]), true);
  assert.equal(isPerfectLevel(slices[1]), false);
  assert.equal(isPerfectLevel([right(), right(), right(), right(), right({ hintUsed: true })]), false);
});

// Levels

const TOPICS = ['everyday-object', 'industrial', 'furniture', 'ui'];

// 40 questions: q0 is the easiest, q39 the hardest. A few share a group, two
// are myth busters, every third has a tidbit.
function pool() {
  const questions = Array.from({ length: 40 }, (_, i) => ({
    id: `q${i}`,
    topic: i >= 38 ? MYTH_TOPIC : TOPICS[i % TOPICS.length],
    themes: [['a', 'b', 'c'][i % 3]],
    tags: [`t${i % 5}`],
    stats: { asked: 100, right: 95 - i * 2 },
  }));
  questions[0].group = 'keypads';
  questions[1].group = 'keypads';
  questions[2].group = 'rotary';
  questions[7].group = 'rotary';
  const tidbits = questions.filter((_, i) => i % 3 === 0).map((q) => ({ id: `t-${q.id}`, tidbitFor: q.id, text: 'clue' }));
  return { questions, tidbits };
}

const byId = (questions) => Object.fromEntries(questions.map((q) => [q.id, q]));

test('a level is five different questions: no near duplicates, one myth buster at most, neighbours differ', () => {
  const { questions } = pool();
  const map = byId(questions);
  for (let seed = 0; seed < 30; seed++) {
    const { ids } = buildLevel({ questions, random: seededRandom(`level-${seed}`) });
    assert.equal(ids.length, LEVEL_SIZE);
    assert.equal(new Set(ids).size, LEVEL_SIZE);
    const groups = ids.map((id) => map[id].group).filter(Boolean);
    assert.equal(new Set(groups).size, groups.length, 'no two from one group');
    assert.ok(ids.filter((id) => map[id].topic === MYTH_TOPIC).length <= 1);
    assert.ok(ids.every((id, i) => i === 0 || map[id].topic !== map[ids[i - 1]].topic), 'neighbours differ');
  }
});

test('levels get harder as a run goes on, because the easier questions come first', () => {
  const { questions } = pool();
  const map = byId(questions);
  const averageEase = (ids) => ids.reduce((sum, id) => sum + easeOf(map[id]), 0) / ids.length;
  let firstHarder = 0;
  for (let seed = 0; seed < 20; seed++) {
    const random = seededRandom(`run-${seed}`);
    const used = [];
    const eases = [];
    for (let level = 0; level < 6; level++) {
      const { ids } = buildLevel({ questions, usedIds: used, random });
      used.push(...ids);
      eases.push(averageEase(ids));
    }
    if (eases[0] <= eases[5]) firstHarder += 1;
    assert.equal(new Set(used).size, used.length, 'never repeats a question in a run');
  }
  assert.equal(firstHarder, 0, 'level 1 is always easier than level 6');
});

test('questions not seen yet and questions in the chosen topics get a head start', () => {
  const { questions } = pool();
  const map = byId(questions);
  const seen = new Set(questions.slice(0, 20).map((q) => q.id));
  let seenPicked = 0;
  let themedPicked = 0;
  for (let seed = 0; seed < 20; seed++) {
    const fresh = buildLevel({ questions, seen, random: seededRandom(`seen-${seed}`) }).ids;
    seenPicked += fresh.filter((id) => seen.has(id)).length;
    const themed = buildLevel({ questions, themeIds: ['c'], random: seededRandom(`topics-${seed}`) }).ids;
    themedPicked += themed.filter((id) => map[id].themes[0] === 'c').length;
  }
  assert.equal(seenPicked, 0, 'unseen first, even though the seen ones are easier');
  assert.ok(themedPicked / (20 * LEVEL_SIZE) >= 0.6, 'mostly from the chosen topic, though it holds a third of the bank');
});

test('a level after the first carries a clue for one of its own questions, never the same one twice', () => {
  const { questions, tidbits } = pool();
  const random = seededRandom('clues');
  const used = [];
  const usedTidbitIds = [];
  for (let level = 0; level < 6; level++) {
    const { ids, tidbitId } = buildLevel({ questions, tidbits, usedIds: used, usedTidbitIds, withTidbit: true, random });
    assert.ok(tidbitId, `level ${level + 1} has a clue`);
    assert.ok(!usedTidbitIds.includes(tidbitId));
    assert.ok(ids.includes(tidbits.find((t) => t.id === tidbitId).tidbitFor), 'the clue is for a question in this level');
    used.push(...ids);
    usedTidbitIds.push(tidbitId);
  }
  assert.equal(buildLevel({ questions, tidbits, withTidbit: false }).tidbitId, null);
});

test('the last level can be short, and an empty one means the bank is used up', () => {
  const { questions } = pool();
  const ids = questions.map((q) => q.id);
  const open = openQuestions(questions, ids.slice(0, 37));
  assert.ok(!open.some((q) => q.group === 'rotary'), 'q7 is out because q2, in its group, was used');
  assert.ok(buildLevel({ questions, usedIds: ids.slice(0, 37) }).ids.length < LEVEL_SIZE);
  assert.deepEqual(buildLevel({ questions, usedIds: ids }).ids, []);
});

test('a swapped-in question is new to the run, shares no group, and keeps the topic when it can', () => {
  const questions = [
    { id: 'a', topic: 'ui', group: 'g' },
    { id: 'b', topic: 'ui', group: 'h' },
    { id: 'c', topic: 'ui', group: 'g' },
    { id: 'd', topic: 'furniture' },
    { id: 'e', topic: 'ui' },
    { id: 'f', topic: 'ui', group: 'h' },
    { id: 'm', topic: MYTH_TOPIC },
  ];
  const pick = replacementFor({ replacedId: 'b', usedIds: ['a', 'b', 'd'], questions, random: seededRandom('s') });
  assert.equal(pick, 'e', 'c shares a group with a, f with b itself, d is in the run, m is a myth');
  assert.equal(replacementFor({ replacedId: 'b', usedIds: ['a', 'b', 'd', 'e'], questions }), null);
});

test('ease is pulled towards a half until there are answers, and the share shows from ten answers', () => {
  assert.equal(easeOf({}), 0.5);
  assert.equal(easeOf({ stats: { asked: 1, right: 1 } }), 0.6);
  assert.ok(Math.abs(easeOf({ stats: { asked: 100, right: 90 } }) - 92 / 104) < 1e-9);
  assert.equal(percentRight({ stats: { asked: 9, right: 9 } }), null);
  assert.equal(percentRight({ stats: { asked: 10, right: 3 } }), 30);
});

test('a redeem keeps the questions the levels still need, unless they fit much better', () => {
  const questions = [
    { id: 'missed', topic: 'ui', tags: ['x'] },
    { id: 'pic-related', topic: 'ui', tags: ['x'] },
    { id: 'pic-twin', topic: 'ui', group: 'g', tags: ['x'] },
    { id: 'text-1', topic: 'ui', tags: ['x'] },
    { id: 'text-2', topic: 'ui', tags: ['x'] },
    { id: 'text-3', topic: 'furniture', tags: ['y'] },
  ];
  questions[0].group = 'g';
  const offered = pickRedeemQuestions({
    missed: questions[0],
    questions,
    usedIds: ['missed'],
    keepIds: ['pic-related', 'pic-twin'],
    random: seededRandom('r'),
  });
  assert.deepEqual(offered.slice(0, 1), ['pic-twin'], 'a near duplicate is still the best redeem');
  assert.ok(!offered.includes('pic-related'), 'an equally related text question wins over a picture one');
});

// Verification

const REAL = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => [`v${i}`, { id: `v${i}`, topic: 'ui', correctIndex: 0 }]).concat([
    ['r1', { id: 'r1', topic: 'ui', correctIndex: 2 }],
  ]),
);

// Seven answers: right, right, right, wrong then won back, right, right
// (clears level 1), wrong.
function genuine() {
  const plan = [true, true, true, false, true, true, false];
  const answers = plan.map((ok, i) => ({
    id: `v${i}`,
    topic: 'ui',
    position: i + 1,
    chosenIndex: ok ? 0 : 1,
    correct: ok,
    hintUsed: false,
    redeemUsed: i === 3,
    redeemPassed: i === 3,
    redeemQuestionId: i === 3 ? 'r1' : null,
    redeemChosenIndex: i === 3 ? 2 : null,
  }));
  const r = replay(answers);
  answers.forEach((a, i) => (a.points = r.steps[i].points));
  return {
    timestamp: '2026-09-27T10:00:00.000Z',
    finishedAt: '2026-09-27T10:04:00.000Z',
    durationMs: 240000,
    questions: answers,
  };
}

test('a genuine run checks out, scored the same way the quiz scored it', () => {
  const result = verifySession(genuine(), REAL);
  assert.ok(result);
  assert.equal(result.score, 10 + 10 + 15 + 0 + 10 + 12 + 0, 'the sixth answer is in level 2');
  assert.equal(result.correct, 5);
  assert.equal(result.total, 7);
  assert.equal(result.level, 2);
  assert.deepEqual(sessionQuestionIds(genuine()).sort(), ['r1', 'v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6']);
});

test('tampered runs are refused', () => {
  const cases = {
    'points claimed that were not earned': (s) => (s.questions[0].points = 20),
    'credit for a wrong answer': (s) => Object.assign(s.questions[6], { correct: true, points: 12 }),
    'a redeem that was not really passed': (s) => (s.questions[3].redeemChosenIndex = 1),
    'a redeem on a question from the run itself': (s) => (s.questions[3].redeemQuestionId = 'v9'),
    'answers out of order': (s) => (s.questions[1].position = 5),
    'a repeated question': (s) => (s.questions[1].id = 'v0'),
    'an unknown question': (s) => (s.questions[1].id = 'ghost'),
    'a duration that does not match its own times': (s) => (s.durationMs = 1),
    'no answers at all': (s) => (s.questions = []),
  };
  for (const [name, tamper] of Object.entries(cases)) {
    const session = genuine();
    tamper(session);
    assert.equal(verifySession(session, REAL), null, name);
  }
  const afterDeath = genuine();
  afterDeath.questions = [0, 1, 2, 3].map((i) => ({ id: `v${i}`, topic: 'ui', position: i + 1, chosenIndex: 1, correct: false, points: 0 }));
  assert.equal(verifySession(afterDeath, REAL), null, 'answers after the last life');
});

test('a run checks out against the version of a question its player saw', () => {
  const session = genuine();
  const edited = { ...REAL, v0: [{ id: 'v0', topic: 'ui', correctIndex: 3 }] };
  assert.equal(verifySession(session, edited), null, 'without the old version it fails');
  const withHistory = { ...REAL, v0: [{ id: 'v0', topic: 'ui', correctIndex: 3 }, { id: 'v0', topic: 'ui', correctIndex: 0 }] };
  assert.ok(verifySession(session, withHistory));
});

// Rewards, the week, the reason line

test('badges follow what was done', () => {
  assert.deepEqual(levelBadges([right(), right(), right(), right(), right()]), ['first-level', 'perfect-level']);
  assert.deepEqual(levelBadges([right(), wrong({ redeemPassed: true }), right(), right(), right()]), ['first-level']);
  assert.deepEqual(whysBadges(49), []);
  assert.deepEqual(whysBadges(50), ['whys-50']);
  assert.deepEqual(streakBadges(2), []);
  assert.deepEqual(streakBadges(3), ['streak-3']);
  assert.equal(beatsBest({ score: 10, level: 1 }, null), true);
  assert.equal(beatsBest({ score: 10, level: 2 }, { score: 10, level: 1 }), true);
  assert.equal(beatsBest({ score: 9, level: 5 }, { score: 10, level: 1 }), false);
});

test('the week starts at midnight on Monday, India time', () => {
  // Sunday 27 September 2026, 23:00 in India.
  assert.equal(weekStart(Date.parse('2026-09-27T17:30:00Z')).toISOString(), '2026-09-20T18:30:00.000Z');
  // Ten minutes into Monday 28 September in India, still Sunday in UTC.
  assert.equal(weekStart(Date.parse('2026-09-27T18:40:00Z')).toISOString(), '2026-09-27T18:30:00.000Z');
  assert.equal(resetWords(Date.parse('2026-09-27T17:30:00Z')), 'Resets tonight');
  assert.equal(resetWords(Date.parse('2026-09-27T03:30:00Z')), 'Resets tomorrow');
  assert.equal(resetWords(Date.parse('2026-09-26T10:00:00Z')), 'Resets in 2 days');
  assert.equal(resetWords(Date.parse('2026-09-23T10:00:00Z')), 'Resets in 5 days');
});

test('the short reason is the first sentence, or the first two when the first is short', () => {
  const long = 'Touch typists rest their left index finger on F and their right index finger on J, with the other fingers along the same row.';
  assert.equal(firstSentence(`${long} The bumps let you feel it.`), long);
  assert.equal(firstSentence("It's the wind. Tall buildings sway. Then more."), "It's the wind. Tall buildings sway.");
  assert.equal(firstSentence('No full stop here'), 'No full stop here');
  assert.equal(firstSentence('The U.S. standard came first. Then others.'), 'The U.S. standard came first. Then others.', 'U.S. is not a sentence end');
});
