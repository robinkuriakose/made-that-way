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

// Where the run left you on this week's board, and which way you moved.
function signedMessage(result, boards, rankBefore) {
  const rank = (boards.week.entries.find((e) => e.isMe) ?? boards.week.me)?.rank;
  const test = result.isTest ? ' (A test run: it goes in two minutes.)' : '';
  if (!rank) return `On the board.${test}`;
  if (!rankBefore) return `You're on the board: ${ordinal(rank)} this week.${test}`;
  if (rank < rankBefore) return `Up to ${ordinal(rank)} this week, from ${ordinal(rankBefore)}.${test}`;
  if (rank > rankBefore) return `${ordinal(rank)} this week, down from ${ordinal(rankBefore)}: others have passed you.${test}`;
  return result.isNewBest ? `Still ${ordinal(rank)} this week, with a new best.${test}` : `Still ${ordinal(rank)} this week. Your best run counts.${test}`;
}

const STAR = 'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

// After every run: how was it (one tap on a star opens the short form with
// it filled in), and a question to suggest. Loud on purpose: it's how the
// game gets better.
function AskCard({ onRate, onSuggest }) {
  return (
    <section className="end-ask" aria-label="Help make the next questions">
      <div className="end-ask-part">
        <p className="end-ask-title">How was that?</p>
        <div className="end-stars" role="group" aria-label="Rate the game">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className="end-star" aria-label={`${n} out of 5`} onClick={() => onRate(n)}>
              <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" focusable="false">
                <path d={STAR} />
              </svg>
            </button>
          ))}
        </div>
        <p className="end-ask-note">Tap a star. A few quick questions after that, all optional.</p>
      </div>
      <div className="end-ask-part">
        <p className="end-ask-title">Seen something that makes you ask why?</p>
        <p className="end-ask-note">Send it in. If it becomes a question, it goes in with your name on it.</p>
        <button type="button" className="button button-primary" onClick={onSuggest}>
          Suggest a question
        </button>
      </div>
    </section>
  );
}

const HEADLINES = {
  legend: 'Legend: every level cleared',
  lives: 'Out of lives',
  finished: 'Run saved',
  complete: "You've answered every question we have",
};

export default function EndScreen({
  run,
  questionsById,
  boards,
  knownName,
  signing,
  signResult,
  starting,
  onSign,
  onExplain,
  onPlayAgain,
  onHome,
  onCollection,
  onRate,
  onSuggest,
}) {
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

        <section className="end-section end-board" aria-label="Leaderboard">
          {signed ? (
            <p className="sign-done" aria-live="polite">
              {signedMessage(signResult, boards, run.rankBefore ?? null)}
            </p>
          ) : run.autoSigning && signing ? (
            <p className="sign-done muted">Adding your run to this week's board…</p>
          ) : (
            <SignForm knownName={knownName} signing={signing} error={signResult?.error} onSign={onSign} />
          )}
          <Leaderboard boards={boards} limit={10} titleId="end-board-title" animate />
        </section>

        <AskCard onRate={onRate} onSuggest={onSuggest} />

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
