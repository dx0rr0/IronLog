// Tests for src/domain/training/volume.js
import {
  PRIMARY_MUSCLE_GROUPS,
  VOLUME_WINDOWS,
  VOLUME_LANDMARKS,
  volumeLevel,
  sessionInWindow,
  isSameIsoWeek,
  computeVolumeBreakdown,
} from '../src/domain/training/volume.js';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : ''); fail++; }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// ============================================================
// constants
// ============================================================
console.log('\nconstants');
ok('8 primary groups', PRIMARY_MUSCLE_GROUPS.length === 8);
ok('window keys defined', !!VOLUME_WINDOWS.week_rolling && !!VOLUME_WINDOWS.week_iso && !!VOLUME_WINDOWS.month);
ok('every primary group has landmarks', PRIMARY_MUSCLE_GROUPS.every(g => !!VOLUME_LANDMARKS[g]));

// ============================================================
// volumeLevel
// ============================================================
console.log('\nvolumeLevel');
// pecho: under 8, ok [10,20], over 22
ok('pecho 0 → none', volumeLevel(0, 'pecho') === 'none');
ok('pecho 4 → low (below under threshold)', volumeLevel(4, 'pecho') === 'low');
ok('pecho 8 → low (just under threshold)', volumeLevel(8, 'pecho') === 'low');
ok('pecho 10 → ok (lower bound)', volumeLevel(10, 'pecho') === 'ok');
ok('pecho 15 → ok (middle)', volumeLevel(15, 'pecho') === 'ok');
ok('pecho 20 → ok (upper bound)', volumeLevel(20, 'pecho') === 'ok');
ok('pecho 21 → high (above ok, below over)', volumeLevel(21, 'pecho') === 'high');
ok('pecho 22 → over', volumeLevel(22, 'pecho') === 'over');
ok('pecho 30 → over (way over)', volumeLevel(30, 'pecho') === 'over');
// core has different landmarks (under: 0)
ok('core 1 → low (under is 0 so >0 is still low)', volumeLevel(1, 'core') === 'low');
ok('core 5 → ok', volumeLevel(5, 'core') === 'ok');
// Unknown group: graceful fallback
ok('unknown group with count → ok', volumeLevel(5, 'something') === 'ok');
ok('unknown group with 0 → none', volumeLevel(0, 'something') === 'none');
// Negative / nullish input
ok('null count → none', volumeLevel(null, 'pecho') === 'none');
ok('undefined count → none', volumeLevel(undefined, 'pecho') === 'none');
ok('negative count → none', volumeLevel(-5, 'pecho') === 'none');

// ============================================================
// sessionInWindow & isSameIsoWeek
// ============================================================
console.log('\nsessionInWindow');
const now = new Date('2026-05-12T12:00:00Z').getTime(); // Tuesday
{
  // 3 days ago: in rolling week, in month, in iso week (same Mon)
  const s = { date: new Date(now - 3 * 24 * 3600 * 1000).toISOString() };
  ok('3d ago: rolling week ✓', sessionInWindow(s, 'week_rolling', now));
  ok('3d ago: month ✓',         sessionInWindow(s, 'month', now));
}
{
  // 8 days ago: not in rolling week, in month
  const s = { date: new Date(now - 8 * 24 * 3600 * 1000).toISOString() };
  ok('8d ago: rolling week ✗', !sessionInWindow(s, 'week_rolling', now));
  ok('8d ago: month ✓',          sessionInWindow(s, 'month', now));
}
{
  // 35 days ago: nothing
  const s = { date: new Date(now - 35 * 24 * 3600 * 1000).toISOString() };
  ok('35d ago: month ✗', !sessionInWindow(s, 'month', now));
}
{
  // Bad date
  ok('invalid date → false', !sessionInWindow({ date: 'not-a-date' }, 'month', now));
}

console.log('\nisSameIsoWeek');
{
  // Mon 11 May 2026 and Sun 17 May 2026 should be same ISO week.
  const mon = new Date('2026-05-11T08:00:00').getTime();
  const sun = new Date('2026-05-17T22:00:00').getTime();
  ok('Mon and Sun of same week → true', isSameIsoWeek(mon, sun));
  // Sun 10 May 2026 (previous week) vs Mon 11.
  const prevSun = new Date('2026-05-10T22:00:00').getTime();
  ok('Sun before vs Mon of next week → false', !isSameIsoWeek(prevSun, mon));
}

// ============================================================
// computeVolumeBreakdown
// ============================================================
console.log('\ncomputeVolumeBreakdown');
const exMap = {
  press_banca:  { id: 'press_banca',  name: 'Press de banca', muscleGroup: 'pecho',    type: 'weight_reps' },
  aperturas:    { id: 'aperturas',    name: 'Aperturas',      muscleGroup: 'pecho',    type: 'weight_reps' },
  remo:         { id: 'remo',         name: 'Remo',           muscleGroup: 'espalda',  type: 'weight_reps' },
  curl:         { id: 'curl',         name: 'Curl bíceps',    muscleGroup: 'biceps',   type: 'weight_reps' },
  cardio:       { id: 'cardio',       name: 'Cinta',          muscleGroup: 'cardio_general', type: 'distance_duration' },
  novel:        { id: 'novel',        name: 'X',              muscleGroup: 'inventado',type: 'reps' },
};
{
  // Two sessions in last 7d, with mixed exercises.
  const sessions = [
    {
      id: 's1',
      date: new Date(now - 1 * 24 * 3600 * 1000).toISOString(),
      entries: [
        { exerciseId: 'press_banca', sets: [{ done: true }, { done: true }, { done: true }, { done: false }] }, // 3
        { exerciseId: 'aperturas',   sets: [{ done: true }, { done: true }] },                                  // 2 (also pecho)
        { exerciseId: 'curl',        sets: [{ done: true }, { done: true }, { done: true }] },                  // 3 (biceps)
        { exerciseId: 'cardio',      sets: [{ done: true }] },                                                  // ignored (not primary)
      ],
    },
    {
      id: 's2',
      date: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
      entries: [
        { exerciseId: 'press_banca', sets: [{ done: true }, { done: true }] }, // 2 more pecho
        { exerciseId: 'remo',        sets: [{ done: true }, { done: true }, { done: true }, { done: true }] }, // 4 espalda
      ],
    },
    {
      id: 's3', // 20d ago: in month window but not in week
      date: new Date(now - 20 * 24 * 3600 * 1000).toISOString(),
      entries: [
        { exerciseId: 'press_banca', sets: [{ done: true }, { done: true }, { done: true }] },
      ],
    },
  ];

  const result = computeVolumeBreakdown(sessions, exMap, 'week_rolling', now);
  ok('pecho total 7d = 7 (3+2+2)', result.totalSets.pecho === 7, result.totalSets);
  ok('espalda total 7d = 4',       result.totalSets.espalda === 4);
  ok('biceps total 7d = 3',        result.totalSets.biceps === 3);
  ok('hombros total 7d = 0',       result.totalSets.hombros === 0);
  ok('triceps total 7d = 0',       result.totalSets.triceps === 0);
  ok('sessionCount = 2 (s1 and s2)', result.sessionCount === 2);

  // Drill-down: pecho should have 2 exercises with their tallies.
  ok('pecho breakdown has 2 exercises', result.byExercise.pecho.length === 2);
  ok('pecho top exercise is press_banca with 5 sets',
    result.byExercise.pecho[0].exerciseId === 'press_banca' && result.byExercise.pecho[0].sets === 5,
    result.byExercise.pecho);
  ok('pecho second is aperturas with 2 sets',
    result.byExercise.pecho[1].exerciseId === 'aperturas' && result.byExercise.pecho[1].sets === 2);
  // Set-level detail: press_banca should have 5 entries (3 + 2 across two sessions).
  ok('press_banca has 5 setDetails',
    result.byExercise.pecho[0].setDetails.length === 5,
    result.byExercise.pecho[0].setDetails.length);
  // setDetails sorted newest-first (s1 is 1d ago, s2 is 3d ago).
  const ds = result.byExercise.pecho[0].setDetails.map(s => s.sessionId);
  ok('setDetails sorted newest-first',
    ds.slice(0, 3).every(id => id === 's1') && ds.slice(3).every(id => id === 's2'),
    ds);
  // Each set carries weight & reps (we didn't set them in the fixture above,
  // but the fields are present even if undefined).
  ok('setDetails entries have date field',
    result.byExercise.pecho[0].setDetails.every(s => !!s.date));
  // Exercise carries type for proper rendering downstream.
  ok('exercise object has type field for rendering',
    result.byExercise.pecho[0].type !== undefined);

  // Month window should include all 3 sessions
  const monthResult = computeVolumeBreakdown(sessions, exMap, 'month', now);
  ok('month: pecho includes the 3 extra sets from s3',
    monthResult.totalSets.pecho === 7 + 3, monthResult.totalSets);
  ok('month: sessionCount = 3', monthResult.sessionCount === 3);
}
{
  // Only undone sets → nothing counts
  const sessions = [
    {
      id: 's1', date: new Date(now).toISOString(),
      entries: [{ exerciseId: 'press_banca', sets: [{ done: false }, { done: false }] }],
    },
  ];
  const r = computeVolumeBreakdown(sessions, exMap, 'week_rolling', now);
  ok('no done sets → pecho 0', r.totalSets.pecho === 0);
  ok('no done sets → sessionCount 0', r.sessionCount === 0);
}
{
  // Empty / null sessions handled safely
  ok('empty sessions',    computeVolumeBreakdown([],    exMap, 'week_rolling', now).totalSets.pecho === 0);
  ok('null sessions',     computeVolumeBreakdown(null,  exMap, 'week_rolling', now).totalSets.pecho === 0);
}
{
  // Unknown exercise (e.g. user deleted custom exercise) → silently skipped
  const sessions = [
    {
      id: 's1', date: new Date(now).toISOString(),
      entries: [{ exerciseId: 'deleted_ex', sets: [{ done: true }] }],
    },
  ];
  const r = computeVolumeBreakdown(sessions, exMap, 'week_rolling', now);
  ok('unknown exercise id → no crash, no count', Object.values(r.totalSets).every(v => v === 0));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
