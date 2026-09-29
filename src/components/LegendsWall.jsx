import { Signature } from './SignaturePad.jsx';
import { duration } from '../lib/format.js';

// Everyone who finished every level: their signature, name, score and how
// long it took. A row you swipe, newest first; your own card is marked.
export default function LegendsWall({ legends, lastLevel, title = 'Legends', titleId = 'legends-title', note = null }) {
  const list = legends ?? [];
  return (
    <section className="legends" aria-labelledby={titleId}>
      <div className="legends-head">
        <p id={titleId} className="section-title">
          {title}
        </p>
        <p className="muted legends-note">{note ?? `Finished all ${lastLevel} levels`}</p>
      </div>
      {list.length ? (
        <ul className="legends-row">
          {list.map((l) => (
            <li key={l.id} className={`legend-card${l.isMe ? ' is-me' : ''}`}>
              <div className="legend-sign">{l.signature ? <Signature path={l.signature} /> : <span className="legend-initial">{l.name.slice(0, 1)}</span>}</div>
              <p className="legend-name">
                {l.name}
                {l.isMe && <span className="board-you"> (you)</span>}
              </p>
              <p className="legend-meta">
                <strong>{l.score}</strong> pts · {duration(l.durationMs)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted legends-empty">No legends yet. Finish all {lastLevel} levels and sign your name here first.</p>
      )}
    </section>
  );
}
