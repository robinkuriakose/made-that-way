import { useEffect, useRef, useState } from 'react';
import { START_LIVES } from '../lib/scoring.js';

export function Heart({ state = 'full' }) {
  return (
    <svg className={`heart is-${state}`} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.2.4.8.4 1 0 .7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

// Lives as hearts: full ones for the lives left, empty ones up to the three
// a run starts with. A heart that's just been lost drops away, and one that's
// just been won pops in. Nothing moves when the component first appears.
export default function Hearts({ lives, className = '' }) {
  const shown = Math.max(START_LIVES, lives);
  const previous = useRef(lives);
  const [change, setChange] = useState(null);

  useEffect(() => {
    if (lives !== previous.current) {
      setChange({ from: previous.current, to: lives });
      previous.current = lives;
      const timer = setTimeout(() => setChange(null), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lives]);

  const stateOf = (i) => {
    if (change && change.to < change.from && i >= change.to && i < change.from) return 'losing';
    if (change && change.to > change.from && i >= change.from && i < change.to) return 'gaining';
    return i < lives ? 'full' : 'empty';
  };

  return (
    <span className={`hearts ${className}`} role="img" aria-label={`${lives} ${lives === 1 ? 'life' : 'lives'} left`}>
      {Array.from({ length: shown }, (_, i) => (
        <Heart key={i} state={stateOf(i)} />
      ))}
    </span>
  );
}
