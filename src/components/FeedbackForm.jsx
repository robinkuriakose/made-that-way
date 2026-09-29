import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { RATINGS, MORE_OF, RECOMMEND, NOTE_MAX } from '../lib/feedbackForm.js';
import { sendFeedback } from '../lib/playerClient.js';

function Stars({ id, label, value, onChange }) {
  return (
    <div className="fb-row">
      <p className="fb-label" id={`fb-${id}`}>
        {label}
      </p>
      <div className="stars" role="radiogroup" aria-labelledby={`fb-${id}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of 5`}
            className={`star${value >= n ? ' is-on' : ''}`}
            onClick={() => onChange(value === n ? null : n)}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
              <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// A short form: three ratings, what to add more of, whether you'd tell a
// friend, and a note. Every part is optional; only what's answered is sent.
export default function FeedbackForm({ runId = null, onClose }) {
  const closeRef = useRef(null);
  const [ratings, setRatings] = useState({});
  const [more, setMore] = useState([]);
  const [moreOther, setMoreOther] = useState('');
  const [recommend, setRecommend] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const answered = Object.keys(ratings).length || more.length || moreOther.trim() || recommend || note.trim();

  async function submit(e) {
    e.preventDefault();
    if (!answered || sending) return;
    setSending(true);
    setError(null);
    const result = await sendFeedback({ ratings, more, moreOther, recommend, note }, runId);
    setSending(false);
    if (result.ok) setSent(true);
    else setError(result.error);
  }

  const toggle = (id) => setMore((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <Modal labelledBy="fb-title" onClose={onClose} initialFocusRef={closeRef} className="modal-feedback">
      {sent ? (
        <div className="fb-thanks">
          <p className="fb-thanks-mark" aria-hidden="true">
            ✓
          </p>
          <h2 id="fb-title" className="modal-title">
            Thank you!
          </h2>
          <p className="modal-lede">It really helps. We read every one.</p>
          <div className="modal-actions">
            <button ref={closeRef} type="button" className="button button-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p className="eyebrow">Two minutes, tops</p>
          <h2 id="fb-title" className="modal-title">
            How's it going?
          </h2>
          <p className="modal-lede">Tell us what you liked and what you'd change. Skip anything you like.</p>

          {RATINGS.map((r) => (
            <Stars key={r.id} id={r.id} label={r.label} value={ratings[r.id] ?? null} onChange={(v) => setRatings((x) => ({ ...x, [r.id]: v ?? undefined }))} />
          ))}

          <div className="fb-row">
            <p className="fb-label">What should we add more of?</p>
            <div className="topic-pills">
              {MORE_OF.map((o) => (
                <button key={o.id} type="button" className="topic-pill" aria-pressed={more.includes(o.id)} onClick={() => toggle(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="fb-other"
              value={moreOther}
              maxLength={200}
              placeholder="Something else?"
              onChange={(e) => setMoreOther(e.target.value)}
              aria-label="Something else to add more of"
            />
          </div>

          <div className="fb-row">
            <p className="fb-label" id="fb-recommend">
              Would you tell a friend about it?
            </p>
            <div className="segmented" role="radiogroup" aria-labelledby="fb-recommend">
              {RECOMMEND.map((r) => (
                <button key={r.id} type="button" role="radio" aria-checked={recommend === r.id} aria-pressed={recommend === r.id} onClick={() => setRecommend(recommend === r.id ? null : r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fb-row">
            <label className="fb-label" htmlFor="fb-note">
              Anything confusing, or anything you loved?
            </label>
            <textarea id="fb-note" rows={3} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions modal-actions-split">
            <button ref={closeRef} type="button" className="text-button" onClick={onClose}>
              Not now
            </button>
            <button type="submit" className="button button-primary" disabled={!answered || sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
