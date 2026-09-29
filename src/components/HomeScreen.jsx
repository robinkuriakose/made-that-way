import { useMemo, useState } from 'react';
import TopBar from './TopBar.jsx';
import Leaderboard from './Leaderboard.jsx';
import DailyCard from './DailyCard.jsx';
import WallOfWhys from './WallOfWhys.jsx';
import WhyPreview from './WhyPreview.jsx';
import LegendsWall from './LegendsWall.jsx';
import NameTag from './NameTag.jsx';
import { Heart } from './Hearts.jsx';
import { showsImage } from './ImageFrame.jsx';
import { shuffled } from '../lib/shuffle.js';
import { questionLabel } from '../lib/themes.js';
import { seenIds } from '../lib/seen.js';

const HERO_PICTURES = 3;
const ROW_PICTURES = 12;

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

// What this player has built up, in one line. Only for returning players.
function Progress({ best, whys, streak, badges, badgeTotal, onCollection }) {
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
          <strong>{badges}</strong> of {badgeTotal} badges
        </button>
      )}
    </p>
  );
}

// Three pictures fanned out like prints on a table, beside the headline on a
// computer and above it on a phone. The first thing a visual person sees.
function HeroStack({ tiles, onOpen }) {
  if (tiles.length < HERO_PICTURES) return null;
  return (
    <div className="hero-stack">
      {tiles.slice(0, HERO_PICTURES).map((q, i) => (
        <button key={q.id} type="button" className={`hero-print hero-print-${i}`} aria-label={`${q.image.alt}. See its question.`} onClick={() => onOpen(i)}>
          <img src={q.image.thumb ?? q.image.src} alt="" decoding="async" />
          <span className="wall-why" aria-hidden="true">
            Why?
          </span>
        </button>
      ))}
    </div>
  );
}

// How it works, as three pictures and a few words each, not paragraphs.
function HowItWorks() {
  const steps = [
    {
      title: 'Look closely',
      icon: (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path d="M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24z" />
          <circle cx="24" cy="24" r="6" />
        </svg>
      ),
    },
    {
      title: 'Pick the why',
      icon: (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <rect x="8" y="9" width="32" height="8" rx="4" />
          <rect x="8" y="21" width="32" height="8" rx="4" className="how-picked" />
          <rect x="8" y="33" width="32" height="8" rx="4" />
        </svg>
      ),
    },
    {
      title: 'See the thinking',
      icon: (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path d="M24 6a12 12 0 0 0-7 21.7c1.3 1 2 2.5 2 4.1V34h10v-2.2c0-1.6.7-3.1 2-4.1A12 12 0 0 0 24 6z" />
          <path d="M19 39h10M21 43h6" />
        </svg>
      ),
    },
  ];
  return (
    <section className="how" aria-labelledby="how-title">
      <p id="how-title" className="section-title">
        How it works
      </p>
      <ol className="how-steps">
        {steps.map((s) => (
          <li key={s.title} className="how-step">
            <span className="how-icon">{s.icon}</span>
            <span className="how-title">{s.title}</span>
          </li>
        ))}
      </ol>
      <ul className="how-facts">
        <li>
          <Heart /> 3 lives
        </li>
        <li>5 questions a level</li>
        <li>No clock</li>
      </ul>
    </section>
  );
}

// The home screen, for people who look before they read: a stack of
// pictures and one big button up top, then a row of pictures, today's
// question, how it works in three pictures, the Legends wall and this
// week's board, with room to breathe between them.
export default function HomeScreen({
  resume,
  boards,
  legends,
  starting,
  player,
  progress,
  themes,
  chosenThemes,
  questions,
  dailyFlagged,
  onStart,
  onResume,
  onOpenProfile,
  onEditName,
  onChooseThemes,
  onFlagDaily,
  onStreak,
  onCollection,
  onPlayQuestion,
  onSignLegend,
}) {
  // One set of pictures for the whole visit: unseen questions first, so the
  // stack and the row stay fresh. Picked once, so nothing reshuffles when
  // the live bank arrives.
  const tiles = useMemo(() => {
    const seen = new Set(seenIds());
    const pictures = questions.filter((q) => showsImage(q.image));
    return [...shuffled(pictures.filter((q) => !seen.has(q.id))), ...shuffled(pictures.filter((q) => seen.has(q.id)))].slice(
      0,
      HERO_PICTURES + ROW_PICTURES,
    );
  }, [questions.length > 0]);
  const [open, setOpen] = useState(null);
  const [lastRow, setLastRow] = useState(null);
  const heroTiles = tiles.slice(0, HERO_PICTURES);
  const rowTiles = tiles.slice(HERO_PICTURES);
  const question = open == null ? null : tiles[open];

  const close = () => {
    if (open >= HERO_PICTURES) setLastRow(open - HERO_PICTURES);
    setOpen(null);
  };

  return (
    <div className="page">
      <TopBar meta={<NameTag name={player.name} onOpen={onOpenProfile} onEdit={onEditName} />} />
      <main className="stage start home">
        <section className="hero">
          <HeroStack tiles={heroTiles} onOpen={setOpen} />
          <div className="hero-text">
            <h1 className="promise">You've seen it a thousand times. Let's ask why.</h1>
            <p className="lede">Good design starts with a simple why. Slow down for a minute, look a little closer, and give your brain a treat.</p>
            <div className="start-actions">
              {resume ? (
                <>
                  <button type="button" className="button button-primary button-big" onClick={onResume}>
                    {resume}
                  </button>
                  <button type="button" className="text-button" onClick={onStart} disabled={starting}>
                    {starting ? 'Loading questions…' : 'Start a new run instead'}
                  </button>
                </>
              ) : (
                <button type="button" className="button button-primary button-big" onClick={onStart} disabled={starting}>
                  {starting ? 'Loading questions…' : "Let's start"}
                </button>
              )}
              <p className="start-note">Quick picture questions. No clock, no sign-up.</p>
            </div>
            <Progress {...progress} onCollection={onCollection} />
            {onSignLegend && (
              <button type="button" className="legend-prompt" onClick={onSignLegend}>
                ★ You finished every level. Sign the Legends wall
              </button>
            )}
          </div>
        </section>

        <WallOfWhys tiles={rowTiles} onOpen={(i) => setOpen(i + HERO_PICTURES)} activeIndex={lastRow} />

        <DailyCard onFlag={onFlagDaily} flagged={dailyFlagged} onStreak={onStreak} />

        <HowItWorks />

        <LegendsWall legends={legends.legends} lastLevel={legends.lastLevel} titleId="home-legends" />

        <section className="start-board" aria-labelledby="start-board-title">
          <Leaderboard boards={boards} limit={5} titleId="start-board-title" />
        </section>

        <div className="home-foot">
          <TopicsLine themes={themes} chosen={chosenThemes} onChoose={onChooseThemes} />
        </div>
      </main>

      {question && (
        <WhyPreview
          question={question}
          label={questionLabel(question, themes)}
          starting={starting}
          onPlay={() => onPlayQuestion(question.id)}
          onAnother={() => setOpen((i) => (i + 1) % tiles.length)}
          onClose={close}
        />
      )}
    </div>
  );
}
