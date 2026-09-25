import { completedSets } from './session-utils.js';

const positiveInteger = value => {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const validRir = value => {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const targetsFromSet = (set, exercise) => {
  if (exercise.type !== 'weight_reps' && exercise.type !== 'reps') {
    return { repsMin: null, repsMax: null, rir: null };
  }

  const reps = positiveInteger(set.reps);
  const plannedMin = positiveInteger(set.repsMin);
  const plannedMax = positiveInteger(set.repsMax);
  const repsMin = plannedMin ?? (reps == null ? null : Math.max(1, reps - 2));
  const repsMax = plannedMax != null && (repsMin == null || plannedMax >= repsMin)
    ? plannedMax
    : (reps == null ? repsMin : Math.max(repsMin ?? 1, reps + 2));

  return { repsMin, repsMax, rir: validRir(set.rir) };
};

// A routine is a reusable plan, not a copy of the session's recorded results.
export const routineDraftFromSession = (session, exMap) => ({
  name: session?.name?.trim() || 'Entrenamiento',
  notes: '',
  exercises: (session?.entries || []).flatMap(entry => {
    const exercise = exMap[entry.exerciseId];
    const sets = completedSets(entry);
    if (!exercise || exercise.hidden || sets.length === 0) return [];
    return [{
      exerciseId: entry.exerciseId,
      restSeconds: entry.restSeconds || 0,
      notes: entry.notes || '',
      sets: sets.map(set => targetsFromSet(set, exercise)),
    }];
  }),
});
