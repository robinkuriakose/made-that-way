import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { MIN_THEMES } from '../lib/themes.js';

// Choose which topics runs draw from. At least MIN_THEMES. Nothing else to
// think about: if a choice is small, runs quietly borrow related questions.
export default function TopicPicker({ themes, chosen, onSave, onClose }) {
  const [picked, setPicked] = useState(() => new Set(chosen ?? themes.map((t) => t.id)));
  const titleRef = useRef(null);
  const allOn = picked.size === themes.length;
  const short = MIN_THEMES - picked.size;

  function toggle(id) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal labelledBy="topics-title" onClose={onClose} initialFocusRef={titleRef} className="modal-topics">
      <h2 id="topics-title" className="modal-title" tabIndex={-1} ref={titleRef}>
        Choose topics
      </h2>
      <p className="modal-lede">Pick at least {MIN_THEMES}. Your runs will come from these.</p>
      <div className="topic-pills" role="group" aria-labelledby="topics-title">
        {themes.map((t) => (
          <button key={t.id} type="button" className="topic-pill" aria-pressed={picked.has(t.id)} onClick={() => toggle(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="text-button topic-all"
        onClick={() => setPicked(allOn ? new Set() : new Set(themes.map((t) => t.id)))}
      >
        {allOn ? 'Clear all' : 'Select all'}
      </button>
      <div className="modal-actions modal-actions-split">
        <span className="muted topic-hint" aria-live="polite">
          {short > 0 ? `Pick ${short} more.` : ''}
        </span>
        <div className="actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={short > 0}
            onClick={() => onSave(allOn ? null : themes.map((t) => t.id).filter((id) => picked.has(id)))}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
