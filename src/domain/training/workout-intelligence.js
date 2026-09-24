import { inheritSet } from '../exercises/exercise-utils.js';
import { completedSets, sessionVolume } from './session-utils.js';

const positive = value => Number.isFinite(Number(value)) && Number(value) > 0
  ? Number(value) : null;
const finite = value => value !== '' && value !== null && value !== undefined &&
  Number.isFinite(Number(value)) ? Number(value) : null;

export function exerciseComparisons(sessions, exerciseId, routineId) {
  const all = (sessions || [])
    .map(session => ({ session, entry: session.entries?.find(e => e.exerciseId === exerciseId) }))
    .filter(item => item.entry && completedSets(item.entry).length)
    .sort((a, b) => new Date(b.session.date) - new Date(a.session.date));
  const routine = routineId ? all.find(item => item.session.routineId === routineId) || null : null;
  return { routine, general: all[0] || null, preferred: routine || all[0] || null,
    scope: routine ? 'rutina' : 'general' };
}

function matchingSet(entry, setIndex) {
  const sets = entry?.sets || [];
  return sets[setIndex]?.done === true ? sets[setIndex]
    : [...sets].reverse().find(set => set.done === true) || null;
}

function weightStep(equipment) {
  if (/mancuern/i.test(equipment || '')) return 1;
  if (/barra/i.test(equipment || '')) return 2.5;
  return 2.5;
}

function learnedWeightStep(items, setIndex, equipment) {
  const weights = [...new Set(items.slice(0, 8)
    .map(item => positive(matchingSet(item.entry, setIndex)?.weight))
    .filter(Boolean))].sort((a, b) => a - b);
  const observed = weights.slice(1).map((value, index) => Number((value - weights[index]).toFixed(2)))
    .filter(step => step >= 0.5 && step <= 10);
  return observed.length ? Math.min(...observed) : weightStep(equipment);
}

function recentFeedback(items, setIndex, weight) {
  const errors = [];
  for (const item of items) {
    const set = matchingSet(item.entry, setIndex);
    if (!set?.ghost || finite(set.ghost.reps) === null || finite(set.reps) === null) continue;
    if (weight !== null && Math.abs((finite(set.weight) ?? 0) -
      (finite(set.ghost.weight) ?? 0)) > 0.01) continue;
    errors.push(Number(set.reps) - Number(set.ghost.reps));
    if (errors.length === 3) break;
  }
  return errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null;
}

// A conservative, inspectable proposal. It uses completed sets only, prefers
// the same routine, and corrects its pace when previous ghosts were too high.
export function predictGhost({ exercise, setIndex, sessions, routineId, targetSet = {}, currentEntry }) {
  if (!exercise || !['weight_reps', 'reps'].includes(exercise.type)) return null;
  const comparisons = exerciseComparisons(sessions, exercise.id, routineId);
  const all = (sessions || [])
    .map(session => ({ session, entry: session.entries?.find(e => e.exerciseId === exercise.id) }))
    .filter(item => item.entry && completedSets(item.entry).length)
    .sort((a, b) => new Date(b.session.date) - new Date(a.session.date));
  const preferred = comparisons.routine
    ? all.filter(item => item.session.routineId === routineId) : all;
  const reference = preferred[0];
  const last = matchingSet(reference?.entry, setIndex);
  if (!last) return null;

  const lastReps = positive(last.reps);
  const lastWeight = exercise.type === 'weight_reps' ? positive(last.weight) : null;
  if (!lastReps || (exercise.type === 'weight_reps' && !lastWeight)) return null;
  const min = positive(targetSet.repsMin);
  const max = positive(targetSet.repsMax);
  const targetRir = finite(targetSet.rir) ?? finite(last.rir);
  const lastRir = finite(last.rir);
  const rirAllowsProgress = targetRir === null || lastRir === null || lastRir >= targetRir;
  const feedback = recentFeedback(preferred, setIndex, lastWeight);
  const paceAllowsProgress = feedback === null || feedback >= -0.5;
  let weight = lastWeight;
  let reps = lastReps;
  let reason = 'Repite la última serie y ajusta según el resultado real.';

  if (rirAllowsProgress && paceAllowsProgress && max && lastReps >= max &&
      exercise.type === 'weight_reps') {
    weight = Number((lastWeight + learnedWeightStep(preferred, setIndex, exercise.equipment)).toFixed(2));
    reps = min || max;
    reason = 'Alcanzaste el tope de repeticiones con el RIR previsto; prueba el siguiente peso.';
  } else if (rirAllowsProgress && paceAllowsProgress &&
      (!max || lastReps < max) && (!min || lastReps >= min)) {
    reps = Math.min(max || 30, lastReps + 1);
    reason = 'Propongo una repetición más con la misma carga.';
  } else if (!paceAllowsProgress) {
    reason = 'Las últimas propuestas quedaron altas; repetimos el resultado real.';
  } else if (!rirAllowsProgress) {
    reason = 'El RIR quedó por debajo del previsto; consolidamos la carga.';
  }

  // Feedback from earlier sets in this workout can temper the next proposal.
  const earlier = (currentEntry?.sets || []).slice(0, setIndex).filter(set =>
    set.done === true && set.ghost && finite(set.reps) !== null &&
    finite(set.ghost.reps) !== null &&
    (exercise.type !== 'weight_reps' ||
      Math.abs((finite(set.weight) ?? 0) - (finite(set.ghost.weight) ?? 0)) < 0.01));
  if (earlier.length) {
    const prior = earlier[earlier.length - 1];
    const miss = Number(prior.reps) - Number(prior.ghost.reps);
    if (miss <= -2) {
      reps = Math.max(1, reps - 1);
      reason += ' Ajustado a la serie anterior de hoy.';
    } else if (miss >= 2 && (!max || reps < max)) {
      reps = Math.min(max || 30, reps + 1);
      reason += ' Ajustado a la serie anterior de hoy.';
    }
  }

  return { version: 1, weight, reps, rir: targetRir, reason,
    scope: comparisons.scope, referenceSessionId: reference.session.id,
    referenceDate: reference.session.date };
}

export function repeatSession(source, exMap, now = Date.now()) {
  return {
    id: `ses_${now}`,
    date: new Date(now).toISOString(),
    startedAt: now,
    name: source.name || 'Entrenamiento',
    notes: '',
    routineId: source.routineId || null,
    sourceSessionId: source.id,
    entries: (source.entries || []).filter(entry => exMap[entry.exerciseId]).map(entry => ({
      exerciseId: entry.exerciseId,
      restSeconds: entry.restSeconds || 0,
      notes: entry.notes || '',
      sets: (entry.sets || []).map(set => inheritSet(exMap[entry.exerciseId], set, null)),
    })),
  };
}

export function summarizeSession(session, previousSessions, exMap) {
  const rows = (session.entries || []).map((entry, entryIndex) => {
    const actual = completedSets(entry);
    if (!actual.length) return null;
    const previous = exerciseComparisons(previousSessions, entry.exerciseId, session.routineId).preferred;
    const before = matchingSet(previous?.entry, 0);
    return {
      exerciseId: entry.exerciseId,
      entryIndex,
      name: exMap[entry.exerciseId]?.name || entry.exerciseId,
      sets: actual.length,
      first: actual[0],
      before,
      scope: previous ? (previous.session.routineId === session.routineId && session.routineId
        ? 'rutina' : 'general') : null,
    };
  }).filter(Boolean);
  return { sets: rows.reduce((sum, row) => sum + row.sets, 0),
    exercises: rows.length, volume: sessionVolume(session), rows };
}
