import { useEffect, useRef, useState } from 'react';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A row of pictures from the quiz, and nothing else: the pictures are the
// hook, and the home screen has enough words. Swipe it by hand (it never
// moves on its own); on a computer, arrows page through it. Tapping one
// calls onOpen(index), which opens it big with its question (WhyPreview, in
// HomeScreen). `activeIndex` is the one last looked at, kept in view.
export default function WallOfWhys({ tiles, onOpen, activeIndex = null }) {
  const [ends, setEnds] = useState({ start: true, end: false });
  const rowRef = useRef(null);

  const readEnds = () => {
    const row = rowRef.current;
    if (!row) return;
    setEnds({ start: row.scrollLeft < 8, end: row.scrollLeft + row.clientWidth > row.scrollWidth - 8 });
  };
  useEffect(readEnds, [tiles.length]);

  // After closing a picture, the row shows the last one looked at.
  useEffect(() => {
    if (activeIndex == null) return;
    rowRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [activeIndex]);

  if (tiles.length < 4) return null;

  const page = (dir) => {
    const row = rowRef.current;
    row?.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <section className="wall" aria-labelledby="wall-title">
      <div className="wall-head">
        <p id="wall-title" className="section-title">
          Why is it like that?
        </p>
        <div className="wall-arrows">
          <button type="button" className="wall-arrow" aria-label="Earlier pictures" onClick={() => page(-1)} disabled={ends.start}>
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" className="wall-arrow" aria-label="More pictures" onClick={() => page(1)} disabled={ends.end}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <ul className="wall-row" ref={rowRef} onScroll={readEnds}>
        {tiles.map((q, i) => (
          <li key={q.id} className="wall-item">
            <button type="button" className="wall-tile" aria-label={`${q.image.alt}. See its question.`} onClick={() => onOpen(i)}>
              <img src={q.image.thumb ?? q.image.src} alt="" loading="lazy" decoding="async" />
              <span className="wall-why" aria-hidden="true">
                Why?
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
