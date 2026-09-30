import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

// The home screen's hero: a pile of picture cards. Drag or flick the top one
// away, either way, and the next comes forward while a new one slides in at
// the back. Tap it and it flips over, growing into its question.
//
// Motion is GSAP; the drag is plain pointer events, so the page still
// scrolls on a phone (vertical pans belong to the browser). Everything
// still works, without the movement, for people who ask for less motion.

const VISIBLE = 4; // the top card and three behind it
const THROW_DISTANCE = 110; // px dragged before letting go sends it away
const THROW_SPEED = 0.5; // px per ms: a quick flick sends it too
const TAP_SLOP = 6; // px of movement still counted as a tap

// Where each card sits: the top one straight, the ones behind smaller,
// higher and turned a little, like prints piled on a table.
const SLOTS = [
  { x: 0, y: 0, scale: 1, rotation: 0, '--dim': 0 },
  { x: -16, y: -22, scale: 0.94, rotation: -5, '--dim': 0.05 },
  { x: 18, y: -42, scale: 0.88, rotation: 6, '--dim': 0.1 },
  { x: -8, y: -58, scale: 0.82, rotation: -3, '--dim': 0.15 },
];
const BACK = { x: 0, y: -72, scale: 0.76, rotation: 2, '--dim': 0.2 };
const pose = (i) => (i < SLOTS.length ? { ...SLOTS[i], autoAlpha: 1 } : { ...BACK, autoAlpha: 0 });
const between = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]));

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function Print({ question, big = false }) {
  const { image } = question;
  return (
    <div className="deck-print">
      <img
        src={big ? image.src : (image.thumb ?? image.src)}
        srcSet={!big && image.thumb ? `${image.thumb} 360w, ${image.src} 1200w` : undefined}
        sizes="(max-width: 720px) 60vw, 260px"
        alt=""
        draggable={false}
        decoding="async"
      />
      <span className="deck-glare" aria-hidden="true" />
      <span className="deck-why" aria-hidden="true">
        Why?
      </span>
    </div>
  );
}

// The card, flipped over and grown into a window: the picture big, its
// question, and what to do next. It flips back into the pile on close.
function FlipDialog({ question, label, from, starting, onPlay, onClosed }) {
  const backdropRef = useRef(null);
  const flipRef = useRef(null);
  const innerRef = useRef(null);
  const backRef = useRef(null);
  const playRef = useRef(null);
  const tl = useRef(null);
  const closing = useRef(null);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  const targetRect = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const flip = flipRef.current;
    const width = Math.min(560, vw - 32);
    gsap.set(flip, { width, height: 1 });
    const natural = Math.ceil(backRef.current.scrollHeight);
    const height = Math.min(natural, vh - 32);
    // Only a window taller than the screen scrolls, and only once it's open.
    backRef.current.dataset.scrolls = natural > height ? '1' : '';
    return { left: (vw - width) / 2, top: Math.max(16, (vh - height) / 2), width, height };
  };

  const close = useCallback((next = null) => {
    if (closing.current || !tl.current) return;
    closing.current = { next };
    backRef.current.style.overflowY = 'hidden';
    tl.current.timeScale(calm() ? 1 : 1.35).reverse();
  }, []);

  useLayoutEffect(() => {
    const flip = flipRef.current;
    const start = from.getBoundingClientRect();
    const target = targetRect();
    gsap.set(flip, { left: start.left, top: start.top, width: start.width, height: start.height, autoAlpha: 1 });
    gsap.set(from, { autoAlpha: 0 });
    document.body.classList.add('no-scroll');

    const reveal = backRef.current.querySelectorAll('.flip-reveal');
    const back = backRef.current;
    const t = gsap.timeline({
      onComplete: () => {
        if (back.dataset.scrolls) back.style.overflowY = 'auto';
        if (!back.contains(document.activeElement)) playRef.current?.focus({ preventScroll: true });
      },
      onReverseComplete: () => {
        gsap.set(from, { autoAlpha: 1 });
        onClosedRef.current(closing.current?.next ?? null);
      },
    });
    if (calm()) {
      t.set(flip, target).set(innerRef.current, { rotationY: 180 }).fromTo([backdropRef.current, flip], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
    } else {
      t.fromTo(backdropRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: 'power2.out' }, 0)
        .to(flip, { ...target, duration: 0.95, ease: 'expo.inOut' }, 0)
        .to(innerRef.current, { rotationY: 180, duration: 0.95, ease: 'power3.inOut' }, 0)
        .to(
          innerRef.current,
          { keyframes: [{ z: 170, duration: 0.47, ease: 'power2.out' }, { z: 0, duration: 0.48, ease: 'power2.in' }] },
          0,
        )
        .fromTo(reveal, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 0.6);
    }
    tl.current = t;
    closing.current = null;
    // The window takes focus now; Play gets it once it has faded in.
    flip.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      const items = [...flipRef.current.querySelectorAll(`.flip-back ${FOCUSABLE}`)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // Keep it centred if the window changes size once it's open.
    const onResize = () => {
      if (t.progress() === 1 && !closing.current) gsap.set(flip, targetRect());
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      t.kill();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('no-scroll');
      gsap.set(from, { autoAlpha: 1 });
    };
  }, [from, close]);

  return createPortal(
    <>
      <div className="flip-backdrop" ref={backdropRef} onClick={() => close()} />
      <div className="flip" ref={flipRef} role="dialog" aria-modal="true" aria-labelledby="flip-title" tabIndex={-1}>
        <div className="flip-inner" ref={innerRef}>
          <div className="flip-face flip-front" aria-hidden="true">
            <Print question={question} />
          </div>
          <div className="flip-face flip-back" ref={backRef}>
            <div className="flip-picture flip-reveal">
              <img src={question.image.src} alt={question.image.alt} decoding="async" />
              <button type="button" className="flip-close" aria-label="Close" onClick={() => close()}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="flip-label flip-reveal">{label}</p>
            <h2 id="flip-title" className="flip-stem flip-reveal">
              {question.stem}
            </h2>
            <div className="flip-actions flip-reveal">
              <button ref={playRef} type="button" className="button button-primary button-big" onClick={onPlay} disabled={starting}>
                {starting ? 'Loading…' : 'Play this one'}
              </button>
              <button type="button" className="text-button" onClick={() => close('another')}>
                Another one
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default function HeroDeck({ tiles, labelFor, starting, onPlay }) {
  const [order, setOrder] = useState(() => tiles.map((_, i) => i));
  const [flying, setFlying] = useState([]);
  const [open, setOpen] = useState(null); // { index, from }
  const [sent, setSent] = useState(0);
  const nodes = useRef(new Map());
  const drag = useRef(null);
  const dealt = useRef(false);
  const lastLayout = useRef(null);
  const touched = useRef(false);
  const refocus = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const deck = order.filter((i) => !flying.includes(i)).slice(0, VISIBLE + 1);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const rendered = [...flying.filter((i) => !deck.includes(i)), ...deck];
  const nodeOf = (i) => (i == null ? null : nodes.current.get(tiles[i]?.id));

  // Put every card in its place after the pile changes: the first time as a
  // deal from below, after that each moving up a place.
  useLayoutEffect(() => {
    if (lastLayout.current?.order === order && lastLayout.current?.flying === flying) return; // StrictMode's second run
    lastLayout.current = { order, flying };
    const els = deck.map(nodeOf);

    if (!dealt.current) {
      dealt.current = true;
      els.forEach((el, p) => {
        if (!el) return;
        el.dataset.placed = '1';
        if (calm() || p >= VISIBLE) {
          gsap.set(el, pose(p));
          return;
        }
        gsap.set(el, { x: gsap.utils.random(-70, 70), y: 280, rotation: gsap.utils.random(-20, 20), scale: 0.86, autoAlpha: 0, '--dim': 0 });
        gsap.to(el, { ...pose(p), duration: 1.25, ease: 'expo.out', delay: 0.15 + (VISIBLE - 1 - p) * 0.1 });
      });
      return;
    }

    els.forEach((el, p) => {
      if (!el || drag.current?.el === el) return;
      if (!el.dataset.placed) {
        gsap.set(el, pose(VISIBLE));
        el.dataset.placed = '1';
      }
      gsap.to(el, { ...pose(p), duration: calm() ? 0 : 0.85, ease: 'expo.out', delay: calm() ? 0 : p * 0.035, overwrite: 'auto' });
    });
    if (refocus.current) {
      refocus.current = false;
      els[0]?.focus({ preventScroll: true });
    }
  }, [order, flying]);

  // A little nudge once the pile has landed, to show it moves. Only if the
  // player hasn't touched it already.
  useEffect(() => {
    if (calm()) return undefined;
    const timer = setTimeout(() => {
      const el = nodeOf(deckRef.current[0]);
      if (!el || touched.current || openRef.current || drag.current) return;
      gsap
        .timeline()
        .to(el, { x: -34, rotation: -6, duration: 0.45, ease: 'power2.out' })
        .to(el, { x: 0, rotation: 0, duration: 1.2, ease: 'elastic.out(1, 0.45)' });
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  // Send the top card to the back of the pile: it slides out to one side,
  // then tucks in behind the others as they move up, and settles out of
  // sight at the back. It never leaves the pile.
  const throwTop = useCallback(
    (dir, { vx = 0 } = {}) => {
      if (openRef.current) return;
      const i = deckRef.current[0];
      const el = nodeOf(i);
      if (!el) return;
      touched.current = true;
      const land = () => setFlying((f) => f.filter((x) => x !== i));
      gsap.killTweensOf(el, 'x,y,rotation,scale');
      if (calm()) {
        gsap.to(el, { autoAlpha: 0, duration: 0.15, onComplete: land });
      } else {
        const speed = Math.min(2.5, Math.abs(vx));
        const out = dir * Math.max(Math.abs(Number(gsap.getProperty(el, 'x'))) + 24, el.offsetWidth * 0.82);
        const back = pose(VISIBLE - 1);
        gsap
          .timeline({ onComplete: land })
          .to(el.firstChild, { rotationX: 0, rotationY: 0, '--glare': 0, duration: 0.3 }, 0)
          .to(el, { x: out, y: -14, rotation: dir * (12 + speed * 3), scale: 0.97, duration: 0.36 - speed * 0.04, ease: 'power2.out' }, 0)
          .set(el, { zIndex: 1 })
          .to(el, {
            x: back.x,
            y: back.y - 6,
            scale: back.scale * 0.96,
            rotation: back.rotation - dir * 4,
            '--dim': back['--dim'] + 0.05,
            duration: 0.66,
            ease: 'power3.inOut',
          })
          .to(el, { autoAlpha: 0, duration: 0.24, ease: 'power1.in' }, '-=0.24');
      }
      setFlying((f) => [...f, i]);
      setOrder((o) => [...o.filter((x) => x !== i), i]);
      setSent((n) => n + 1);
    },
    [tiles],
  );

  const openTop = () => {
    const i = deckRef.current[0];
    const el = nodeOf(i);
    if (!el || openRef.current) return;
    touched.current = true;
    // Straighten it first, so the flip starts exactly where the card is and
    // nothing still moving can make it show again under the flip.
    gsap.killTweensOf([el, el.firstChild]);
    gsap.set(el, pose(0));
    gsap.set(el.firstChild, { rotationX: 0, rotationY: 0, '--glare': 0 });
    setOpen({ index: i, from: el });
  };

  const onClosed = (next) => {
    const el = open?.from;
    setOpen(null);
    el?.focus({ preventScroll: true });
    if (next === 'another') {
      refocus.current = true;
      requestAnimationFrame(() => throwTop(1));
    }
  };

  // Hover: the top card tilts towards the pointer, with a soft glare.
  const tilt = (e) => {
    if (e.pointerType !== 'mouse' || drag.current || openRef.current) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(el.firstChild, {
      rotationY: px * 14,
      rotationX: -py * 12,
      transformPerspective: 900,
      '--gx': `${(px + 0.5) * 100}%`,
      '--gy': `${(py + 0.5) * 100}%`,
      '--glare': 1,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  };
  const untilt = (e) => gsap.to(e.currentTarget.firstChild, { rotationX: 0, rotationY: 0, '--glare': 0, duration: 0.8, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });

  // Dragging the top card: it follows the finger, turning as it goes, and the
  // cards behind lean in. Let go past the line (or flick) and it's sent away;
  // otherwise it springs back. A touch that barely moves is a tap: flip it.
  const onPointerDown = (e) => {
    if (e.button !== 0 || openRef.current) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    gsap.killTweensOf(el, 'x,y,rotation');
    const now = performance.now();
    drag.current = {
      id: e.pointerId,
      el,
      x0: e.clientX,
      y0: e.clientY,
      startX: Number(gsap.getProperty(el, 'x')),
      startY: Number(gsap.getProperty(el, 'y')),
      moved: false,
      samples: [{ x: e.clientX, y: e.clientY, t: now }],
      follow: {
        x: gsap.quickTo(el, 'x', { duration: 0.28, ease: 'power3' }),
        y: gsap.quickTo(el, 'y', { duration: 0.28, ease: 'power3' }),
        rotation: gsap.quickTo(el, 'rotation', { duration: 0.35, ease: 'power3' }),
      },
    };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) {
      tilt(e);
      return;
    }
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) > TAP_SLOP) {
      d.moved = true;
      touched.current = true;
      d.el.classList.add('is-dragging');
      gsap.to(d.el.firstChild, { rotationX: 0, rotationY: 0, '--glare': 0, duration: 0.3, overwrite: 'auto' });
    }
    if (!d.moved) return;
    d.follow.x(d.startX + dx);
    d.follow.y(d.startY + dy * 0.35);
    d.follow.rotation(dx * 0.07);
    const now = performance.now();
    d.samples.push({ x: e.clientX, y: e.clientY, t: now });
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();

    const lean = Math.min(1, Math.abs(dx) / (THROW_DISTANCE * 1.6));
    deckRef.current.slice(1).forEach((i, k) => {
      const el = nodeOf(i);
      if (el) gsap.to(el, { ...between(pose(k + 1), pose(k), lean), duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    });
  };

  const settle = () => {
    deckRef.current.forEach((i, p) => {
      const el = nodeOf(i);
      if (!el) return;
      gsap.to(el, { ...pose(p), duration: p === 0 ? 1.1 : 0.7, ease: p === 0 ? 'elastic.out(1, 0.55)' : 'power3.out', overwrite: 'auto' });
    });
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    d.el.classList.remove('is-dragging');
    if (!d.moved) {
      if (e.type === 'pointerup') openTop();
      else settle();
      return;
    }
    const dx = e.clientX - d.x0;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const vx = (last.x - first.x) / dt;
    const vy = (last.y - first.y) / dt;
    const flicked = Math.abs(vx) > THROW_SPEED && Math.sign(vx) === Math.sign(dx);
    if (e.type === 'pointerup' && (Math.abs(dx) > THROW_DISTANCE || flicked)) throwTop(Math.sign(dx) || 1, { vx, vy });
    else settle();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openTop();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      refocus.current = true;
      throwTop(e.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  if (tiles.length < VISIBLE + 1) return null;
  const top = tiles[deck[0]];

  return (
    <div className="deck-wrap">
      <div className="deck">
        {rendered.map((i) => {
          const q = tiles[i];
          const p = deck.indexOf(i);
          const isTop = p === 0;
          return (
            <div
              key={q.id}
              ref={(el) => (el ? nodes.current.set(q.id, el) : nodes.current.delete(q.id))}
              className={`deck-card${isTop ? ' is-top' : ''}`}
              style={{ zIndex: p === -1 ? 60 : 50 - p }}
              {...(isTop
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `${q.image.alt}. Press Enter to see its question, or the arrow keys for another picture.`,
                    onPointerDown,
                    onPointerMove,
                    onPointerUp,
                    onPointerCancel: onPointerUp,
                    onPointerLeave: untilt,
                    onKeyDown,
                  }
                : { 'aria-hidden': true })}
            >
              <Print question={q} />
            </div>
          );
        })}
      </div>

      <p className="deck-hint">Swipe for another, tap to flip</p>
      <p className="visually-hidden" aria-live="polite">
        {sent > 0 && top ? `Next picture: ${top.image.alt}` : ''}
      </p>

      {open && (
        <FlipDialog
          question={tiles[open.index]}
          label={labelFor(tiles[open.index])}
          from={open.from}
          starting={starting}
          onPlay={() => onPlay(tiles[open.index].id)}
          onClosed={onClosed}
        />
      )}
    </div>
  );
}
