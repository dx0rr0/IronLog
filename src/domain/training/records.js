import { epley } from '../exercises/exercise-utils.js';

const positive = value => value !== '' && value !== null && value !== undefined &&
  Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const greater = (value, previous) => value > previous + 0.001;

// Session progress is independent of an all-time record. Compare the same
// ordinal set only; a higher strength estimate is labelled as an estimate.
export function setProgress(set, previous, type) {
  if (!set?.done || !previous?.done) return null;
  if (type === 'weight_reps') {
    const weight = positive(set.weight), reps = positive(set.reps);
    const oldWeight = positive(previous.weight), oldReps = positive(previous.reps);
    if (!weight || !reps || !oldWeight || !oldReps) return null;
    if (Math.abs(weight - oldWeight) < 0.001) {
      return greater(reps, oldReps) ? `+${reps - oldReps} reps con el mismo peso` : null;
    }
    const before = epley(oldWeight, oldReps), after = epley(weight, reps);
    return greater(after, before)
      ? `1RM estimado +${Math.round((after / before - 1) * 1000) / 10}%` : null;
  }
  const field = type === 'reps' ? 'reps' : type === 'duration' ? 'duration'
    : type === 'distance_duration' ? 'distance' : null;
  const value = field && positive(set[field]), before = field && positive(previous[field]);
  if (!value || !before || !greater(value, before)) return null;
  return type === 'reps' ? `+${value - before} reps` : type === 'duration'
    ? `+${value - before} s` : 'Mayor distancia';
}

export function detectSetRecords({ exercise, set, previousSessions = [], currentSession = null,
  entryIndex = -1, setIndex = -1 }) {
  if (!exercise || !set?.done) return [];
  const prior = [];
  for (const session of previousSessions) {
    for (const entry of session.entries || []) {
      if (entry.exerciseId === exercise.id) prior.push(...(entry.sets || []).filter(item => item.done));
    }
  }
  for (const [ei, entry] of (currentSession?.entries || []).entries()) {
    if (entry.exerciseId !== exercise.id) continue;
    for (const [si, item] of (entry.sets || []).entries()) {
      if ((ei !== entryIndex || si !== setIndex) && item.done) prior.push(item);
    }
  }
  if (exercise.type === 'weight_reps') {
    const weight = positive(set.weight);
    const reps = positive(set.reps);
    const valid = prior.map(item => ({ weight: positive(item.weight), reps: positive(item.reps) }))
      .filter(item => item.weight && item.reps);
    if (!weight || !reps) return [];
    if (!valid.length) return [{ kind: 'first', label: 'Primera marca', detail: `${weight} kg × ${reps} reps` }];
    const records = [];
    const maxWeight = Math.max(...valid.map(item => item.weight));
    if (greater(weight, maxWeight)) records.push({ kind: 'weight', label: 'Mayor peso', detail: `${weight} kg` });
    const sameWeight = valid.filter(item => Math.abs(item.weight - weight) < 0.001);
    if (sameWeight.length && greater(reps, Math.max(...sameWeight.map(item => item.reps)))) {
      records.push({ kind: 'repsAtWeight', label: 'Más reps con este peso', detail: `${reps} reps a ${weight} kg` });
    }
    const oneRm = epley(weight, reps);
    if (greater(oneRm, Math.max(...valid.map(item => epley(item.weight, item.reps))))) {
      records.push({ kind: 'estimated1RM', label: '1RM estimado', detail: `${Math.round(oneRm * 10) / 10} kg` });
    }
    return records;
  }
  if (exercise.type === 'reps') {
    const reps = positive(set.reps);
    const previous = prior.map(item => positive(item.reps)).filter(Boolean);
    if (reps && !previous.length) return [{ kind: 'first', label: 'Primera marca', detail: `${reps} reps` }];
    return reps && previous.length && greater(reps, Math.max(...previous))
      ? [{ kind: 'reps', label: 'Más repeticiones', detail: `${reps} reps` }] : [];
  }
  if (exercise.type === 'duration') {
    const duration = positive(set.duration);
    const previous = prior.map(item => positive(item.duration)).filter(Boolean);
    if (duration && !previous.length) return [{ kind: 'first', label: 'Primera marca', detail: `${duration} s` }];
    return duration && previous.length && greater(duration, Math.max(...previous))
      ? [{ kind: 'duration', label: 'Mayor duración', detail: `${duration} s` }] : [];
  }
  if (exercise.type === 'distance_duration') {
    const distance = positive(set.distance);
    const previous = prior.map(item => positive(item.distance)).filter(Boolean);
    if (distance && !previous.length) return [{ kind: 'first', label: 'Primera marca', detail: `${distance} ${exercise.distanceUnit || 'km'}` }];
    return distance && previous.length && greater(distance, Math.max(...previous))
      ? [{ kind: 'distance', label: 'Mayor distancia', detail: `${distance} ${exercise.distanceUnit || 'km'}` }] : [];
  }
  return [];
}
