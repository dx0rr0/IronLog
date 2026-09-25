import { GOAL_MESSAGES, goalMessage, goalReachedBySession, volumeComparison, weeklyGoalProgress } from '../src/domain/training/motivation.js';

let count = 0;
const ok = (name, condition) => {
  if (!condition) throw new Error(name);
  count++;
  console.log('  ✓', name);
};
const session = (id, date, done = true) => ({ id, date: new Date(date).toISOString(),
  entries: [{ exerciseId: 'press_banca', sets: [{ weight: 80, reps: 8, done }] }] });
const monday = session('mon', '2026-09-21T10:00:00');
const mondayEvening = session('mon2', '2026-09-21T18:00:00');
const wednesday = session('wed', '2026-09-23T10:00:00');
const friday = session('fri', '2026-09-25T10:00:00');
const old = session('old', '2026-09-18T10:00:00');
const planned = session('planned', '2026-09-24T10:00:00', false);
const at = new Date('2026-09-25T12:00:00');

const progress = weeklyGoalProgress([monday, mondayEvening, wednesday, old, planned], 3, at);
ok('counts distinct completed training days in the Monday-Sunday week', progress.days === 2);
ok('does not count planned or previous-week sessions', progress.remaining === 1 && !progress.reached);
ok('week starts on Monday', progress.weekStart === '2026-09-21' && progress.weekDays[0].trained);
ok('a completed new day reaches the target once', goalReachedBySession([monday, mondayEvening, wednesday], friday, 3));
ok('another session on the same day does not reach it again', !goalReachedBySession([monday, mondayEvening, wednesday], mondayEvening, 3));
ok('already-reached goal does not celebrate again', !goalReachedBySession([monday, wednesday, friday], session('sun', '2026-09-27T10:00:00'), 3));
ok('unfinished sessions cannot trigger completion', !goalReachedBySession([monday, wednesday], planned, 3));
ok('invalid targets are rejected', weeklyGoalProgress([], 0, at) === null && weeklyGoalProgress([], 8, at) === null);
ok('celebrations vary across weeks', GOAL_MESSAGES.length >= 5 &&
  goalMessage('2026-09-21').title !== goalMessage('2026-09-28').title);
const comparison = volumeComparison(2500, 'session-a');
ok('volume comparison is based on an explicit mass reference', comparison && comparison.amount > 0 && comparison.referenceKg > 0);
ok('zero-volume sessions have no weight comparison', volumeComparison(0) === null);

console.log(`\n${count} motivation checks passed`);
