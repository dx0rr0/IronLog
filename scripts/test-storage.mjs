// Smoke test for the storage abstraction.
// Run with: node --experimental-vm-modules scripts/test-storage.mjs
//
// Sets up fake-indexeddb so storage.js can run outside the browser,
// then exercises set/get/delete plus a roundtrip with realistic data.

import 'fake-indexeddb/auto';
import { storage } from '../src/lib/storage.js';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, extra ?? ''); fail++; }
}

console.log('storage layer');

// 1) get on missing key returns null
ok('get on missing key returns null', (await storage.get('missing')) === null);

// 2) set + get roundtrip
await storage.set('foo', { hello: 'world', n: 42 });
const got = await storage.get('foo');
ok('roundtrip object', JSON.stringify(got) === JSON.stringify({ hello: 'world', n: 42 }), got);

// 3) overwrite
await storage.set('foo', { hello: 'mars' });
ok('overwrite updates value', (await storage.get('foo')).hello === 'mars');

// 4) delete
await storage.del('foo');
ok('delete removes key', (await storage.get('foo')) === null);

// 5) sessions array roundtrip (realistic)
const sessions = [
  { id: 's1', date: new Date().toISOString(), name: 'Pecho', entries: [{ exerciseId: 'press_banca', sets: [{ weight: 80, reps: 8, done: true }] }], duration: 3600 },
  { id: 's2', date: new Date().toISOString(), name: 'Espalda', entries: [], duration: 0 },
];
await storage.set('sessions', sessions);
const back = await storage.get('sessions');
ok('sessions array length',  back.length === 2);
ok('sessions deep equality', JSON.stringify(back) === JSON.stringify(sessions));

// 6) routine with nested structure
const routine = {
  id: 'r1', name: 'Rutina A', notes: 'test',
  exercises: [{
    exerciseId: 'press_banca', restSeconds: 120, notes: '',
    sets: [{ repsMin: 8, repsMax: 12, rir: 2 }, { repsMin: 8, repsMax: 12, rir: 2 }],
  }],
};
await storage.set('routines', [routine]);
const r = (await storage.get('routines'))[0];
ok('nested routine roundtrip', r.exercises[0].sets[1].rir === 2);

// 7) empty/null values
await storage.set('nullval', null);
// Note: null serializes to "null", which is a valid JSON value
ok('null roundtrip', (await storage.get('nullval')) === null);

// 8) body-weights array (new in v1.1)
const bodyWeights = [
  { date: '2025-05-12T07:00:00.000Z', kg: 75.4 },
  { date: '2025-05-10T07:00:00.000Z', kg: 75.6 },
  { date: '2025-05-08T07:00:00.000Z', kg: 75.8 },
];
await storage.set('body-weights', bodyWeights);
const bwBack = await storage.get('body-weights');
ok('body-weights length', bwBack.length === 3);
ok('body-weights are numbers (not stringified)', typeof bwBack[0].kg === 'number');
ok('body-weights deep equality', JSON.stringify(bwBack) === JSON.stringify(bodyWeights));

// 9) plate-config object (new in v1.1)
const plateCfg = {
  barWeightKg: 20,
  plates: [
    { weight: 20, pairs: 3 },
    { weight: 10, pairs: 2 },
    { weight: 2.5, pairs: 2 },
  ],
};
await storage.set('plate-config', plateCfg);
const pcBack = await storage.get('plate-config');
ok('plate-config roundtrip', JSON.stringify(pcBack) === JSON.stringify(plateCfg));
ok('plate-config plate weights are numbers', typeof pcBack.plates[0].weight === 'number' && typeof pcBack.plates[0].pairs === 'number');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
