// Only completed sets contribute to training totals. Planned/autofilled
// values can exist on an unfinished set and must not count as work done.
export const completedSets = entry => (entry?.sets || []).filter(set => set.done === true);

export const hasCompletedSet = session =>
  (session?.entries || []).some(entry => completedSets(entry).length > 0);

export const sessionVolume = session => (session?.entries || []).reduce(
  (total, entry) => total + completedSets(entry).reduce((sum, set) => {
    const weight = Number(set.weight);
    const reps = Number(set.reps);
    return sum + (Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps > 0
      ? weight * reps : 0);
  }, 0),
  0,
);
