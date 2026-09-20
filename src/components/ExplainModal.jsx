import { useRef } from 'react';
import Modal from './Modal.jsx';
import Explanation from './Explanation.jsx';

export default function ExplainModal({ question, wasCorrect, chosenIndex, flagged, onFlag, onClose }) {
  const closeRef = useRef(null);

  return (
    <Modal labelledBy="explain-title" onClose={onClose} initialFocusRef={closeRef}>
      <p className="modal-question">{question.stem}</p>
      <h2 id="explain-title" className="modal-title">
        {question.options[question.correctIndex]}
      </h2>
      <Explanation question={question} wasCorrect={wasCorrect} chosenIndex={chosenIndex} />
      <div className="modal-actions modal-actions-split">
        {onFlag &&
          (flagged ? (
            <span className="flag-done">Flagged. Thanks.</span>
          ) : (
            <button type="button" className="text-button flag-link" onClick={onFlag}>
              Flag this question
            </button>
          ))}
        <button ref={closeRef} type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
