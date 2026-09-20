import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { FLAG_REASONS, FLAG_DETAILS_MAX, flagReason } from '../lib/flags.js';

// "What's wrong with this question?" Only offered after answering, so a
// player can't use it to fish for the answer. "My answer should have
// counted" only appears if their answer was marked wrong.
export default function FlagModal({ question, wasCorrect, onSubmit, onClose }) {
  const headingRef = useRef(null);
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [state, setState] = useState('editing'); // editing | sending | sent | failed

  const reasons = FLAG_REASONS.filter((r) => !r.onlyIfWrong || wasCorrect === false);
  const chosen = flagReason(reason);
  const ready = Boolean(chosen) && (!chosen.needsDetails || details.trim().length > 0) && state !== 'sending';

  async function send(e) {
    e.preventDefault();
    if (!ready) return;
    setState('sending');
    setState((await onSubmit(reason, details.trim())) ? 'sent' : 'failed');
  }

  if (state === 'sent') {
    return (
      <Modal labelledBy="flag-title" onClose={onClose} initialFocusRef={headingRef} className="modal-flag">
        <h2 id="flag-title" className="modal-title" tabIndex={-1} ref={headingRef}>
          Thanks, that's flagged.
        </h2>
        <p className="modal-lede">We read every flag and fix what's wrong. It won't change your score for this run.</p>
        <div className="modal-actions">
          <button type="button" className="button button-primary" onClick={onClose}>
            Back to the quiz
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal labelledBy="flag-title" onClose={onClose} initialFocusRef={headingRef} className="modal-flag">
      <form onSubmit={send}>
        <p className="modal-question">{question?.stem}</p>
        <h2 id="flag-title" className="modal-title" tabIndex={-1} ref={headingRef}>
          What's wrong with this question?
        </h2>

        <fieldset className="flag-reasons">
          <legend className="visually-hidden">Pick the closest match</legend>
          {reasons.map((r) => (
            <label key={r.id} className={`flag-reason${reason === r.id ? ' is-chosen' : ''}`}>
              <input type="radio" name="flag-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
              <span>{r.label}</span>
            </label>
          ))}
        </fieldset>

        {chosen && (
          <div className="flag-details">
            <label htmlFor="flag-details" className="field-label">
              {chosen.detailsLabel}
            </label>
            <textarea
              id="flag-details"
              rows={3}
              maxLength={FLAG_DETAILS_MAX}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        )}

        {state === 'failed' && <p className="form-error">Couldn't send that. Check your connection and try again.</p>}

        <p className="muted flag-note">Flagging won't change your score. It helps us fix the question.</p>

        <div className="modal-actions modal-actions-split">
          <button type="button" className="text-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={!ready}>
            {state === 'sending' ? 'Sending…' : 'Send flag'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
