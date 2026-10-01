import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { resetWords } from '../lib/week.js';

export function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// One ranked list. Shows the top `limit` entries, plus this device's row
// underneath when it ranks below the cut. Ranks come from the server.
//
// With `animate` (the end screen), a change to the board plays out: every
// row slides from where it was to where it is now, and this player's row
// counts its rank up or down on the way. A first entry rises from below the
// list. It lands with a glow.
export function BoardList({ board, limit = 10, animate = false }) {
  const listRef = useRef(null);
  const before = useRef(null); // id -> { top, rank }, as last drawn
  const top = (board?.entries ?? []).slice(0, limit);
  const me = board?.me;
  const rows = me && !top.some((e) => e.isMe) ? [...top, null, me] : top;

  useLayoutEffect(() => {
    const list = listRef.current;
    const now = new Map();
    if (list) {
      for (const li of list.querySelectorAll('[data-entry]')) now.set(li.dataset.entry, { top: li.offsetTop, rank: Number(li.dataset.rank) });
    }
    const was = before.current;
    before.current = now;
    if (!animate || !was || !list || calm()) return;

    const items = [...list.querySelectorAll('[data-entry]')];
    const moved = items.some((li) => was.get(li.dataset.entry)?.top !== now.get(li.dataset.entry).top);
    if (!moved) return;
    const height = list.offsetHeight;
    for (const li of items) {
      const id = li.dataset.entry;
      const old = was.get(id);
      const mine = li.classList.contains('is-me');
      if (old) {
        const dy = old.top - now.get(id).top;
        if (Math.abs(dy) >= 1) gsap.fromTo(li, { y: dy }, { y: 0, duration: mine ? 1.2 : 0.8, ease: 'power3.inOut', delay: mine ? 0.15 : 0.25 });
      } else if (mine) {
        gsap.fromTo(li, { y: height - now.get(id).top + 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, ease: 'power3.out', delay: 0.15 });
      } else {
        gsap.fromTo(li, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, delay: 0.3 });
      }
    }

    const mineEl = list.querySelector('.board-row.is-me');
    if (!mineEl) return;
    const rankEl = mineEl.querySelector('.board-rank');
    const to = Number(mineEl.dataset.rank);
    const from = was.get(mineEl.dataset.entry)?.rank ?? Math.max(to, items.length) + 1;
    if (from !== to) {
      // It shows the old rank from the first frame, then counts to the new one.
      if (rankEl.firstChild) rankEl.firstChild.nodeValue = String(from);
      const counter = { v: from };
      gsap.to(counter, {
        v: to,
        duration: 1.2,
        delay: 0.15,
        ease: 'power3.inOut',
        // The same text node React drew, so React still owns it afterwards.
        onUpdate: () => {
          if (rankEl.firstChild) rankEl.firstChild.nodeValue = String(Math.round(counter.v));
        },
      });
    }
    gsap.delayedCall(1.4, () => {
      mineEl.classList.add('is-landed');
      setTimeout(() => mineEl.classList.remove('is-landed'), 1800);
    });
  });

  if (top.length === 0) return <p className="muted board-empty">No names yet this week. Finish a run and add yours.</p>;

  return (
    <ol className="board" ref={listRef}>
      {rows.map((entry) =>
        entry === null ? (
          <li key="gap" className="board-gap" aria-hidden="true">
            …
          </li>
        ) : (
          <li key={entry.id} data-entry={entry.id} data-rank={entry.rank} className={`board-row${entry.isMe ? ' is-me' : ''}`}>
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
export default function Leaderboard({ boards, limit = 10, title = 'This week', titleId = 'board-title', animate = false }) {
  return (
    <div className="board-wrap">
      <div className="board-head">
        <p id={titleId} className="section-title">
          {title}
        </p>
        <p className="muted board-reset">{resetWords()}</p>
      </div>
      <BoardList board={boards?.week} limit={limit} animate={animate} />
    </div>
  );
}
