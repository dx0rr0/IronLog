import assert from 'node:assert/strict';
import { routineDraftFromSession } from '../src/domain/training/routine-from-session.js';

const exMap = {
  press: { id: 'press', type: 'weight_reps' },
  pull: { id: 'pull', type: 'reps' },
  plank: { id: 'plank', type: 'duration' },
  archived: { id: 'archived', type: 'weight_reps', hidden: true },
};
const source = {
  id: 'session-1', name: 'Torso', notes: 'Me dolía el hombro', duration: 1800,
  entries: [
    { exerciseId: 'press', restSeconds: 120, notes: 'Pausa en el pecho', sets: [
      { weight: 80, reps: 10, rir: 2, done: true, ghost: { weight: 82.5 }, personalRecords: ['reps'] },
      { weight: 80, reps: 8, rir: 1, repsMin: 6, repsMax: 10, done: true },
      { weight: 80, reps: 8, done: false },
    ] },
    { exerciseId: 'pull', sets: [{ reps: 5, rir: 0, done: true }] },
    { exerciseId: 'plank', sets: [{ duration: 60, done: true }] },
    { exerciseId: 'archived', sets: [{ weight: 10, reps: 10, done: true }] },
    { exerciseId: 'missing', sets: [{ reps: 10, done: true }] },
    { exerciseId: 'press', sets: [{ weight: 70, reps: 10, done: false }] },
  ],
};
const before = structuredClone(source);
const draft = routineDraftFromSession(source, exMap);

assert.equal(draft.name, 'Torso');
assert.equal(draft.notes, '');
assert.deepEqual(draft.exercises.map(entry => entry.exerciseId), ['press', 'pull', 'plank']);
assert.equal(draft.exercises[0].restSeconds, 120);
assert.equal(draft.exercises[0].notes, 'Pausa en el pecho');
assert.deepEqual(draft.exercises[0].sets, [
  { repsMin: 8, repsMax: 12, rir: 2 },
  { repsMin: 6, repsMax: 10, rir: 1 },
]);
assert.deepEqual(draft.exercises[1].sets, [{ repsMin: 3, repsMax: 7, rir: 0 }]);
assert.deepEqual(draft.exercises[2].sets, [{ repsMin: null, repsMax: null, rir: null }]);
assert.deepEqual(source, before, 'past session is unchanged');
assert.equal(JSON.stringify(draft).includes('weight'), false, 'recorded loads stay in history');
assert.equal(JSON.stringify(draft).includes('done'), false, 'completion state is not a routine target');
assert.deepEqual(routineDraftFromSession(null, exMap), {
  name: 'Entrenamiento', notes: '', exercises: [],
});
console.log('Session-to-routine conversion checks passed');
