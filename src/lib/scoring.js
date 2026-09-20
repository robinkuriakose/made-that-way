export const TIME_LIMIT_SECONDS = 45;
export const HINT_PENALTY_SECONDS = 10;
export const RUN_LENGTH = 10;
export const REDEEM_SHARE = 0.25;

// Points for a correct answer, by elapsed seconds at the moment of answering.
// Anything strictly over 45 seconds scores zero.
export function pointBand(elapsedSeconds) {
  if (elapsedSeconds > TIME_LIMIT_SECONDS) return 0;
  const s = Math.floor(elapsedSeconds);
  if (s <= 7) return 10;
  if (s <= 14) return 8;
  if (s <= 25) return 7;
  if (s <= 34) return 6;
  return 5;
}

// A passed redeem earns a share of the band the wrong answer was given in,
// rounded up to a whole number.
export function redeemPoints(band) {
  return Math.ceil(band * REDEEM_SHARE);
}
