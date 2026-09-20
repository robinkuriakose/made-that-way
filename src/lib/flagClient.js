// Sends a player's flag. The server only accepts flags on runs it knows
// about, so any queued run start goes out first. Resolves to true if saved.
import { flush } from './outbox.js';
import { getDeviceId } from './device.js';
import { isTestMode } from './testMode.js';

export async function sendFlag(flag) {
  try {
    await flush();
    const res = await fetch('/api/flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...flag, deviceId: getDeviceId(), test: isTestMode() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
