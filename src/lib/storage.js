// Saving a finished run. It goes through the outbox, so a run finished
// offline is sent on the next visit instead of being lost. The server
// checks it against the run registered when it started (see
// server/routes/sessions.js). Reading runs back is builder only.
import { send } from './outbox.js';
import { isTestMode } from './testMode.js';

export function recordSession(session) {
  return send('/api/sessions', { ...session, test: isTestMode() });
}
