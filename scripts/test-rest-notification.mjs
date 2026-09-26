import assert from 'node:assert/strict';
import { closeRestNotification, showRestNotification } from '../src/infrastructure/notifications/rest-notification.js';

const calls = [];
const existing = { close: () => calls.push('closed') };
const worker = {
  getNotifications: async ({ tag }) => {
    assert.equal(tag, 'ironlog-rest');
    return [existing];
  },
  showNotification: async (title, options) => calls.push({ title, options }),
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true, value: { serviceWorker: { ready: Promise.resolve(worker) } },
});
globalThis.Notification = { permission: 'default', requestPermission: async () => {
  Notification.permission = 'granted';
  return 'granted';
} };
const timer = { endsAt: new Date('2026-09-26T10:01:30Z').getTime(),
  exerciseName: 'Press de banca', total: 90 };
assert.equal(await showRestNotification(timer, true), true);
assert.equal(calls[0], 'closed');
assert.equal(calls[1].title, 'Descanso en curso');
assert.match(calls[1].options.body, /Termina a las .*Press de banca/);
assert.equal(calls[1].options.tag, 'ironlog-rest');
await closeRestNotification();
assert.equal(calls[2], 'closed');
Notification.permission = 'denied';
assert.equal(await showRestNotification(timer), false);
console.log('Rest notification checks passed');
