import { epley } from '../exercises/exercise-utils.js';

const positive = value => value !== '' && value !== null && value !== undefined &&
  Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const greater = (value, previous) => value > previous + 0.001;

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
  if (!prior.length) return [];

  if (exercise.type === 'weight_reps') {
    const weight = positive(set.weight);
    const reps = positive(set.reps);
    const valid = prior.map(item => ({ weight: positive(item.weight), reps: positive(item.reps) }))
      .filter(item => item.weight && item.reps);
    if (!weight || !reps || !valid.length) return [];
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
    return reps && previous.length && greater(reps, Math.max(...previous))
      ? [{ kind: 'reps', label: 'Más repeticiones', detail: `${reps} reps` }] : [];
  }
  if (exercise.type === 'duration') {
    const duration = positive(set.duration);
    const previous = prior.map(item => positive(item.duration)).filter(Boolean);
    return duration && previous.length && greater(duration, Math.max(...previous))
      ? [{ kind: 'duration', label: 'Mayor duración', detail: `${duration} s` }] : [];
  }
  if (exercise.type === 'distance_duration') {
    const distance = positive(set.distance);
    const previous = prior.map(item => positive(item.distance)).filter(Boolean);
    return distance && previous.length && greater(distance, Math.max(...previous))
      ? [{ kind: 'distance', label: 'Mayor distancia', detail: `${distance} ${exercise.distanceUnit || 'km'}` }] : [];
  }
  return [];
}
