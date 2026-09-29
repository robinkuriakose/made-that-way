import { useState } from 'react';
import { wordCount } from '../lib/questionRules.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const TIER_ORDER = { easy: 0, medium: 1, hard: 2 };
const FIELD_LABELS = {
  stem: 'Question',
  hint: 'Hint',
  explanationRight: 'Why the right answer is right',
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Only the parts of a proposal that would actually change the question now.
function changedParts(edit, q) {
  return Object.entries(edit.changes).filter(([k, v]) => !same(q[k], v));
}

function TextRow({ label, now, next }) {
  return (
    <div className="rw-row">
      <p className="rw-label">
        {label}
        <span className="muted">
          {' '}
          {wordCount(now)} → {wordCount(next)} words
        </span>
      </p>
      <div className="rw-pair">
        <p className="rw-now">
          <span className="rw-cap">Now</span>
          {now}
        </p>
        <p className="rw-next">
          <span className="rw-cap">Proposed</span>
          {next}
        </p>
      </div>
    </div>
  );
}

function OptionsRows({ q, next }) {
  return (
    <div className="rw-row">
      <p className="rw-label">Options</p>
      <ol className="rw-options">
        <li className="rw-options-head" aria-hidden="true">
          <span />
          <span className="rw-cap">Now</span>
          <span className="rw-cap">Proposed</span>
        </li>
        {q.options.map((o, i) => (
          <li key={i} className={i === q.correctIndex ? 'is-right' : ''}>
            <span className="rw-letter" aria-label={i === q.correctIndex ? `${LETTERS[i]}, the right answer` : LETTERS[i]}>
              {LETTERS[i]}
              {i === q.correctIndex && ' ✓'}
            </span>
            <span className="rw-now">{o}</span>
            <span className={`rw-next${next[i] === o ? ' is-same' : ''}`}>{next[i] === o ? 'Same' : next[i]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExplanationRows({ q, next }) {
  return q.explanationWrong.map((now, i) =>
    same(now, next[i]) ? null : <TextRow key={i} label={`Why ${LETTERS[i]} is wrong`} now={now ?? ''} next={next[i] ?? ''} />,
  );
}

function RewriteCard({ edit, q, act, onEditWith, onDone }) {
  const [busy, setBusy] = useState(null);
  const parts = changedParts(edit, q);

  async function run(action, extra, message) {
    setBusy(action);
    const ok = await act(q.id, action, { editId: edit.id, ...extra }, message);
    setBusy(null);
    if (ok) onDone(edit.id);
  }

  return (
    <li className="rewrite-card">
      <div className="rw-head">
        {q.image ? <img className="qcard-thumb" src={q.image.thumb ?? q.image.src} alt="" loading="lazy" /> : <span className="qcard-thumb qcard-thumb-empty" aria-hidden="true" />}
        <p className="qcard-meta">
          <span className="chip chip-muted">{q.kind === 'daily' ? 'Daily' : q.difficulty ? q.difficulty[0].toUpperCase() + q.difficulty.slice(1) : 'Untagged'}</span>
          <span>{q.id}</span>
          {q.status !== 'live' && <span className="muted">{q.status}</span>}
        </p>
      </div>
      {edit.note && <p className="rw-note">{edit.note}</p>}
      {parts.map(([k, v]) => {
        if (k === 'options') return <OptionsRows key={k} q={q} next={v} />;
        if (k === 'explanationWrong') return <ExplanationRows key={k} q={q} next={v} />;
        if (typeof v === 'string') return <TextRow key={k} label={FIELD_LABELS[k] ?? k} now={q[k] ?? ''} next={v} />;
        return (
          <p key={k} className="rw-row muted">
            Also changes: {k}
          </p>
        );
      })}
      <div className="review-actions">
        <button type="button" className="button button-primary" disabled={Boolean(busy)} onClick={() => run('applyEdit', {}, 'New wording in. The old version is kept in its history.')}>
          {busy === 'applyEdit' ? 'Saving…' : 'Use the new wording'}
        </button>
        <button type="button" className="button" disabled={Boolean(busy)} onClick={() => onEditWith(edit, q)}>
          Edit it first
        </button>
        <button type="button" className="text-button" disabled={Boolean(busy)} onClick={() => run('closeEdit', { outcome: 'declined' }, 'Kept as it was.')}>
          Keep it as it is
        </button>
      </div>
    </li>
  );
}

// Changes Claude proposes to questions already in the game (round 12:
// shorter questions and options). Nothing changes until one is used; the
// replaced version is kept in the question's history either way.
export default function RewritesPanel({ edits, questions, act, onEditWith, onDone }) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const rows = edits
    .map((e) => ({ e, q: byId.get(e.questionId) }))
    .filter(({ e, q }) => q && changedParts(e, q).length > 0)
    .sort(
      (a, b) =>
        (a.q.kind === 'daily') - (b.q.kind === 'daily') ||
        (TIER_ORDER[a.q.difficulty] ?? 3) - (TIER_ORDER[b.q.difficulty] ?? 3) ||
        a.q.id.localeCompare(b.q.id),
    );

  return (
    <section>
      <header className="builder-head">
        <h1 className="builder-title">Rewrites</h1>
        <p className="muted">
          {rows.length === 0
            ? 'Nothing waiting. New proposals show up here.'
            : `Shorter wording for ${rows.length} question${rows.length === 1 ? '' : 's'}, easy ones first. Options keep their order and meaning, so the explanations still fit. Nothing changes until you use one.`}
        </p>
      </header>
      <ol className="rewrite-list">
        {rows.map(({ e, q }) => (
          <RewriteCard key={e.id} edit={e} q={q} act={act} onEditWith={onEditWith} onDone={onDone} />
        ))}
      </ol>
    </section>
  );
}
