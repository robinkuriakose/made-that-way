import { useCallback, useEffect, useState } from 'react';

const FILTERS = [
  { id: 'new', label: 'New' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Not used' },
];

// A player's full suggestion as the start of a question: their wording, the
// right answer first, and their name for the credit. Explanations, topics
// and sources are still to write, so it opens in the form rather than going
// straight in.
export function suggestionToPrefill(s) {
  const d = s.data ?? {};
  return {
    stem: d.question ?? d.text ?? '',
    options: d.question ? [d.answer ?? '', ...(d.wrong ?? ['', '', ''])] : ['', '', '', ''],
    correctIndex: d.question ? 0 : null,
    hint: d.hint ?? '',
    sourceUrl: d.source ?? '',
    image: d.image ? { src: d.image, alt: '' } : null,
    suggestedBy: s.name,
  };
}

// Questions players suggested: a one-line idea, or a whole question. Make
// one into a question (it opens the form, filled in and credited), or mark
// it as not used.
export default function SuggestionsPanel({ api, notify, onMakeQuestion }) {
  const [filter, setFilter] = useState('new');
  const [test, setTest] = useState(false);
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api(`/api/builder/suggestions?status=${filter}&test=${test ? '1' : '0'}`)
      .then((d) => setList(d.suggestions))
      .catch((err) => setError(err.message));
  }, [api, filter, test]);

  useEffect(() => {
    setList(null);
    load();
  }, [load]);

  async function mark(s, action, message) {
    try {
      await api('/api/builder/suggestions', { method: 'PATCH', body: { id: s.id, action } });
      setList((l) => l.filter((x) => x.id !== s.id));
      notify(message);
    } catch (err) {
      notify(err.message);
    }
  }

  return (
    <section>
      <header className="builder-head">
        <h1 className="builder-title">Suggestions</h1>
        <p className="muted">Questions players sent in. Anything you make into a question carries their name.</p>
      </header>
      <div className="list-tools">
        <div className="segmented" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? 'is-active' : ''} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Whose suggestions">
          <button type="button" className={!test ? 'is-active' : ''} aria-pressed={!test} onClick={() => setTest(false)}>
            Players
          </button>
          <button type="button" className={test ? 'is-active' : ''} aria-pressed={test} onClick={() => setTest(true)}>
            Test runs
          </button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {!list && !error && <p className="muted builder-empty">Loading…</p>}
      {list && list.length === 0 && <p className="muted builder-empty">Nothing here.</p>}
      {list && list.length > 0 && (
        <ul className="qcards">
          {list.map((s) => (
            <li key={s.id} className="qcard qcard-plain suggestion-card">
              <div className="qcard-body">
                <p className="qcard-meta">
                  <span className="chip chip-muted">{s.kind === 'quick' ? 'Idea' : 'Whole question'}</span>
                  <span>From {s.name}</span>
                  <span className="muted">{new Date(s.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  {s.questionId && <span className="muted">Became {s.questionId}</span>}
                </p>
                {s.kind === 'quick' ? (
                  <p className="qcard-stem">{s.data.text}</p>
                ) : (
                  <>
                    <p className="qcard-stem">{s.data.question}</p>
                    <ul className="suggestion-options">
                      <li className="is-right">{s.data.answer}</li>
                      {s.data.wrong.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                    {s.data.hint && <p className="muted">Hint: {s.data.hint}</p>}
                    {s.data.source && (
                      <p className="muted">
                        Source:{' '}
                        <a href={s.data.source} target="_blank" rel="noopener noreferrer">
                          {s.data.source}
                        </a>
                      </p>
                    )}
                    {s.data.image && <img className="suggestion-image" src={s.data.image} alt="" loading="lazy" />}
                  </>
                )}
              </div>
              <div className="qcard-actions">
                {s.status === 'new' ? (
                  <>
                    <button type="button" className="button button-small button-primary" onClick={() => onMakeQuestion(s)}>
                      Make it a question
                    </button>
                    {s.kind === 'quick' && (
                      <button type="button" className="text-button" onClick={() => mark(s, 'accept', 'Marked as used.')}>
                        Mark as used
                      </button>
                    )}
                    <button type="button" className="text-button" onClick={() => mark(s, 'reject', 'Moved to Not used.')}>
                      Not this one
                    </button>
                  </>
                ) : (
                  <button type="button" className="text-button" onClick={() => mark(s, 'reopen', 'Back in New.')}>
                    Move back to New
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
