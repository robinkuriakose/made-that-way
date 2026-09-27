import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRedeemQuestions, REDEEM_CHOICES } from './redeem.js';
import { summarize, sessionsToCsv } from './analytics.js';
import { cleanName, rankEntries, isBetterRun } from './leaderboard.js';

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
    const offered = pickRedeemQuestions({ missed: questions[0], questions, usedIds: ['missed', 'in-run'], random: seeded(seed) });
    assert.equal(offered.length, REDEEM_CHOICES);
    assert.deepEqual(offered, ['same-group', 'two-tags', 'one-tag']);
  }
});

test('redeem avoids questions already offered in the run, unless nothing else is left', () => {
  const questions = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, topic: 'ui', tags: ['x'] }));
  const missed = questions[0];
  const fresh = pickRedeemQuestions({ missed, questions, usedIds: ['a'], alreadyOffered: ['b', 'c'], random: seeded(1) });
  assert.deepEqual([...fresh].sort(), ['d', 'e', 'f']);
  const reused = pickRedeemQuestions({ missed, questions, usedIds: ['a'], alreadyOffered: ['b', 'c', 'd'], random: seeded(1) });
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
