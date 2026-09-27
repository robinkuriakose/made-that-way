// The short reason shown right after an answer. Most explanations open with
// the problem and follow with how the design solves it, so a short first
// sentence takes the next one too: together they say why, on their own.
const MIN_LENGTH = 120;

export function firstSentence(text) {
  const clean = String(text ?? '').trim();
  const parts = clean.split(/(?<=[.!?])\s+(?=["'‘“(]?[A-Z0-9])/);
  let out = parts[0] ?? '';
  if (out.length < MIN_LENGTH && parts[1]) out = `${out} ${parts[1]}`;
  return out;
}
