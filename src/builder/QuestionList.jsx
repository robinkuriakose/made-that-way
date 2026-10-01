import { useMemo, useRef, useState } from 'react';
import plan from '../data/level-plan.json';
import { DIFFICULTIES } from '../lib/questionRules.js';
import { planNeeds, tierMismatch } from '../lib/levels.js';
import { idFromFilename } from '../lib/imagePrep.js';
import { uploadPicture } from './uploadPicture.js';

const STATUS_FILTERS = [
  { id: 'live', label: 'Live' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'all', label: 'All' },
];

const TIERS = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'none', label: 'Untagged' },
];
const tierOfQuestion = (q) => (DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'none');
const hasPicture = (q) => Boolean(q.image?.src) && !q.image.placeholder;

// Live questions in the same shape as src/data/questions.json, so the
// bundled fallback can be refreshed from what's actually live.
function exportLive(questions) {
  const live = questions.filter((q) => q.kind !== 'daily' && q.status === 'live').sort((a, b) => a.id.localeCompare(b.id));
  const strip = ({ status, origin, feedback, createdAt, updatedAt, tidbit, kind, position, stats, ...q }) => q;
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

// How each tier stands against what a run through every level needs.
function PlanHealth({ questions }) {
  const need = planNeeds(plan);
  const live = questions.filter((q) => q.status === 'live');
  return (
    <div className="plan-health" aria-label="Questions against the level plan">
      {DIFFICULTIES.map((t) => {
        const all = live.filter((q) => tierOfQuestion(q) === t);
        const pictured = all.filter(hasPicture).length;
        const short = Math.max(0, need[t] - pictured);
        return (
          <div key={t} className={`plan-tier${short ? ' is-short' : ''}`}>
            <p className="plan-tier-name">{t[0].toUpperCase() + t.slice(1)}</p>
            <p className="plan-tier-count">
              <strong>{pictured}</strong> with a picture <span className="muted">of {all.length}</span>
            </p>
            <p className="plan-tier-need">{short ? `${short} more needed for ${plan.lastLevel} levels` : `Enough for ${plan.lastLevel} levels`}</p>
          </div>
        );
      })}
    </div>
  );
}

// Several pictures at once, from anywhere: each file is matched to the
// question whose id is its name (plane-ashtray.jpg goes to plane-ashtray),
// shrunk, stored and attached. A question's existing description is kept.
function BulkPictures({ all, api, act }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const byId = useMemo(() => new Map(all.map((q) => [q.id, q])), [all]);

  async function add(files) {
    if (!files?.length) return;
    setBusy(true);
    setResults([]);
    const out = [];
    for (const file of files) {
      const id = idFromFilename(file.name);
      const q = byId.get(id);
      if (!q) {
        out.push({ name: file.name, ok: false, note: `No question with the id "${id}".` });
        setResults([...out]);
        continue;
      }
      try {
        const stored = await uploadPicture(api, id, file);
        const ok = await act(id, 'setImage', { image: { ...stored, alt: q.image?.alt ?? '', credit: q.image?.credit ?? '' } });
        out.push({ name: file.name, ok, note: ok ? `Added to "${q.stem}"` : 'Stored, but not attached. Try again.' });
      } catch (err) {
        out.push({ name: file.name, ok: false, note: err.message });
      }
      setResults([...out]);
    }
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  return (
    <div className="bulk-pictures">
      <label className={`button${busy ? ' is-busy' : ''}`}>
        {busy ? 'Adding pictures…' : 'Add pictures'}
        <input ref={input} type="file" accept="image/*" multiple className="visually-hidden" disabled={busy} onChange={(e) => add([...(e.target.files ?? [])])} />
      </label>
      <p className="muted field-note">Name each file with its question id, like plane-ashtray.jpg. Pick as many as you like.</p>
      {results.length > 0 && (
        <ul className="bulk-results">
          {results.map((r) => (
            <li key={r.name} className={r.ok ? 'is-ok' : 'is-problem'}>
              <strong>{r.name}</strong> {r.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function QuestionList({ questions: all, themes, openFlags, act, api, onEdit, onAdd }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('live');
  const [tier, setTier] = useState('easy');
  const [topic, setTopic] = useState('');
  const questions = useMemo(() => all.filter((q) => q.kind !== 'daily'), [all]);

  const inStatus = useMemo(
    () => questions.filter((x) => x.status === 'live' || x.status === 'hidden').filter((x) => status === 'all' || x.status === status),
    [questions, status],
  );
  const tierCount = (t) => inStatus.filter((q) => tierOfQuestion(q) === t).length;

  // Newest first, within the chosen tier.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inStatus
      .filter((x) => tierOfQuestion(x) === tier)
      .filter((x) => !topic || (x.themes ?? []).includes(topic))
      .filter((x) => !q || x.stem.toLowerCase().includes(q) || x.id.includes(q) || (x.tags ?? []).some((t) => t.includes(q)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || a.stem.localeCompare(b.stem));
  }, [inStatus, query, tier, topic]);

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

      <PlanHealth questions={questions} />
      <BulkPictures all={all} api={api} act={act} />

      <div className="tier-tabs" role="group" aria-label="Difficulty">
        {TIERS.map((t) => (
          <button key={t.id} type="button" className={`tier-tab${tier === t.id ? ' is-active' : ''}`} aria-pressed={tier === t.id} onClick={() => setTier(t.id)}>
            {t.label}
            <span className="builder-count">{tierCount(t.id)}</span>
          </button>
        ))}
      </div>

      <div className="list-tools">
        <input type="search" placeholder="Search questions, ids or tags" aria-label="Search questions" value={query} onChange={(e) => setQuery(e.target.value)} />
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
        <p className="muted builder-empty">No questions here.</p>
      ) : (
        <ul className="qcards">
          {shown.map((q) => {
            const mismatch = tierMismatch(q);
            return (
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
                    {!q.image && <span className="chip chip-flag">No picture</span>}
                    {q.image && !q.image.alt && <span className="chip chip-waiting">Picture needs a description</span>}
                    {q.image && !q.image.credit && <span className="chip chip-muted">No credit</span>}
                    {q.image?.placeholder && <span className="chip chip-flag">Placeholder image</span>}
                    {mismatch && <span className="chip chip-waiting">{mismatch}</span>}
                    {q.stats?.asked > 0 && (
                      <span className="muted">
                        {Math.round((q.stats.right / q.stats.asked) * 100)}% of {q.stats.asked} right
                      </span>
                    )}
                    {q.suggestedBy && <span className="muted">Suggested by {q.suggestedBy}</span>}
                    {openFlags[q.id] > 0 && (
                      <span className="chip chip-flag">
                        {openFlags[q.id]} open flag{openFlags[q.id] === 1 ? '' : 's'}
                      </span>
                    )}
                  </p>
                </div>
                <div className="qcard-actions">
                  <select
                    className="tier-select"
                    aria-label="Difficulty"
                    value={DIFFICULTIES.includes(q.difficulty) ? q.difficulty : ''}
                    onChange={(e) => act(q.id, 'setDifficulty', { difficulty: e.target.value }, `Moved to ${e.target.value}.`)}
                  >
                    {!DIFFICULTIES.includes(q.difficulty) && <option value="">Pick a tier</option>}
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d[0].toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </select>
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
            );
          })}
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
