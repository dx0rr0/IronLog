// Stable IDs preserve references from routines and sessions. Archive is a
// versioned edit, rather than a deletion that an older tab could resurrect.
export function mergeCustomExercises(...collections) {
  const byId = new Map();
  for (const collection of collections) {
    if (collection == null) continue;
    if (!Array.isArray(collection)) throw new Error('Invalid custom exercise collection');
    for (const exercise of collection) {
      if (!exercise || typeof exercise.id !== 'string' || !exercise.id) {
        throw new Error('Custom exercise has no stable ID');
      }
      const previous = byId.get(exercise.id);
      const stamp = Number(exercise.updatedAt) || 0;
      const previousStamp = Number(previous?.updatedAt) || 0;
      if (!previous || stamp > previousStamp ||
          (stamp === previousStamp && exercise.hidden && !previous.hidden)) {
        byId.set(exercise.id, { ...exercise });
      }
    }
  }
  return [...byId.values()];
}
