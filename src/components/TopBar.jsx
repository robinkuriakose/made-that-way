import Hearts from './Hearts.jsx';
import CountUp from './CountUp.jsx';

// The bar along the top. Off a run it's just the name, which leads home
// when onHome is given. During a run (`play`) it reads "‹ Home" (navigation,
// not an invitation to quit), with a quiet Restart, and a second row for the
// game: the level, lives, combo and score, then a segment per question in
// the level.
//
// play = { level, step, levelSize, lives, score, combo }; step is 1-based,
// or null on a level break. meta fills the right-hand side off a run (the
// builder uses it).
export default function TopBar({ play = null, meta = null, onHome = null, onRestart = null }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-row">
          {onHome ? (
            <button type="button" className="brand brand-link" onClick={onHome}>
              {play ? (
                <>
                  <span aria-hidden="true">‹ </span>Home
                </>
              ) : (
                'Made That Way'
              )}
            </button>
          ) : (
            <span className="brand">Made That Way</span>
          )}
          {!play && meta}
          {play && onRestart && (
            <button type="button" className="topbar-action" onClick={onRestart}>
              Restart
            </button>
          )}
        </div>
        {play && (
          <>
            <div className="playbar">
              <span className="playbar-level">
                Level {play.level}
                {play.step != null && (
                  <span className="playbar-step">
                    {' '}
                    · {play.step} of {play.levelSize}
                  </span>
                )}
              </span>
              <Hearts lives={play.lives} />
              <span className="playbar-score">
                {play.combo > 1 && (
                  <span key={play.combo} className="combo-chip" title="Right answers in a row multiply your points">
                    ×{play.combo}
                  </span>
                )}
                <CountUp value={play.score} />
                <span className="playbar-unit"> pts</span>
              </span>
            </div>
            {play.step != null && (
              <ol className="level-steps" aria-hidden="true">
                {Array.from({ length: play.levelSize }, (_, i) => (
                  <li key={i} className={i + 1 < play.step ? 'is-done' : i + 1 === play.step ? 'is-now' : ''} />
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </header>
  );
}
