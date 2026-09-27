// The weekly leaderboard's week: it starts at midnight on Monday, India time
// (UTC+5:30, no daylight saving), for everyone. One fixed reset keeps the
// board the same for every player wherever they are. Pure, shared by the
// quiz and the server.
const OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The instant the current week began, as a Date.
export function weekStart(now = Date.now()) {
  const local = new Date(now + OFFSET_MS);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - sinceMonday * DAY_MS;
  return new Date(midnight - OFFSET_MS);
}

export const nextReset = (now = Date.now()) => new Date(weekStart(now).getTime() + 7 * DAY_MS);

// "Resets tomorrow", "Resets in 3 days", "Resets tonight".
export function resetWords(now = Date.now()) {
  const hours = (nextReset(now).getTime() - now) / (60 * 60 * 1000);
  if (hours <= 12) return 'Resets tonight';
  const days = Math.ceil(hours / 24);
  return days <= 1 ? 'Resets tomorrow' : `Resets in ${days} days`;
}
