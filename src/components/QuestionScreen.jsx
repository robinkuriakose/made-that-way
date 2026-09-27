import { useEffect, useRef } from 'react';
import TopBar from './TopBar.jsx';
import ImageFrame from './ImageFrame.jsx';
import { firstSentence } from '../lib/text.js';
import { percentRight } from '../lib/levels.js';

const LETTERS = ['A', 'B', 'C', 'D'];

function Option({ index, text, state, onAnswer }) {
  if (state === 'open') {
    return (
      <button type="button" className="option" onClick={() => onAnswer(index)}>
        <span className="option-letter">{LETTERS[index]}</span>
        <span className="option-text">{text}</span>
      </button>
    );
  }
  return (
    <div className={`option is-${state}`}>
      <span className="option-letter">{LETTERS[index]}</span>
      <span className="option-body">
        <span className="option-text">{text}</span>
        {state === 'wrong' && <span className="option-note">Your answer</span>}
      </span>
    </div>
  );
}

// The reward for answering: why it's made that way, in one line, straight
// away. "Read more" opens the full reasoning and its source.
function Reason({ question, onExplain }) {
  const share = percentRight(question);
  return (
    <div className="reason">
      <p className="reason-label">Why it's made that way</p>
      <p className="reason-text">{firstSentence(question.explanationRight)}</p>
      <p className="reason-foot">
        <button type="button" className="text-button" onClick={onExplain}>
          Read more
        </button>
        {share != null && <span className="muted reason-share">{share}% of players get this right</span>}
      </p>
    </div>
  );
}

function Feedback({ current, streak, lives, canRedeem, onOpenRedeem }) {
  const { phase, points, redeem } = current;
  if (phase === 'correct') {
    return (
      <p className="feedback feedback-right">
        Right.{' '}
        <span className="points points-pop" key={points}>
          +{points}
        </span>
        {streak >= 3 && <span className="streak-note">{streak} in a row</span>}
      </p>
    );
  }
  if (phase === 'redeemed') {
    return <p className="feedback">{redeem?.correct ? 'Life won back.' : 'No life back this time.'}</p>;
  }
  // wrong, or a redeem in progress
  return (
    <>
      <p className="feedback feedback-wrong">{lives === 0 ? 'Not this one. That was your last life.' : 'Not this one. You lost a life.'}</p>
      {canRedeem && (
        <div className="redeem-offer">
          <p className="muted">
            {lives === 0 ? 'One last chance: answer a related question to stay in.' : 'Answer a related question to win the life back.'}
          </p>
          <button type="button" className="button button-accent" onClick={onOpenRedeem}>
            Win it back
          </button>
        </div>
      )}
    </>
  );
}

// `question` is the view the player sees (options already shuffled), and
// current.chosenIndex is in that same order. See lib/shuffle.js.
export default function QuestionScreen({
  question,
  label,
  play,
  current,
  streak,
  lives,
  nextLabel,
  canRedeem,
  flagged,
  onHint,
  onAnswer,
  onOpenRedeem,
  onNext,
  onFlag,
  onExplain,
  onHome,
  onRestart,
}) {
  const { phase, chosenIndex, hintUsed } = current;
  const answered = phase !== 'answering';
  const statusRef = useRef(null);

  // On a phone the result and the reason land below the fold. Bring them
  // into view once, as the answer is given; nothing moves if they fit.
  useEffect(() => {
    if (!answered) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    statusRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [answered]);

  function optionState(i) {
    if (!answered) return 'open';
    if (i === question.correctIndex) return 'correct';
    if (i === chosenIndex) return 'wrong';
    return 'idle';
  }

  return (
    <div className="page">
      <TopBar play={play} onHome={onHome} onRestart={onRestart} />
      <main className="stage question">
        <p className="eyebrow">{label}</p>
        <h1 className="stem">{question.stem}</h1>
        {/* Below the question, so the question itself always sits at the same
            height, and every image fills the same frame. Images show before
            the answer on purpose: the point is to work it out. */}
        {question.image && <ImageFrame image={question.image} compact />}

        <ol className={`options${answered ? ' is-answered' : ''}`}>
          {question.options.map((text, i) => (
            <li key={i}>
              <Option index={i} text={text} state={optionState(i)} onAnswer={onAnswer} />
            </li>
          ))}
        </ol>

        <div className="status" aria-live="polite" ref={statusRef}>
          {!answered &&
            (hintUsed ? (
              <p className="hint">
                <span className="hint-label">Hint</span>
                {question.hint}
              </p>
            ) : (
              <button type="button" className="text-button" onClick={onHint}>
                Show a hint <span className="muted">(halves the points)</span>
              </button>
            ))}
          {answered && (
            <>
              <Feedback current={current} streak={streak} lives={lives} canRedeem={canRedeem} onOpenRedeem={onOpenRedeem} />
              <Reason question={question} onExplain={onExplain} />
            </>
          )}
        </div>

        {answered && (
          <div className="next-row next-row-split">
            {flagged ? (
              <span className="flag-done">Flagged. Thanks.</span>
            ) : (
              <button type="button" className="text-button flag-link" onClick={onFlag}>
                Flag this question
              </button>
            )}
            <button type="button" className="button button-primary" onClick={onNext}>
              {nextLabel}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
