import { hasCompletedSet } from './session-utils.js';

export const GOAL_MESSAGES = [
  { title: 'LO HAS HECHO.', body: 'Te propusiste entrenar esta semana y cumpliste. Quédate un momento con esa sensación.' },
  { title: 'SEMANA CERRADA.', body: 'Cada día que reservaste para entrenar está aquí. La constancia también se celebra.' },
  { title: 'OBJETIVO CONQUISTADO.', body: 'No fue una intención en el calendario: fueron días reales de entrenamiento.' },
  { title: 'CUMPLISTE TU PALABRA.', body: 'Marcaste una meta, apareciste y la alcanzaste. Buen trabajo.' },
  { title: 'OTRA SEMANA TUYA.', body: 'Las sesiones de esta semana ya están hechas. Disfruta lo que has construido.' },
  { title: 'MISIÓN CUMPLIDA.', body: 'Llegaste a tu objetivo semanal. Hoy toca reconocerlo, además de entrenar.' },
  { title: 'ESTO YA CUENTA.', body: 'Sumaste los días que querías sumar. Esa repetición de hábitos vale mucho.' },
  { title: 'META ALCANZADA.', body: 'Tu semana de entrenamiento tiene las casillas que prometiste llenar.' },
];

const validGoal = goal => Number.isInteger(goal) && goal >= 1 && goal <= 7;
const localDayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function weeklyGoalProgress(sessions, goal, at = new Date()) {
  if (!validGoal(goal)) return null;
  const now = new Date(at);
  if (Number.isNaN(now.getTime())) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const days = new Set((sessions || []).filter(hasCompletedSet).map(session => {
    const date = new Date(session.date);
    return date >= start && date < end ? localDayKey(date) : null;
  }).filter(Boolean));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { key: localDayKey(date), trained: days.has(localDayKey(date)) };
  });
  return { goal, days: days.size, remaining: Math.max(0, goal - days.size),
    reached: days.size >= goal, weekStart: localDayKey(start), weekDays };
}

export function goalReachedBySession(previousSessions, finishedSession, goal) {
  if (!hasCompletedSet(finishedSession)) return false;
  const before = weeklyGoalProgress(previousSessions, goal, finishedSession.date);
  const after = weeklyGoalProgress([...(previousSessions || []), finishedSession], goal, finishedSession.date);
  return Boolean(before && after && !before.reached && after.reached);
}

export function goalMessage(weekStart) {
  const [year, month, day] = String(weekStart).split('-').map(Number);
  const weekNumber = Math.floor(Date.UTC(year, month - 1, day) / (7 * 86400000));
  return GOAL_MESSAGES[((weekNumber % GOAL_MESSAGES.length) + GOAL_MESSAGES.length) % GOAL_MESSAGES.length];
}

const MASS_REFERENCES = [
  { kg: 5, label: 'garrafas de agua de 5 litros' },
  { kg: 25, label: 'sacos de 25 kg' },
  { kg: 70, label: 'lavadoras de unos 70 kg' },
  { kg: 250, label: 'pianos de unos 250 kg' },
  { kg: 1200, label: 'coches pequeños de unos 1.200 kg' },
  { kg: 5000, label: 'elefantes de unos 5.000 kg' },
];

export function volumeComparison(volumeKg, seed = '') {
  if (!Number.isFinite(volumeKg) || volumeKg < 5) return null;
  const options = MASS_REFERENCES.filter(item => volumeKg / item.kg >= 2 && volumeKg / item.kg <= 20);
  const choice = options.length ? options : [MASS_REFERENCES.reduce((best, item) =>
    item.kg <= volumeKg ? item : best, MASS_REFERENCES[0])];
  const hash = [...String(seed)].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
  const reference = choice[hash % choice.length];
  const amount = volumeKg / reference.kg;
  return { amount: Number(amount.toFixed(1)), label: reference.label,
    referenceKg: reference.kg };
}
