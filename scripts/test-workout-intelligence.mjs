import fs from 'node:fs';
import { CATALOG_ADDITIONS } from '../src/domain/exercises/catalog-additions.js';
import { exerciseComparisons, predictGhost, repeatSession, summarizeSession } from '../src/domain/training/workout-intelligence.js';

let pass = 0;
function ok(name, condition) {
  if (!condition) throw new Error(name);
  console.log('  ✓', name);
  pass++;
}

const exercise = { id: 'press_banca', type: 'weight_reps', equipment: 'Barra', name: 'Press de banca' };
const exMap = { press_banca: exercise };
const session = (id, date, routineId, sets) => ({
  id, date, routineId, name: 'Pecho', entries: [{ exerciseId: 'press_banca',
    restSeconds: 90, sets }],
});
const older = session('old', '2026-01-01', 'r1', [{ weight: 80, reps: 10, rir: 2, done: true }]);
const differentRoutine = session('other', '2026-01-10', 'r2', [{ weight: 85, reps: 8, rir: 2, done: true }]);
const target = { repsMin: 8, repsMax: 12, rir: 2 };

const comparison = exerciseComparisons([differentRoutine, older], 'press_banca', 'r1');
ok('prefers same routine over newer general session', comparison.preferred.session.id === 'old');
ok('general history remains available', comparison.general.session.id === 'other');
const firstGhost = predictGhost({ exercise, setIndex: 0, sessions: [differentRoutine, older],
  routineId: 'r1', targetSet: target });
ok('ghost uses routine baseline', firstGhost.weight === 80 && firstGhost.reps === 11);
ok('ghost exposes its reason and source', firstGhost.reason && firstGhost.scope === 'rutina');

const top = session('top', '2026-01-20', 'r1', [{ weight: 80, reps: 12, rir: 2, done: true }]);
const next = predictGhost({ exercise, setIndex: 0, sessions: [top, older], routineId: 'r1', targetSet: target });
ok('reaching top of range suggests a small weight increase', next.weight === 82.5 && next.reps === 8);
const oneKilo = session('one-kilo', '2026-01-21', 'r1', [{ weight: 81, reps: 12, rir: 2, done: true }]);
const learned = predictGhost({ exercise, setIndex: 0, sessions: [oneKilo, top, older],
  routineId: 'r1', targetSet: target });
ok('ghost learns observed weight increments', learned.weight === 82);
const lowRir = session('low', '2026-01-21', 'r1', [{ weight: 80, reps: 12, rir: 0, done: true }]);
const hold = predictGhost({ exercise, setIndex: 0, sessions: [lowRir, older], routineId: 'r1', targetSet: target });
ok('low RIR holds the load', hold.weight === 80 && hold.reps === 12);

const missed = session('missed', '2026-01-22', 'r1', [{ weight: 80, reps: 9, rir: 2, done: true,
  ghost: { weight: 80, reps: 12 } }]);
const adapted = predictGhost({ exercise, setIndex: 0, sessions: [missed, older], routineId: 'r1', targetSet: target });
ok('recent overprediction slows progression', adapted.weight === 80 && adapted.reps === 9);

const withTwoSets = session('two', '2026-01-23', 'r1', [
  { weight: 80, reps: 10, rir: 2, done: true },
  { weight: 80, reps: 10, rir: 2, done: true },
]);
const inDay = predictGhost({ exercise, setIndex: 1, sessions: [withTwoSets], routineId: 'r1',
  targetSet: target, currentEntry: { sets: [
    { weight: 80, reps: 8, done: true, ghost: { weight: 80, reps: 11 } },
  ] } });
ok('earlier set today tempers next ghost', inDay.reps === 10);

const repeated = repeatSession(top, exMap, Date.UTC(2026, 1, 1));
ok('repeat creates a new active session', repeated.id !== top.id && repeated.sourceSessionId === top.id);
ok('repeat keeps the template and resets completion', repeated.entries[0].restSeconds === 90 &&
  repeated.entries[0].sets[0].done === false && repeated.entries[0].sets[0].weight === 80);
ok('repeat does not mutate the old session', top.entries[0].sets[0].done === true);

const finished = session('finished', '2026-02-01', 'r1', [
  { weight: 82.5, reps: 8, done: true }, { weight: 82.5, reps: 8, done: false },
]);
const summary = summarizeSession(finished, [top], exMap);
ok('summary counts completed work only', summary.sets === 1 && summary.volume === 660);
ok('summary includes same-routine comparison', summary.rows[0].before.weight === 80 &&
  summary.rows[0].scope === 'rutina');

const ids = CATALOG_ADDITIONS.map(item => item.id);
const originalSource = fs.readFileSync(new URL('../src/domain/exercises/catalog.js', import.meta.url), 'utf8');
const originalIds = [...originalSource.matchAll(/\{ id: '([^']+)', name:/g)].map(match => match[1]);
ok('new catalogue has at least 70 additions', CATALOG_ADDITIONS.length >= 70);
ok('all catalogue IDs are unique', new Set([...originalIds, ...ids]).size === originalIds.length + ids.length);

console.log(`\n${pass} passed, 0 failed`);
