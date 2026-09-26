export const createRestTimer = (seconds, exerciseName, now = Date.now()) => ({
  endsAt: now + seconds * 1000,
  total: seconds,
  exerciseName,
});

export const restSecondsLeft = (timer, now = Date.now()) =>
  timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : 0;

export const adjustRestTimer = (timer, deltaSeconds, now = Date.now()) => {
  if (!timer) return null;
  const remaining = Math.max(0, restSecondsLeft(timer, now) + deltaSeconds);
  return remaining ? {
    ...timer,
    endsAt: now + remaining * 1000,
    total: Math.max(remaining, timer.total + deltaSeconds),
  } : null;
};
