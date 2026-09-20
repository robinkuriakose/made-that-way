import { useState } from 'react';
import QuestionPreview from './QuestionPreview.jsx';

const when = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

// The notes on one question, oldest first, each with Claude's reply once the
// question has been revised. Notes belong to this question only.
function FeedbackThread({ notes }) {
  if (!notes.length) return null;
  return (
    <ol className="thread">
      {notes.map((n) => (
        <li key={n.id} className="thread-item">
          <p className="thread-meta">
            You, {when(n.createdAt)}
            <span className={`chip ${n.status === 'open' ? 'chip-waiting' : 'chip-done'}`}>
              {n.status === 'open' ? 'Waiting for a revision' : 'Revised'}
            </span>
          </p>
          <p className="thread-text">{n.text}</p>
          {n.response && (
            <div className="thread-reply">
              <p className="thread-meta">Claude, {when(n.addressedAt)}</p>
              <p className="thread-text">{n.response}</p>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function ReviewCard({ q, act, onEdit }) {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(null);
  const waiting = (q.feedback ?? []).some((n) => n.status === 'open');

  async function run(action, extra, message) {
    setBusy(action);
    const ok = await act(q.id, action, extra, message);
    setBusy(null);
    return ok;
  }

  async function sendFeedback(e) {
    e.preventDefault();
    if (!text.trim()) return;
    if (await run('feedback', { text }, 'Feedback saved on this question.')) {
      setText('');
      setWriting(false);
    }
  }

  return (
    <li className="review-card">
      <QuestionPreview q={q} />
      <FeedbackThread notes={q.feedback ?? []} />

      {writing ? (
        <form className="feedback-form" onSubmit={sendFeedback}>
          <label className="field-label" htmlFor={`fb-${q.id}`}>
            What should change on this question?
          </label>
          <textarea id={`fb-${q.id}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <p className="muted field-note">Only this question will be changed. It stays in this queue until you accept it.</p>
          <div className="actions">
            <button type="submit" className="button button-primary" disabled={!text.trim() || busy}>
              {busy === 'feedback' ? 'Saving…' : 'Send feedback'}
            </button>
            <button type="button" className="button" onClick={() => setWriting(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="review-actions">
          <button type="button" className="button button-primary" disabled={Boolean(busy)} onClick={() => run('accept', {}, 'Accepted. It can now appear in runs.')}>
            {busy === 'accept' ? 'Accepting…' : 'Accept'}
          </button>
          <button type="button" className="button" disabled={Boolean(busy)} onClick={() => setWriting(true)}>
            {waiting ? 'Add more feedback' : 'Give feedback'}
          </button>
          <button type="button" className="button" disabled={Boolean(busy)} onClick={() => run('reject', {}, 'Rejected. Kept below in case you change your mind.')}>
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
          <button type="button" className="text-button" onClick={() => onEdit(q)}>
            Edit it myself
          </button>
        </div>
      )}
    </li>
  );
}

export default function ReviewQueue({ questions, act, onEdit }) {
  // Oldest first, so a batch reads in the order it was written.
  const pending = questions
    .filter((q) => q.kind !== 'daily' && q.status === 'pending')
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || a.id.localeCompare(b.id));
  const rejected = questions.filter((q) => q.kind !== 'daily' && q.status === 'rejected');
  const waiting = pending.filter((q) => (q.feedback ?? []).some((n) => n.status === 'open')).length;

  return (
    <section>
      <header className="builder-head">
        <h1 className="builder-title">New questions</h1>
        <p className="muted">
          {pending.length === 0
            ? 'Nothing waiting for review.'
            : `${pending.length} waiting for review${waiting ? `, ${waiting} waiting for a revision` : ''}. Accept puts a question into runs straight away.`}
        </p>
      </header>

      <ol className="review-list-cards">
        {pending.map((q) => (
          <ReviewCard key={q.id} q={q} act={act} onEdit={onEdit} />
        ))}
      </ol>

      {rejected.length > 0 && (
        <details className="rejected">
          <summary>Rejected ({rejected.length})</summary>
          <ul className="rejected-list">
            {rejected.map((q) => (
              <li key={q.id} className="rejected-item">
                <span>{q.stem}</span>
                <button type="button" className="text-button" onClick={() => act(q.id, 'restore', {}, 'Moved back to the queue.')}>
                  Put back in the queue
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
