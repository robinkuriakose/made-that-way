import { useRef, useState } from 'react';
import TopBar from './TopBar.jsx';
import { cleanSuggestion, QUICK_MAX, FIELD_MAX } from '../lib/suggestions.js';
import { sendSuggestion, uploadSuggestionImage } from '../lib/playerClient.js';
import { NAME_MAX_LENGTH, cleanName } from '../lib/names.js';

// Suggest a question, two ways: just the idea in a line, or the whole thing.
// The last step asks who to thank; "Be mysterious" sends it under the
// player's starting name instead.
export default function SuggestScreen({ placeholder, onHome }) {
  const [kind, setKind] = useState(null);
  const [step, setStep] = useState('write');
  const [quick, setQuick] = useState('');
  const [full, setFull] = useState({ question: '', answer: '', wrong: ['', '', ''], hint: '', source: '', image: '' });
  const [imageName, setImageName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const data = kind === 'quick' ? { text: quick } : full;
  const setWrong = (i, v) => setFull((f) => ({ ...f, wrong: f.wrong.map((w, j) => (j === i ? v : w)) }));

  function next(e) {
    e.preventDefault();
    const checked = cleanSuggestion(kind, data);
    if (checked.error) {
      setError(checked.error);
      return;
    }
    setError(null);
    setStep('name');
  }

  async function send(as) {
    setSending(true);
    setError(null);
    const result = await sendSuggestion({ name: as, kind, data });
    setSending(false);
    if (result.ok) setStep('done');
    else setError(result.error);
  }

  async function pickImage(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await uploadSuggestionImage(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (result.ok) {
      setFull((f) => ({ ...f, image: result.url }));
      setImageName(file.name);
    } else setError(result.error);
  }

  let body;
  if (step === 'done') {
    body = (
      <>
        <p className="eyebrow">Sent</p>
        <h1 className="stem">Thank you!</h1>
        <p className="lede">We'll take a look. If it makes it in, your name goes on it. You can check on it from your profile.</p>
        <div className="actions">
          <button type="button" className="button button-primary" onClick={onHome}>
            Back home
          </button>
        </div>
      </>
    );
  } else if (step === 'name') {
    body = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const clean = cleanName(name);
          if (!clean) setError('Add your name, or be mysterious.');
          else send(clean);
        }}
      >
        <p className="eyebrow">Last step</p>
        <h1 className="stem">Who should we thank?</h1>
        <label className="field-label" htmlFor="suggest-name">
          Your name
        </label>
        <input id="suggest-name" type="text" value={name} maxLength={NAME_MAX_LENGTH} autoComplete="name" placeholder={placeholder} onChange={(e) => setName(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <div className="actions suggest-actions">
          <button type="submit" className="button button-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send it'}
          </button>
          <button type="button" className="text-button" disabled={sending} onClick={() => send(placeholder)}>
            Be mysterious
          </button>
        </div>
      </form>
    );
  } else if (!kind) {
    body = (
      <>
        <p className="eyebrow">Suggest a question</p>
        <h1 className="stem">Spotted a clever little design?</h1>
        <p className="lede">Tell us about it. The best ones become questions, with your name on them.</p>
        <div className="suggest-kinds">
          <button type="button" className="suggest-kind" onClick={() => setKind('quick')}>
            <span className="suggest-kind-title">Just the idea</span>
            <span className="suggest-kind-note">One line: a question and its answer, or the fact itself</span>
          </button>
          <button type="button" className="suggest-kind" onClick={() => setKind('full')}>
            <span className="suggest-kind-title">The whole question</span>
            <span className="suggest-kind-note">The answer, three wrong ones, and a hint, a source or a picture if you have them</span>
          </button>
        </div>
      </>
    );
  } else if (kind === 'quick') {
    body = (
      <form onSubmit={next}>
        <p className="eyebrow">Just the idea</p>
        <h1 className="stem">What's the design?</h1>
        <label className="field-label" htmlFor="suggest-quick">
          Your idea
        </label>
        <textarea
          id="suggest-quick"
          rows={4}
          maxLength={QUICK_MAX}
          value={quick}
          placeholder="Why do pizza boxes have a little plastic table in the middle? It keeps the lid off the cheese."
          onChange={(e) => setQuick(e.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="actions suggest-actions">
          <button type="submit" className="button button-primary">
            Next
          </button>
          <button type="button" className="text-button" onClick={() => setKind(null)}>
            Back
          </button>
        </div>
      </form>
    );
  } else {
    const field = (id, label, value, set, extra = {}) => (
      <div className="suggest-field">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <input id={id} type="text" maxLength={FIELD_MAX} value={value} onChange={(e) => set(e.target.value)} {...extra} />
      </div>
    );
    body = (
      <form onSubmit={next}>
        <p className="eyebrow">The whole question</p>
        <h1 className="stem">Write it up</h1>
        {field('s-q', 'The question', full.question, (v) => setFull((f) => ({ ...f, question: v })), { placeholder: 'Why do…?' })}
        {field('s-a', 'The right answer', full.answer, (v) => setFull((f) => ({ ...f, answer: v })))}
        {full.wrong.map((w, i) => (
          <div key={i}>{field(`s-w${i}`, `Wrong answer ${i + 1}`, w, (v) => setWrong(i, v))}</div>
        ))}
        {field('s-h', 'A hint (optional)', full.hint, (v) => setFull((f) => ({ ...f, hint: v })))}
        {field('s-s', 'Where you read about it (optional link)', full.source, (v) => setFull((f) => ({ ...f, source: v })), { inputMode: 'url', placeholder: 'https://' })}
        <div className="suggest-field">
          <p className="field-label">A picture (optional)</p>
          <label className={`button${uploading ? ' is-busy' : ''}`}>
            {uploading ? 'Uploading…' : full.image ? 'Change picture' : 'Add a picture'}
            <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" disabled={uploading} onChange={(e) => pickImage(e.target.files?.[0])} />
          </label>
          {imageName && <p className="muted field-note">Added: {imageName}</p>}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="actions suggest-actions">
          <button type="submit" className="button button-primary" disabled={uploading}>
            Next
          </button>
          <button type="button" className="text-button" onClick={() => setKind(null)}>
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="page">
      <TopBar onHome={onHome} />
      <main className="stage suggest">{body}</main>
    </div>
  );
}
