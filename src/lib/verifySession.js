import { pointBand, redeemPoints, RUN_LENGTH } from './scoring.js';

// Recomputes a session's score from its own per-question answers, using the
// same pure scoring functions the client uses, and checks each answer
// against the real question bank (questionsById). Returns null if anything
// doesn't add up: an unknown question id, a repeated question, a "correct"
// flag that doesn't match the real answer, points that don't match the
// timing, a duration that doesn't match its own start and end time, or the
// wrong number of questions.
//
// Used server side (api/leaderboard.js) so a leaderboard score is never
// trusted directly from the client. This closes the easy version of faking
// one, posting a number by hand instead of playing, not every version of
// it: a determined attempt could still script a fake but
// internally-consistent session. That would take real effort to build,
// rather than one request, which is the bar this is meant to raise it to.
//
// questionsById maps an id to the question, or to a list of versions of it
// (the current one plus any it replaced during the run), so editing a
// question's answer mid-run doesn't fail an honest player's run.
export function verifySession(session, questionsById) {
  const qs = session?.questions;
  if (!Array.isArray(qs) || qs.length !== RUN_LENGTH) return null;

  const seen = new Set();
  let score = 0;
  let correctCount = 0;

  for (const q of qs) {
    if (typeof q.id !== 'string' || seen.has(q.id)) return null;
    seen.add(q.id);

    const entry = questionsById[q.id];
    const versions = (Array.isArray(entry) ? entry : [entry]).filter(Boolean);
    if (versions.length === 0) return null;
    if (typeof q.chosenIndex !== 'number' || typeof q.elapsedSeconds !== 'number') return null;

    const matches = versions.some(
      (real) => q.topic === real.topic && (q.chosenIndex === real.correctIndex) === Boolean(q.correct),
    );
    if (!matches) return null;

    const band = pointBand(q.elapsedSeconds);
    const expectedPoints = q.correct ? band : q.redeemPassed ? redeemPoints(band) : 0;
    if (expectedPoints !== q.points) return null;

    score += q.points;
    if (q.correct) correctCount += 1;
  }

  const startedAtMs = Date.parse(session.timestamp);
  const finishedAtMs = Date.parse(session.finishedAt);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs) || finishedAtMs < startedAtMs) return null;
  if (session.durationMs !== finishedAtMs - startedAtMs) return null;

  return {
    score,
    correct: correctCount,
    total: RUN_LENGTH,
    durationMs: session.durationMs,
    finishedAt: session.finishedAt,
  };
}
