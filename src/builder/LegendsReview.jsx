import { useEffect, useState } from 'react';
import { Signature } from '../components/SignaturePad.jsx';
import { duration } from '../lib/format.js';

// Everyone on the Legends wall, with the signature they drew. Hide anything
// that shouldn't be there; it disappears from the wall at once.
export default function LegendsReview({ api, notify }) {
  const [legends, setLegends] = useState(null);
  const [test, setTest] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLegends(null);
    api(`/api/builder/legends?test=${test ? '1' : '0'}`)
      .then((d) => setLegends(d.legends))
      .catch((err) => setError(err.message));
  }, [api, test]);

  async function toggle(l) {
    try {
      const { legend } = await api('/api/builder/legends', { method: 'PATCH', body: { runId: l.runId, action: l.hidden ? 'unhide' : 'hide' } });
      setLegends((list) => list.map((x) => (x.runId === l.runId ? legend : x)));
      notify(legend.hidden ? `${legend.name} is off the Legends wall.` : `${legend.name} is back on the Legends wall.`);
    } catch (err) {
      notify(err.message);
    }
  }

  return (
    <section className="legends-review">
      <header className="builder-head builder-head-row">
        <div>
          <h2 className="builder-title">Legends wall</h2>
          <p className="muted">Everyone who finished every level, with their signature. Check the drawings now and then.</p>
        </div>
        <div className="segmented" role="group" aria-label="Whose legends">
          <button type="button" className={!test ? 'is-active' : ''} aria-pressed={!test} onClick={() => setTest(false)}>
            Players
          </button>
          <button type="button" className={test ? 'is-active' : ''} aria-pressed={test} onClick={() => setTest(true)}>
            Test runs
          </button>
        </div>
      </header>
      {error && <p className="form-error">{error}</p>}
      {legends && legends.length === 0 && <p className="muted builder-empty">Nobody yet.</p>}
      {legends && legends.length > 0 && (
        <ul className="legends-grid">
          {legends.map((l) => (
            <li key={l.runId} className={`legend-card${l.hidden ? ' is-hidden' : ''}`}>
              <div className="legend-sign">{l.signature ? <Signature path={l.signature} /> : <span className="legend-initial">{l.name.slice(0, 1)}</span>}</div>
              <p className="legend-name">{l.name}</p>
              <p className="legend-meta">
                <strong>{l.score}</strong> pts · {duration(l.durationMs)}
              </p>
              <button type="button" className="text-button" onClick={() => toggle(l)}>
                {l.hidden ? 'Show again' : 'Hide'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
