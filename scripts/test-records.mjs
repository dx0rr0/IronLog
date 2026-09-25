import { detectSetRecords } from '../src/domain/training/records.js';

let count = 0;
const ok = (name, condition) => {
  if (!condition) throw new Error(name);
  count++;
  console.log('  ✓', name);
};
const exercise = { id: 'press_banca', type: 'weight_reps' };
const prior = [{ entries: [{ exerciseId: exercise.id, sets: [
  { weight: 80, reps: 8, done: true }, { weight: 80, reps: 10, done: true },
  { weight: 90, reps: 6, done: true }, { weight: 120, reps: 1, done: false },
] }] }];
const kinds = set => detectSetRecords({ exercise, set: { ...set, done: true }, previousSessions: prior })
  .map(record => record.kind);
ok('new load is a weight record', kinds({ weight: 92.5, reps: 5 }).includes('weight'));
ok('more reps at the same load is a record', kinds({ weight: 80, reps: 11 }).includes('repsAtWeight'));
ok('estimated 1RM record is separate from max load', kinds({ weight: 80, reps: 11 }).includes('estimated1RM'));
ok('a tie is not a record', kinds({ weight: 90, reps: 6 }).length === 0);
ok('unfinished sets are ignored as historical baselines', kinds({ weight: 110, reps: 2 }).includes('weight'));
ok('first ever set establishes a baseline without an alert', detectSetRecords({ exercise,
  set: { weight: 80, reps: 8, done: true } }).length === 0);
ok('invalid actual values do not create records', kinds({ weight: '', reps: 15 }).length === 0);
const withinWorkout = detectSetRecords({ exercise, set: { weight: 80, reps: 9, done: true },
  currentSession: { entries: [{ exerciseId: exercise.id, sets: [
    { weight: 80, reps: 8, done: true }, { weight: 80, reps: 9, done: false },
  ] }] }, entryIndex: 0, setIndex: 1 });
ok('earlier sets today count as the baseline', withinWorkout.some(record => record.kind === 'repsAtWeight'));
ok('bodyweight repetition record is supported', detectSetRecords({
  exercise: { id: 'dominadas', type: 'reps' }, set: { reps: 10, done: true },
  previousSessions: [{ entries: [{ exerciseId: 'dominadas', sets: [{ reps: 8, done: true }] }] }],
}).some(record => record.kind === 'reps'));
ok('duration record is supported', detectSetRecords({
  exercise: { id: 'plancha', type: 'duration' }, set: { duration: 100, done: true },
  previousSessions: [{ entries: [{ exerciseId: 'plancha', sets: [{ duration: 90, done: true }] }] }],
}).some(record => record.kind === 'duration'));

console.log(`\n${count} record checks passed`);
