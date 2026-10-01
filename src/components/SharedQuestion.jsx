import { useMemo, useState } from 'react';
import TopBar from './TopBar.jsx';
import ImageFrame from './ImageFrame.jsx';
import { LogoMark } from './Logo.jsx';
import { optionOrder, toOriginal } from '../lib/shuffle.js';
import { firstSentence } from '../lib/text.js';
import { percentRight } from '../lib/levels.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// A question someone shared, opened from their link: answer it right here,
// see why, then carry on into a run or pass it on. `from` is the sharer's
// name; a link only carries it when they got the question right.
export default function SharedQuestion({ question, label, from, starting, onAnswered, onExplain, onPlay, onShare, onHome }) {
  const order = useMemo(() => optionOrder(4), [question.id]);
  const [chosen, setChosen] = useState(null); // in the question's own order
  const answered = chosen != null;
  const correct = answered && chosen === question.correctIndex;
  const share = percentRight(question);

  function choose(displayIndex) {
    if (answered) return;
    const original = toOriginal(order, displayIndex);
    setChosen(original);
    onAnswered(original, original === question.correctIndex);
  }

  function optionState(original) {
    if (!answered) return 'open';
    if (original === question.correctIndex) return 'correct';
    if (original === chosen) return 'wrong';
    return 'idle';
  }

  return (
    <div className="page">
      <TopBar onHome={onHome} />
      <main className={`stage question shared${answered ? ' is-answered' : ''}`}>
        <p className="shared-kicker">
          <LogoMark size={20} />
          <span>{from ? `${from} worked this one out. Can you?` : 'Someone sent you this. Can you work it out?'}</span>
        </p>
        <p className="eyebrow">{label}</p>
        <h1 className="stem">{question.stem}</h1>
        {question.image && <ImageFrame image={question.image} compact />}
        {question.suggestedBy && <p className="suggested-by">Suggested by {question.suggestedBy}</p>}

        <ol className={`options${answered ? ' is-answered' : ''}`}>
          {order.map((original, i) => {
            const state = optionState(original);
            const text = question.options[original];
            return (
              <li key={original}>
                {state === 'open' ? (
                  <button type="button" className="option" onClick={() => choose(i)}>
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

        {answered && (
          <div className="status" aria-live="polite">
            <p className={`feedback ${correct ? 'feedback-right' : 'feedback-wrong'}`}>
              {correct ? (from ? `Right. You and ${from} both got it.` : 'Right. You worked it out.') : 'Not this one.'}
            </p>
            <div className="reason">
              <p className="reason-label">Why it's made that way</p>
              <p className="reason-text">{firstSentence(question.explanationRight)}</p>
              {share != null && <p className="muted reason-share">{share}% of players get this right.</p>}
              <p className="reason-foot">
                <button type="button" className="text-button" onClick={() => onExplain(chosen, correct)}>
                  Read more
                </button>
              </p>
            </div>

            <section className="shared-next" aria-labelledby="shared-next-title">
              <h2 id="shared-next-title" className="shared-next-title">
                That was one. There are plenty more.
              </h2>
              <p className="shared-next-lede">Quick picture questions about everyday design. No clock, no sign-up.</p>
              <div className="shared-next-actions">
                <button type="button" className="button button-primary button-big" onClick={onPlay} disabled={starting}>
                  {starting ? 'Loading questions…' : "Let's play"}
                </button>
                <button type="button" className="button" onClick={() => onShare(correct)}>
                  Send it to a friend
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
