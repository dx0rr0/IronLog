import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let onClick, focused = 0, closed = 0, opened;
const self = { registration: { scope: 'https://ironlog.example/' },
  addEventListener(type, handler) { assert.equal(type, 'notificationclick'); onClick = handler; },
  clients: {
    matchAll: async () => [{ url: 'https://ironlog.example/', focus: async () => { focused++; } }],
    openWindow: async url => { opened = url; },
  },
};
vm.runInNewContext(fs.readFileSync(new URL('../public/rest-notification-worker.js', import.meta.url), 'utf8'), { self, URL });
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
console.log('Rest notification click focuses or opens IronLog');
