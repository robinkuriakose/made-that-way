import { useEffect, useState } from 'react';
import { RATINGS, MORE_OF, RECOMMEND } from '../lib/feedbackForm.js';

const labelOf = (list, id) => list.find((x) => x.id === id)?.label ?? id;
const SHORT = { overall: 'Overall', questions: 'Questions', pictures: 'Pictures' };

// What players said in the feedback form: the averages, what they want more
// of, whether they'd tell a friend, and every answer, newest first.
export default function FeedbackPanel({ api }) {
  const [test, setTest] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setData(null);
    api(`/api/builder/feedback?test=${test ? '1' : '0'}`)
      .then((d) => live && setData(d))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [api, test]);

  const s = data?.summary;
  const maxMore = Math.max(1, ...Object.values(s?.more ?? {}));
  const recommendTotal = Object.values(s?.recommend ?? {}).reduce((a, b) => a + b, 0);

  return (
    <section>
      <header className="builder-head builder-head-row">
        <div>
          <h1 className="builder-title">Feedback</h1>
          <p className="muted">From the form players see after the last level, and from their profile.</p>
        </div>
        <div className="segmented" role="group" aria-label="Whose answers">
          <button type="button" className={!test ? 'is-active' : ''} aria-pressed={!test} onClick={() => setTest(false)}>
            Players
          </button>
          <button type="button" className={test ? 'is-active' : ''} aria-pressed={test} onClick={() => setTest(true)}>
            Test runs
          </button>
        </div>
      </header>
      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="muted builder-empty">Loading…</p>}
      {s && s.responses === 0 && <p className="muted builder-empty">No answers yet.</p>}
      {s && s.responses > 0 && (
        <>
          <div className="stats">
            <div className="stat">
              <p className="stat-value">{s.responses}</p>
              <p className="stat-label">answers</p>
            </div>
            {RATINGS.map((r) => (
              <div key={r.id} className="stat">
                <p className="stat-value">{s.ratings[r.id] ? `${s.ratings[r.id].average} ★` : '·'}</p>
                <p className="stat-label">{SHORT[r.id] ?? r.id}</p>
              </div>
            ))}
          </div>

          <div className="dash-grid feedback-grid">
            <section className="dash-section">
              <h2 className="dash-title">What to add more of</h2>
              <ul className="hbars">
                {MORE_OF.map((o) => (
                  <li key={o.id} className="hbar">
                    <span className="hbar-label">{o.label}</span>
                    <span className="hbar-track">
                      <span className="hbar-fill" style={{ width: `${((s.more[o.id] ?? 0) / maxMore) * 100}%` }} />
                    </span>
                    <span className="hbar-value">{s.more[o.id] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="dash-section">
              <h2 className="dash-title">Would they tell a friend?</h2>
              <ul className="hbars">
                {RECOMMEND.map((r) => (
                  <li key={r.id} className="hbar">
                    <span className="hbar-label">{r.label}</span>
                    <span className="hbar-track">
                      <span className="hbar-fill" style={{ width: `${recommendTotal ? ((s.recommend[r.id] ?? 0) / recommendTotal) * 100 : 0}%` }} />
                    </span>
                    <span className="hbar-value">{s.recommend[r.id] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <h2 className="dash-title feedback-list-title">Every answer</h2>
          <ul className="qcards">
            {data.responses.map((r) => (
              <li key={r.id} className="qcard qcard-plain">
                <div className="qcard-body">
                  <p className="qcard-meta">
                    <span className="muted">{new Date(r.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                    {RATINGS.filter((x) => r.answers.ratings?.[x.id]).map((x) => (
                      <span key={x.id} className="chip chip-muted">
                        {SHORT[x.id] ?? x.id} {r.answers.ratings[x.id]}/5
                      </span>
                    ))}
                    {r.answers.recommend && <span className="chip chip-done">Tell a friend: {labelOf(RECOMMEND, r.answers.recommend)}</span>}
                  </p>
                  {r.answers.more?.length > 0 && <p className="muted">More of: {r.answers.more.map((m) => labelOf(MORE_OF, m)).join(', ')}</p>}
                  {r.answers.moreOther && <p className="muted">Also: {r.answers.moreOther}</p>}
                  {r.note && <p className="qcard-stem">{r.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
