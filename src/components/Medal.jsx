import { BADGES } from '../lib/rewards.js';

// Small medals for the weekly board and the name window: silver and gold
// discs on a ribbon, and Legend as a gold star on a dark disc. Flat fills
// (no gradient ids), so any number can sit on one page.
const LOOKS = {
  silver: { disc: '#bcc4ce', edge: '#8d96a2', shine: '#f1f3f6' },
  gold: { disc: '#e8b923', edge: '#a87c0a', shine: '#fff1a8' },
  legend: { disc: '#16150f', edge: '#16150f', shine: null, star: '#f3d27f' },
};

export function medalLabel(kind) {
  const badge = BADGES.find((b) => b.id === kind);
  if (!badge) return '';
  return badge.level ? `${badge.label}: cleared level ${badge.level}` : `${badge.label}: cleared every level`;
}

// For the key under the board: "Level 6", or "Legend".
export function medalShort(kind) {
  const badge = BADGES.find((b) => b.id === kind);
  return badge?.level ? `Level ${badge.level}` : (badge?.label ?? '');
}

export function MedalIcon({ kind, size = 18, className = '' }) {
  const look = LOOKS[kind];
  if (!look) return null;
  const label = medalLabel(kind);
  return (
    <svg className={`medal-icon medal-icon-${kind} ${className}`} viewBox="0 0 20 24" width={size} height={size * 1.2} role="img" aria-label={label}>
      <title>{label}</title>
      <path d="M4.5 0h4.2l3 8.5H7.5z" fill="#0860b6" />
      <path d="M15.5 0h-4.2l-3 8.5h4.2z" fill="#cfe957" />
      <circle cx="10" cy="15.5" r="7.6" fill={look.edge} />
      <circle cx="10" cy="15.5" r="6.2" fill={look.disc} />
      {look.shine && <ellipse cx="7.8" cy="12.9" rx="2.2" ry="1.4" fill={look.shine} opacity="0.85" />}
      {look.star && <path d="M10 10.6l1.45 2.95 3.25.47-2.35 2.3.55 3.24L10 18.03l-2.9 1.53.55-3.24-2.35-2.3 3.25-.47z" fill={look.star} />}
    </svg>
  );
}
