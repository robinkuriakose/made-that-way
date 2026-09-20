import { useEffect, useMemo, useRef, useState } from 'react';
import ImageFrame from './ImageFrame.jsx';
import { answerDaily, cachedDaily, fetchDaily } from '../lib/dailyClient.js';
import { localDay } from '../lib/daily.js';
import { optionOrder, seededRandom, toDisplay, toOriginal } from '../lib/shuffle.js';
import { getDeviceId } from '../lib/device.js';
import { CONFIDENCE_LABELS } from '../lib/labels.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const dayLabel = (day) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function Stats({ me }) {
  if (!me?.answered) return null;
  const parts = [];
  if (me.streak > 0) parts.push(`${me.streak} day streak`);
  if (me.averageCorrect != null) parts.push(`${me.averageCorrect}% right on average`);
  if (!parts.length) return null;
  return <p className="daily-stats">{parts.join(' · ')}</p>;
}

// The question of the day, answered right on the home screen: no timer, no
// points, one go. Afterwards: the reason, how everyone else did, and this
// player's streak and average. Hidden quietly if the server can't be reached
// and nothing is cached, so the home screen never shows a broken card.
export default function DailyCard({ onFlag, flagged }) {
  const day = useMemo(() => localDay(), []);
  const [state, setState] = useState(() => cachedDaily(day));
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    let live = true;
    fetchDaily(day)
      .then((s) => live && setState(s))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [day]);

  // The same shuffle every time for this device and day.
  const order = useMemo(() => optionOrder(4, seededRandom(`${getDeviceId()}:${day}`)), [day]);

  if (!state) {
    if (failed) return null;
    return (
      <section className="daily is-loading" aria-label="Today's question">
        <p className="eyebrow">Today's question</p>
        <div className="daily-skeleton" />
      </section>
    );
  }

  const { question, answer, me } = state;
  if (!question) {
    return (
      <section className="daily" aria-labelledby="daily-title">
        <p className="eyebrow">Today's question</p>
        <p id="daily-title" className="daily-empty">No new question today. There'll be one tomorrow.</p>
        <Stats me={me} />
      </section>
    );
  }

  async function choose(displayIndex) {
    if (sending || answer) return;
    setSending(true);
    setSendError(null);
    try {
      setState(await answerDaily({ day, chosenIndex: toOriginal(order, displayIndex), timeMs: Date.now() - shownAt.current }));
    } catch {
      setSendError("Couldn't save your answer. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const chosen = answer ? toDisplay(order, answer.chosenIndex) : null;
  const correct = answer ? toDisplay(order, answer.correctIndex) : null;
  const explanation = answer ? (answer.correct ? answer.explanationRight : answer.explanationWrong?.[answer.chosenIndex]) : null;
  const everyone = answer?.everyone;

  return (
    <section className="daily" aria-labelledby="daily-title">
      <div className="daily-head">
        <p className="eyebrow">Today's question</p>
        <p className="daily-date">{dayLabel(day)}</p>
      </div>
      {question.image && <ImageFrame image={question.image} compact />}
      <h2 id="daily-title" className="daily-stem">
        {question.stem}
      </h2>

      <ol className="options options-compact">
        {order.map((original, i) => {
          const text = question.options[original];
          if (!answer) {
            return (
              <li key={i}>
                <button type="button" className="option" onClick={() => choose(i)} disabled={sending}>
                  <span className="option-letter">{LETTERS[i]}</span>
                  <span className="option-text">{text}</span>
                </button>
              </li>
            );
          }
          const optionState = i === correct ? 'correct' : i === chosen ? 'wrong' : 'idle';
          return (
            <li key={i}>
              <div className={`option is-${optionState}`}>
                <span className="option-letter">{LETTERS[i]}</span>
                <span className="option-body">
                  <span className="option-text">{text}</span>
                  {i === chosen && <span className="option-note">Your answer</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {sendError && <p className="form-error">{sendError}</p>}

      {answer && (
        <div className="daily-result" aria-live="polite">
          <p className="feedback">{answer.correct ? 'Right.' : 'Not this one.'}</p>
          {everyone?.answered > 1 && everyone.percentRight != null && (
            <p className="daily-everyone">{everyone.percentRight}% of players got this right today.</p>
          )}
          {explanation && <p className="daily-why">{explanation}</p>}
          <p className="daily-source">
            {CONFIDENCE_LABELS[answer.confidence]?.label}
            {answer.sourceUrl && (
              <>
                {' · '}
                <a href={answer.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {answer.sourceName}
                </a>
              </>
            )}
          </p>
          <div className="daily-foot">
            <Stats me={me} />
            {flagged ? (
              <span className="flag-done">Flagged. Thanks.</span>
            ) : (
              <button
                type="button"
                className="text-button flag-link"
                onClick={() =>
                  onFlag({
                    questionId: question.id,
                    runId: `daily-${day}`,
                    chosenIndex: answer.chosenIndex,
                    wasCorrect: answer.correct,
                    question: { ...question, correctIndex: answer.correctIndex },
                  })
                }
              >
                Flag this question
              </button>
            )}
          </div>
          <p className="muted daily-next">A new question comes out every day.</p>
        </div>
      )}
      {!answer && <Stats me={me} />}
    </section>
  );
}
