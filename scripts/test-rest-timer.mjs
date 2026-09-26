import assert from 'node:assert/strict';
import { adjustRestTimer, createRestTimer, restSecondsLeft } from '../src/domain/training/rest-timer.js';

const timer = createRestTimer(120, 'Press de banca', 1000);
assert.deepEqual(timer, { endsAt: 121000, total: 120, exerciseName: 'Press de banca' });
assert.equal(restSecondsLeft(timer, 1000), 120);
assert.equal(restSecondsLeft(timer, 46000), 75, 'backgrounded time still elapses');
assert.equal(restSecondsLeft(timer, 121001), 0);
assert.equal(restSecondsLeft(null, 1000), 0);
const extended = adjustRestTimer(timer, 15, 46000);
assert.equal(restSecondsLeft(extended, 46000), 90);
assert.equal(restSecondsLeft(adjustRestTimer(timer, -15, 46000), 46000), 60);
assert.equal(adjustRestTimer(timer, -90, 46000), null);
console.log('Wall-clock rest timer checks passed');
