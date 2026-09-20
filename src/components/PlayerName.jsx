import { useState } from 'react';
import { NAME_MAX_LENGTH, cleanName } from '../lib/names.js';

// "Playing as Robin. Change" on the home screen, once a name exists.
// Changing it renames the player on every board. changesLeft is null when the
// name isn't on the board yet (never signed), and then changes are free.
export default function PlayerName({ name, changesLeft, onRename }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!name) return null;
  const locked = changesLeft === 0;

  async function save(e) {
    e.preventDefault();
    const next = cleanName(value);
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const result = await onRename(next);
    setSaving(false);
    if (result.ok) {
      setEditing(false);
      setError(null);
    } else setError(result.error);
  }

  if (!editing) {
    return (
      <p className="player-name">
        Playing as <strong>{name}</strong>
        {!locked && (
          <button
            type="button"
            className="text-button player-change"
            onClick={() => {
              setValue(name);
              setError(null);
              setEditing(true);
            }}
          >
            Change
          </button>
        )}
      </p>
    );
  }

  return (
    <form className="player-edit" onSubmit={save}>
      <label htmlFor="player-rename" className="field-label">
        Your name on the board
      </label>
      <div className="sign-row">
        <input
          id="player-rename"
          type="text"
          value={value}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <button type="submit" className="button button-primary" disabled={saving || !cleanName(value)}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="text-button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
      {error ? (
        <p className="form-error">{error}</p>
      ) : (
        changesLeft != null && (
          <p className="muted field-note">
            {changesLeft === 1 ? 'This is your last name change.' : `You can change it ${changesLeft} more times.`}
          </p>
        )
      )}
    </form>
  );
}
