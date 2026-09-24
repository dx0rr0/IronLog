// Unit tests for the new feature logic (autofill, plate calc, body-weight stats).
// Pure functions only — no React, no DOM, no storage.
// Run with: node scripts/test-exercise-utils.mjs

import {
  epley,
  numOrEmpty,
  defaultSetShape,
  inheritSet,
  findLastEntryForExercise,
  computePlates,
  platesSummary,
  bodyWeightDelta,
  DEFAULT_PLATE_CONFIG,
} from '../src/domain/exercises/exercise-utils.js';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : ''); fail++; }
}
function approx(a, b, eps = 1e-6) { return Math.abs(a - b) < eps; }
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// ============================================================
// epley
// ============================================================
console.log('\nepley (1RM estimate)');
ok('basic case 80×8 ≈ 101.33', approx(epley(80, 8), 80 * (1 + 8 / 30)));
ok('1 rep returns the weight itself', approx(epley(100, 1), 100 * (1 + 1 / 30)));
ok('0 weight returns 0', epley(0, 8) === 0);
ok('0 reps returns 0', epley(80, 0) === 0);
ok('null weight returns 0', epley(null, 8) === 0);
ok('null reps returns 0', epley(80, null) === 0);
ok('empty string weight returns 0', epley('', 8) === 0);

// ============================================================
// numOrEmpty
// ============================================================
console.log('\nnumOrEmpty');
ok('"" stays ""', numOrEmpty('') === '');
ok('null becomes ""', numOrEmpty(null) === '');
ok('undefined becomes ""', numOrEmpty(undefined) === '');
ok('NaN becomes ""', numOrEmpty(NaN) === '');
ok('"abc" becomes ""', numOrEmpty('abc') === '');
ok('number 42 stays 42', numOrEmpty(42) === 42);
ok('number 0 stays 0 (zero is valid)', numOrEmpty(0) === 0);
ok('number -5 stays -5', numOrEmpty(-5) === -5);
ok('numeric string "12" becomes 12', numOrEmpty('12') === 12);
ok('numeric string "12.5" becomes 12.5', numOrEmpty('12.5') === 12.5);

// ============================================================
// defaultSetShape
// ============================================================
console.log('\ndefaultSetShape');
const exWR = { type: 'weight_reps' };
const exReps = { type: 'reps' };
const exDD = { type: 'distance_duration' };
const exDur = { type: 'duration' };
ok('weight_reps has weight and reps', eq(defaultSetShape(exWR), { done: false, repsMin: null, repsMax: null, rir: null, weight: '', reps: '' }));
ok('reps has only reps', eq(defaultSetShape(exReps), { done: false, repsMin: null, repsMax: null, rir: null, reps: '' }));
ok('distance_duration has distance + duration', eq(defaultSetShape(exDD), { done: false, repsMin: null, repsMax: null, rir: null, distance: '', duration: 0 }));
ok('duration has only duration', eq(defaultSetShape(exDur), { done: false, repsMin: null, repsMax: null, rir: null, duration: 0 }));
ok('null exercise defaults to weight_reps shape', eq(defaultSetShape(null), { done: false, repsMin: null, repsMax: null, rir: null, weight: '', reps: '' }));

// ============================================================
// inheritSet
// ============================================================
console.log('\ninheritSet');
{
  const prev = { weight: 80, reps: 8, done: true, repsMin: 6, repsMax: 10, rir: 1 };
  const got = inheritSet(exWR, prev, null);
  ok('copies weight from previous', got.weight === 80);
  ok('copies reps from previous', got.reps === 8);
  ok('always resets done to false', got.done === false);
  ok('preserves repsMin/Max/RIR from previous when no routine targets', got.repsMin === 6 && got.repsMax === 10 && got.rir === 1);
}
{
  // Routine targets must override even if previous had different targets.
  const prev = { weight: 80, reps: 8, repsMin: 6, repsMax: 10, rir: 1 };
  const targets = { repsMin: 8, repsMax: 12, rir: 2 };
  const got = inheritSet(exWR, prev, targets);
  ok('routine repsMin overrides previous', got.repsMin === 8);
  ok('routine repsMax overrides previous', got.repsMax === 12);
  ok('routine rir overrides previous', got.rir === 2);
  ok('weight still inherited from previous', got.weight === 80);
  ok('reps still inherited from previous', got.reps === 8);
}
{
  // No previous set, just routine targets.
  const got = inheritSet(exWR, null, { repsMin: 8, repsMax: 12, rir: 2 });
  ok('no previous: weight stays empty', got.weight === '');
  ok('no previous: reps stays empty', got.reps === '');
  ok('no previous: routine targets applied', got.repsMin === 8 && got.repsMax === 12 && got.rir === 2);
}
{
  // Routine targets that explicitly set null should override too.
  const prev = { weight: 80, reps: 8, repsMin: 6, repsMax: 10, rir: 1 };
  const got = inheritSet(exWR, prev, { repsMin: null, repsMax: null, rir: null });
  ok('routine null targets clear previous targets', got.repsMin === null && got.repsMax === null && got.rir === null);
}
{
  // Distance/duration exercise — should copy distance and duration.
  const prev = { distance: 5.2, duration: 1800 };
  const got = inheritSet(exDD, prev, null);
  ok('distance_duration: copies distance', got.distance === 5.2);
  ok('distance_duration: copies duration', got.duration === 1800);
}
{
  // Invalid numeric values are coerced to '' (weight) or 0 (duration).
  const prev = { weight: NaN, reps: 'abc', duration: 'oops' };
  const got = inheritSet(exWR, prev, null);
  ok('NaN weight becomes ""', got.weight === '');
  ok('non-numeric reps becomes ""', got.reps === '');
}
{
  // Duration field: non-finite becomes 0.
  const prev = { duration: undefined };
  const got = inheritSet(exDur, prev, null);
  ok('undefined duration becomes 0', got.duration === 0);
}

// ============================================================
// findLastEntryForExercise
// ============================================================
console.log('\nfindLastEntryForExercise');
{
  const sessions = [
    { id: 's1', date: '2025-05-10', entries: [{ exerciseId: 'press', sets: [{ weight: 80, reps: 8 }] }] },
    { id: 's2', date: '2025-05-08', entries: [{ exerciseId: 'press', sets: [{ weight: 75, reps: 8 }] }] },
    { id: 's3', date: '2025-05-05', entries: [{ exerciseId: 'sentadilla', sets: [{ weight: 100, reps: 5 }] }] },
  ];
  ok('finds newest entry first (by array order)', findLastEntryForExercise('press', sessions).date === '2025-05-10');
  ok('finds entry in older session if newest does not have it', findLastEntryForExercise('sentadilla', sessions).date === '2025-05-05');
  ok('returns null for unknown exercise', findLastEntryForExercise('nope', sessions) === null);
  ok('returns null for null id', findLastEntryForExercise(null, sessions) === null);
  ok('returns null for non-array sessions', findLastEntryForExercise('press', null) === null);
  ok('returns null for empty sessions', findLastEntryForExercise('press', []) === null);
}
{
  // Skips entries with no sets.
  const sessions = [
    { id: 's1', date: '2025-05-10', entries: [{ exerciseId: 'press', sets: [] }] },
    { id: 's2', date: '2025-05-08', entries: [{ exerciseId: 'press', sets: [{ weight: 75, reps: 8 }] }] },
  ];
  ok('skips entries with empty sets array', findLastEntryForExercise('press', sessions).date === '2025-05-08');
}
{
  // Handles malformed session entries gracefully.
  const sessions = [
    { id: 's1' }, // no entries field
    { id: 's2', entries: null },
    { id: 's3', date: '2025-05-08', entries: [{ exerciseId: 'press', sets: [{ weight: 75, reps: 8 }] }] },
  ];
  ok('tolerates missing/null entries field', findLastEntryForExercise('press', sessions).date === '2025-05-08');
}

// ============================================================
// computePlates — DEFAULT CONFIG
// ============================================================
console.log('\ncomputePlates (with default config)');
{
  const cfg = DEFAULT_PLATE_CONFIG;
  // 60 = bar 20 + 20 each side = 1 plate of 20kg per side
  let r = computePlates(60, cfg);
  ok('60kg → 20 per side, exact', r.exact && eq(r.perSide, [20]) && !r.belowBar);
  // 80 = bar 20 + 30 each side. Greedy: 25 (1 pair available) + 5 = 30 ✓
  r = computePlates(80, cfg);
  ok('80kg → 25+5 per side, exact (greedy uses largest plate first)', r.exact && eq(r.perSide, [25, 5]), r);
  // 100 = bar 20 + 40 each side. Greedy: 25 + 15 = 40 ✓
  r = computePlates(100, cfg);
  ok('100kg → 25+15 per side, exact', r.exact && eq(r.perSide, [25, 15]), r);
  // 102.5 = bar 20 + 41.25 each side. Greedy: 25 + 15 + 1.25 = 41.25 ✓
  r = computePlates(102.5, cfg);
  ok('102.5kg → 25+15+1.25 per side, exact', r.exact && eq(r.perSide, [25, 15, 1.25]), r);
  // 22.5 = bar + 1.25 each side
  r = computePlates(22.5, cfg);
  ok('22.5kg → 1.25 per side, exact', r.exact && eq(r.perSide, [1.25]));
  // Also test a config WITHOUT a 25kg pair (more typical home gym), where 20+10 IS the answer.
  const homeCfg = {
    barWeightKg: 20,
    plates: [
      { weight: 20, pairs: 3 },
      { weight: 10, pairs: 2 },
      { weight: 5, pairs: 2 },
      { weight: 2.5, pairs: 2 },
      { weight: 1.25, pairs: 1 },
    ],
  };
  r = computePlates(80, homeCfg);
  ok('80kg with home config → 20+10 per side, exact', r.exact && eq(r.perSide, [20, 10]), r);
  r = computePlates(100, homeCfg);
  ok('100kg with home config → 20+20 per side, exact', r.exact && eq(r.perSide, [20, 20]), r);
}

// Below-bar cases
console.log('\ncomputePlates: below-bar edge cases');
{
  const cfg = DEFAULT_PLATE_CONFIG;
  let r = computePlates(20, cfg);
  ok('exact bar (20kg) → belowBar + exact + no plates', r.belowBar && r.exact && r.perSide.length === 0);
  r = computePlates(15, cfg);
  ok('less than bar (15kg) → belowBar + !exact', r.belowBar && !r.exact);
  r = computePlates(0, cfg);
  ok('0kg → belowBar, exact, empty', r.belowBar && r.exact && r.perSide.length === 0);
  r = computePlates(-10, cfg);
  ok('negative kg → belowBar', r.belowBar);
}

// Float precision
console.log('\ncomputePlates: float precision');
{
  const cfg = DEFAULT_PLATE_CONFIG;
  // 22.5 - 20 = 2.5, /2 = 1.25 per side. Edge that historically miscounts.
  let r = computePlates(22.5, cfg);
  ok('22.5kg is exact (no phantom remainder)', r.exact, r);
  // 47.5 = 20 + 27.5, /2 = 13.75 per side = 10 + 2.5 + 1.25
  r = computePlates(47.5, cfg);
  ok('47.5kg → 10+2.5+1.25 per side, exact', r.exact && eq(r.perSide, [10, 2.5, 1.25]), r);
  // Tricky: 20 + 3*1.25 doesn't divide evenly per side when there's a single pair.
  r = computePlates(22.5, cfg);
  ok('22.5kg uses 1 pair of 1.25', r.perSide.length === 1);
}

// Inexact (insufficient plates)
console.log('\ncomputePlates: insufficient plates');
{
  // Only the bar and one tiny plate pair.
  const cfg = { barWeightKg: 20, plates: [{ weight: 5, pairs: 1 }] };
  let r = computePlates(50, cfg);
  // Want 15 per side; only have 1×5 per side.
  ok('insufficient plates: !exact', !r.exact);
  ok('insufficient plates: remainder is 10 (15 - 5)', approx(r.remainder, 10), r);
  ok('insufficient plates: used 5', eq(r.perSide, [5]));
}
{
  // No plates at all.
  const cfg = { barWeightKg: 20, plates: [] };
  let r = computePlates(40, cfg);
  ok('no plates: empty perSide and remainder=10', !r.exact && r.perSide.length === 0 && approx(r.remainder, 10));
}
{
  // Asking for exactly 1 plate but pairs=0 (means we have it listed but no inventory).
  const cfg = { barWeightKg: 20, plates: [{ weight: 5, pairs: 0 }] };
  let r = computePlates(30, cfg);
  ok('pairs=0 is filtered out', r.perSide.length === 0);
}

// Pair limits respected
console.log('\ncomputePlates: pair limits');
{
  // Need 4 plates of 20 per side but only 2 pairs available.
  const cfg = { barWeightKg: 20, plates: [{ weight: 20, pairs: 2 }] };
  let r = computePlates(180, cfg); // wants 80 per side
  ok('respects pair count limit', r.perSide.filter(w => w === 20).length === 2);
  ok('remainder reflects shortage', approx(r.remainder, 40)); // 80 - 2×20
}

// Garbage input
console.log('\ncomputePlates: garbage input');
{
  let r = computePlates('not a number', DEFAULT_PLATE_CONFIG);
  ok('non-numeric target → belowBar (defensive)', r.belowBar);
  r = computePlates(NaN, DEFAULT_PLATE_CONFIG);
  ok('NaN target → belowBar', r.belowBar);
  r = computePlates(80, { barWeightKg: NaN, plates: [{ weight: 20, pairs: 1 }] });
  ok('NaN bar weight does not crash', !!r);
  r = computePlates(80, null);
  ok('null config does not crash', !!r);
  r = computePlates(80, {});
  ok('empty config does not crash', !!r);
}

// ============================================================
// computePlates: `enabled` flag (added v1.2)
// ============================================================
console.log('\ncomputePlates: enabled flag');
{
  // 80kg = bar 20 + 30 per side. With enabled 25kg → 25+5 = 30.
  const cfg = {
    barWeightKg: 20,
    plates: [
      { weight: 25, pairs: 1, enabled: true },
      { weight: 20, pairs: 3, enabled: true },
      { weight: 5, pairs: 2, enabled: true },
    ],
  };
  let r = computePlates(80, cfg);
  ok('80kg with 25 enabled → 25+5 per side', r.exact && eq(r.perSide, [25, 5]), r);
  // Disable the 25kg: greedy now picks 20+5+5 = 30 (5 has 2 pairs).
  cfg.plates[0].enabled = false;
  r = computePlates(80, cfg);
  ok('80kg with 25 disabled → 20+5+5 per side, exact', r.exact && eq(r.perSide, [20, 5, 5]), r);
  // Disable everything except 20 kg → 80kg uses 20 + ... = 30, can't reach exactly.
  cfg.plates.forEach(p => p.enabled = false);
  cfg.plates[1].enabled = true; // only 20kg active
  r = computePlates(80, cfg);
  ok('80kg only 20kg enabled → 20 per side + 10 remainder', !r.exact && eq(r.perSide, [20]) && approx(r.remainder, 10));
  // Missing `enabled` field is treated as enabled (back-compat).
  const legacyCfg = {
    barWeightKg: 20,
    plates: [{ weight: 20, pairs: 2 }, { weight: 5, pairs: 2 }],
  };
  r = computePlates(60, legacyCfg);
  ok('legacy config without `enabled` still works', r.exact && eq(r.perSide, [20]));
}

// ============================================================
// platesSummary
// ============================================================
console.log('\nplatesSummary');
ok('empty array → empty string', platesSummary([]) === '');
ok('single plate → just the weight', platesSummary([20]) === '20');
ok('two different → "20 + 10"', platesSummary([20, 10]) === '20 + 10');
ok('two equal → "2×20"', platesSummary([20, 20]) === '2×20');
ok('mixed → "2×20 + 10 + 5"', platesSummary([20, 20, 10, 5]) === '2×20 + 10 + 5');
ok('decimal plates preserve number', platesSummary([1.25]) === '1.25');
ok('null/undefined input safe', platesSummary(null) === '' && platesSummary(undefined) === '');

// ============================================================
// bodyWeightDelta
// ============================================================
console.log('\nbodyWeightDelta');
{
  ok('empty array returns null', bodyWeightDelta([], 7) === null);
  ok('null returns null', bodyWeightDelta(null, 7) === null);
}
{
  // Only one entry — no comparison possible.
  const bw = [{ date: new Date().toISOString(), kg: 75 }];
  ok('single entry returns null', bodyWeightDelta(bw, 7) === null);
}
{
  // Two entries, 10 days apart. Delta over 7 days should compare against the older one.
  const now = Date.now();
  const bw = [
    { date: new Date(now).toISOString(), kg: 76 },
    { date: new Date(now - 10 * 24 * 3600 * 1000).toISOString(), kg: 75 },
  ];
  const d = bodyWeightDelta(bw, 7);
  ok('7-day delta computes (older falls outside window → use older)', d === 1);
}
{
  // A 3-day-old entry cannot stand in for a 7-day comparison.
  const now = Date.now();
  const bw = [
    { date: new Date(now).toISOString(), kg: 76 },
    { date: new Date(now - 3 * 24 * 3600 * 1000).toISOString(), kg: 75.5 },
  ];
  const d = bodyWeightDelta(bw, 7);
  ok('no 7-day delta without a sufficiently old entry', d === null);
}
{
  const now = Date.now();
  const day = n => new Date(now - n * 24 * 3600 * 1000).toISOString();
  const bw = [
    { date: day(0), kg: 80 },
    { date: day(8), kg: 79 },
    { date: day(100), kg: 75 },
  ];
  ok('uses closest entry at least 7 days old', bodyWeightDelta(bw, 7) === 1);
  ok('uses closest entry at least 30 days old', bodyWeightDelta(bw, 30) === 5);
}
{
  // Negative delta (weight loss)
  const now = Date.now();
  const bw = [
    { date: new Date(now).toISOString(), kg: 73 },
    { date: new Date(now - 30 * 24 * 3600 * 1000).toISOString(), kg: 75 },
  ];
  ok('negative delta (cut)', bodyWeightDelta(bw, 7) === -2);
}
{
  // Rounding to 2 decimals
  const now = Date.now();
  const bw = [
    { date: new Date(now).toISOString(), kg: 75.123456 },
    { date: new Date(now - 10 * 24 * 3600 * 1000).toISOString(), kg: 75 },
  ];
  const d = bodyWeightDelta(bw, 7);
  ok('delta rounded to 2 decimals', d === 0.12);
}

// ============================================================
// Roundtrip integration: simulate a full autofill flow
// ============================================================
console.log('\nintegration: full autofill flow');
{
  // Past session: pressed banca 4×80×8.
  const exercise = { id: 'press_banca', type: 'weight_reps' };
  const pastSession = {
    id: 's_old',
    date: '2025-05-01',
    entries: [{
      exerciseId: 'press_banca',
      sets: [
        { weight: 60, reps: 12, done: true }, // warmup
        { weight: 80, reps: 8, done: true },
        { weight: 80, reps: 8, done: true },
        { weight: 80, reps: 7, done: true },
      ],
    }],
  };
  const previousSessions = [pastSession];

  // Simulate addExercise behaviour: mirror past session's set count and values.
  const last = findLastEntryForExercise(exercise.id, previousSessions);
  const newSets = last.sets.map(ps => inheritSet(exercise, ps, null));
  ok('autofill creates same # of sets', newSets.length === 4);
  ok('autofill set 0: weight 60 reps 12', newSets[0].weight === 60 && newSets[0].reps === 12);
  ok('autofill set 1: weight 80 reps 8', newSets[1].weight === 80 && newSets[1].reps === 8);
  ok('autofill set 2: weight 80 reps 8', newSets[2].weight === 80 && newSets[2].reps === 8);
  ok('autofill set 3: weight 80 reps 7', newSets[3].weight === 80 && newSets[3].reps === 7);
  ok('all sets done: false', newSets.every(s => s.done === false));
}
{
  // Routine flow: routine has 3 sets with targets 8-12 reps RIR 2.
  // Past session had 4 sets, last 3 at 82.5 kg.
  const exercise = { id: 'press_banca', type: 'weight_reps' };
  const pastSession = {
    id: 's_old',
    date: '2025-05-01',
    entries: [{
      exerciseId: 'press_banca',
      sets: [
        { weight: 60, reps: 12 },
        { weight: 82.5, reps: 8 },
        { weight: 82.5, reps: 8 },
        { weight: 82.5, reps: 7 },
      ],
    }],
  };
  const routineSets = [
    { repsMin: 8, repsMax: 12, rir: 2 },
    { repsMin: 8, repsMax: 12, rir: 2 },
    { repsMin: 8, repsMax: 12, rir: 2 },
  ];
  const last = findLastEntryForExercise(exercise.id, [pastSession]);
  // Pair routine set N with past set N (so warmup-as-set-0 propagates as set-0).
  const newSets = routineSets.map((rs, idx) => {
    const prev = last?.sets ? (last.sets[idx] || last.sets[last.sets.length - 1]) : null;
    return inheritSet(exercise, prev, { repsMin: rs.repsMin, repsMax: rs.repsMax, rir: rs.rir });
  });
  ok('routine autofill: 3 sets', newSets.length === 3);
  ok('routine: set 0 weight = past set 0 (60)', newSets[0].weight === 60);
  ok('routine: set 0 keeps routine targets (8-12 RIR 2)',
    newSets[0].repsMin === 8 && newSets[0].repsMax === 12 && newSets[0].rir === 2);
  ok('routine: set 1 weight = past set 1 (82.5)', newSets[1].weight === 82.5);
  ok('routine: set 2 weight = past set 2 (82.5)', newSets[2].weight === 82.5);
}
{
  // Routine has MORE sets than previous session — extras fall back to last past set.
  const exercise = { id: 'press_banca', type: 'weight_reps' };
  const pastSession = {
    id: 's_old', date: '2025-05-01',
    entries: [{ exerciseId: 'press_banca', sets: [{ weight: 80, reps: 8 }] }],
  };
  const routineSets = [{ repsMin: 5, repsMax: 5 }, { repsMin: 5, repsMax: 5 }, { repsMin: 5, repsMax: 5 }];
  const last = findLastEntryForExercise(exercise.id, [pastSession]);
  const newSets = routineSets.map((rs, idx) => {
    const prev = last?.sets ? (last.sets[idx] || last.sets[last.sets.length - 1]) : null;
    return inheritSet(exercise, prev, { repsMin: rs.repsMin, repsMax: rs.repsMax });
  });
  ok('overshooting routine: all 3 sets inherit from past last set', newSets.every(s => s.weight === 80));
}
{
  // No previous history at all.
  const exercise = { id: 'novel', type: 'weight_reps' };
  const last = findLastEntryForExercise(exercise.id, []);
  ok('no history: findLast returns null', last === null);
}

// ============================================================
// Integration: plate breakdown over many random weights
// ============================================================
console.log('\nintegration: plate breakdown sanity over 5..300 kg');
{
  const cfg = DEFAULT_PLATE_CONFIG;
  let perfectCount = 0, totalCount = 0;
  for (let target = 22.5; target <= 200; target += 2.5) {
    totalCount++;
    const r = computePlates(target, cfg);
    // Self-consistency: bar + 2×Σ(perSide) + 2×remainder should approximate target.
    const sumSide = r.perSide.reduce((a, w) => a + w, 0);
    const reconstituted = cfg.barWeightKg + 2 * sumSide + 2 * r.remainder;
    if (!approx(reconstituted, target, 1e-6)) {
      ok(`reconstitution for ${target}kg`, false, { r, reconstituted });
      break;
    }
    if (r.exact) perfectCount++;
  }
  ok('all 72 reconstitutions match target ± epsilon', true);
  ok(`most plate combos found exactly (${perfectCount}/${totalCount})`, perfectCount > totalCount * 0.85);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
