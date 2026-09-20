import { useMemo, useState } from 'react';
import { flagReason } from '../lib/flags.js';

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
];

const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function FlagItem({ flag, question, api, onChanged }) {
  const [note, setNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const reason = flagReason(flag.reason);
  const answer = flag.chosenIndex != null && question ? question.options[flag.chosenIndex] : null;
  const changedSince = question?.updatedAt && flag.questionVersion && question.updatedAt !== flag.questionVersion;

  async function update(status) {
    setBusy(true);
    setError(null);
    try {
      const { flag: updated } = await api('/api/builder/flags', { method: 'PATCH', body: { id: flag.id, status, note } });
      onChanged(updated);
      setResolving(false);
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`flag-item${flag.status === 'resolved' ? ' is-resolved' : ''}`}>
      <p className="flag-item-reason">{reason?.label ?? flag.reason}</p>
      {flag.details && <p className="flag-item-details">“{flag.details}”</p>}
      <p className="flag-item-meta">
        {when(flag.createdAt)}
        {answer && (
          <>
            {' · '}Answered {flag.wasCorrect ? 'right' : 'wrong'}: {answer}
          </>
        )}
        {changedSince && <span className="chip chip-muted">Question edited since</span>}
      </p>
      {flag.status === 'resolved' && flag.note && <p className="flag-item-note">Resolved: {flag.note}</p>}

      {resolving ? (
        <div className="flag-resolve">
          <label className="field-label" htmlFor={`note-${flag.id}`}>
            What did you do? (optional)
          </label>
          <input id={`note-${flag.id}`} type="text" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          <div className="actions">
            <button type="button" className="button button-primary button-small" disabled={busy} onClick={() => update('resolved')}>
              Mark resolved
            </button>
            <button type="button" className="text-button" onClick={() => setResolving(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          {flag.status === 'open' ? (
            <button type="button" className="button button-small" onClick={() => setResolving(true)}>
              Resolve
            </button>
          ) : (
            <button type="button" className="text-button" disabled={busy} onClick={() => update('open')}>
              Reopen
            </button>
          )}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </li>
  );
}

export default function FlagsPanel({ flags, questions, api, onChanged, onEdit }) {
  const [filter, setFilter] = useState('open');
  const byId = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

  const groups = useMemo(() => {
    const shown = flags.filter((f) => filter === 'all' || f.status === filter);
    const map = new Map();
    for (const f of shown) {
      if (!map.has(f.questionId)) map.set(f.questionId, []);
      map.get(f.questionId).push(f);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [flags, filter]);

  return (
    <section>
      <header className="builder-head">
        <h1 className="builder-title">Flags</h1>
        <p className="muted">What players reported, grouped by question. Fix the question, then mark its flags resolved.</p>
      </header>

      <div className="list-tools">
        <div className="segmented" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? 'is-active' : ''} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="muted builder-empty">{filter === 'open' ? 'No open flags. Nice.' : 'Nothing here.'}</p>
      ) : (
        <ul className="flag-groups">
          {groups.map(([questionId, list]) => {
            const q = byId[questionId];
            return (
              <li key={questionId} className="flag-group">
                <div className="flag-group-head">
                  <p className="flag-group-stem">{q?.stem ?? questionId}</p>
                  <p className="muted">
                    {list.length} flag{list.length === 1 ? '' : 's'}
                    {q && q.status !== 'live' ? ` · ${q.status}` : ''}
                  </p>
                  {q && (
                    <button type="button" className="button button-small" onClick={() => onEdit(q)}>
                      Edit question
                    </button>
                  )}
                </div>
                <ul className="flag-list">
                  {list.map((f) => (
                    <FlagItem key={f.id} flag={f} question={q} api={api} onChanged={onChanged} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
