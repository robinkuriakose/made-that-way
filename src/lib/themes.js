// Topics players choose from ("themes" in the code and data, "topics" on
// screen). The list comes with the live question bank, so new topics need no
// code change; the bundled copy is only the fallback.
//
// A player's choice is remembered on this device. null means every topic,
// which is also what a fresh player gets. Choosing always needs at least
// MIN_THEMES, and anything the choice can't fill is quietly topped up from
// other topics when a run is built (see lib/run.js), so the player never has
// to think about how many questions a topic holds.
import bundled from '../data/themes.json';
import { storageKey } from './testMode.js';

export const MIN_THEMES = 3;
export const bundledThemes = bundled.themes;
const CHOSEN_KEY = 'madeThatWay.themes.v1';

export function readChosenThemes(available) {
  try {
    const ids = JSON.parse(window.localStorage.getItem(storageKey(CHOSEN_KEY)));
    if (!Array.isArray(ids)) return null;
    const known = ids.filter((id) => available.some((t) => t.id === id));
    return known.length >= MIN_THEMES && known.length < available.length ? known : null;
  } catch {
    return null;
  }
}

export function saveChosenThemes(ids, available) {
  try {
    const all = !ids || ids.length >= available.length;
    if (all) window.localStorage.removeItem(storageKey(CHOSEN_KEY));
    else window.localStorage.setItem(storageKey(CHOSEN_KEY), JSON.stringify(ids));
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}

// The small label above a question. Myth busters keep their own label,
// since that's a promise about the question, not its subject.
export function questionLabel(question, themes) {
  if (question?.topic === 'myth-buster') return 'Worth a second look';
  const first = question?.themes?.[0];
  return themes.find((t) => t.id === first)?.label ?? '';
}
