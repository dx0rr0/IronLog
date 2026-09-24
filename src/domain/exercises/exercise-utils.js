// ---------------------------------------------------------------
// Pure utility functions for exercise tracking, plate maths, and
// body-weight stats. Kept React-free so they can be unit-tested
// in plain node.
// ---------------------------------------------------------------

// Epley 1RM estimate. Returns 0 if either input is falsy/zero so callers
// can use a simple truthy check.
export const epley = (w, r) => (w && r) ? w * (1 + r / 30) : 0;

// Coerces a value to a number when it looks numeric, otherwise returns ''.
// Used to keep our set-state inputs as either a number or an empty string
// (the controlled-input "blank" sentinel).
export function numOrEmpty(v) {
  return (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)))
    ? ''
    : Number(v);
}

// Shape of a freshly-created set for a given exercise type. Mirrors what
// `defaultSet(ex)` returns in the React side.
export function defaultSetShape(ex) {
  const base = { done: false, repsMin: null, repsMax: null, rir: null };
  if (!ex) return { ...base, weight: '', reps: '' };
  if (ex.type === 'weight_reps') return { ...base, weight: '', reps: '' };
  if (ex.type === 'reps') return { ...base, reps: '' };
  if (ex.type === 'distance_duration') return { ...base, distance: '', duration: 0 };
  if (ex.type === 'duration') return { ...base, duration: 0 };
  return { ...base, weight: '', reps: '' };
}

// Build a new set inheriting weight / reps / distance / duration from a
// previous set, with `done: false`. If `routineTargets` is provided, those
// override the inherited repsMin/repsMax/rir (so routine plans keep their
// own targets while the user gets weight hints from history).
export function inheritSet(ex, prevSet, routineTargets) {
  const base = defaultSetShape(ex);
  const inherit = prevSet || {};
  const out = {
    ...base,
    weight: numOrEmpty(inherit.weight),
    reps: numOrEmpty(inherit.reps),
    distance: numOrEmpty(inherit.distance),
    duration: Number.isFinite(inherit.duration) ? inherit.duration : 0,
    repsMin: inherit.repsMin ?? null,
    repsMax: inherit.repsMax ?? null,
    rir: inherit.rir ?? null,
    done: false,
  };
  if (routineTargets) {
    if (routineTargets.repsMin !== undefined) out.repsMin = routineTargets.repsMin ?? null;
    if (routineTargets.repsMax !== undefined) out.repsMax = routineTargets.repsMax ?? null;
    if (routineTargets.rir !== undefined) out.rir = routineTargets.rir ?? null;
  }
  return out;
}

// Locate the most recent session that contains this exercise. `sessions`
// is expected newest-first (which is how we store and import them).
export function findLastEntryForExercise(exerciseId, sessions) {
  if (!exerciseId || !Array.isArray(sessions)) return null;
  for (const s of sessions) {
    const e = s.entries?.find(x => x.exerciseId === exerciseId);
    if (e && e.sets?.length) return { date: s.date, sets: e.sets };
  }
  return null;
}

// ---------- Plate calculator ----------
export const DEFAULT_PLATE_CONFIG = {
  barWeightKg: 20,
  // pairs = number of *pairs* available. 1 pair = 2 physical plates (one
  // per side of the bar) — the smallest useful unit for symmetric loading.
  plates: [
    { weight: 25,   pairs: 1, enabled: true },
    { weight: 20,   pairs: 3, enabled: true },
    { weight: 15,   pairs: 1, enabled: true },
    { weight: 10,   pairs: 2, enabled: true },
    { weight: 5,    pairs: 2, enabled: true },
    { weight: 2.5,  pairs: 2, enabled: true },
    { weight: 1.25, pairs: 1, enabled: true },
  ],
};

// Greedy plate fit. Returns:
//   - perSide: array of plate weights to put on each side, descending order
//   - remainder: kg still unaccounted for after using available plates
//   - exact: true if remainder is effectively zero (within epsilon)
//   - belowBar: true if target ≤ bar weight (nothing to load)
// Floating-point arithmetic is tricky here (e.g. 22.5 - 1.25 - 1.25 isn't
// exactly 20 in IEEE-754); we use a small epsilon throughout.
export function computePlates(target, config) {
  const bar = Number(config?.barWeightKg);
  const t = Number(target);
  if (!Number.isFinite(t) || t <= 0) {
    return { perSide: [], remainder: 0, exact: true, belowBar: true };
  }
  const barOk = Number.isFinite(bar) && bar > 0;
  if (!barOk) {
    // No bar configured: treat entire weight as needing plates.
    // We still split per side (half / half).
    return computePlatesFromSide(t / 2, config);
  }
  if (t <= bar + 1e-9) {
    return { perSide: [], remainder: 0, exact: Math.abs(t - bar) < 1e-9, belowBar: true };
  }
  const side = (t - bar) / 2;
  return computePlatesFromSide(side, config);
}

function computePlatesFromSide(side, config) {
  const sorted = (config?.plates || [])
    // Treat missing `enabled` as true for back-compat with older configs.
    .filter(p => p && p.pairs > 0 && p.weight > 0 && p.enabled !== false)
    .map(p => ({ weight: Number(p.weight), pairs: Math.floor(Number(p.pairs)) }))
    .sort((a, b) => b.weight - a.weight);
  let remaining = side;
  const used = [];
  for (const p of sorted) {
    if (p.weight > remaining + 1e-9) continue;
    const maxByWeight = Math.floor((remaining + 1e-9) / p.weight);
    const n = Math.min(maxByWeight, p.pairs);
    for (let i = 0; i < n; i++) used.push(p.weight);
    remaining -= n * p.weight;
  }
  // Clamp tiny float drift to zero.
  if (remaining < 1e-9) remaining = 0;
  return { perSide: used, remainder: remaining, exact: remaining === 0, belowBar: false };
}

// Group consecutive equal plates into a compact human-readable string.
// e.g. [20, 20, 10, 5] -> "2×20 + 10 + 5"
export function platesSummary(perSide) {
  if (!perSide || !perSide.length) return '';
  const groups = [];
  for (const w of perSide) {
    const last = groups[groups.length - 1];
    if (last && last.weight === w) last.count++;
    else groups.push({ weight: w, count: 1 });
  }
  const fmt = w => String(w);
  return groups.map(g => g.count === 1 ? fmt(g.weight) : `${g.count}×${fmt(g.weight)}`).join(' + ');
}

// ---------- Body weight stats ----------

// Difference between the latest body weight and the closest entry at least
// `days` days old. Avoid labelling a shorter interval as a 7/30-day change.
export function bodyWeightDelta(bodyWeights, days) {
  if (!Array.isArray(bodyWeights) || bodyWeights.length < 2) return null;
  const current = bodyWeights[0];
  const cutoff = new Date(current.date).getTime() - days * 24 * 3600 * 1000;
  let baseline = null;
  for (let i = 1; i < bodyWeights.length; i++) {
    if (new Date(bodyWeights[i].date).getTime() <= cutoff) {
      baseline = bodyWeights[i];
      break;
    }
  }
  if (!baseline) return null;
  return Number((current.kg - baseline.kg).toFixed(2));
}
