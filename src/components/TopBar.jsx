import { TIME_LIMIT_SECONDS } from '../lib/scoring.js';

// progress is 0..1 of the 45 second window, or null to hide the timer line.
// onHome turns the brand into a way back to the home screen ("‹ Home" during
// a run, where it reads as navigation rather than an invitation to quit).
// onRestart shows a quiet Restart during a run.
export default function TopBar({ position, total, score, progress = null, meta = null, onHome = null, onRestart = null }) {
  const playing = position != null;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-row">
          {onHome ? (
            <button type="button" className="brand brand-link" onClick={onHome}>
              {playing ? (
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
          {meta ??
            (playing && (
              <span className="topbar-meta">
                {onRestart && (
                  <button type="button" className="topbar-action" onClick={onRestart}>
                    Restart
                  </button>
                )}
                <span>
                  {position} of {total}
                </span>
                <span>Score {score}</span>
              </span>
            ))}
        </div>
        {progress != null && (
          <div
            className="timer"
            role="progressbar"
            aria-label="Time on this question"
            aria-valuemin={0}
            aria-valuemax={TIME_LIMIT_SECONDS}
            aria-valuenow={Math.round(progress * TIME_LIMIT_SECONDS)}
          >
            <div className="timer-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
        )}
      </div>
    </header>
  );
}
