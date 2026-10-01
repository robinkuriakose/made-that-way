import { useEffect, useRef } from 'react';
import TopBar from './TopBar.jsx';
import ImageFrame from './ImageFrame.jsx';
import { Heart } from './Hearts.jsx';
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

// One line: how it went. Points and the streak for a right answer, the life
// lost for a wrong one.
function Result({ current, streak, lives }) {
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
  return (
    <p className="feedback feedback-wrong">
      {lives === 0 ? 'Not this one. That was your last life.' : 'Not this one.'}
      {lives > 0 && (
        <span className="life-lost">
          <Heart state="empty" /> −1 life
        </span>
      )}
    </p>
  );
}

// Most players miss it at this share or below, so getting it right is worth
// telling someone about.
const RARE = 50;

// The reward for answering: why it's made that way, short, straight away.
// "Read more" opens the full reasoning and its source; flagging sits here,
// quietly, beside it. A right answer can be sent to a friend, and when most
// players miss that question, the moment says so.
function Reason({ question, correct, flagged, onExplain, onFlag, onShare }) {
  const share = percentRight(question);
  const rare = correct && share != null && share <= RARE;
  return (
    <div className="reason">
      {rare && (
        <div className="reason-rare">
          <p className="reason-rare-text">
            Only <strong>{share}%</strong> of players get this right. You did.
          </p>
          <button type="button" className="button button-small button-accent" onClick={onShare}>
            Ask a friend
          </button>
        </div>
      )}
      <p className="reason-label">Why it's made that way</p>
      <p className="reason-text">{firstSentence(question.explanationRight)}</p>
      {share != null && !rare && <p className="muted reason-share">{share}% of players get this right.</p>}
      <p className="reason-foot">
        <button type="button" className="text-button" onClick={onExplain}>
          Read more
        </button>
        {correct && !rare && (
          <button type="button" className="text-button" onClick={onShare}>
            Ask a friend
          </button>
        )}
        {flagged ? (
          <span className="flag-done">Flagged. Thanks.</span>
        ) : (
          <button type="button" className="text-button flag-link" onClick={onFlag}>
            Flag this question
          </button>
        )}
      </p>
    </div>
  );
}

// What to do next, in one place. After a wrong answer with a redeem on
// offer there are two choices, and winning the life back leads; otherwise
// there's one. On a phone this bar stays pinned to the bottom of the screen.
function Actions({ current, lives, canRedeem, nextLabel, onOpenRedeem, onNext }) {
  const offer = canRedeem && (current.phase === 'wrong' || current.phase === 'redeeming');
  return (
    <div className={`answer-actions${offer ? ' has-offer' : ''}`}>
      {offer && (
        <p className="answer-actions-note">
          {lives === 0 ? 'One last chance: answer a related question to stay in.' : 'Answer a related question to win your life back.'}
        </p>
      )}
      <div className="answer-actions-buttons">
        {offer ? (
          <>
            <button type="button" className="button" onClick={onNext}>
              {nextLabel}
            </button>
            <button type="button" className="button button-accent" onClick={onOpenRedeem}>
              <Heart /> Win it back
            </button>
          </>
        ) : (
          <button type="button" className="button button-primary" onClick={onNext}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
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
  onShare,
  onHome,
  onRestart,
}) {
  const { phase, chosenIndex, hintUsed } = current;
  const answered = phase !== 'answering';
  const optionsRef = useRef(null);

  // Once answered, the answers themselves lead: the two that are neither
  // yours nor right shrink to a line, and the screen brings the first of the
  // two that matter to the top, with the result and the reason right under
  // them. Nothing moves if it's all in view already.
  useEffect(() => {
    if (!answered) return;
    const first = optionsRef.current?.querySelector('.is-correct, .is-wrong');
    if (!first) return;
    const top = first.getBoundingClientRect().top;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (top < 0 || top > window.innerHeight * 0.45) first.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
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
      <main className={`stage question${answered ? ' is-answered' : ''}`}>
        <p className="eyebrow">{label}</p>
        <h1 className="stem">{question.stem}</h1>
        {/* Below the question, so the question itself always sits at the same
            height, and every image fills the same frame. Images show before
            the answer on purpose: the point is to work it out. */}
        {question.image && <ImageFrame image={question.image} compact />}
        {question.suggestedBy && <p className="suggested-by">Suggested by {question.suggestedBy}</p>}

        <ol ref={optionsRef} className={`options${answered ? ' is-answered' : ''}`}>
          {question.options.map((text, i) => (
            <li key={i}>
              <Option index={i} text={text} state={optionState(i)} onAnswer={onAnswer} />
            </li>
          ))}
        </ol>

        <div className="status" aria-live="polite">
          {!answered &&
            question.hint &&
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
              <Result current={current} streak={streak} lives={lives} />
              <Reason question={question} correct={phase === 'correct'} flagged={flagged} onExplain={onExplain} onFlag={onFlag} onShare={onShare} />
            </>
          )}
        </div>

        {answered && (
          <Actions
            current={current}
            lives={lives}
            canRedeem={canRedeem}
            nextLabel={nextLabel}
            onOpenRedeem={onOpenRedeem}
            onNext={onNext}
          />
        )}
      </main>
    </div>
  );
}
