import TopBar from './TopBar.jsx';
import Leaderboard from './Leaderboard.jsx';
import PlayerName from './PlayerName.jsx';
import DailyCard from './DailyCard.jsx';
import WallOfWhys from './WallOfWhys.jsx';
import { RUN_LENGTH } from '../lib/scoring.js';

function TopicsLine({ themes, chosen, onChoose }) {
  const names = chosen ? themes.filter((t) => chosen.includes(t.id)).map((t) => t.label) : null;
  return (
    <p className="topics-line">
      <span className="muted">Topics:</span> <span>{names ? names.join(', ') : 'All'}</span>
      <button type="button" className="text-button topics-change" onClick={onChoose}>
        Choose topics
      </button>
    </p>
  );
}

export default function HomeScreen({
  canResume,
  resumePosition,
  total,
  boards,
  starting,
  player,
  themes,
  chosenThemes,
  questions,
  dailyFlagged,
  onStart,
  onResume,
  onRename,
  onChooseThemes,
  onFlagDaily,
}) {
  return (
    <div className="page">
      <TopBar />
      <main className="stage start home">
        <h1 className="stem">Why are well designed things shaped the way they are?</h1>
        <p className="lede">
          Ten questions about everyday objects, furniture, machines and screens. Every one has a real reason behind it,
          and you can read that reason once you answer.
        </p>

        <PlayerName name={player.name} changesLeft={player.changesLeft} onRename={onRename} />

        <div className="actions start-actions">
          {canResume ? (
            <>
              <button type="button" className="button button-primary" onClick={onResume}>
                Continue from question {resumePosition} of {total ?? RUN_LENGTH}
              </button>
              <button type="button" className="button" onClick={onStart} disabled={starting}>
                {starting ? 'Loading questions…' : 'Start a new run'}
              </button>
            </>
          ) : (
            <button type="button" className="button button-primary" onClick={onStart} disabled={starting}>
              {starting ? 'Loading questions…' : 'Start'}
            </button>
          )}
        </div>
        <TopicsLine themes={themes} chosen={chosenThemes} onChoose={onChooseThemes} />

        <ul className="rules">
          <li>Take up to 45 seconds a question. Answering sooner scores a little more.</li>
          <li>One hint per question. It costs 10 seconds.</li>
          <li>Get one wrong and you can win a few points back by answering a related question.</li>
        </ul>

        <DailyCard onFlag={onFlagDaily} flagged={dailyFlagged} />

        <WallOfWhys questions={questions} themes={themes} />

        <section className="end-section start-board" aria-labelledby="start-board-title">
          <Leaderboard boards={boards} limit={5} titleId="start-board-title" />
        </section>
      </main>
    </div>
  );
}
