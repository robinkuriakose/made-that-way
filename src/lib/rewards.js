// What a player collects across runs, kept on this device: the whys they've
// uncovered (every question whose reason they've seen), their badges and
// their best run. The rules are pure functions; the storage wrappers around
// them never throw, so blocked storage just means nothing is remembered.
import { storageKey } from './testMode.js';
import { LEVEL_SIZE, isPerfectLevel } from './scoring.js';

const WHYS_KEY = 'madeThatWay.whys.v1';
const BADGES_KEY = 'madeThatWay.badges.v1';
const BEST_KEY = 'madeThatWay.best.v1';

export const WHYS_FOR_BADGE = 50;
export const STREAK_FOR_BADGE = 3;

// Data, so a new badge is one entry here plus the check that awards it.
export const BADGES = [
  { id: 'first-level', label: 'First level', note: 'Clear level 1.' },
  { id: 'perfect-level', label: 'Perfect level', note: 'All five right in one level, without a hint.' },
  { id: 'streak-3', label: 'Three day streak', note: "Answer today's question three days running." },
  { id: 'whys-50', label: '50 whys', note: `Uncover the reasons behind ${WHYS_FOR_BADGE} designs.` },
  // Milestones (src/data/level-plan.json): shown once the game has that many levels.
  { id: 'bronze', label: 'Bronze', note: 'Clear level 5.', level: 5 },
  { id: 'silver', label: 'Silver', note: 'Clear level 10.', level: 10 },
  { id: 'legend', label: 'Legend', note: 'Finish every level there is.' },
];

// The badges a player can earn today: a milestone past the last level waits.
export const availableBadges = (lastLevel) => BADGES.filter((b) => !b.level || b.level <= lastLevel);

// Badges a just-cleared level earns. slice: that level's answers.
export function levelBadges(slice) {
  const out = [];
  if (slice.length === LEVEL_SIZE) out.push('first-level');
  if (isPerfectLevel(slice)) out.push('perfect-level');
  return out;
}

export const whysBadges = (count) => (count >= WHYS_FOR_BADGE ? ['whys-50'] : []);
export const streakBadges = (streak) => (streak >= STREAK_FOR_BADGE ? ['streak-3'] : []);

// True if a finished run beats the stored best: more points, then further.
export const beatsBest = (run, best) => !best || run.score > best.score || (run.score === best.score && run.level > best.level);

function read(key, fallback) {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(key)));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Storage blocked: this visit still shows it, it just isn't remembered.
  }
}

export function uncoveredIds() {
  const list = read(WHYS_KEY, []);
  return Array.isArray(list) ? list : [];
}

// Adds ids to the collection. Returns how many were new.
export function uncover(ids) {
  const have = uncoveredIds();
  const fresh = ids.filter((id) => id && !have.includes(id));
  if (fresh.length) write(WHYS_KEY, [...have, ...fresh]);
  return fresh.length;
}

// { badgeId: isoDate }
export function earnedBadges() {
  const map = read(BADGES_KEY, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

// Awards badges not held yet. Returns the ids that are new.
export function award(ids) {
  const have = earnedBadges();
  const fresh = [...new Set(ids)].filter((id) => !have[id] && BADGES.some((b) => b.id === id));
  if (fresh.length) {
    const at = new Date().toISOString();
    write(BADGES_KEY, { ...have, ...Object.fromEntries(fresh.map((id) => [id, at])) });
  }
  return fresh;
}

// { score, level, at } of this device's best finished run, signed or not.
export function readBest() {
  const best = read(BEST_KEY, null);
  return best && typeof best.score === 'number' ? best : null;
}

// Stores the run if it's a new best. Returns true when it was.
export function recordBest(run) {
  if (!beatsBest(run, readBest())) return false;
  write(BEST_KEY, { score: run.score, level: run.level, at: new Date().toISOString() });
  return true;
}
