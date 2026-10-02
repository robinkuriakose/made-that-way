import { replay, MAX_ANSWERS } from './scoring.js';

// Recomputes a session's score from its own answers, with the same pure
// scoring the quiz uses (lib/scoring.js), and checks each answer against the
// real questions (questionsById). Returns null if anything doesn't add up:
// an unknown or repeated question, answers out of order, a "correct" flag
// that doesn't match the real answer, a redeem that wasn't really passed,
// points that don't match, a run that carried on after its last life, or a
// duration that doesn't match its own start and end time.
//
// Used by the server (routes/leaderboard.js), so a leaderboard score is never
// taken from the client. This closes the easy ways of faking one, posting a
// number or a made-up list of answers; a determined attempt could still
// script a consistent run, but that takes real effort, which is the bar.
//
// questionsById maps an id to the question, or to a list of versions of it
// (the current one plus any it replaced during the run), so editing a
// question mid-run doesn't fail an honest player's run.
function versionsOf(questionsById, id) {
  const entry = questionsById[id];
  return (Array.isArray(entry) ? entry : [entry]).filter(Boolean);
}

const answered = (versions, chosenIndex, correct) =>
  versions.some((real) => (chosenIndex === real.correctIndex) === Boolean(correct));

export function verifySession(session, questionsById) {
  const qs = session?.questions;
  if (!Array.isArray(qs) || qs.length < 1 || qs.length > MAX_ANSWERS) return null;

  const runIds = new Set(qs.map((q) => q?.id));
  const seen = new Set();
  const redeemed = new Set();

  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (typeof q?.id !== 'string' || seen.has(q.id)) return null;
    seen.add(q.id);
    if (q.position !== i + 1) return null;
    if (typeof q.chosenIndex !== 'number' || typeof q.correct !== 'boolean') return null;

    const versions = versionsOf(questionsById, q.id);
    if (!versions.length || !versions.some((real) => real.topic === q.topic)) return null;
    if (!answered(versions, q.chosenIndex, q.correct)) return null;

    if (q.redeemPassed) {
      const id = q.redeemQuestionId;
      if (typeof id !== 'string' || runIds.has(id) || redeemed.has(id)) return null;
      redeemed.add(id);
      const redeemVersions = versionsOf(questionsById, id);
      if (!redeemVersions.length || typeof q.redeemChosenIndex !== 'number') return null;
      if (!redeemVersions.some((real) => real.correctIndex === q.redeemChosenIndex)) return null;
    }
  }

  const result = replay(qs);
  if (!result) return null;
  if (qs.some((q, i) => q.points !== result.steps[i].points)) return null;

  const startedAtMs = Date.parse(session.timestamp);
  const finishedAtMs = Date.parse(session.finishedAt);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs) || finishedAtMs < startedAtMs) return null;
  if (session.durationMs !== finishedAtMs - startedAtMs) return null;

  return {
    score: result.score,
    correct: result.correct,
    total: qs.length,
    level: result.level,
    levelsCleared: result.levelsCleared,
    durationMs: session.durationMs,
    finishedAt: session.finishedAt,
  };
}

// Every question id a session's answers point at, redeems included.
export function sessionQuestionIds(session) {
  const ids = new Set();
  for (const q of session?.questions ?? []) {
    if (typeof q?.id === 'string') ids.add(q.id);
    if (typeof q?.redeemQuestionId === 'string') ids.add(q.redeemQuestionId);
  }
  return [...ids];
}
