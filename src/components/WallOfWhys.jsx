import { useMemo, useState } from 'react';
import { showsImage } from './ImageFrame.jsx';
import { shuffled } from '../lib/shuffle.js';
import { questionLabel } from '../lib/themes.js';

const TILE_COUNT = 14;

// A slowly drifting strip of things from the quiz. Tapping a picture turns
// it over to show its question, never the answer: a taste of what the quiz
// is about, and a reason to find out. The strip pauses while hovered or
// while a card is turned, and doesn't move at all for people who ask their
// device for less motion (it scrolls by hand instead).
export default function WallOfWhys({ questions, themes }) {
  const tiles = useMemo(
    () => shuffled(questions.filter((q) => showsImage(q.image))).slice(0, TILE_COUNT),
    // Picked once per visit, so the strip doesn't reshuffle when the live bank arrives.
    [questions.length > 0],
  );
  const [flipped, setFlipped] = useState(null);

  if (tiles.length < 4) return null;

  const tile = (q, copy) => {
    const isFlipped = flipped === q.id && copy === 0;
    return (
      <li key={`${q.id}-${copy}`} className="wall-item" aria-hidden={copy === 1 ? 'true' : undefined}>
        <button
          type="button"
          className={`wall-tile${isFlipped ? ' is-flipped' : ''}`}
          aria-pressed={copy === 0 ? isFlipped : undefined}
          aria-label={copy === 0 ? (isFlipped ? q.stem : `${q.image.alt}. Show its question.`) : undefined}
          tabIndex={copy === 1 ? -1 : 0}
          onClick={() => setFlipped(isFlipped || copy === 1 ? null : q.id)}
        >
          <span className="wall-face wall-front">
            <img src={q.image.thumb ?? q.image.src} alt="" loading="lazy" decoding="async" />
          </span>
          <span className="wall-face wall-back">
            <span className="wall-label">{questionLabel(q, themes)}</span>
            <span className="wall-stem">{q.stem}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <section className="wall" aria-labelledby="wall-title">
      <div className="wall-head">
        <p id="wall-title" className="section-title">
          Why is it like that?
        </p>
        <p className="muted wall-hint">Tap a picture to see its question.</p>
      </div>
      <div className={`wall-viewport${flipped ? ' is-paused' : ''}`}>
        <ul className="wall-track">
          {tiles.map((q) => tile(q, 0))}
          {tiles.map((q) => tile(q, 1))}
        </ul>
      </div>
    </section>
  );
}
