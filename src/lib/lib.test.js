import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointBand, redeemPoints, RUN_LENGTH } from './scoring.js';
import { pickRedeemQuestions, REDEEM_CHOICES } from './redeem.js';
import { buildRun, planTidbit, topicLimits, MYTH_TOPIC } from './run.js';
import { summarize, sessionsToCsv } from './analytics.js';
import { cleanName, rankEntries, isBetterRun } from './leaderboard.js';
import { verifySession } from './verifySession.js';

// Small seeded random number generator so run tests are repeatable.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TOPICS = ['everyday-object', 'industrial', 'furniture', 'ui', 'ui'];

// A pool shaped like the real one: interface questions are the biggest topic,
// and a few questions share a group.
function makePool() {
  const questions = [];
  for (let i = 0; i < 48; i++) {
    const q = { id: `q${i}`, topic: TOPICS[i % TOPICS.length], tags: [`t${i % 7}`] };
    if (i < 3) q.group = 'keypads';
    if (i === 5 || i === 10) q.group = 'rotary';
    questions.push(q);
  }
  questions.push({ id: 'm1', topic: MYTH_TOPIC, tags: ['t1'] }, { id: 'm2', topic: MYTH_TOPIC, tags: ['t2'] });
  const tidbits = questions
    .filter((q, i) => i % 3 === 0 && q.topic !== MYTH_TOPIC)
    .map((q) => ({ id: `t-${q.id}`, tidbitFor: q.id, text: 'tidbit' }));
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
  return { questions, tidbits, byId };
}

test('point bands follow the scoring table', () => {
  const cases = [
    [0, 10], [7, 10], [7.9, 10], [8, 8], [14.9, 8], [15, 7], [25.9, 7],
    [26, 6], [34.9, 6], [35, 5], [45, 5], [45.01, 0], [55, 0],
  ];
  for (const [elapsed, points] of cases) assert.equal(pointBand(elapsed), points, `at ${elapsed}s`);
});

test('a passed redeem is a quarter of the band, rounded up', () => {
  assert.equal(redeemPoints(10), 3);
  assert.equal(redeemPoints(8), 2);
  assert.equal(redeemPoints(7), 2);
  assert.equal(redeemPoints(6), 2);
  assert.equal(redeemPoints(5), 2);
  assert.equal(redeemPoints(0), 0);
});

test('a run is ten different questions with at most one myth buster', () => {
  const { questions, tidbits, byId } = makePool();
  let runsWithMyth = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const order = buildRun(questions, tidbits, seeded(seed));
    assert.equal(order.length, RUN_LENGTH);
    assert.equal(new Set(order).size, RUN_LENGTH);
    const myths = order.filter((id) => byId[id].topic === MYTH_TOPIC).length;
    assert.ok(myths <= 1, `seed ${seed} has ${myths} myth busters`);
    if (myths === 1) runsWithMyth++;
  }
  assert.ok(runsWithMyth > 60 && runsWithMyth < 140, `myth buster in ${runsWithMyth} of 200 runs`);
});

test('each topic stays within its limits', () => {
  const { questions, tidbits, byId } = makePool();
  for (let seed = 1; seed <= 200; seed++) {
    const order = buildRun(questions, tidbits, seeded(seed));
    for (const topic of ['everyday-object', 'industrial', 'furniture', 'ui']) {
      const [min, max] = topicLimits(topic);
      const n = order.filter((id) => byId[id].topic === topic).length;
      assert.ok(n >= min && n <= max, `seed ${seed}: ${n} ${topic} questions`);
    }
  }
});

test('questions in the same group never share a run', () => {
  const { questions, tidbits, byId } = makePool();
  for (let seed = 1; seed <= 200; seed++) {
    const groups = buildRun(questions, tidbits, seeded(seed)).map((id) => byId[id].group).filter(Boolean);
    assert.equal(new Set(groups).size, groups.length, `seed ${seed} repeats a group`);
  }
});

test('neighbouring questions never share a topic', () => {
  const { questions, tidbits, byId } = makePool();
  for (let seed = 1; seed <= 200; seed++) {
    const order = buildRun(questions, tidbits, seeded(seed));
    for (let i = 1; i < order.length; i++) {
      assert.notEqual(byId[order[i]].topic, byId[order[i - 1]].topic, `seed ${seed} at ${i}`);
    }
  }
});

test('each run has at least three questions with a tidbit', () => {
  const { questions, tidbits } = makePool();
  const seededIds = new Set(tidbits.map((t) => t.tidbitFor));
  for (let seed = 1; seed <= 100; seed++) {
    const order = buildRun(questions, tidbits, seeded(seed));
    assert.ok(order.filter((id) => seededIds.has(id)).length >= 3, `seed ${seed} has too few seeded questions`);
  }
});

test('a tidbit moves its question to three after the miss and keeps the set', () => {
  const { questions, tidbits, byId } = makePool();
  let planned = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const order = buildRun(questions, tidbits, seeded(seed));
    const afterIndex = 2;
    const missedIds = order.slice(0, 3);
    const plan = planTidbit({ order, afterIndex, missedIds, questionsById: byId, tidbits });
    if (!plan) continue;
    planned++;
    assert.equal(plan.seededIndex, 5);
    assert.equal(plan.order[5], plan.tidbit.tidbitFor);
    assert.deepEqual(plan.order.slice(0, 3), order.slice(0, 3));
    assert.deepEqual([...plan.order].sort(), [...order].sort());
    assert.ok(!missedIds.includes(plan.tidbit.tidbitFor));
  }
  assert.ok(planned > 60, `a tidbit could be planned in only ${planned} of 80 runs`);
});

test('a tidbit prefers a topic unlike the missed questions', () => {
  const byId = {
    a: { id: 'a', topic: 'ui' },
    b: { id: 'b', topic: 'ui' },
    c: { id: 'c', topic: 'ui' },
    d: { id: 'd', topic: 'furniture' },
    e: { id: 'e', topic: 'ui' },
    f: { id: 'f', topic: 'industrial' },
    g: { id: 'g', topic: 'furniture' },
  };
  const tidbits = [
    { id: 't-e', tidbitFor: 'e' },
    { id: 't-f', tidbitFor: 'f' },
  ];
  const order = ['a', 'b', 'c', 'd', 'e', 'g', 'f'];
  const plan = planTidbit({ order, afterIndex: 2, missedIds: ['a', 'b', 'c'], questionsById: byId, tidbits });
  assert.equal(plan.tidbit.id, 't-f');
  assert.equal(plan.order[5], 'f');
  assert.equal(plan.order[6], 'g');
});

test('a tidbit avoids swaps that put the same topic side by side', () => {
  const byId = {
    a: { id: 'a', topic: 'ui' },
    b: { id: 'b', topic: 'ui' },
    c: { id: 'c', topic: 'ui' },
    d: { id: 'd', topic: 'furniture' },
    e: { id: 'e', topic: 'industrial' },
    f: { id: 'f', topic: 'furniture' },
    g: { id: 'g', topic: 'industrial' },
    h: { id: 'h', topic: 'furniture' },
  };
  // Moving g to index 5 gives d e g: industrial twice. Moving h gives d e h: fine.
  const tidbits = [
    { id: 't-g', tidbitFor: 'g' },
    { id: 't-h', tidbitFor: 'h' },
  ];
  const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const plan = planTidbit({ order, afterIndex: 2, missedIds: ['a', 'b', 'c'], questionsById: byId, tidbits });
  assert.equal(plan.tidbit.id, 't-h');
  assert.equal(plan.order[5], 'h');
});

test('no tidbit when there is no room three questions later', () => {
  const { questions, tidbits, byId } = makePool();
  const order = buildRun(questions, tidbits, seeded(3));
  const plan = planTidbit({ order, afterIndex: 7, missedIds: order.slice(5, 8), questionsById: byId, tidbits });
  assert.equal(plan, null);
});

test('used tidbits are not shown twice', () => {
  const byId = {
    a: { id: 'a', topic: 'ui' },
    b: { id: 'b', topic: 'ui' },
    c: { id: 'c', topic: 'ui' },
    d: { id: 'd', topic: 'furniture' },
    e: { id: 'e', topic: 'industrial' },
    f: { id: 'f', topic: 'industrial' },
  };
  const tidbits = [{ id: 't-f', tidbitFor: 'f' }];
  const order = ['a', 'b', 'c', 'd', 'e', 'f'];
  const plan = planTidbit({ order, afterIndex: 2, missedIds: ['a', 'b', 'c'], questionsById: byId, tidbits, usedTidbitIds: ['t-f'] });
  assert.equal(plan, null);
});

test('redeem offers three questions from outside the run, most related first', () => {
  const questions = [
    { id: 'missed', topic: 'ui', group: 'keypads', tags: ['phones', 'keypads'] },
    { id: 'same-group', topic: 'ui', group: 'keypads', tags: ['keypads'] },
    { id: 'two-tags', topic: 'everyday-object', tags: ['phones', 'keypads'] },
    { id: 'one-tag', topic: 'furniture', tags: ['phones'] },
    { id: 'same-topic', topic: 'ui', tags: ['menus'] },
    { id: 'unrelated', topic: 'furniture', tags: ['chairs'] },
    { id: 'in-run', topic: 'ui', group: 'keypads', tags: ['phones', 'keypads'] },
  ];
  for (let seed = 1; seed <= 20; seed++) {
    const offered = pickRedeemQuestions({ missed: questions[0], questions, runIds: ['missed', 'in-run'], random: seeded(seed) });
    assert.equal(offered.length, REDEEM_CHOICES);
    assert.deepEqual(offered, ['same-group', 'two-tags', 'one-tag']);
  }
});

test('redeem avoids questions already offered in the run, unless nothing else is left', () => {
  const questions = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, topic: 'ui', tags: ['x'] }));
  const missed = questions[0];
  const fresh = pickRedeemQuestions({ missed, questions, runIds: ['a'], alreadyOffered: ['b', 'c'], random: seeded(1) });
  assert.deepEqual([...fresh].sort(), ['d', 'e', 'f']);
  const reused = pickRedeemQuestions({ missed, questions, runIds: ['a'], alreadyOffered: ['b', 'c', 'd'], random: seeded(1) });
  assert.equal(reused.length, 3);
  assert.ok(!reused.includes('a'));
});

test('leaderboard names are tidied and entries ranked', () => {
  assert.equal(cleanName('   Ada\n  Lovelace  '), 'Ada Lovelace');
  assert.equal(cleanName('x'.repeat(40)).length, 24);
  assert.equal(cleanName('   '), '');
  const ranked = rankEntries([
    { id: 'slow', score: 60, correct: 7, durationMs: 300000, finishedAt: '2026-09-19T10:00:00Z' },
    { id: 'top', score: 80, correct: 8, durationMs: 400000, finishedAt: '2026-09-19T11:00:00Z' },
    { id: 'fast', score: 60, correct: 7, durationMs: 200000, finishedAt: '2026-09-19T12:00:00Z' },
    { id: 'more-right', score: 60, correct: 8, durationMs: 500000, finishedAt: '2026-09-19T13:00:00Z' },
  ]);
  assert.deepEqual(ranked.map((e) => e.id), ['top', 'more-right', 'fast', 'slow']);
});

test('a personal best is replaced by a higher score, then more correct, then faster', () => {
  const base = { score: 60, correct: 7, durationMs: 300000, finishedAt: '2026-09-19T10:00:00Z' };
  assert.equal(isBetterRun(base, null), true, 'anything beats no previous best');
  assert.equal(isBetterRun({ ...base, score: 70 }, base), true, 'higher score wins');
  assert.equal(isBetterRun({ ...base, score: 50 }, base), false, 'lower score loses');
  assert.equal(isBetterRun({ ...base, correct: 8 }, base), true, 'same score, more correct wins');
  assert.equal(isBetterRun({ ...base, durationMs: 100000 }, base), true, 'same score and correct, faster wins');
  assert.equal(isBetterRun({ ...base }, base), false, 'an exact tie keeps the existing one');
});

// A genuine RUN_LENGTH-question session: q0 to q8 answered correctly and
// fast, q9 answered wrong. Every rejection test below starts from this and
// tampers with exactly one thing, so a failing case is failing for the
// reason under test, not for having the wrong number of questions.
const VERIFY_QUESTIONS_BY_ID = Object.fromEntries(
  Array.from({ length: RUN_LENGTH }, (_, i) => [`q${i}`, { id: `q${i}`, topic: 'ui', correctIndex: 0 }]),
);

function genuineSession() {
  const questions = Array.from({ length: RUN_LENGTH }, (_, i) => ({
    id: `q${i}`,
    topic: 'ui',
    chosenIndex: i === 9 ? 1 : 0,
    correct: i !== 9,
    elapsedSeconds: 5,
    hintUsed: false,
    redeemUsed: false,
    redeemPassed: false,
    points: i === 9 ? 0 : 10,
  }));
  return {
    timestamp: '2026-09-19T10:00:00.000Z',
    finishedAt: '2026-09-19T10:03:00.000Z',
    durationMs: 180000,
    questions,
  };
}

test('verifySession accepts a genuine session and sums it correctly', () => {
  const result = verifySession(genuineSession(), VERIFY_QUESTIONS_BY_ID);
  assert.ok(result);
  assert.equal(result.score, 90);
  assert.equal(result.correct, 9);
  assert.equal(result.total, RUN_LENGTH);
  assert.equal(result.durationMs, 180000);
});

test('verifySession rejects a session claiming credit for a wrong answer', () => {
  const session = genuineSession();
  session.questions[9] = { ...session.questions[9], correct: true, points: 10 };
  assert.equal(verifySession(session, VERIFY_QUESTIONS_BY_ID), null);
});

test('verifySession rejects points that do not match the claimed timing', () => {
  const session = genuineSession();
  session.questions[0] = { ...session.questions[0], elapsedSeconds: 40, points: 10 };
  assert.equal(verifySession(session, VERIFY_QUESTIONS_BY_ID), null);
});

test('verifySession rejects a duration that does not match its own start and end time', () => {
  const session = genuineSession();
  session.durationMs = 1;
  assert.equal(verifySession(session, VERIFY_QUESTIONS_BY_ID), null);
});

test('verifySession rejects an unknown or repeated question id', () => {
  const unknown = genuineSession();
  unknown.questions[0] = { ...unknown.questions[0], id: 'ghost' };
  assert.equal(verifySession(unknown, VERIFY_QUESTIONS_BY_ID), null);

  const repeated = genuineSession();
  repeated.questions[1] = { ...repeated.questions[1], id: 'q0' };
  assert.equal(verifySession(repeated, VERIFY_QUESTIONS_BY_ID), null);
});

test('verifySession rejects the wrong number of questions', () => {
  const session = genuineSession();
  session.questions = session.questions.slice(0, RUN_LENGTH - 1);
  assert.equal(verifySession(session, VERIFY_QUESTIONS_BY_ID), null);
});

function answer(overrides) {
  return {
    id: 'q1', topic: 'ui', position: 1, chosenIndex: 0, correct: true, timeToAnswerMs: 4000,
    elapsedSeconds: 4, hintUsed: false, redeemUsed: false, redeemPassed: false, redeemOffered: null,
    redeemQuestionId: null, redeemChosenIndex: null, points: 10,
    ...overrides,
  };
}

test('analytics summarise questions, topics, sessions and redeem picks', () => {
  const sessions = [
    {
      id: 's1', timestamp: '2026-09-15T10:00:00.000Z', totalScore: 12, durationMs: 60000,
      questions: [
        answer({}),
        answer({
          id: 'q2', topic: 'furniture', position: 2, correct: false, chosenIndex: 1, timeToAnswerMs: 20000,
          hintUsed: true, redeemUsed: true, redeemPassed: true, redeemOffered: ['r1', 'r2', 'r3'],
          redeemQuestionId: 'r2', redeemChosenIndex: 3, points: 2,
        }),
      ],
    },
    {
      id: 's2', timestamp: '2026-09-15T11:00:00.000Z', totalScore: 0, durationMs: 120000,
      questions: [answer({ correct: false, timeToAnswerMs: 10000, points: 0, redeemOffered: ['r2', 'r4', 'r5'] })],
    },
  ];
  const summary = summarize(sessions);
  assert.equal(summary.sessionCount, 2);
  assert.equal(summary.avgSessionScore, 6);
  const q1 = summary.questions.find((q) => q.id === 'q1');
  assert.equal(q1.asked, 2);
  assert.equal(q1.percentCorrect, 0.5);
  assert.equal(q1.avgTimeSeconds, 7);
  assert.equal(q1.redeemRate, 0);
  const furniture = summary.topics.find((t) => t.topic === 'furniture');
  assert.equal(furniture.hintRate, 1);
  assert.equal(furniture.redeemRate, 1);
  assert.equal(furniture.redeemPassRate, 1);
  assert.equal(furniture.avgSessionScore, 2);
  assert.equal(summary.topics.find((t) => t.topic === 'ui').avgSessionScore, 5);
  assert.deepEqual(summary.redeemUse.r2, { offered: 2, picked: 1, pickedRight: 1 });
  assert.deepEqual(summary.redeemUse.r4, { offered: 1, picked: 0, pickedRight: 0 });

  const csv = sessionsToCsv(sessions).split('\n');
  assert.equal(csv.length, 4);
  assert.ok(csv[0].includes('redeem_question_id'));
  assert.ok(csv[2].startsWith('s1,'));
  assert.ok(csv[2].includes('r1 r2 r3,r2,3,2'));
});
