import { useEffect, useRef, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A number that counts up (or down) to its new value instead of jumping.
// `from` sets where the first count starts; after that it counts on from
// whatever is showing. People who ask for less motion see the number change
// at once.
export default function CountUp({ value, from = value, duration = 700, className = '' }) {
  const [shown, setShown] = useState(from);
  const current = useRef(from);

  useEffect(() => {
    const show = (n) => {
      current.current = n;
      setShown(n);
    };
    if (reducedMotion() || current.current === value) {
      show(value);
      return undefined;
    }
    const begin = current.current;
    const t0 = performance.now();
    let frame;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      show(Math.round(begin + (value - begin) * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={`count-up ${className}`}>{shown}</span>;
}
