// ---------------------------------------------------------------
// Muscle-group volume analysis.
// Aggregates *completed* sets per muscle group over a time window,
// for the body-map view in Progress.
// ---------------------------------------------------------------

// The 8 primary groups we show on the body silhouette. Order matters
// only insofar as it gives a stable list ordering for UI.
export const PRIMARY_MUSCLE_GROUPS = [
  'pecho', 'espalda', 'hombros', 'pierna',
  'gluteo', 'biceps', 'triceps', 'core',
];

// The three time windows the user can pick.
export const VOLUME_WINDOWS = {
  week_rolling: { label: 'Últimos 7 días',   days: 7  },
  week_iso:     { label: 'Semana en curso',  days: 0  }, // computed differently
  month:        { label: 'Últimas 4 semanas', days: 28 },
};

// Recommended weekly working-set ranges for hypertrophy training, by group.
// Numbers are intentionally rough — these are guidance markers, not absolutes.
// Source: typical MEV/MAV/MRV from hypertrophy literature, simplified.
//   under:  below this, you're undertrained for the week
//   ok:     productive zone
//   over:   above this, likely junk volume / counterproductive
// "core" is special — it's typically trained as accessory work, lower volumes
// are normal and useful.
export const VOLUME_LANDMARKS = {
  pecho:   { under: 8,  ok: [10, 20], over: 22 },
  espalda: { under: 10, ok: [12, 22], over: 25 },
  hombros: { under: 6,  ok: [8,  18], over: 20 },
  pierna:  { under: 8,  ok: [10, 20], over: 22 },
  gluteo:  { under: 6,  ok: [8,  16], over: 18 },
  biceps:  { under: 6,  ok: [8,  16], over: 18 },
  triceps: { under: 6,  ok: [8,  16], over: 18 },
  core:    { under: 0,  ok: [3,  12], over: 16 },
};

// Decide the qualitative bucket for a count vs the group's landmarks.
//   'none'   → 0 sets
//   'low'    → below the under threshold
//   'ok'     → within the ok range (inclusive)
//   'high'   → between ok[1] and over
//   'over'   → at or above over
export function volumeLevel(count, group) {
  if (!count || count <= 0) return 'none';
  const lm = VOLUME_LANDMARKS[group];
  if (!lm) return count > 0 ? 'ok' : 'none';
  if (count >= lm.over) return 'over';
  if (count > lm.ok[1]) return 'high';
  if (count >= lm.ok[0]) return 'ok';
  if (count >= lm.under) return 'low';
  return 'low'; // below under but > 0 is still "low", not "none"
}

// Decide whether a session falls inside the chosen window relative to `now`.
// Returns true/false. `windowKey` is one of VOLUME_WINDOWS keys.
//
// Semantics:
//   week_rolling — session.date >= now - 7 days
//   month        — session.date >= now - 28 days
//   week_iso     — session.date is in the same ISO week as `now`,
//                  treating Monday as the first day of the week (es-ES standard).
export function sessionInWindow(session, windowKey, now = Date.now()) {
  const t = new Date(session.date).getTime();
  if (!Number.isFinite(t)) return false;
  if (windowKey === 'week_rolling') {
    return t >= now - 7 * 24 * 3600 * 1000;
  }
  if (windowKey === 'month') {
    return t >= now - 28 * 24 * 3600 * 1000;
  }
  if (windowKey === 'week_iso') {
    return isSameIsoWeek(t, now);
  }
  return false;
}

// True when both timestamps fall in the same Monday-Sunday window in local time.
export function isSameIsoWeek(aMs, bMs) {
  const a = mondayOf(new Date(aMs));
  const b = mondayOf(new Date(bMs));
  return a.getTime() === b.getTime();
}
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // JS: Sunday = 0, Monday = 1, ... Saturday = 6. We want Monday=0..Sunday=6.
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Main aggregation. Returns:
//   {
//     totalSets: { pecho: 12, espalda: 8, ... }            // numbers per group
//     byExercise: { pecho: [{ exerciseId, name, sets }, ...] }   // drill-down
//     sessionCount: N
//   }
//
// Counts only sets where `s.done === true`. `exMap` is a lookup of
// id → exercise so we can find the muscleGroup and display name.
export function computeVolumeBreakdown(sessions, exMap, windowKey, now = Date.now()) {
  const totalSets = {};
  const byExerciseMap = {};
  PRIMARY_MUSCLE_GROUPS.forEach(g => {
    totalSets[g] = 0;
    byExerciseMap[g] = new Map();
  });
  let sessionCount = 0;
  for (const ses of sessions || []) {
    if (!sessionInWindow(ses, windowKey, now)) continue;
    if (!ses.entries?.length) continue;
    let sessionContributed = false;
    for (const entry of ses.entries) {
      const ex = exMap[entry.exerciseId];
      if (!ex) continue;
      const group = ex.muscleGroup;
      if (!PRIMARY_MUSCLE_GROUPS.includes(group)) continue;
      const doneSets = (entry.sets || []).filter(s => s.done === true);
      if (doneSets.length === 0) continue;
      totalSets[group] += doneSets.length;
      // Tag each set with the session date so the UI can group them.
      const taggedSets = doneSets.map(s => ({
        date: ses.date,
        sessionId: ses.id,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        distance: s.distance,
        duration: s.duration,
      }));
      const prev = byExerciseMap[group].get(entry.exerciseId);
      if (prev) {
        prev.sets += doneSets.length;
        prev.setDetails.push(...taggedSets);
      } else {
        byExerciseMap[group].set(entry.exerciseId, {
          exerciseId: entry.exerciseId,
          name: ex.name,
          type: ex.type,
          sets: doneSets.length,
          setDetails: taggedSets,
        });
      }
      sessionContributed = true;
    }
    if (sessionContributed) sessionCount++;
  }
  // Convert maps to arrays, sorted by total sets desc. Within each
  // exercise, sort setDetails newest-first (matches the rest of the app).
  const byExercise = {};
  for (const g of PRIMARY_MUSCLE_GROUPS) {
    byExercise[g] = [...byExerciseMap[g].values()]
      .map(e => ({
        ...e,
        setDetails: e.setDetails.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
      }))
      .sort((a, b) => b.sets - a.sets);
  }
  return { totalSets, byExercise, sessionCount };
}
