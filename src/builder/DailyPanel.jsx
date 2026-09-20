import { useCallback, useEffect, useState } from 'react';
import QuestionPreview from './QuestionPreview.jsx';

// Below this many queued questions, the tab warns you to add more.
const LOW_QUEUE = 3;

const dayLabel = (day) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// The daily question: what's queued (in the order it goes out), and how each
// day went. A day takes the next queued question the first time anyone opens
// it, so the queue only moves on days people actually visit.
export default function DailyPanel({ questions, api, act, onEdit, onAdd, notify }) {
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);

  const daily = questions.filter((q) => q.kind === 'daily');
  const queued = daily.filter((q) => q.status === 'queued').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const hidden = daily.filter((q) => q.status === 'hidden');

  const load = useCallback(() => {
    api('/api/builder/daily')
      .then((d) => setSchedule(d.schedule))
      .catch((err) => setError(err.message));
  }, [api]);

  useEffect(load, [load]);

  async function setVoid(day, action) {
    try {
      await api('/api/builder/daily', { method: 'PATCH', body: { day, action } });
      notify(action === 'void' ? "Voided. That day won't count against anyone's average." : 'Counted again.');
      load();
    } catch (err) {
      notify(err.message);
    }
  }

  return (
    <section>
      <header className="builder-head builder-head-row">
        <div>
          <h1 className="builder-title">Daily question</h1>
          <p className="muted">
            One question a day, the same for everyone, in this order. They never repeat and never appear in runs.
          </p>
        </div>
        <button type="button" className="button button-primary" onClick={onAdd}>
          Add a daily question
        </button>
      </header>

      {queued.length < LOW_QUEUE && (
        <p className="notice-warn" role="status">
          {queued.length === 0
            ? 'The queue is empty. Players will see "no new question today" until you add one.'
            : `Only ${queued.length} left in the queue. Add more so a day never goes without one.`}
        </p>
      )}

      <h2 className="dev-title">Coming up</h2>
      {queued.length === 0 ? (
        <p className="muted builder-empty">Nothing queued.</p>
      ) : (
        <ol className="daily-queue">
          {queued.map((q, i) => (
            <li key={q.id} className="daily-queue-item">
              <div className="daily-queue-head">
                <span className="daily-queue-pos">{i === 0 ? 'Next' : `${i + 1}`}</span>
                <p className="qcard-stem">{q.stem}</p>
              </div>
              <details className="daily-preview">
                <summary>Preview</summary>
                <QuestionPreview q={q} />
              </details>
              <div className="qcard-actions">
                <button type="button" className="button button-small" onClick={() => onEdit(q)}>
                  Edit
                </button>
                <button type="button" className="text-button" disabled={i === 0} onClick={() => act(q.id, 'move', { direction: 'up' })}>
                  Move up
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={i === queued.length - 1}
                  onClick={() => act(q.id, 'move', { direction: 'down' })}
                >
                  Move down
                </button>
                <button type="button" className="text-button" onClick={() => act(q.id, 'hide', {}, 'Taken out of the queue.')}>
                  Take out
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {hidden.length > 0 && (
        <details className="rejected">
          <summary>Taken out ({hidden.length})</summary>
          <ul className="rejected-list">
            {hidden.map((q) => (
              <li key={q.id} className="rejected-item">
                <span>{q.stem}</span>
                <button type="button" className="text-button" onClick={() => act(q.id, 'unhide', {}, 'Back at the end of the queue.')}>
                  Put back in the queue
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <h2 className="dev-title">Gone out</h2>
      {error && <p className="form-error">Couldn't load the schedule: {error}</p>}
      {schedule && schedule.length === 0 && <p className="muted builder-empty">No daily question has gone out yet.</p>}
      {schedule && schedule.length > 0 && (
        <ul className="daily-history">
          {schedule.map((d) => (
            <li key={d.day} className={`daily-history-item${d.isVoid ? ' is-void' : ''}`}>
              <p className="daily-history-day">{dayLabel(d.day)}</p>
              <p className="qcard-stem">{d.stem}</p>
              <p className="qcard-meta">
                <span>{d.answered} answered</span>
                {d.percentRight != null && <span>{d.percentRight}% right</span>}
                {d.avgSeconds != null && <span>{d.avgSeconds}s on average</span>}
                {d.isVoid && <span className="chip chip-muted">Voided</span>}
              </p>
              <button type="button" className="text-button" onClick={() => setVoid(d.day, d.isVoid ? 'unvoid' : 'void')}>
                {d.isVoid ? 'Count it again' : 'Void this day'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
