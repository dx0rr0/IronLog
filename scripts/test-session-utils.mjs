import { completedSets, hasCompletedSet, sessionVolume } from '../src/domain/training/session-utils.js';

let pass = 0;
function ok(name, condition) {
  if (!condition) throw new Error(name);
  console.log('  ✓', name);
  pass++;
}

const session = { entries: [
  { sets: [
    { weight: 80, reps: 8, done: true },
    { weight: 90, reps: 8, done: false },
    { weight: '', reps: '', done: true },
  ] },
  { sets: [{ reps: 12, done: true }] },
] };

ok('only done sets are completed', completedSets(session.entries[0]).length === 2);
ok('volume excludes planned and blank sets', sessionVolume(session) === 640);
ok('session has completed work', hasCompletedSet(session));
ok('planned-only session is unfinished', !hasCompletedSet({ entries: [
  { sets: [{ weight: 90, reps: 8, done: false }] },
] }));
ok('missing entries are safe', sessionVolume({}) === 0 && !hasCompletedSet({}));

console.log(`\n${pass} passed, 0 failed`);
