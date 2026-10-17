import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
const idb = globalThis.indexedDB;
globalThis.indexedDB = undefined;
const { storage: fallback } = await import('../src/infrastructure/storage/storage.js?fallback');
const old = { id: 'cust_old', name: 'Curl Bayesian', hidden: false };
assert.equal(await fallback.set('custom-exercises', [old]), true);
assert.equal(await fallback.set('sessions', [{ id: 'old-session' }]), true);
globalThis.indexedDB = idb;
const { storage } = await import('../src/infrastructure/storage/storage.js');
assert.deepEqual(await storage.get('custom-exercises'), [old]);
assert.deepEqual(await storage.get('sessions'), [{ id: 'old-session' }]);
assert.equal(values.has('sessions'), false, 'migrated legacy sessions cannot resurrect');
await storage.del('sessions');
assert.equal(await storage.get('sessions'), null);

await storage.set('custom-exercises', []);
assert.deepEqual(await storage.get('custom-exercises'), [old], 'empty stale snapshot cannot erase custom data');
const other = { id: 'cust_other', name: 'Otro ejercicio' };
values.set('custom-exercises', JSON.stringify([other]));
assert.equal((await storage.get('custom-exercises')).length, 2, 'merge both backends');
await storage.set('custom-exercises', [{ ...old, hidden: true, updatedAt: 10 }]);
await storage.set('custom-exercises', [old]);
assert.equal((await storage.get('custom-exercises')).find(ex => ex.id === old.id).hidden, true);
await storage.set('custom-exercises', [{ ...old, hidden: false, updatedAt: 11 }]);
assert.equal((await storage.get('custom-exercises')).find(ex => ex.id === old.id).hidden, false);

const { storage: tab } = await import('../src/infrastructure/storage/storage.js?other-tab');
await Promise.all([
  storage.set('custom-exercises', [{ id: 'tab-a', name: 'A' }]),
  tab.set('custom-exercises', [{ id: 'tab-b', name: 'B' }]),
]);
assert.deepEqual(new Set((await storage.get('custom-exercises')).map(ex => ex.id)),
  new Set(['cust_old', 'cust_other', 'tab-a', 'tab-b']));
const secondary = JSON.parse(values.get('custom-exercises'));
assert.equal(secondary.length, 4);
values.set('custom-exercises', '{broken');
await assert.rejects(storage.get('custom-exercises'));
assert.equal(values.get('custom-exercises'), '{broken', 'do not overwrite unreadable legacy data');
values.set('custom-exercises', JSON.stringify(secondary));
assert.equal((await storage.get('custom-exercises')).length, 4);
await storage.del('custom-exercises');
assert.deepEqual(await storage.get('custom-exercises'), [], 'explicit reset clears both stores');
console.log('Storage migration, upsert, archive, concurrent tabs and explicit reset passed');
