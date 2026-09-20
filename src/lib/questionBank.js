// Where the quiz gets its questions and topics.
//
// The live bank comes from /api/questions (the database, edited in the
// builder). So the quiz never waits on the network:
//   1. The app starts with the last live bank this browser saw, or the
//      questions bundled into the app if it has never seen one.
//   2. It fetches the live bank as soon as the page loads, in the background.
//   3. Pressing Start uses the live bank if it has arrived. If it hasn't, it
//      waits for it, but never past LIVE_TIMEOUT_MS from page load, then
//      falls back to whatever it started with.
import bundled from '../data/questions.json';
import { mergeTidbits, splitTidbits } from './bank.js';
import { bundledThemes } from './themes.js';

export const LIVE_TIMEOUT_MS = 3000;
const CACHE_KEY = 'madeThatWay.bank.v2';
// A bank smaller than this can't make a balanced run; treat it as a fault.
const MIN_QUESTIONS = 20;

function fromQuestions(questions, source, themes) {
  return { ...splitTidbits(questions), themes: Array.isArray(themes) && themes.length ? themes : bundledThemes, source };
}

export function bundledBank() {
  return fromQuestions(mergeTidbits(bundled.questions, bundled.tidbits), 'bundled', bundledThemes);
}

export function initialBank() {
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY));
    if (Array.isArray(cached?.questions) && cached.questions.length >= MIN_QUESTIONS) {
      return fromQuestions(cached.questions, 'cache', cached.themes);
    }
  } catch {
    // Unreadable cache: use the bundled questions.
  }
  return bundledBank();
}

// Resolves to the live bank, or null if it can't be had within the timeout.
export async function fetchLiveBank(timeoutMs = LIVE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/questions', { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    if (!Array.isArray(body?.questions) || body.questions.length < MIN_QUESTIONS) return null;
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ questions: body.questions, themes: body.themes, savedAt: Date.now() }));
    } catch {
      // Storage full or blocked: fine, this visit still uses the live bank.
    }
    return fromQuestions(body.questions, 'live', body.themes);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
