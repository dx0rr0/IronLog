import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let onClick, onMessage, focused = 0, closed = 0, opened;
const shown = [];
const self = { registration: { scope: 'https://ironlog.example/',
    showNotification: async (title, options) => { shown.push({ title, options }); } },
  addEventListener(type, handler) {
    if (type === 'notificationclick') onClick = handler;
    else if (type === 'message') onMessage = handler;
    else assert.fail(`unexpected listener ${type}`);
  },
  clients: {
    matchAll: async () => [{ url: 'https://ironlog.example/', focus: async () => { focused++; } }],
    openWindow: async url => { opened = url; },
  },
};
vm.runInNewContext(fs.readFileSync(new URL('../public/rest-notification-worker.js', import.meta.url), 'utf8'), { self, URL, setTimeout, Date, Number });
let pending;
const event = { notification: { tag: 'ironlog-rest', close: () => { closed++; } },
  waitUntil: promise => { pending = promise; } };
onClick(event);
await pending;
assert.equal(focused, 1);
assert.equal(closed, 1);
self.clients.matchAll = async () => [];
onClick(event);
await pending;
assert.equal(opened, 'https://ironlog.example/');
onClick({ notification: { tag: 'other', close() { throw new Error('unrelated notification'); } } });

// Background end-of-rest alert
const schedule = (endsAt, extra = {}) => {
  let waiting = Promise.resolve();
  onMessage({ data: { type: 'rest-schedule', endsAt, ...extra }, waitUntil: p => { waiting = p; } });
  return waiting;
};
self.clients.matchAll = async () => [{ visibilityState: 'hidden' }];
await schedule(Date.now() + 30, { exerciseName: 'Cambio → Remo con barra' });
assert.equal(shown.length, 1, 'fires when the rest ends with the app hidden');
assert.equal(shown[0].title, 'Descanso terminado');
assert.match(shown[0].options.body, /Remo con barra/);
assert.equal(shown[0].options.tag, 'ironlog-rest', 'replaces the running-rest notification');
assert.equal(shown[0].options.renotify, true, 'alerts again with sound');
assert.ok(shown[0].options.vibrate.length > 0);

self.clients.matchAll = async () => [{ visibilityState: 'visible' }];
await schedule(Date.now() + 30);
assert.equal(shown.length, 1, 'the visible app plays its own sound');

self.clients.matchAll = async () => [];
const cancelled = schedule(Date.now() + 30);
onMessage({ data: { type: 'rest-cancel' } });
await cancelled;
assert.equal(shown.length, 1, 'a dismissed rest never alerts');

const replaced = schedule(Date.now() + 30);
const latest = schedule(Date.now() + 60);
await Promise.all([replaced, latest]);
assert.equal(shown.length, 2, 'an adjusted rest alerts once, at its new end');
assert.equal(shown[1].options.data.endedAt > 0, true);

onMessage({ data: { type: 'rest-schedule', endsAt: Date.now() - 1000 }, waitUntil() { assert.fail('expired rests do not wait'); } });
onMessage({ data: { type: 'something-else' } });
console.log('Rest notification click focuses or opens IronLog; background rest end alerts once');
