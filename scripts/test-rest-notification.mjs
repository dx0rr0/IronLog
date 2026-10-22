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
  active: { postMessage: message => messages.push(message) },
};
const messages = [];
Object.defineProperty(globalThis, 'navigator', {
  configurable: true, value: { serviceWorker: { ready: Promise.resolve(worker) } },
});
globalThis.Notification = { permission: 'default', requestPermission: async () => {
  Notification.permission = 'granted';
  return 'granted';
} };
const timer = { endsAt: new Date('2026-09-26T10:01:30Z').getTime(),
  exerciseName: 'Press de banca', total: 90 };
timer.endsAt = Date.now() + 90000;
assert.equal((await showRestNotification(timer, true)).status, 'shown');
assert.equal(calls[0].title, 'Descanso en curso');
assert.match(calls[0].options.body, /Termina a las .*Press de banca/);
assert.equal(calls[0].options.tag, 'ironlog-rest');
assert.equal(calls[0].options.silent, undefined, 'new rests respect Android alert settings');
assert.equal(calls[0].options.renotify, true, 'each new rest may alert again');
assert.equal(calls[0].options.requireInteraction, true);
assert.equal(calls[0].options.data.endsAt, timer.endsAt);
assert.deepEqual(messages.at(-1), { type: 'rest-schedule', endsAt: timer.endsAt, exerciseName: 'Press de banca' },
  'the worker gets the deadline for the background alert');
assert.equal((await showRestNotification(timer)).status, 'shown');
assert.equal(calls[1].options.silent, true, 'restoring/updating a rest stays quiet');
assert.equal(calls.filter(call => call === 'closed').length, 0, 'replacements do not close the old notification first');
await closeRestNotification();
assert.equal(calls[2], 'closed');
assert.deepEqual(messages.at(-1), { type: 'rest-cancel' }, 'closing cancels the background alert');
Notification.permission = 'denied';
assert.equal((await showRestNotification(timer)).status, 'denied');
Notification.permission = 'default';
assert.equal((await showRestNotification(timer)).status, 'permission');
Notification.permission = 'granted';
const originalShow = worker.showNotification;
worker.showNotification = async () => { throw new Error('OS notification failure'); };
const replacement = { ...timer, endsAt: timer.endsAt + 30000 };
assert.equal((await showRestNotification(replacement)).status, 'failed', 'permission alone is not delivery');
assert.deepEqual(messages.at(-1), { type: 'rest-schedule', endsAt: replacement.endsAt, exerciseName: 'Press de banca' },
  'a failed display still replaces the previous deadline');
worker.showNotification = originalShow;
assert.equal((await showRestNotification({ ...timer, endsAt: Date.now() - 1 })).status, 'expired');
assert.deepEqual(messages.at(-1), { type: 'rest-cancel' }, 'an expired rest clears any pending deadline');
const originalSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = callback => originalSetTimeout(callback, 1);
navigator.serviceWorker.ready = new Promise(() => {});
assert.equal((await showRestNotification(timer)).status, 'unavailable', 'missing service worker does not wait forever');
globalThis.setTimeout = originalSetTimeout;

let makeReady;
navigator.serviceWorker.ready = new Promise(resolve => { makeReady = resolve; });
const obsoleteClose = closeRestNotification();
const newest = showRestNotification(timer, true);
makeReady(worker);
await obsoleteClose;
assert.equal((await newest).status, 'shown');
assert.equal(calls.filter(call => call === 'closed').length, 1, 'an obsolete close cannot dismiss a newer rest');

let completeShow;
worker.showNotification = async () => {
  calls.push('showing');
  await new Promise(resolve => { completeShow = resolve; });
};
const pending = showRestNotification(timer);
while (!completeShow) await new Promise(resolve => originalSetTimeout(resolve, 0));
const cancelled = closeRestNotification();
completeShow();
assert.equal((await pending).status, 'cancelled');
await cancelled;
assert.equal(calls.at(-1), 'closed', 'dismissing during delivery closes it after delivery');
console.log('Rest notification checks passed');
