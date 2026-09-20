import { useEffect, useRef } from 'react';
import Modal from './Modal.jsx';
import Explanation from './Explanation.jsx';
import ImageFrame from './ImageFrame.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

function optionState(question, i, chosenIndex) {
  if (chosenIndex == null) return 'open';
  if (i === question.correctIndex) return 'correct';
  if (i === chosenIndex) return 'wrong';
  return 'idle';
}

// Three related questions are offered after a wrong answer. The player picks
// one, answers it, and sees the reasoning. Back returns to the three choices
// until an answer is given; after that the result stands.
//
// `offered` are the views the player sees (options shuffled), and
// redeem.chosenIndex is in that same order. labelFor gives each its topic label.
export default function RedeemModal({ offered, redeem, pointsAvailable, labelFor, flagged, onFlag, onPick, onBack, onAnswer, onClose }) {
  const headingRef = useRef(null);
  const picked = offered.find((q) => q.id === redeem.pickedId) ?? null;
  const step = !picked ? 'choose' : redeem.chosenIndex == null ? 'answer' : 'result';

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  let body;
  if (step === 'choose') {
    body = (
      <>
        <p className="eyebrow">Redeem</p>
        <h2 id="redeem-title" className="modal-title" tabIndex={-1} ref={headingRef}>
          Pick a related question
        </h2>
        <p className="modal-lede">
          {pointsAvailable > 0
            ? `Answer it right to win back ${pointsAvailable} ${pointsAvailable === 1 ? 'point' : 'points'}. Choose the one you feel surest about.`
            : 'The clock had run out, so there are no points to win back, but you can still try one.'}
        </p>
        <ul className="redeem-choices">
          {offered.map((q) => (
            <li key={q.id}>
              <button type="button" className="redeem-choice" onClick={() => onPick(q.id)}>
                <span className="redeem-choice-topic">{labelFor(q)}</span>
                <span className="redeem-choice-stem">{q.stem}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose}>
            Not now
          </button>
        </div>
      </>
    );
  } else {
    const done = step === 'result';
    body = (
      <>
        <p className="eyebrow">{labelFor(picked)}</p>
        <h2 id="redeem-title" className="modal-title" tabIndex={-1} ref={headingRef}>
          {picked.stem}
        </h2>
        {picked.image && <ImageFrame image={picked.image} compact />}
        <ol className="options options-compact">
          {picked.options.map((text, i) => {
            const state = optionState(picked, i, redeem.chosenIndex);
            return (
              <li key={i}>
                {state === 'open' ? (
                  <button type="button" className="option" onClick={() => onAnswer(i)}>
                    <span className="option-letter">{LETTERS[i]}</span>
                    <span className="option-text">{text}</span>
                  </button>
                ) : (
                  <div className={`option is-${state}`}>
                    <span className="option-letter">{LETTERS[i]}</span>
                    <span className="option-body">
                      <span className="option-text">{text}</span>
                      {state === 'wrong' && <span className="option-note">Your answer</span>}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {done && (
          <div className="redeem-result" aria-live="polite">
            <p className="feedback">
              {redeem.correct ? (
                pointsAvailable > 0 ? (
                  <>
                    Redeemed. <span className="points">+{pointsAvailable}</span>
                  </>
                ) : (
                  'Right, though there were no points left to win back.'
                )
              ) : (
                'Not this one either. Here is why.'
              )}
            </p>
            <Explanation question={picked} wasCorrect={redeem.correct} chosenIndex={redeem.chosenIndex} />
          </div>
        )}

        <div className="modal-actions modal-actions-split">
          {done ? (
            <>
              {flagged ? (
                <span className="flag-done">Flagged. Thanks.</span>
              ) : (
                <button type="button" className="text-button flag-link" onClick={() => onFlag(picked)}>
                  Flag this question
                </button>
              )}
              <button type="button" className="button button-primary" onClick={onClose}>
                Back to the quiz
              </button>
            </>
          ) : (
            <button type="button" className="text-button" onClick={onBack}>
              Pick a different question
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <Modal labelledBy="redeem-title" onClose={onClose} initialFocusRef={headingRef} className="modal-redeem">
      {body}
    </Modal>
  );
}
