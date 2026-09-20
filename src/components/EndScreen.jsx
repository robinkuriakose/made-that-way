import { useState } from 'react';
import TopBar from './TopBar.jsx';
import Leaderboard, { ordinal } from './Leaderboard.jsx';
import { NAME_MAX_LENGTH, cleanName } from '../lib/names.js';

// Signing. When this device already has a name it's one tap; the name is
// changed from the home screen. Otherwise, a name box.
function SignForm({ knownName, signing, error, onSign }) {
  const [name, setName] = useState('');
  if (knownName) {
    return (
      <div className="sign">
        <p className="field-label">Sign your score</p>
        <div className="sign-row">
          <button type="button" className="button button-primary" disabled={signing} onClick={() => onSign(knownName)}>
            {signing ? 'Saving…' : `Add to the board as ${knownName}`}
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
        Sign your score
      </label>
      <p className="muted sign-note">Add a name to put this run on the leaderboard.</p>
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
  const mine = boards.allTime.entries.find((e) => e.isMe) ?? boards.allTime.me;
  const weekRank = (boards.week.entries.find((e) => e.isMe) ?? boards.week.me)?.rank;
  if (result.isNewBest) return weekRank ? `Your new best. You're ${ordinal(weekRank)} this week.` : 'Your new best.';
  return mine ? `On the board. Your best is still ${mine.score}, from an earlier run.` : 'On the board.';
}

export default function EndScreen({ run, questionsById, boards, knownName, signing, signResult, starting, onSign, onExplain, onPlayAgain, onHome }) {
  const total = run.results.reduce((sum, r) => sum + r.points, 0);
  const right = run.results.filter((r) => r.correct).length;
  const redeemed = run.results.filter((r) => r.redeemPassed).length;
  const signed = signResult?.ok;

  return (
    <div className="page">
      <TopBar onHome={onHome} />
      <main className="stage end">
        <p className="eyebrow">Your run</p>
        <p className="final-score">
          {total}
          <span className="final-unit">points</span>
        </p>
        <p className="lede">
          You got {right} of {run.results.length} right
          {redeemed > 0 && `, and redeemed ${redeemed} more`}.
        </p>

        <section className="end-section" aria-label="Leaderboard">
          {signed ? (
            <p className="section-title sign-done">{signedMessage(signResult, boards)}</p>
          ) : (
            <SignForm knownName={knownName} signing={signing} error={signResult?.error} onSign={onSign} />
          )}
          <Leaderboard boards={boards} limit={10} titleId="end-board-title" />
          <p className="muted board-note">
            Scores are shared with everyone who plays. Your best is remembered on this device; a different browser
            starts fresh.
          </p>
        </section>

        <section className="end-section" aria-labelledby="review-title">
          <p id="review-title" className="section-title">
            Read the reasoning again
          </p>
          <ol className="review-list">
            {run.results.map((result) => (
              <li key={result.id}>
                <button type="button" className="review-row" onClick={() => onExplain(result)}>
                  <span className="review-num">{String(result.position).padStart(2, '0')}</span>
                  <span className="review-stem">{questionsById[result.id]?.stem}</span>
                  <span
                    className={`review-mark ${result.correct ? 'is-right' : result.redeemPassed ? 'is-redeemed' : 'is-wrong'}`}
                  >
                    {result.correct ? 'Right' : result.redeemPassed ? 'Redeemed' : 'Wrong'}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <div className="next-row">
          <button type="button" className="button button-primary" onClick={onPlayAgain} disabled={starting}>
            {starting ? 'Loading questions…' : 'Play again'}
          </button>
        </div>
      </main>
    </div>
  );
}
