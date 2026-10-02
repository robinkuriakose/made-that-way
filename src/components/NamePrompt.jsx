import { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { MedalIcon, medalLabel } from './Medal.jsx';
import { ordinal } from './Leaderboard.jsx';
import { NAME_MAX_LENGTH, cleanName, nameProblem } from '../lib/names.js';
import { releaseKeyboard } from '../lib/keyboard.js';

// Opens over the end screen when a run finishes and the player still has
// their starting name: the score, where it would land this week, and one box
// for a name, already focused so a phone's keyboard is up. Empty is fine: the
// button then uses the starting name. "Not now" leaves the usual form below.
export default function NamePrompt({ score, levelsCleared, medal, rank, placeholder, onSubmit, onClose }) {
  const inputRef = useRef(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  // The Modal has focused the box by now; the stand-in can go.
  useEffect(() => {
    releaseKeyboard();
    return releaseKeyboard;
  }, []);

  const clean = cleanName(name);
  function submit(e) {
    e.preventDefault();
    const problem = clean ? nameProblem(clean) : null;
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    onSubmit(clean || placeholder);
  }

  return (
    <Modal labelledBy="name-prompt-title" onClose={onClose} initialFocusRef={inputRef} className="name-prompt">
      <p className="name-prompt-kicker">
        {levelsCleared > 0 ? `${levelsCleared} ${levelsCleared === 1 ? 'level' : 'levels'} cleared` : 'Run over'}
      </p>
      <p className="name-prompt-score">
        {score}
        <span>points</span>
      </p>
      {medal && (
        <p className="name-prompt-medal">
          <MedalIcon kind={medal} size={20} /> {medalLabel(medal)}
        </p>
      )}
      <h2 id="name-prompt-title" className="name-prompt-title">
        {rank ? `That's ${ordinal(rank)} on this week's board.` : "That goes on this week's board."} Put your name on it.
      </h2>
      <form className="name-prompt-form" onSubmit={submit} noValidate>
        <label htmlFor="name-prompt-input" className="visually-hidden">
          Your name
        </label>
        <input
          ref={inputRef}
          id="name-prompt-input"
          type="text"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          placeholder="Your name"
          autoComplete="nickname"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'name-prompt-error' : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p id="name-prompt-error" className="form-error">
            {error}
          </p>
        )}
        <button type="submit" className="button button-primary name-prompt-go">
          {`Add as ${clean || placeholder}`}
        </button>
        <button type="button" className="text-button name-prompt-skip" onClick={onClose}>
          Not now
        </button>
      </form>
    </Modal>
  );
}
