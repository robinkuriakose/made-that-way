import TopBar from './TopBar.jsx';
import Leaderboard from './Leaderboard.jsx';
import PlayerName from './PlayerName.jsx';
import DailyCard from './DailyCard.jsx';
import WallOfWhys from './WallOfWhys.jsx';
import { BADGES } from '../lib/rewards.js';

function TopicsLine({ themes, chosen, onChoose }) {
  const names = chosen ? themes.filter((t) => chosen.includes(t.id)).map((t) => t.label) : null;
  return (
    <p className="topics-line">
      <span className="muted">Topics first:</span> <span>{names ? names.join(', ') : 'All'}</span>
      <button type="button" className="text-button topics-change" onClick={onChoose}>
        Choose topics
      </button>
    </p>
  );
}

// What this player has built up, in one line. Only for returning players:
// a first visit shows nothing here.
function Progress({ best, whys, streak, badges, onCollection }) {
  if (!best && !whys && !streak && !badges) return null;
  return (
    <p className="progress-line">
      {best && (
        <span>
          Your best <strong>{best.score}</strong>
        </span>
      )}
      {whys > 0 && (
        <button type="button" className="link-button" onClick={onCollection}>
          <strong>{whys}</strong> {whys === 1 ? 'why' : 'whys'} uncovered
        </button>
      )}
      {streak > 0 && (
        <span>
          <strong>{streak}</strong> day streak
        </span>
      )}
      {badges > 0 && (
        <button type="button" className="link-button" onClick={onCollection}>
          <strong>{badges}</strong> of {BADGES.length} badges
        </button>
      )}
    </p>
  );
}

// Above the fold: the promise, Start and today's question, nothing else.
// Everything that needs explaining or scrolling sits below.
export default function HomeScreen({
  resume,
  boards,
  starting,
  player,
  progress,
  themes,
  chosenThemes,
  questions,
  dailyFlagged,
  onStart,
  onResume,
  onRename,
  onChooseThemes,
  onFlagDaily,
  onStreak,
  onCollection,
}) {
  return (
    <div className="page">
      <TopBar />
      <main className="stage start home">
        <h1 className="promise">You've seen it a thousand times. Ever wondered why?</h1>
        <p className="lede">
          Why F and J have little bumps. Why manhole covers are round. Why a pen cap has a hole in it. Everyday things
          are full of clever decisions: take a guess, and enjoy the moment it clicks.
        </p>

        <div className="actions start-actions">
          {resume ? (
            <>
              <button type="button" className="button button-primary" onClick={onResume}>
                {resume}
              </button>
              <button type="button" className="button" onClick={onStart} disabled={starting}>
                {starting ? 'Loading questions…' : 'Start a new run'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button button-primary button-big" onClick={onStart} disabled={starting}>
                {starting ? 'Loading questions…' : 'Start guessing'}
              </button>
              <p className="start-note">Quick picture questions. No clock, no sign-up.</p>
            </>
          )}
        </div>
        <Progress {...progress} onCollection={onCollection} />

        <DailyCard onFlag={onFlagDaily} flagged={dailyFlagged} onStreak={onStreak} />

        <section className="how" aria-labelledby="how-title">
          <p id="how-title" className="section-title">
            How it works
          </p>
          <ul className="rules">
            <li>Five questions make a level, and each level is worth more than the last.</li>
            <li>You have three lives. A wrong answer costs one; answer a related question to win it back.</li>
            <li>Clear a level for an extra life. Get answers right in a row for a combo.</li>
            <li>No clock. Take the time to think it through.</li>
          </ul>
        </section>

        <section className="end-section start-board" aria-labelledby="start-board-title">
          <Leaderboard boards={boards} limit={5} titleId="start-board-title" />
        </section>

        <WallOfWhys questions={questions} themes={themes} />

        <div className="home-foot">
          <PlayerName name={player.name} changesLeft={player.changesLeft} onRename={onRename} />
          <TopicsLine themes={themes} chosen={chosenThemes} onChoose={onChooseThemes} />
        </div>
      </main>
    </div>
  );
}
