// Activity events for the overview analytics: page opened, run started,
// left, restarted, resumed, daily question opened. Sent through the outbox,
// so none are lost offline. No personal data: a random device id, and the
// kind of screen (phone, tablet, desktop).
import { send } from './outbox.js';
import { getDeviceId } from './device.js';
import { isTestMode } from './testMode.js';

export function screenKind() {
  const w = window.innerWidth || 1024;
  return w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop';
}

export function track(type, { runId = null, data = {} } = {}) {
  return send('/api/events', { type, deviceId: getDeviceId(), runId, test: isTestMode(), data });
}
