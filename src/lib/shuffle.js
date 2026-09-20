// Shuffling, including the order a question's four options are shown in.
//
// A question always stores its options in their original order, and every
// answer is recorded against that original order (chosenIndex), so scoring,
// verification, analytics and flags never need to know how the options were
// shown. Only the screen uses the shuffled "view".

// A small seeded generator (mulberry32), for shuffles that must come out the
// same every time, such as the daily question on one device.
export function seededRandom(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(list, random = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// order[displayPosition] = original option index.
export const optionOrder = (count = 4, random = Math.random) => shuffled([...Array(count).keys()], random);

// The question as the player sees it: options, the right answer and the
// wrong-answer explanations all rearranged together.
export function viewOf(question, order) {
  if (!question || !Array.isArray(order) || order.length !== question.options?.length) return question;
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    correctIndex: order.indexOf(question.correctIndex),
    explanationWrong: Array.isArray(question.explanationWrong) ? order.map((i) => question.explanationWrong[i] ?? null) : question.explanationWrong,
  };
}

export const toOriginal = (order, displayIndex) => (Array.isArray(order) ? order[displayIndex] : displayIndex);
export const toDisplay = (order, originalIndex) =>
  originalIndex == null ? originalIndex : Array.isArray(order) ? order.indexOf(originalIndex) : originalIndex;
