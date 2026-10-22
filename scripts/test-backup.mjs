// Backup export/import: nothing the app persists may be left out of the
// JSON copy, and restoring a copy onto an empty device must bring it all back.
// Run with: node scripts/test-backup.mjs
import { readFileSync } from 'node:fs';
import { BACKUP_FIELDS, buildBackup, describeBackup, mergeBackup, parseBackup } from '../src/domain/backup/backup.js';
import { DEFAULT_PLATE_CONFIG } from '../src/domain/exercises/exercise-utils.js';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : ''); fail++; }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\nevery persisted key is in the backup');
{
  const app = readFileSync(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  const keys = [...new Set([...app.matchAll(/storage\.set\('([^']+)'/g)].map(m => m[1]))];
  ok('found the persisted keys', keys.length >= 7, keys);
  for (const key of keys) {
    const field = key.replace(/-(\w)/g, (_, c) => c.toUpperCase());
    ok(`'${key}' is exported as ${field}`, BACKUP_FIELDS.includes(field));
  }
}

const state = {
  customExercises: [{ id: 'custom_1', name: 'Curl raro', muscleGroup: 'biceps', updatedAt: 5 }],
  sessions: [
    { id: 's2', date: '2026-10-20T10:00:00Z', entries: [] },
    { id: 's1', date: '2026-10-18T10:00:00Z', entries: [] },
  ],
  currentSession: { id: 'live', startedAt: 1000, entries: [] },
  routines: [{ id: 'rt_1', name: 'Pierna', entries: [] }],
  bodyWeights: [{ date: '2026-10-20T08:00:00Z', kg: 80.2 }, { date: '2026-10-10T08:00:00Z', kg: 81 }],
  plateConfig: { barWeightKg: 15, plates: [{ weight: 10, pairs: 4, enabled: true }] },
  weeklyGoal: 4,
};

console.log('\nround trip onto an empty device');
{
  const json = JSON.stringify(buildBackup(state, new Date('2026-10-22T00:00:00Z')));
  const data = parseBackup(json);
  ok('backup has every field', BACKUP_FIELDS.every(f => f in data));
  ok('backup carries body weights', eq(data.bodyWeights, state.bodyWeights));
  const empty = { customExercises: [], sessions: [], currentSession: null, routines: [], bodyWeights: [], plateConfig: DEFAULT_PLATE_CONFIG, weeklyGoal: null };
  const restored = mergeBackup(empty, data);
  for (const field of BACKUP_FIELDS) ok(`${field} restored`, eq(restored[field], state[field]), restored[field]);
  ok('summary mentions weights', describeBackup(data).includes('2 registro(s) de peso'));
}

console.log('\nmerging keeps what is already on the device');
{
  const device = {
    ...state,
    sessions: [{ id: 's3', date: '2026-10-21T10:00:00Z', entries: [] }],
    bodyWeights: [{ date: '2026-10-21T08:00:00Z', kg: 79.9 }, { date: '2026-10-20T19:00:00Z', kg: 80.6 }],
    currentSession: null,
    weeklyGoal: 3,
  };
  const merged = mergeBackup(device, parseBackup(JSON.stringify(buildBackup(state))));
  ok('sessions merged newest first', eq(merged.sessions.map(s => s.id), ['s3', 's2', 's1']));
  ok('one weight per day, backup wins, newest first',
    eq(merged.bodyWeights.map(b => b.kg), [79.9, 80.2, 81]), merged.bodyWeights);
  ok('live session restored when none is running', merged.currentSession?.id === 'live');
  ok('backup goal applied', merged.weeklyGoal === 4);
  const noExtras = mergeBackup(device, { sessions: [] });
  ok('old backup without weights keeps device weights', eq(noExtras.bodyWeights, device.bodyWeights));
  ok('old backup without plates keeps device plates', eq(noExtras.plateConfig, device.plateConfig));
  ok('old backup without goal keeps device goal', noExtras.weeklyGoal === 3);
  const badDates = mergeBackup(device, { sessions: [], bodyWeights: [{ date: '22/10/2026', kg: 80 }, { date: '2026-10-22T08:00:00Z', kg: 79.5 }] });
  ok('weights with unparseable dates are not imported', eq(badDates.bodyWeights.map(b => b.kg), [79.5, 79.9, 80.6]), badDates.bodyWeights);
}

console.log('\ninvalid files');
{
  let threw = false;
  try { parseBackup('{"foo": 1}'); } catch { threw = true; }
  ok('rejects JSON without sessions', threw);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
