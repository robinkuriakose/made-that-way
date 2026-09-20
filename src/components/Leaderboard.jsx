import { useState } from 'react';

export function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

// One ranked list. Shows the top `limit` entries, plus this device's row
// underneath when it ranks below the cut. Ranks come from the server.
export function BoardList({ board, limit = 10 }) {
  const top = (board?.entries ?? []).slice(0, limit);
  const me = board?.me;
  const rows = me && !top.some((e) => e.isMe) ? [...top, null, me] : top;

  if (top.length === 0) return <p className="muted board-empty">No names here yet. Finish a run and add yours.</p>;

  return (
    <ol className="board">
      {rows.map((entry) =>
        entry === null ? (
          <li key="gap" className="board-gap" aria-hidden="true">
            …
          </li>
        ) : (
          <li key={entry.id} className={`board-row${entry.isMe ? ' is-me' : ''}`}>
            <span className="board-rank">{entry.rank}</span>
            <span className="board-name">
              {entry.name}
              {entry.isMe && <span className="board-you"> (you)</span>}
            </span>
            <span className="board-detail">
              {entry.correct} of {entry.total} right
            </span>
            <span className="board-score">{entry.score}</span>
          </li>
        ),
      )}
    </ol>
  );
}

const TABS = [
  { id: 'week', label: 'This week' },
  { id: 'allTime', label: 'All time' },
];

// Both boards behind a small switch. This week is the default, so a newcomer
// has a real chance of seeing their name near the top; it falls back to all
// time when nobody has played this week.
export default function Leaderboard({ boards, limit = 10, title = 'Leaderboard', titleId = 'board-title' }) {
  // null until the player picks, so the default follows the data as it loads.
  const [picked, setTab] = useState(null);
  const weekEmpty = !boards?.week?.entries?.length;
  const tab = picked ?? (weekEmpty && boards?.allTime?.entries?.length ? 'allTime' : 'week');
  return (
    <div className="board-wrap">
      <div className="board-head">
        <p id={titleId} className="section-title">
          {title}
        </p>
        <div className="segmented segmented-small" role="group" aria-labelledby={titleId}>
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <BoardList board={boards?.[tab]} limit={limit} />
    </div>
  );
}
