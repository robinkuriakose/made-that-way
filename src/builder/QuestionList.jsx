import { useMemo, useState } from 'react';

const STATUS_FILTERS = [
  { id: 'live', label: 'Live' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'all', label: 'All' },
];

// Live questions in the same shape as src/data/questions.json, so the
// bundled fallback can be refreshed from what's actually live.
function exportLive(questions) {
  const live = questions.filter((q) => q.kind !== 'daily' && q.status === 'live').sort((a, b) => a.id.localeCompare(b.id));
  const strip = ({ status, origin, feedback, createdAt, updatedAt, tidbit, kind, position, ...q }) => q;
  const data = {
    questions: live.map(strip),
    tidbits: live.filter((q) => q.tidbit).map((q) => ({ id: q.tidbit.id, tidbitFor: q.id, text: q.tidbit.text })),
  };
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'questions.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const themeLabels = (q, themes) => (q.themes ?? []).map((id) => themes.find((t) => t.id === id)?.label ?? id);

export default function QuestionList({ questions: all, themes, openFlags, act, onEdit, onAdd }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('live');
  const [topic, setTopic] = useState('');
  const questions = useMemo(() => all.filter((q) => q.kind !== 'daily'), [all]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions
      .filter((x) => x.status === 'live' || x.status === 'hidden')
      .filter((x) => status === 'all' || x.status === status)
      .filter((x) => !topic || (x.themes ?? []).includes(topic))
      .filter(
        (x) =>
          !q ||
          x.stem.toLowerCase().includes(q) ||
          x.id.includes(q) ||
          (x.tags ?? []).some((t) => t.includes(q)),
      )
      .sort((a, b) => a.stem.localeCompare(b.stem));
  }, [questions, query, status, topic]);

  const liveCount = questions.filter((q) => q.status === 'live').length;
  const hiddenCount = questions.filter((q) => q.status === 'hidden').length;

  return (
    <section>
      <header className="builder-head builder-head-row">
        <div>
          <h1 className="builder-title">Questions</h1>
          <p className="muted">
            {liveCount} live, {hiddenCount} hidden. Hidden questions never appear in runs and can be brought back any time.
          </p>
        </div>
        <button type="button" className="button button-primary" onClick={onAdd}>
          Add a question
        </button>
      </header>

      <div className="list-tools">
        <input
          type="search"
          placeholder="Search questions, ids or tags"
          aria-label="Search questions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="segmented" role="group" aria-label="Show">
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} type="button" className={status === f.id ? 'is-active' : ''} aria-pressed={status === f.id} onClick={() => setStatus(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <select aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="muted builder-empty">No questions match.</p>
      ) : (
        <ul className="qcards">
          {shown.map((q) => (
            <li key={q.id} className={`qcard${q.status === 'hidden' ? ' is-hidden' : ''}`}>
              {q.image ? (
                <img className="qcard-thumb" src={q.image.thumb ?? q.image.src} alt="" loading="lazy" />
              ) : (
                <span className="qcard-thumb qcard-thumb-empty" aria-hidden="true" />
              )}
              <div className="qcard-body">
                <p className="qcard-stem">{q.stem}</p>
                <p className="qcard-meta">
                  <span>{themeLabels(q, themes).join(', ') || 'No topic'}</span>
                  {q.status === 'hidden' && <span className="chip chip-muted">Hidden</span>}
                  {!q.image && <span className="chip chip-muted">No image</span>}
                  {q.image && !q.image.credit && <span className="chip chip-muted">No credit</span>}
                  {q.image?.placeholder && <span className="chip chip-flag">Placeholder image</span>}
                  {openFlags[q.id] > 0 && (
                    <span className="chip chip-flag">
                      {openFlags[q.id]} open flag{openFlags[q.id] === 1 ? '' : 's'}
                    </span>
                  )}
                </p>
              </div>
              <div className="qcard-actions">
                <button type="button" className="button button-small" onClick={() => onEdit(q)}>
                  Edit
                </button>
                {q.status === 'live' ? (
                  <button type="button" className="text-button" onClick={() => act(q.id, 'hide', {}, "Hidden. It won't appear in new runs.")}>
                    Hide
                  </button>
                ) : (
                  <button type="button" className="text-button" onClick={() => act(q.id, 'unhide', {}, 'Live again.')}>
                    Unhide
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="list-footer">
        <button type="button" className="text-button" onClick={() => exportLive(questions)}>
          Download live questions as questions.json
        </button>
        <p className="muted field-note">
          The quiz falls back to the questions built into the app if the database is slow. Send me this file now and then
          and I'll refresh that built-in copy.
        </p>
      </div>
    </section>
  );
}
