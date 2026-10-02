import TopBar from './TopBar.jsx';
import Burst from './Burst.jsx';
import CountUp from './CountUp.jsx';
import { Heart } from './Hearts.jsx';
import { BADGES } from '../lib/rewards.js';
import { levelMultiplier } from '../lib/scoring.js';

// The pause between levels: a moment to mark, the running score, what the
// level earned (a life, a perfect level, badges), a clue for the level
// ahead, and the choice to carry on or stop here.
//
// brk = { level, perfect, lifeGained, levelPoints, badges, tidbit, milestone }
// milestone: "bronze", "silver" or "gold" when this level is one (level-plan.json).
export default function LevelBreak({ brk, score, lives, starting, onContinue, onFinish, onHome, onRestart }) {
  const next = brk.level + 1;
  const badgeLabel = (id) => BADGES.find((b) => b.id === id)?.label ?? id;
  return (
    <div className="page">
      <TopBar play={{ level: brk.level, step: null, lives, score, combo: 1 }} onHome={onHome} onRestart={onRestart} />
      <main className="stage level-break">
        <div className={`level-hero${brk.milestone ? " has-medal" : ""}`}>
          <Burst />
          {brk.milestone && (
            <span className={`medal medal-${brk.milestone}`} aria-hidden="true">
              <span className="medal-disc">{brk.level}</span>
              <span className="medal-ribbon" />
            </span>
          )}
          <p className="eyebrow">{brk.milestone ? `${badgeLabel(brk.milestone)}! Level ${brk.level} cleared` : `Level ${brk.level} cleared`}</p>
          <h1 className="level-title">On to level {next}</h1>
        </div>

        <p className="level-score">
          <CountUp value={score} from={score - brk.levelPoints} duration={900} />
          <span className="final-unit">points so far</span>
        </p>

        <ul className="earned">
          {brk.perfect && <li className="earned-item is-perfect">Perfect level</li>}
          {brk.lifeGained && (
            <li className="earned-item">
              <Heart /> +1 life
            </li>
          )}
          {brk.badges.map((id) => (
            <li key={id} className="earned-item is-badge">
              New badge: {badgeLabel(id)}
            </li>
          ))}
        </ul>

        {brk.tidbit && (
          <aside className="clue" aria-label="A clue for the next level">
            <p className="clue-label">A clue for level {next}</p>
            <p className="clue-text">{brk.tidbit.text}</p>
          </aside>
        )}

        <p className="muted level-note">Answers in level {next} are worth ×{levelMultiplier(next)}.</p>

        <div className="next-row next-row-split">
          <button type="button" className="text-button" onClick={onFinish} disabled={starting}>
            Stop here and save my score
          </button>
          <button type="button" className="button button-primary" onClick={onContinue} autoFocus>
            Start level {next}
          </button>
        </div>
      </main>
    </div>
  );
}
