import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { PencilIcon } from './ProfileScreen.jsx';
import { NAME_MAX_LENGTH, cleanName } from '../lib/names.js';

// Top right of the home screen: "Call me curiousotter35" with a pencil. The
// name opens the profile; the pencil changes the name.
export default function NameTag({ name, onOpen, onEdit }) {
  return (
    <span className="nametag">
      <span className="nametag-call">Call me</span>
      <button type="button" className="nametag-name" onClick={onOpen} title="Your profile and past runs">
        {name}
      </button>
      <button type="button" className="icon-button" aria-label="Change your name" onClick={onEdit}>
        <PencilIcon />
      </button>
    </span>
  );
}

// Changing the name. Once a name is on the board it can change three
// times; until then it changes freely.
export function RenameModal({ name, changesLeft, onSave, onClose }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    const next = cleanName(value);
    if (!next || next === name) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(next);
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error);
  }

  const locked = changesLeft === 0;
  return (
    <Modal labelledBy="rename-title" onClose={onClose} initialFocusRef={inputRef} className="modal-rename">
      <form onSubmit={save}>
        <h2 id="rename-title" className="modal-title">
          What should we call you?
        </h2>
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          disabled={locked}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Your name"
        />
        <p className="muted field-note">
          {locked
            ? "You've used all your name changes."
            : changesLeft == null
              ? 'This is the name on the boards when you add a run.'
              : `You can change it ${changesLeft} more ${changesLeft === 1 ? 'time' : 'times'}. It changes on every board.`}
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions modal-actions-split">
          <button type="button" className="text-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={saving || locked}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
