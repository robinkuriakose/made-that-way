import { useEffect, useMemo, useState } from 'react';
import ImageField from './ImageField.jsx';
import { TOPIC_LABELS, CONFIDENCE_LABELS } from '../lib/labels.js';
import { TOPICS, CONFIDENCE, checkQuestion, normalizeQuestion, slugify, wordCount } from '../lib/questionRules.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Unsaved work is kept on this device as you type, so a sign-out, a closed
// tab or a crash never loses it. Cleared on save or cancel.
const draftKey = (initial, kind) => `madeThatWay.builder.draft.${initial?.id ?? `new-${kind}`}`;

function readDraft(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function clearDraft(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

function blank() {
  return {
    id: '',
    topic: '',
    tags: [],
    themes: [],
    group: '',
    stem: '',
    options: ['', '', '', ''],
    correctIndex: null,
    hint: '',
    explanationRight: '',
    explanationWrong: ['', '', '', ''],
    confidence: '',
    sourceName: '',
    sourceUrl: '',
    image: null,
    tidbit: null,
  };
}

function fromQuestion(q) {
  return {
    ...blank(),
    ...q,
    group: q.group ?? '',
    explanationWrong: (q.explanationWrong ?? []).map((e) => e ?? ''),
    image: q.image ? { credit: '', ...q.image } : null,
    tidbit: q.tidbit ?? null,
    themes: q.themes ?? [],
  };
}

function Field({ label, htmlFor, note, children }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {note && <p className="muted field-note">{note}</p>}
    </div>
  );
}

// kind: 'run' or 'daily' for a new question; an existing one keeps its own.
export default function QuestionForm({ initial, kind: newKind = 'run', themes, existingIds, api, onCancel, onSaved }) {
  const isNew = !initial;
  const kind = initial?.kind ?? newKind;
  const isDaily = kind === 'daily';
  const key = draftKey(initial, kind);
  const [draft, setDraft] = useState(() => {
    const saved = readDraft(key);
    const newer = saved && (!initial?.updatedAt || saved.savedAt > Date.parse(initial.updatedAt));
    return newer ? saved : null;
  });
  const [form, setForm] = useState(() => (initial ? fromQuestion(initial) : blank()));
  const [idTouched, setIdTouched] = useState(false);
  const [tagsText, setTagsText] = useState(() => (initial?.tags ?? []).join(', '));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('live');
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [triedSave, setTriedSave] = useState(false);

  const set = (patch) => {
    setDirty(true);
    setForm((f) => ({ ...f, ...patch }));
  };
  const setAt = (field, i, value) => {
    setDirty(true);
    setForm((f) => ({ ...f, [field]: f[field].map((v, j) => (j === i ? value : v)) }));
  };
  const toggleTheme = (id) => set({ themes: form.themes.includes(id) ? form.themes.filter((t) => t !== id) : [...form.themes, id] });

  // Save a draft half a second after typing stops.
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ form, tagsText, idTouched, savedAt: Date.now() }));
      } catch {
        // Storage full: drafts are a safety net, not essential.
      }
    }, 500);
    return () => clearTimeout(t);
  }, [dirty, form, tagsText, idTouched, key]);

  const effectiveId = isNew && !idTouched ? slugify(form.stem) : form.id;
  const candidate = useMemo(
    () => normalizeQuestion({ ...form, id: effectiveId, tags: tagsText.split(',') }),
    [form, effectiveId, tagsText],
  );
  const themeIds = useMemo(() => themes.map((t) => t.id), [themes]);
  const { errors, warnings } = useMemo(() => {
    const result = checkQuestion(candidate, { themeIds, kind });
    if (isNew && candidate.id && existingIds.has(candidate.id)) {
      result.errors.push(`The id "${candidate.id}" is already used. Change it below.`);
    }
    return result;
  }, [candidate, isNew, existingIds, themeIds, kind]);

  const counts = form.options.map(wordCount);

  async function save(e) {
    e.preventDefault();
    setTriedSave(true);
    setServerErrors([]);
    if (errors.length) return;
    setSaving(true);
    try {
      const result = isNew
        ? await api('/api/builder/questions', { method: 'POST', body: { data: candidate, status, kind } })
        : await api('/api/builder/questions', {
            method: 'PATCH',
            body: { id: candidate.id, action: 'update', data: candidate, expectedUpdatedAt: initial.updatedAt },
          });
      clearDraft(key);
      onSaved(result.question, isNew ? (isDaily ? 'Added to the daily queue.' : `Added "${candidate.stem}"`) : 'Saved.');
    } catch (err) {
      setServerErrors(err.data?.errors ?? [err.message]);
      setSaving(false);
    }
  }

  const showErrors = triedSave || !isNew;

  function cancel() {
    clearDraft(key);
    onCancel();
  }

  function restoreDraft() {
    setForm(draft.form);
    setTagsText(draft.tagsText ?? '');
    setIdTouched(Boolean(draft.idTouched));
    setDraft(null);
    setDirty(true);
  }

  return (
    <form className="qform" onSubmit={save} noValidate>
      <header className="builder-head builder-head-row">
        <div>
          <button type="button" className="text-button" onClick={onCancel}>
            ← Back
          </button>
          <h1 className="builder-title">
            {isNew ? (isDaily ? 'Add a daily question' : 'Add a question') : isDaily ? 'Edit daily question' : 'Edit question'}
          </h1>
          {!isNew && !['live', 'queued'].includes(initial.status) && <p className="muted">This question is {initial.status}.</p>}
          {isDaily && (
            <p className="muted">Daily questions go out one a day, in queue order. They never appear in runs, and have no timer or hint.</p>
          )}
        </div>
      </header>

      {draft && (
        <div className="draft-banner" role="status">
          <span>
            You have unsaved changes from{' '}
            {new Date(draft.savedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.
          </span>
          <span className="actions">
            <button type="button" className="button button-small" onClick={restoreDraft}>
              Restore
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                clearDraft(key);
                setDraft(null);
              }}
            >
              Discard
            </button>
          </span>
        </div>
      )}

      <Field label="Question" htmlFor="q-stem" note="Ask why something is the way it is. Someone should be able to reason their way to the answer.">
        <textarea id="q-stem" rows={2} value={form.stem} onChange={(e) => set({ stem: e.target.value })} />
      </Field>

      <div className="field-row">
        <Field label="Category" htmlFor="q-topic" note="Keeps runs varied. Worth a second look marks a myth buster.">
          <select id="q-topic" value={form.topic} onChange={(e) => set({ topic: e.target.value })}>
            <option value="">Choose…</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {TOPIC_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Confidence" htmlFor="q-confidence" note={CONFIDENCE_LABELS[form.confidence]?.note}>
          <select id="q-confidence" value={form.confidence} onChange={(e) => set({ confidence: e.target.value })}>
            <option value="">Choose…</option>
            {CONFIDENCE.map((c) => (
              <option key={c} value={c}>
                {CONFIDENCE_LABELS[c].label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="field qform-themes">
        <legend className="field-label">Topics</legend>
        <p className="muted field-note">Players choose runs by topic. Pick every one that fits.</p>
        <div className="topic-pills">
          {themes.map((t) => (
            <button key={t.id} type="button" className="topic-pill" aria-pressed={form.themes.includes(t.id)} onClick={() => toggleTheme(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="qform-options">
        <legend className="field-label">Options</legend>
        <p className="muted field-note">
          Mark the right one. Keep all four about the same length: the right answer can't be more than 2 words longer than the longest wrong one.
        </p>
        {form.options.map((text, i) => {
          const right = form.correctIndex === i;
          return (
            <div key={i} className={`qform-option${right ? ' is-correct' : ''}`}>
              <div className="qform-option-head">
                <span className="option-letter">{LETTERS[i]}</span>
                <label className="qform-right">
                  <input type="radio" name="correct" checked={right} onChange={() => set({ correctIndex: i })} />
                  Right answer
                </label>
                <span className="qform-words">{counts[i]} words</span>
              </div>
              <textarea aria-label={`Option ${LETTERS[i]}`} rows={2} value={text} onChange={(e) => setAt('options', i, e.target.value)} />
              {right ? (
                <p className="muted field-note">Players who pick this see the "why it's right" explanation below.</p>
              ) : (
                <textarea
                  aria-label={`Why option ${LETTERS[i]} is wrong`}
                  rows={3}
                  placeholder="What this choice gets wrong, then why the right answer is right"
                  value={form.explanationWrong[i]}
                  onChange={(e) => setAt('explanationWrong', i, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </fieldset>

      <Field label="Why the right answer is right" htmlFor="q-right">
        <textarea id="q-right" rows={4} value={form.explanationRight} onChange={(e) => set({ explanationRight: e.target.value })} />
      </Field>

      {!isDaily && (
        <Field label="Hint" htmlFor="q-hint" note="A nudge, not the answer. Costs the player 10 seconds.">
          <input id="q-hint" type="text" value={form.hint} onChange={(e) => set({ hint: e.target.value })} />
        </Field>
      )}

      <div className="field">
        <p className="field-label">Image</p>
        <ImageField image={form.image} onChange={(image) => set({ image })} api={api} filenameHint={effectiveId} />
      </div>

      <div className="field-row">
        <Field label="Source name" htmlFor="q-source-name">
          <input id="q-source-name" type="text" value={form.sourceName} onChange={(e) => set({ sourceName: e.target.value })} />
        </Field>
        <Field label="Source link" htmlFor="q-source-url">
          <input id="q-source-url" type="text" inputMode="url" value={form.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} />
        </Field>
      </div>

      <div className="field-row">
        <Field label="Tags" htmlFor="q-tags" note="Comma separated. Redeem uses tags to offer related questions.">
          <input id="q-tags" type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </Field>
        <Field label="Group (optional)" htmlFor="q-group" note="Questions in the same group never appear in the same run.">
          <input id="q-group" type="text" value={form.group} onChange={(e) => set({ group: e.target.value })} />
        </Field>
      </div>

      {!isDaily && (
      <Field
        label="Tidbit (optional)"
        htmlFor="q-tidbit"
        note="A short fact shown after three wrong answers in a row, three questions before this one comes up. It should nudge, not give the answer away."
      >
        <textarea
          id="q-tidbit"
          rows={3}
          value={form.tidbit?.text ?? ''}
          onChange={(e) => set({ tidbit: e.target.value ? { id: form.tidbit?.id ?? '', text: e.target.value } : null })}
        />
      </Field>
      )}

      <Field label="Id" htmlFor="q-id" note={isNew ? 'Made from the question. You can change it until you save.' : "Can't change once saved."}>
        <input
          id="q-id"
          type="text"
          value={effectiveId}
          readOnly={!isNew}
          onChange={(e) => {
            setIdTouched(true);
            set({ id: e.target.value });
          }}
        />
      </Field>

      {isNew && !isDaily && (
        <div className="field">
          <p className="field-label">When saved</p>
          <div className="segmented" role="group" aria-label="When saved">
            <button type="button" className={status === 'live' ? 'is-active' : ''} aria-pressed={status === 'live'} onClick={() => setStatus('live')}>
              Go live
            </button>
            <button type="button" className={status === 'hidden' ? 'is-active' : ''} aria-pressed={status === 'hidden'} onClick={() => setStatus('hidden')}>
              Keep hidden
            </button>
          </div>
        </div>
      )}

      {(showErrors && errors.length > 0) || warnings.length > 0 || serverErrors.length > 0 ? (
        <div className="checks" aria-live="polite">
          {showErrors && errors.length > 0 && (
            <>
              <p className="checks-title">Fix before saving</p>
              <ul className="checks-list is-error">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </>
          )}
          {serverErrors.length > 0 && (
            <ul className="checks-list is-error">
              {serverErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <>
              <p className="checks-title">Worth a look</p>
              <ul className="checks-list">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      <div className="qform-actions">
        <button type="button" className="button" onClick={cancel}>
          Cancel
        </button>
        <button type="submit" className="button button-primary" disabled={saving || (triedSave && errors.length > 0)}>
          {saving ? 'Saving…' : isNew ? (isDaily ? 'Add to the queue' : 'Add question') : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
