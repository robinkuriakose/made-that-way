import TopBar from './TopBar.jsx';
import { showsImage } from './ImageFrame.jsx';
import { BADGES } from '../lib/rewards.js';

// Everything this player has uncovered: the badges, then every question whose
// reason they've seen, newest first. Tapping one opens its reasoning again.
// It fills up across runs, so there's always something that grows.
export default function WhysScreen({ uncovered, questionsById, total, badges, labelFor, onExplain, onHome, onStart, starting }) {
  const found = uncovered
    .map((id) => questionsById[id])
    .filter(Boolean)
    .reverse();
  const left = Math.max(0, total - found.length);

  return (
    <div className="page">
      <TopBar onHome={onHome} />
      <main className="stage whys">
        <p className="eyebrow">Your collection</p>
        <h1 className="stem">
          {found.length} {found.length === 1 ? 'why' : 'whys'} uncovered
        </h1>
        <p className="lede">
          {left > 0
            ? `${left} more to find. Every question you answer adds its reason here, right or wrong.`
            : "You've uncovered every why there is, for now. New questions arrive over time."}
        </p>

        <section className="end-section" aria-labelledby="badges-title">
          <p id="badges-title" className="section-title">
            Badges
          </p>
          <ul className="badges">
            {BADGES.map((b) => (
              <li key={b.id} className={`badge${badges[b.id] ? ' is-earned' : ''}`}>
                <span className="badge-mark" aria-hidden="true" />
                <span className="badge-label">{b.label}</span>
                <span className="badge-note">{badges[b.id] ? 'Earned' : b.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="end-section" aria-labelledby="whys-title">
          <p id="whys-title" className="section-title">
            Whys
          </p>
          {found.length ? (
            <ul className="whys-grid">
              {found.map((q) => (
                <li key={q.id}>
                  <button type="button" className="why-tile" onClick={() => onExplain(q.id)}>
                    {showsImage(q.image) ? (
                      <img src={q.image.thumb ?? q.image.src} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="why-tile-blank" aria-hidden="true">?</span>
                    )}
                    <span className="why-tile-text">
                      <span className="why-tile-label">{labelFor(q)}</span>
                      <span className="why-tile-stem">{q.stem}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <p className="muted">Nothing yet. Answer a question and its reason lands here.</p>
              <div className="actions">
                <button type="button" className="button button-primary" onClick={onStart} disabled={starting}>
                  {starting ? 'Loading questions…' : 'Start'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
