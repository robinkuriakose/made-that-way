import { useEffect, useState } from 'react';
import TopBar from './TopBar.jsx';
import ImageFrame from './ImageFrame.jsx';
import { TIME_LIMIT_SECONDS, HINT_PENALTY_SECONDS, redeemPoints } from '../lib/scoring.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Elapsed seconds on this question, including the hint penalty. Ticks while
// the question is open and freezes at the recorded value once answered.
function useElapsed(current) {
  const running = current.phase === 'answering' && current.startedAt != null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [running, current.hintUsed]);

  if (!running) return current.elapsedSeconds ?? 0;
  return Math.max(0, (now - current.startedAt) / 1000) + (current.hintUsed ? HINT_PENALTY_SECONDS : 0);
}

function Option({ index, text, state, isChosen, onAnswer, onExplain }) {
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
        {state === 'correct' && (
          <button type="button" className="explain-link" onClick={onExplain}>
            Explain why
          </button>
        )}
        {state === 'correct' && isChosen && <span className="visually-hidden">Your answer</span>}
      </span>
    </div>
  );
}

const pointsWord = (n) => (n === 1 ? 'point' : 'points');

function Status({ question, current, canRedeem, onHint, onOpenRedeem }) {
  const { phase, points, hintUsed, band, redeem } = current;
  const backAvailable = redeemPoints(band ?? 0);

  const hint = hintUsed ? (
    <p className="hint">
      <span className="hint-label">Hint</span>
      {question.hint}
    </p>
  ) : null;

  switch (phase) {
    case 'answering':
      return (
        hint ?? (
          <button type="button" className="text-button" onClick={onHint}>
            Show a hint
          </button>
        )
      );
    case 'correct':
      return (
        <>
          <p className="feedback">
            {points > 0 ? (
              <>
                Right. <span className="points">+{points}</span>
              </>
            ) : (
              'Right. No points this time, but you knew it.'
            )}
          </p>
          {hint}
        </>
      );
    case 'wrong':
    case 'redeeming':
      return (
        <>
          <p className="feedback">Not this one.</p>
          {canRedeem && (
            <>
              <p className="muted">
                {backAvailable > 0
                  ? `Answer a related question to win back ${backAvailable} ${pointsWord(backAvailable)}.`
                  : 'The clock ran out, so there are no points to win back, but you can still try a related question.'}
              </p>
              <div className="actions">
                <button type="button" className="button button-accent" onClick={onOpenRedeem}>
                  Redeem
                </button>
              </div>
            </>
          )}
          {hint}
        </>
      );
    case 'redeemed':
      return (
        <>
          <p className="feedback">
            {redeem?.correct ? (
              points > 0 ? (
                <>
                  Redeemed. <span className="points">+{points}</span>
                </>
              ) : (
                'Redeemed, though there were no points left to win back.'
              )
            ) : (
              'No points back this time.'
            )}
          </p>
          {hint}
        </>
      );
    default:
      return null;
  }
}

// `question` is the view the player sees (options already shuffled), and
// current.chosenIndex is in that same order. See lib/shuffle.js.
export default function QuestionScreen({
  question,
  label,
  position,
  total,
  score,
  current,
  isLast,
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
  const elapsed = useElapsed(current);
  const progress = Math.min(1, elapsed / TIME_LIMIT_SECONDS);
  const { phase, chosenIndex } = current;
  const answered = phase !== 'answering';

  function optionState(i) {
    if (!answered) return 'open';
    if (i === question.correctIndex) return 'correct';
    if (i === chosenIndex) return 'wrong';
    return 'idle';
  }

  return (
    <div className="page">
      <TopBar position={position} total={total} score={score} progress={progress} onHome={onHome} onRestart={onRestart} />
      <main className="stage">
        <p className="eyebrow">{label}</p>
        <h1 className="stem">{question.stem}</h1>
        {/* Below the question, so the question itself always sits at the same
            height, and every image fills the same frame. Images show before
            the answer on purpose: the point is to work it out, not to be
            tested. */}
        {question.image && <ImageFrame image={question.image} compact />}

        <ol className="options">
          {question.options.map((text, i) => (
            <li key={i}>
              <Option
                index={i}
                text={text}
                state={optionState(i)}
                isChosen={i === chosenIndex}
                onAnswer={onAnswer}
                onExplain={onExplain}
              />
            </li>
          ))}
        </ol>

        <div className="status" aria-live="polite">
          <Status
            question={question}
            current={current}
            canRedeem={canRedeem}
            onHint={onHint}
            onOpenRedeem={onOpenRedeem}
          />
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
              {isLast ? 'See your results' : 'Next question'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
