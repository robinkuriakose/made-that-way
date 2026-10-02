import { useEffect, useRef, useState } from 'react';
import { ordinal } from './Leaderboard.jsx';
import { NAME_MAX_LENGTH, cleanName, nameProblem } from '../lib/names.js';
import { releaseKeyboard } from '../lib/keyboard.js';

// After a run, for a player still on their starting name: a line on the end
// screen itself, above Play again, where the name goes. Centred, the same as
// the page, no box. It takes the focus once the score has counted up, so the
// phone keyboard comes up then; dragging the page puts the keyboard away;
// the button shows once something is typed, and the keyboard's Done sends it.
export default function NameLine({ rank, focusAfter = 1200, onSubmit }) {
  const inputRef = useRef(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const input = inputRef.current;
      const active = document.activeElement;
      // Only if the player hasn't moved on to something else meanwhile.
      if (input && (!active || active === document.body || active.dataset?.keyboardStandIn)) input.focus({ preventScroll: true });
      releaseKeyboard();
    }, focusAfter);
    // The stand-in isn't released here: React may mount this twice in
    // development, and keyboard.js removes it on its own after a few seconds.
    return () => clearTimeout(timer);
  }, []);

  // A drag or a scroll by the player puts the keyboard away. Only touches and
  // wheels count: the scroll a phone makes itself to show the box doesn't.
  useEffect(() => {
    const away = () => {
      if (document.activeElement === inputRef.current) inputRef.current.blur();
    };
    window.addEventListener('touchmove', away, { passive: true });
    window.addEventListener('wheel', away, { passive: true });
    return () => {
      window.removeEventListener('touchmove', away);
      window.removeEventListener('wheel', away);
    };
  }, []);

  const clean = cleanName(name);
  function submit(e) {
    e.preventDefault();
    if (!clean) return;
    const problem = nameProblem(clean);
    if (problem) {
      setError(problem);
      return;
    }
    inputRef.current?.blur();
    onSubmit(clean);
  }

  return (
    <form className="name-line" onSubmit={submit} noValidate>
      <label htmlFor="name-line-input" className="name-line-label">
        {rank ? `That's ${ordinal(rank)} on this week's board. Put your name on it.` : "That goes on this week's board. Put your name on it."}
      </label>
      <input
        ref={inputRef}
        id="name-line-input"
        className="name-line-input"
        type="text"
        value={name}
        maxLength={NAME_MAX_LENGTH}
        placeholder="Your name"
        autoComplete="nickname"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'name-line-error' : undefined}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
      />
      {error && (
        <p id="name-line-error" className="form-error name-line-error">
          {error}
        </p>
      )}
      <div className="name-line-go">
        <button type="submit" className={`button button-primary${clean ? ' is-ready' : ''}`} tabIndex={clean ? 0 : -1} aria-hidden={clean ? undefined : 'true'}>
          Add to the board
        </button>
      </div>
    </form>
  );
}
