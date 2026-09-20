import { useEffect } from 'react';

// A short message at the bottom of the screen, with an optional action
// (such as Undo). Disappears on its own after `duration` ms.
// Long enough to notice and reach for on a phone: an undo that expires
// before you can take it is no better than no undo at all.
export default function Toast({ message, actionLabel = null, onAction = null, onDone, duration = 10000 }) {
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDone]);

  return (
    <div className="toast toast-player" role="status">
      <span>{message}</span>
      {actionLabel && (
        <button type="button" className="toast-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
