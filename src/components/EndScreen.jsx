import { useState } from 'react';
import TopBar from './TopBar.jsx';
import Leaderboard, { ordinal } from './Leaderboard.jsx';
import CountUp from './CountUp.jsx';
import { NAME_MAX_LENGTH, cleanName } from '../lib/names.js';
import { BADGES } from '../lib/rewards.js';
import { levelSlices, replay } from '../lib/scoring.js';

// Signing. When this device already has a name it's one tap; the name is
// changed from the home screen. Otherwise, a name box.
function SignForm({ knownName, signing, error, onSign }) {
  const [name, setName] = useState('');
  if (knownName) {
    return (
      <div className="sign">
        <p className="field-label">Put this run on this week's board</p>
        <div className="sign-row">
          <button type="button" className="button button-primary" disabled={signing} onClick={() => onSign(knownName)}>
            {signing ? 'Saving…' : `Add it as ${knownName}`}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
  const ready = cleanName(name).length > 0 && !signing;
  return (
    <form
      className="sign"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSign(name);
      }}
    >
      <label htmlFor="player-name" className="field-label">
        Put this run on this week's board
      </label>
      <div className="sign-row">
        <input
          id="player-name"
          type="text"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          placeholder="Your name"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="button button-primary" disabled={!ready}>
          {signing ? 'Saving…' : 'Add to the board'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

function signedMessage(result, boards) {
  if (result.isTest) return 'Test run: it shows on the board for two minutes, then it goes.';
  const weekRank = (boards.week.entries.find((e) => e.isMe) ?? boards.week.me)?.rank;
  const where = weekRank ? ` You're ${ordinal(weekRank)} this week.` : '';
  return `On the board.${where}`;
}

const HEADLINES = {
  lives: 'Out of lives',
  finished: 'Run saved',
  complete: "You've answered every question we have",
};

export default function EndScreen({ run, questionsById, boards, knownName, signing, signResult, starting, onSign, onExplain, onPlayAgain, onHome, onCollection }) {
  const summary = replay(run.results) ?? { score: 0, correct: 0, level: 1, levelsCleared: 0 };
  const signed = signResult?.ok;
  const earned = (run.badges ?? []).map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);

  return (
    <div className="page">
      <TopBar onHome={onHome} />
      <main className="stage end">
        <p className="eyebrow">{HEADLINES[run.endReason] ?? 'Your run'}</p>
        <p className="final-score">
          <CountUp value={summary.score} from={0} duration={1100} />
          <span className="final-unit">points</span>
        </p>
        <p className="lede">
          {summary.levelsCleared > 0 ? `You cleared ${summary.levelsCleared} ${summary.levelsCleared === 1 ? 'level' : 'levels'}` : 'You reached level 1'}
          {' '}and got {summary.correct} of {run.results.length} right.
          {run.isNewBest && ' Your best run yet.'}
        </p>

        {(run.newWhys > 0 || earned.length > 0) && (
          <ul className="earned">
            {run.newWhys > 0 && (
              <li className="earned-item">
                <button type="button" className="link-button" onClick={onCollection}>
                  {run.newWhys} new {run.newWhys === 1 ? 'why' : 'whys'} uncovered
                </button>
              </li>
            )}
            {earned.map((b) => (
              <li key={b.id} className="earned-item is-badge">
                New badge: {b.label}
              </li>
            ))}
          </ul>
        )}

        <div className="next-row next-row-start">
          <button type="button" className="button button-primary" onClick={onPlayAgain} disabled={starting}>
            {starting ? 'Loading questions…' : 'Play again'}
          </button>
        </div>

        <section className="end-section" aria-label="Leaderboard">
          {signed ? (
            <p className="section-title sign-done">{signedMessage(signResult, boards)}</p>
          ) : (
            <SignForm knownName={knownName} signing={signing} error={signResult?.error} onSign={onSign} />
          )}
          <Leaderboard boards={boards} limit={10} titleId="end-board-title" />
        </section>

        <section className="end-section" aria-labelledby="review-title">
          <p id="review-title" className="section-title">
            Read the reasoning again
          </p>
          {levelSlices(run.results).map((slice, i) => (
            <div key={i} className="review-level">
              <p className="review-level-title">Level {i + 1}</p>
              <ol className="review-list">
                {slice.map((result) => (
                  <li key={result.id}>
                    <button type="button" className="review-row" onClick={() => onExplain(result)}>
                      <span className="review-num">{String(result.position).padStart(2, '0')}</span>
                      <span className="review-stem">{questionsById[result.id]?.stem}</span>
                      <span className={`review-mark ${result.correct ? 'is-right' : result.redeemPassed ? 'is-redeemed' : 'is-wrong'}`}>
                        {result.correct ? `+${result.points}` : result.redeemPassed ? 'Life won back' : 'Missed'}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
