import { useEffect, useMemo, useRef, useState } from 'react';
import { showsImage } from './ImageFrame.jsx';
import WhyPreview from './WhyPreview.jsx';
import { shuffled } from '../lib/shuffle.js';
import { questionLabel } from '../lib/themes.js';
import { seenIds } from '../lib/seen.js';

const TILE_COUNT = 12;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A row of pictures from the quiz, and nothing else: the pictures are the
// hook, and the home screen has enough words. Swipe it by hand (it never
// moves on its own); on a computer, arrows page through it. Tapping one opens
// it big with its question, never the answer, and "Play this one" starts a
// run with that question first. Questions this device hasn't seen come first.
export default function WallOfWhys({ questions, themes, starting, onPlay }) {
  const tiles = useMemo(() => {
    const seen = new Set(seenIds());
    const pictures = questions.filter((q) => showsImage(q.image));
    return [...shuffled(pictures.filter((q) => !seen.has(q.id))), ...shuffled(pictures.filter((q) => seen.has(q.id)))].slice(
      0,
      TILE_COUNT,
    );
    // Picked once per visit, so the row doesn't reshuffle when the live bank arrives.
  }, [questions.length > 0]);
  const [open, setOpen] = useState(null);
  const [ends, setEnds] = useState({ start: true, end: false });
  const rowRef = useRef(null);

  const readEnds = () => {
    const row = rowRef.current;
    if (!row) return;
    setEnds({ start: row.scrollLeft < 8, end: row.scrollLeft + row.clientWidth > row.scrollWidth - 8 });
  };
  useEffect(readEnds, [tiles.length]);

  if (tiles.length < 4) return null;

  const page = (dir) => {
    const row = rowRef.current;
    row?.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  // Closing leaves the row showing the last picture looked at.
  const close = () => {
    const tile = rowRef.current?.children[open]?.querySelector('button');
    setOpen(null);
    tile?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  const question = open == null ? null : tiles[open];

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
            <button type="button" className="wall-tile" aria-label={`${q.image.alt}. See its question.`} onClick={() => setOpen(i)}>
              <img src={q.image.thumb ?? q.image.src} alt="" loading="lazy" decoding="async" />
              <span className="wall-why" aria-hidden="true">
                Why?
              </span>
            </button>
          </li>
        ))}
      </ul>
      {question && (
        <WhyPreview
          question={question}
          label={questionLabel(question, themes)}
          starting={starting}
          onPlay={() => onPlay(question.id)}
          onAnother={() => setOpen((i) => (i + 1) % tiles.length)}
          onClose={close}
        />
      )}
    </section>
  );
}
