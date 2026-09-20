// Player names: cleaning, what's allowed, and test names. Shared by the quiz
// and the server, so both apply exactly the same rules.

export const NAME_MAX_LENGTH = 24;
export const NAME_CHANGE_LIMIT = 3;

// Strips control characters and extra spaces, and caps the length.
export function cleanName(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .slice(0, NAME_MAX_LENGTH);
}

// A word starting with "test": "test", "Test 2", "Robin test", "testing".
// "Protest" or "contest" don't count. Runs signed with such a name are test
// runs: they show on the board for two minutes and never count in the numbers.
export const isTestName = (name) => /(^|[^\p{L}\p{N}])test/iu.test(String(name ?? ''));

// Links, emails and handles are how spam bots use a leaderboard.
const LINK = /(https?:|www\.|\.(com|net|org|in|io|co|xyz|ru|info|biz|app|link|ly)\b|@[a-z0-9_]{2,}|\b[a-z0-9._%+-]+@[a-z0-9.-]+\b)/i;

// A short list, matched inside words once spaces and punctuation are removed.
// The builder can hide any name this misses.
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nigg', 'fag', 'rape', 'porn',
  'chutiya', 'chutia', 'bhenchod', 'behenchod', 'madarchod', 'bhosdi', 'randi', 'gandu', 'lauda', 'lavda',
];

// Returns why a name can't be used, or null if it's fine.
export function nameProblem(raw) {
  const name = cleanName(raw);
  if (!name) return 'Add a name first.';
  if (LINK.test(name)) return "Names can't contain links or handles.";
  const squashed = name.toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '');
  if (BLOCKED.some((w) => squashed.includes(w))) return 'Please pick a different name.';
  return null;
}
