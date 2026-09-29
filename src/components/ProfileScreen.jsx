import { useEffect, useState } from 'react';
import TopBar from './TopBar.jsx';
import { fetchProfile } from '../lib/playerClient.js';
import { duration, shortDate } from '../lib/format.js';

const SUGGESTION_STATUS = { new: 'Waiting for a look', accepted: 'Accepted, thank you!', rejected: 'Not this time' };

function Stat({ label, value }) {
  return (
    <div className="stat">
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

// This player's own numbers, never the questions: best level and score, how
// often they're right, how each level has gone, their last runs, badges and
// the questions they've suggested.
export default function ProfileScreen({ name, badges, badgeList, whysCount, onRename, onHome, onCollection, onSuggest, onFeedback }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    fetchProfile().then((r) => {
      if (!live) return;
      if (r.ok) setData(r);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, []);

  const t = data?.totals;
  const maxRuns = Math.max(1, ...(data?.levels ?? []).map((l) => l.runs));

  return (
    <div className="page">
      <TopBar onHome={onHome} />
      <main className="stage profile">
        <p className="eyebrow">Your profile</p>
        <h1 className="profile-name">
          {name}
          <button type="button" className="icon-button" aria-label="Change your name" onClick={onRename}>
            <PencilIcon />
          </button>
        </h1>

        {error && <p className="form-error">{error}</p>}
        {!data && !error && <div className="daily-skeleton" />}

        {t && (
          <>
            {t.runs === 0 ? (
              <p className="lede">No finished runs yet. Your numbers show up here after your first one.</p>
            ) : (
              <div className="stats">
                <Stat label="Best level" value={t.bestLevel} />
                <Stat label="Best score" value={t.bestScore} />
                <Stat label="Right answers" value={t.percentRight == null ? 'None yet' : `${t.percentRight}%`} />
                <Stat label="Runs" value={t.runs} />
              </div>
            )}
            {data.legend && (
              <p className="profile-legend">
                ★ Legend: {data.legend.score} points in {duration(data.legend.durationMs)}
              </p>
            )}

            {data.levels.length > 0 && (
              <section className="end-section" aria-labelledby="levels-title">
                <p id="levels-title" className="section-title">
                  Level by level
                </p>
                <ol className="level-bars">
                  {data.levels.map((l) => (
                    <li key={l.level}>
                      <span className="level-bars-name">Level {l.level}</span>
                      <span className="level-bars-track" title={`Reached in ${l.runs} ${l.runs === 1 ? 'run' : 'runs'}`}>
                        <span className="level-bars-fill" style={{ width: `${(l.runs / maxRuns) * 100}%` }} />
                      </span>
                      <span className="level-bars-value">{l.percentRight == null ? '' : `${l.percentRight}% right`}</span>
                    </li>
                  ))}
                </ol>
                <p className="muted board-note">The bar shows how many runs reached each level.</p>
              </section>
            )}

            {data.runs.length > 0 && (
              <section className="end-section" aria-labelledby="runs-title">
                <p id="runs-title" className="section-title">
                  Your last runs
                </p>
                <ol className="board">
                  {data.runs.map((r) => (
                    <li key={r.id} className="run-row">
                      <span className="board-rank">{shortDate(r.finishedAt)}</span>
                      <span>
                        Level {r.level}
                        {r.legend && <span className="run-legend"> ★</span>}
                        <span className="board-detail"> · {r.right} of {r.answered} right</span>
                      </span>
                      <span className="board-detail">{duration(r.durationMs)}</span>
                      <span className="board-score">{r.score}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        <section className="end-section" aria-labelledby="badges-title-p">
          <div className="board-head">
            <p id="badges-title-p" className="section-title">
              Badges and whys
            </p>
            <button type="button" className="text-button" onClick={onCollection}>
              {whysCount} {whysCount === 1 ? 'why' : 'whys'} uncovered
            </button>
          </div>
          <ul className="badge-row">
            {badgeList.map((b) => (
              <li key={b.id} className={`badge-chip${badges[b.id] ? ' is-earned' : ''}`} title={b.note}>
                {b.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="end-section" aria-labelledby="suggest-title">
          <p id="suggest-title" className="section-title">
            Know a good why?
          </p>
          <p className="muted">Send us a question and we might add it, with your name on it.</p>
          <div className="actions">
            <button type="button" className="button" onClick={onSuggest}>
              Suggest a question
            </button>
            <button type="button" className="text-button" onClick={onFeedback}>
              Tell us how it's going
            </button>
          </div>
          {data?.suggestions?.length > 0 && (
            <ul className="suggestion-list">
              {data.suggestions.map((s) => (
                <li key={s.id}>
                  <span className="suggestion-text">{s.text}</span>
                  <span className={`chip ${s.status === 'accepted' ? 'chip-done' : s.status === 'rejected' ? 'chip-muted' : 'chip-waiting'}`}>
                    {SUGGESTION_STATUS[s.status] ?? s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 6.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
