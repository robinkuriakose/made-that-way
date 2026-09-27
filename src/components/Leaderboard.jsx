import { resetWords } from '../lib/week.js';

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

  if (top.length === 0) return <p className="muted board-empty">No names yet this week. Finish a run and add yours.</p>;

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
              Level {entry.level} · {entry.correct} right
            </span>
            <span className="board-score">{entry.score}</span>
          </li>
        ),
      )}
    </ol>
  );
}

// This week's board. It starts again every Monday (lib/week.js), so a
// newcomer always has a real chance of seeing their name near the top. A
// player's all-time best is shown to them alone, on the home screen.
export default function Leaderboard({ boards, limit = 10, title = 'This week', titleId = 'board-title' }) {
  return (
    <div className="board-wrap">
      <div className="board-head">
        <p id={titleId} className="section-title">
          {title}
        </p>
        <p className="muted board-reset">{resetWords()}</p>
      </div>
      <BoardList board={boards?.week} limit={limit} />
    </div>
  );
}
