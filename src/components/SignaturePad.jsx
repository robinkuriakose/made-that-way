import { useEffect, useRef, useState } from 'react';

// The box the drawing is stored in. Whatever size the pad is on screen, the
// signature is saved in these units, so it looks the same everywhere.
export const SIGNATURE_BOX = { width: 320, height: 120 };

// Draw with a finger, a pen or a mouse. The drawing is kept as SVG path data
// (moves and lines only), small and safe to show anywhere: onChange gets the
// path, or '' when the pad is empty.
export default function SignaturePad({ onChange, label = 'Sign here' }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Crisp lines on high density screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = getComputedStyle(canvas).color;
  }, []);

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  };

  const toPath = () =>
    strokes.current
      .filter((s) => s.length)
      .map((s) =>
        s
          .map((p, i) => `${i ? 'L' : 'M'}${((p.x / p.w) * SIGNATURE_BOX.width).toFixed(1)} ${((p.y / p.h) * SIGNATURE_BOX.height).toFixed(1)}`)
          .join(' '),
      )
      .join(' ');

  function down(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    strokes.current.push([p]);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  }

  function move(e) {
    if (!drawing.current) return;
    const p = point(e);
    const stroke = strokes.current.at(-1);
    const last = stroke.at(-1);
    // Skip points too close to matter; it keeps the saved path small.
    if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 1.5) return;
    stroke.push(p);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(toPath());
  }

  function clear() {
    strokes.current = [];
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange('');
  }

  return (
    <div className="sigpad">
      <canvas
        ref={canvasRef}
        className="sigpad-canvas"
        aria-label={label}
        role="img"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      />
      {empty && <span className="sigpad-hint" aria-hidden="true">{label}</span>}
      <span className="sigpad-line" aria-hidden="true" />
      {!empty && (
        <button type="button" className="text-button sigpad-clear" onClick={clear}>
          Start again
        </button>
      )}
    </div>
  );
}

// A saved signature, drawn back.
export function Signature({ path, className = '' }) {
  if (!path) return null;
  return (
    <svg className={`signature ${className}`} viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`} aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
