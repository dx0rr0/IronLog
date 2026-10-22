// JSON backup format. Everything the user would miss after losing the
// device goes in here; anything new that gets persisted must be added to
// BACKUP_FIELDS, buildBackup and mergeBackup (test-backup.mjs checks it).
import { mergeCustomExercises } from '../exercises/custom-exercises.js';
import { upgradePlateConfig } from '../exercises/exercise-utils.js';
import { dateKey } from '../../presentation/shared/formatters.js';

export const BACKUP_VERSION = 4;
export const BACKUP_FIELDS = ['customExercises', 'sessions', 'currentSession', 'routines', 'bodyWeights', 'plateConfig', 'weeklyGoal'];

export function buildBackup(state, now = new Date()) {
  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    customExercises: state.customExercises || [],
    sessions: state.sessions || [],
    currentSession: state.currentSession || null,
    routines: state.routines || [],
    bodyWeights: state.bodyWeights || [],
    plateConfig: state.plateConfig || null,
    weeklyGoal: state.weeklyGoal ?? null,
  };
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.sessions)) throw new Error('Formato inválido');
  return data;
}

export function describeBackup(data) {
  const bw = Array.isArray(data.bodyWeights) ? data.bodyWeights.length : 0;
  return `Importar ${data.sessions.length} sesión(es), ${data.customExercises?.length || 0} ejercicio(s) propios, ${data.routines?.length || 0} rutina(s)${bw ? ` y ${bw} registro(s) de peso` : ''}${data.currentSession ? ' y una sesión en curso' : ''}. Se fusionarán con los datos actuales.`;
}

const validGoal = goal => Number.isInteger(goal) && goal >= 1 && goal <= 7;

// Merges a backup into the current state without losing anything already
// on the device. Returns the next state; fields the backup lacks are kept.
export function mergeBackup(current, data) {
  const sessions = [...(current.sessions || [])];
  data.sessions.forEach(s => {
    if (!sessions.find(n => n.id === s.id)) sessions.push(s);
  });
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

  const routines = [...(current.routines || [])];
  (data.routines || []).forEach(r => {
    if (!routines.find(n => n.id === r.id)) routines.push(r);
  });

  // Body weights: one entry per calendar day, the backup's wins. Newest first.
  const bwByDay = new Map();
  [...(current.bodyWeights || []), ...(Array.isArray(data.bodyWeights) ? data.bodyWeights : [])].forEach(b => {
    if (!b || !b.date || !Number.isFinite(Number(b.kg))) return;
    bwByDay.set(dateKey(b.date), { date: b.date, kg: Number(b.kg) });
  });
  const bodyWeights = [...bwByDay.values()].sort((a, b) => new Date(b.date) - new Date(a.date));

  const incoming = data.currentSession;
  const restoreLive = !current.currentSession && incoming?.id && Array.isArray(incoming.entries) &&
    Number.isFinite(incoming.startedAt) && !sessions.some(s => s.id === incoming.id);

  return {
    customExercises: mergeCustomExercises(current.customExercises || [], data.customExercises),
    sessions,
    currentSession: restoreLive ? incoming : current.currentSession || null,
    routines,
    bodyWeights,
    plateConfig: data.plateConfig && typeof data.plateConfig === 'object'
      ? upgradePlateConfig(data.plateConfig) : current.plateConfig,
    weeklyGoal: validGoal(data.weeklyGoal) ? data.weeklyGoal : current.weeklyGoal ?? null,
  };
}
