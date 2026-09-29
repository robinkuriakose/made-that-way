import { useEffect, useMemo, useRef, useState } from 'react';
import SignaturePad from './SignaturePad.jsx';
import LegendsWall from './LegendsWall.jsx';
import CountUp from './CountUp.jsx';
import Burst from './Burst.jsx';
import { duration } from '../lib/format.js';
import { NAME_MAX_LENGTH, cleanName } from '../lib/names.js';

const TILES = 20;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A trophy built from the run itself: the pictures of the questions the
// player answered fly in and settle inside the cup, then turn gold.
function Trophy({ pictures, still }) {
  const tiles = useMemo(() => {
    if (!pictures.length) return [];
    return Array.from({ length: TILES }, (_, i) => {
      const angle = (i / TILES) * Math.PI * 2;
      return {
        src: pictures[i % pictures.length],
        style: {
          '--fx': `${Math.round(Math.cos(angle) * 320)}px`,
          '--fy': `${Math.round(Math.sin(angle) * 260 - 80)}px`,
          '--fr': `${Math.round(((i * 47) % 90) - 45)}deg`,
          '--d': `${(i % 10) * 70 + Math.floor(i / 10) * 120}ms`,
        },
      };
    });
  }, [pictures]);

  return (
    <div className={`trophy${still ? ' is-still' : ''}`} aria-hidden="true">
      <svg className="trophy-handles" viewBox="0 0 300 180">
        <path d="M58 30 C8 30 8 110 70 118" />
        <path d="M242 30 C292 30 292 110 230 118" />
      </svg>
      <div className="trophy-cup">
        <div className="trophy-tiles">
          {tiles.map((t, i) => (
            <span key={i} className="trophy-tile" style={t.style}>
              <img src={t.src} alt="" decoding="async" />
            </span>
          ))}
        </div>
        <span className="trophy-gold" />
        <span className="trophy-sweep" />
      </div>
      <span className="trophy-stem" />
      <span className="trophy-base">Legend</span>
      {!still && <Burst />}
    </div>
  );
}

// The end of every level there is. Three beats: the level bars light up one
// by one, a trophy made of your run's pictures assembles and turns gold, then
// you sign the Legends wall with your finger and see your card join it.
export default function LegendFinale({ lastLevel, score, durationMs, pictures, name: startName, legends, signed, onSign, onFeedback, onContinue }) {
  const [stage, setStage] = useState(() => (reducedMotion() || signed ? 'sign' : 'lights'));
  const [name, setName] = useState(startName ?? '');
  const [signature, setSignature] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [stamped, setStamped] = useState(Boolean(signed));
  const signRef = useRef(null);

  // Beat 1, then beat 2, then the sign card.
  useEffect(() => {
    if (stage === 'lights') {
      const t = setTimeout(() => setStage('trophy'), lastLevel * 260 + 1100);
      return () => clearTimeout(t);
    }
    if (stage === 'trophy') {
      const t = setTimeout(() => setStage('sign'), 3600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage, lastLevel]);

  useEffect(() => {
    if (stage === 'sign') signRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [stage]);

  async function sign(e) {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean) {
      setError('Add your name.');
      return;
    }
    setSending(true);
    setError(null);
    const result = await onSign(clean, signature);
    setSending(false);
    if (!result.ok) setError(result.error);
    else setStamped(true);
  }

  const showTrophy = stage !== 'lights';

  return (
    <div className="finale">
      <div className="finale-inner">
        {stage !== 'sign' && (
          <button type="button" className="finale-skip" onClick={() => setStage('sign')}>
            Skip
          </button>
        )}

        <ol className={`finale-levels${stage === 'lights' ? ' is-lighting' : ''}`} aria-hidden="true">
          {Array.from({ length: lastLevel }, (_, i) => (
            <li key={i} style={{ '--i': i }}>
              {i + 1}
            </li>
          ))}
        </ol>
        <p className="finale-kicker">{`All ${lastLevel} levels. Cleared.`}</p>

        {showTrophy && <Trophy pictures={pictures} still={stage === 'sign'} />}

        {showTrophy && (
          <div className="finale-numbers">
            <p className="finale-score">
              <CountUp value={score} from={0} duration={1600} />
              <span>points</span>
            </p>
            {durationMs != null && <p className="finale-time">in {duration(durationMs)}</p>}
          </div>
        )}

        {stage === 'sign' && (
          <div className="finale-sign" ref={signRef}>
            {stamped ? (
              <div className="legend-done">
                <div className="legend-card-big">
                  <span className="seal" aria-hidden="true">
                    <svg viewBox="0 0 120 120">
                      <defs>
                        <path id="seal-ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
                      </defs>
                      <circle cx="60" cy="60" r="56" />
                      <text>
                        <textPath href="#seal-ring">LEGEND · MADE THAT WAY · LEGEND · MADE THAT WAY ·</textPath>
                      </text>
                      <text x="60" y="68" textAnchor="middle" className="seal-mark">
                        ★
                      </text>
                    </svg>
                  </span>
                  <p className="eyebrow">You're on the wall</p>
                  <p className="legend-card-name">{cleanName(name)}</p>
                  <p className="legend-meta">
                    <strong>{score}</strong> pts · {duration(durationMs)}
                  </p>
                </div>
                <LegendsWall legends={legends} lastLevel={lastLevel} titleId="finale-legends" />
                <div className="finale-actions">
                  <button type="button" className="button button-primary" onClick={onFeedback}>
                    Help shape the next levels
                  </button>
                  <button type="button" className="text-button finale-text" onClick={onContinue}>
                    See your run
                  </button>
                </div>
              </div>
            ) : (
              <form className="legend-form" onSubmit={sign}>
                <p className="eyebrow">You're a Legend</p>
                <h1 className="finale-title">Sign the Legends wall</h1>
                <label className="field-label" htmlFor="legend-name">
                  Your name
                </label>
                <input id="legend-name" type="text" value={name} maxLength={NAME_MAX_LENGTH} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
                <p className="field-label legend-sign-label">Your signature</p>
                <SignaturePad onChange={setSignature} />
                {error && <p className="form-error">{error}</p>}
                <div className="finale-actions">
                  <button type="submit" className="button button-primary" disabled={sending}>
                    {sending ? 'Signing…' : 'Put me on the wall'}
                  </button>
                  <button type="button" className="text-button finale-text" onClick={onContinue}>
                    Not now
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
