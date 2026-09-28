import { useRef } from 'react';
import Modal from './Modal.jsx';
import ImageFrame from './ImageFrame.jsx';

// A picture from the home screen, opened big: its question, never its
// answer, and one thing to do next. "Another one" steps through the rest of
// the strip without closing. A sheet from the bottom on a phone, like the
// app's other windows.
export default function WhyPreview({ question, label, starting, onPlay, onAnother, onClose }) {
  const playRef = useRef(null);
  return (
    <Modal labelledBy="why-title" onClose={onClose} initialFocusRef={playRef} className="modal-why">
      <ImageFrame key={question.id} image={question.image} placeholder={question.image.thumb} eager />
      <p className="eyebrow why-label">{label}</p>
      <h2 id="why-title" className="modal-title why-title" aria-live="polite">
        {question.stem}
      </h2>
      <div className="modal-actions modal-actions-split why-actions">
        <button type="button" className="text-button" onClick={onAnother}>
          Another one
        </button>
        <button ref={playRef} type="button" className="button button-primary" onClick={onPlay} disabled={starting}>
          {starting ? 'Loading…' : 'Play this one'}
        </button>
      </div>
    </Modal>
  );
}
