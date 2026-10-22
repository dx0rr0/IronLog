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

// Swap an entry's exercise in place: keep its position, superset, rest and
// set count/targets; values come from the new exercise's own history.
export function swapEntryExercise(entry, ex, sessions) {
  const last = findLastEntryForExercise(ex.id, sessions);
  const count = Math.max(1, entry.sets?.length || 0);
  const sets = Array.from({ length: count }, (_, i) => {
    const current = entry.sets?.[i] || {};
    const prev = last?.sets?.[i]?.done ? last.sets[i] : null;
    return inheritSet(ex, prev, { repsMin: current.repsMin ?? null, repsMax: current.repsMax ?? null,
      ...(current.rir != null ? { rir: current.rir } : {}) });
  });
  return { ...entry, exerciseId: ex.id, notes: '', sets };
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
  // A typical gym has no 25s and plenty of everything else: 10 pairs is
  // effectively unlimited for any lift.
  plates: [20, 15, 10, 5, 2.5, 1.25].map(weight => ({ weight, pairs: 10, enabled: true })),
};

// Defaults shipped before 1.10 (one pair of 25s, scarce everything else).
const LEGACY_DEFAULT_PLATES = [[25, 1], [20, 3], [15, 1], [10, 2], [5, 2], [2.5, 2], [1.25, 1]];

// Normalizes a stored plate config. A config still identical to the old
// defaults was never customised, so it moves to the current defaults.
export function upgradePlateConfig(config) {
  if (!config || typeof config !== 'object') return DEFAULT_PLATE_CONFIG;
  const plates = Array.isArray(config.plates) && config.plates.length ? config.plates : DEFAULT_PLATE_CONFIG.plates;
  const untouched = plates.length === LEGACY_DEFAULT_PLATES.length && plates.every((p, i) =>
    p.weight === LEGACY_DEFAULT_PLATES[i][0] && p.pairs === LEGACY_DEFAULT_PLATES[i][1] && p.enabled !== false);
  return {
    barWeightKg: Number.isFinite(config.barWeightKg) ? config.barWeightKg : DEFAULT_PLATE_CONFIG.barWeightKg,
    plates: untouched ? DEFAULT_PLATE_CONFIG.plates : plates,
  };
}

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

// A body-weight entry needs a parseable date and a numeric weight.
export const isValidBodyWeight = b => !!b && Number.isFinite(new Date(b.date).getTime()) && Number.isFinite(Number(b.kg));

// Body-weight entries from the last `days` days up to `now` (days = null:
// all), oldest first, ready to chart.
export function bodyWeightSeries(bodyWeights, days = null, now = Date.now()) {
  if (!Array.isArray(bodyWeights) || !bodyWeights.length) return [];
  const sorted = bodyWeights
    .filter(isValidBodyWeight)
    .map(b => ({ date: b.date, kg: Number(b.kg) }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!days) return sorted;
  const cutoff = now - days * 24 * 3600 * 1000;
  return sorted.filter(b => new Date(b.date).getTime() >= cutoff);
}

// Start, current, change and range of a series from bodyWeightSeries.
export function bodyWeightSummary(series) {
  if (!series?.length) return null;
  const kgs = series.map(b => b.kg);
  const first = series[0];
  const last = series[series.length - 1];
  return {
    first,
    last,
    change: Number((last.kg - first.kg).toFixed(2)),
    min: Math.min(...kgs),
    max: Math.max(...kgs),
    count: series.length,
  };
}
