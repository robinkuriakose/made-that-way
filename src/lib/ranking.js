// How runs are ordered on the leaderboard. Pure, shared by the quiz and the
// server.

// Higher score first, then more right, then faster, then whoever got there first.
export function rankEntries(entries) {
  return entries
    .slice()
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.correct - a.correct ||
        a.durationMs - b.durationMs ||
        String(a.finishedAt).localeCompare(String(b.finishedAt)),
    );
}

// True if `a` should replace `b` as a player's best: same order as
// rankEntries. A tie keeps the one already stored.
export function isBetterRun(a, b) {
  if (!b) return true;
  if (a.score !== b.score) return a.score > b.score;
  if (a.correct !== b.correct) return a.correct > b.correct;
  return a.durationMs < b.durationMs;
}
