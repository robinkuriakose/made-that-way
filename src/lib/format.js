// Small formatting helpers for what players read.

// 95000 -> "1 min 35 s"; 2280000 -> "38 min"; 4500000 -> "1 h 15 min".
export function duration(ms) {
  if (ms == null || !Number.isFinite(ms)) return '';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 10) return `${m} min ${s % 60} s`;
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// "28 Sep"
export const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
