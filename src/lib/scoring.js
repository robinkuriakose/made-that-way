// How a run scores, V2. There's no clock: points come from getting answers
// right, keeping a streak going and getting further. Pure, and shared by the
// quiz and the server, so the two can never disagree about a score.
//
// A run is played in levels of LEVEL_SIZE questions. Each level is worth
// more. A wrong answer costs a life, a passed redeem wins it back, and
// clearing a level adds one. The run ends when the lives run out, when the
// player finishes at a level break, or when there are no questions left.

export const LEVEL_SIZE = 5;
export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const BASE_POINTS = 10;
// Longest run the server accepts: far past the question bank today.
export const MAX_ANSWERS = 200;

const LEVEL_MULTIPLIERS = [1, 1.2, 1.5, 2, 2.5, 3];
// Right answers in a row: from 3 the combo is x1.5, from 5 it's x2.
const COMBOS = [
  [5, 2],
  [3, 1.5],
];

export const levelOf = (position) => Math.floor((position - 1) / LEVEL_SIZE) + 1;
export const levelMultiplier = (level) => LEVEL_MULTIPLIERS[Math.min(Math.max(level, 1), LEVEL_MULTIPLIERS.length) - 1];
export const comboMultiplier = (streak) => COMBOS.find(([from]) => streak >= from)?.[1] ?? 1;

// The most a single answer can ever score: top level, top combo, no hint.
export const MAX_POINTS = BASE_POINTS * LEVEL_MULTIPLIERS.at(-1) * COMBOS[0][1];

// A hint halves what the answer is worth.
export function pointsFor({ correct, level, streak, hintUsed = false }) {
  if (!correct) return 0;
  const raw = BASE_POINTS * levelMultiplier(level) * comboMultiplier(streak);
  return Math.round(hintUsed ? raw / 2 : raw);
}

// Walks a run's answers in order ({ correct, hintUsed, redeemPassed }) and
// works out everything that follows from them: each answer's points and
// combo, the lives left, levels cleared. Returns null for an impossible run:
// one that carried on after its last life, or claims a redeem on a right
// answer.
export function replay(answers) {
  let lives = START_LIVES;
  let streak = 0;
  let score = 0;
  let correct = 0;
  const steps = [];
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (lives <= 0) return null;
    if (a.correct && a.redeemPassed) return null;
    const position = i + 1;
    const level = levelOf(position);
    streak = a.correct ? streak + 1 : 0;
    const points = pointsFor({ correct: a.correct, level, streak, hintUsed: Boolean(a.hintUsed) });
    const lost = !a.correct && !a.redeemPassed;
    if (lost) lives -= 1;
    const clears = position % LEVEL_SIZE === 0 && lives > 0;
    const livesBeforeBonus = lives;
    if (clears) lives = Math.min(MAX_LIVES, lives + 1);
    score += points;
    if (a.correct) correct += 1;
    steps.push({ position, level, streak, points, lost, clears, lifeGained: clears && lives > livesBeforeBonus, lives });
  }
  const levelsCleared = steps.filter((s) => s.clears).length;
  return { score, correct, lives, streak, steps, levelsCleared, level: answers.length ? levelOf(answers.length) : 1 };
}

// Every level's answers, for the level break and the end screen.
export function levelSlices(results) {
  const out = [];
  for (let i = 0; i < results.length; i += LEVEL_SIZE) out.push(results.slice(i, i + LEVEL_SIZE));
  return out;
}

// All five right first time, with no hints.
export const isPerfectLevel = (slice) => slice.length === LEVEL_SIZE && slice.every((r) => r.correct && !r.hintUsed);
