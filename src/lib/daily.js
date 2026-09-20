// The daily question's calendar maths. Pure, shared by the quiz and the
// server.
//
// A "day" is the player's own calendar date (YYYY-MM-DD), so the question
// changes at their midnight wherever they are. The server accepts a day only
// if it's within a day of its own UTC date, which covers every time zone
// (UTC-12 to UTC+14) and stops a changed phone clock from faking a streak.

const DAY_MS = 24 * 60 * 60 * 1000;

export function localDay(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const utcMidnight = (day) => Date.parse(`${day}T00:00:00Z`);

export function isPlausibleDay(day, now = Date.now()) {
  const t = utcMidnight(day);
  if (!Number.isFinite(t)) return false;
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return t >= today - DAY_MS && t <= today + DAY_MS;
}

// scheduled: every day that had a daily question, newest first, as
// { day, isVoid }. answered: a Set of days this player answered.
//
// The streak counts back from today. Today not answered yet doesn't break
// it (there's still time). A day with no question never breaks it, since it
// isn't in `scheduled` at all, and neither does a question you voided.
export function computeStreak(scheduled, answered, today) {
  let streak = 0;
  for (const { day, isVoid } of scheduled) {
    if (day > today) continue;
    if (answered.has(day)) streak += 1;
    else if (day === today || isVoid) continue;
    else break;
  }
  return streak;
}
