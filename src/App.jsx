import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Home, Calendar as CalendarIcon, Dumbbell, BarChart3, Settings,
  Plus, X, Check, Trash2, Play, ChevronLeft, ChevronRight, ChevronDown,
  Search, Activity, Timer, TrendingUp, Download, Upload, Edit2, ArrowLeft,
  Zap, Filter, Award, Flame, Clock, Target, AlertTriangle,
  ClipboardList, ArrowUp, ArrowDown, MessageSquare, Save, SkipForward, Bell,
  Copy, FileText, Pencil, RotateCcw, ShieldCheck, HardDrive
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, AreaChart, Area
} from 'recharts';
import { storage } from './lib/storage.js';
import {
  requestPersistentStorage,
  getStorageEstimate,
  markBackupDone,
  dismissBackupReminder,
  shouldRemindBackup,
  getLastBackupAt,
} from './lib/persistence.js';
import {
  epley,
  inheritSet,
  findLastEntryForExercise,
  computePlates,
  platesSummary,
  bodyWeightDelta,
  DEFAULT_PLATE_CONFIG,
} from './lib/exercise-utils.js';
import {
  PRIMARY_MUSCLE_GROUPS,
  VOLUME_WINDOWS,
  VOLUME_LANDMARKS,
  volumeLevel,
  computeVolumeBreakdown,
} from './lib/volume.js';
import { BodyMap } from './components/BodyMap.jsx';
import { completedSets, hasCompletedSet, sessionVolume } from './lib/session-utils.js';
import { CATALOG_ADDITIONS } from './lib/catalog-additions.js';
import { exerciseComparisons, predictGhost, repeatSession, summarizeSession } from './lib/workout-intelligence.js';

// ============================================================
// CONSTANTS
// ============================================================

const MUSCLE_GROUPS = {
  pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros',
  pierna: 'Pierna', gluteo: 'Glúteo', biceps: 'Bíceps',
  triceps: 'Tríceps', antebrazo: 'Antebrazo', core: 'Core',
  cuerpo_completo: 'Cuerpo completo', cardio_general: 'Cardio',
};

const CATEGORY_LABELS = { strength: 'Fuerza', cardio: 'Cardio', other: 'Otros' };
const TYPE_LABELS = {
  weight_reps: 'Peso × Reps',
  reps: 'Solo reps',
  distance_duration: 'Distancia + Tiempo',
  duration: 'Solo tiempo',
};

const DEFAULT_EXERCISES = [
  // PECHO
  { id: 'press_banca', name: 'Press de banca', category: 'strength', muscleGroup: 'pecho', equipment: 'Barra', type: 'weight_reps' },
  { id: 'press_inclinado', name: 'Press inclinado con barra', category: 'strength', muscleGroup: 'pecho', equipment: 'Barra', type: 'weight_reps' },
  { id: 'press_declinado', name: 'Press declinado', category: 'strength', muscleGroup: 'pecho', equipment: 'Barra', type: 'weight_reps' },
  { id: 'press_mancuernas', name: 'Press con mancuernas', category: 'strength', muscleGroup: 'pecho', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'press_inclinado_mc', name: 'Press inclinado con mancuernas', category: 'strength', muscleGroup: 'pecho', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'aperturas_mc', name: 'Aperturas con mancuernas', category: 'strength', muscleGroup: 'pecho', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'aperturas_polea', name: 'Aperturas en polea', category: 'strength', muscleGroup: 'pecho', equipment: 'Polea', type: 'weight_reps' },
  { id: 'pec_deck', name: 'Pec deck (contractor)', category: 'strength', muscleGroup: 'pecho', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'fondos_paralelas', name: 'Fondos en paralelas', category: 'strength', muscleGroup: 'pecho', equipment: 'Peso corporal', type: 'reps' },
  { id: 'flexiones', name: 'Flexiones', category: 'strength', muscleGroup: 'pecho', equipment: 'Peso corporal', type: 'reps' },
  // ESPALDA
  { id: 'peso_muerto', name: 'Peso muerto', category: 'strength', muscleGroup: 'espalda', equipment: 'Barra', type: 'weight_reps' },
  { id: 'peso_muerto_sumo', name: 'Peso muerto sumo', category: 'strength', muscleGroup: 'espalda', equipment: 'Barra', type: 'weight_reps' },
  { id: 'dominadas', name: 'Dominadas', category: 'strength', muscleGroup: 'espalda', equipment: 'Barra', type: 'reps' },
  { id: 'dominadas_supinas', name: 'Dominadas supinas (chin-up)', category: 'strength', muscleGroup: 'espalda', equipment: 'Barra', type: 'reps' },
  { id: 'remo_barra', name: 'Remo con barra', category: 'strength', muscleGroup: 'espalda', equipment: 'Barra', type: 'weight_reps' },
  { id: 'remo_pendlay', name: 'Remo Pendlay', category: 'strength', muscleGroup: 'espalda', equipment: 'Barra', type: 'weight_reps' },
  { id: 'remo_mancuerna', name: 'Remo con mancuerna', category: 'strength', muscleGroup: 'espalda', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'remo_t', name: 'Remo en T', category: 'strength', muscleGroup: 'espalda', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'jalon_pecho', name: 'Jalón al pecho', category: 'strength', muscleGroup: 'espalda', equipment: 'Polea', type: 'weight_reps' },
  { id: 'remo_polea', name: 'Remo en polea baja', category: 'strength', muscleGroup: 'espalda', equipment: 'Polea', type: 'weight_reps' },
  { id: 'pullover', name: 'Pull-over', category: 'strength', muscleGroup: 'espalda', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'face_pull', name: 'Face pull', category: 'strength', muscleGroup: 'espalda', equipment: 'Polea', type: 'weight_reps' },
  { id: 'hiperextension', name: 'Hiperextensión lumbar', category: 'strength', muscleGroup: 'espalda', equipment: 'Banco romano', type: 'reps' },
  // HOMBROS
  { id: 'press_militar', name: 'Press militar', category: 'strength', muscleGroup: 'hombros', equipment: 'Barra', type: 'weight_reps' },
  { id: 'press_hombros_mc', name: 'Press de hombros con mancuernas', category: 'strength', muscleGroup: 'hombros', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'press_arnold', name: 'Press Arnold', category: 'strength', muscleGroup: 'hombros', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'elev_laterales', name: 'Elevaciones laterales', category: 'strength', muscleGroup: 'hombros', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'elev_frontales', name: 'Elevaciones frontales', category: 'strength', muscleGroup: 'hombros', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'pajaros', name: 'Pájaros (rear delt fly)', category: 'strength', muscleGroup: 'hombros', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'remo_menton', name: 'Remo al mentón', category: 'strength', muscleGroup: 'hombros', equipment: 'Barra', type: 'weight_reps' },
  { id: 'encogimientos', name: 'Encogimientos (shrugs)', category: 'strength', muscleGroup: 'hombros', equipment: 'Mancuernas', type: 'weight_reps' },
  // PIERNA / GLÚTEO
  { id: 'sentadilla', name: 'Sentadilla', category: 'strength', muscleGroup: 'pierna', equipment: 'Barra', type: 'weight_reps' },
  { id: 'sentadilla_frontal', name: 'Sentadilla frontal', category: 'strength', muscleGroup: 'pierna', equipment: 'Barra', type: 'weight_reps' },
  { id: 'sentadilla_hack', name: 'Sentadilla hack', category: 'strength', muscleGroup: 'pierna', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'prensa', name: 'Prensa de piernas', category: 'strength', muscleGroup: 'pierna', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'pmuerto_rumano', name: 'Peso muerto rumano', category: 'strength', muscleGroup: 'pierna', equipment: 'Barra', type: 'weight_reps' },
  { id: 'zancadas', name: 'Zancadas', category: 'strength', muscleGroup: 'pierna', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'sentadilla_bulgara', name: 'Sentadilla búlgara', category: 'strength', muscleGroup: 'pierna', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'curl_femoral', name: 'Curl femoral', category: 'strength', muscleGroup: 'pierna', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'ext_cuadriceps', name: 'Extensión de cuádriceps', category: 'strength', muscleGroup: 'pierna', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'gemelos_pie', name: 'Gemelos de pie', category: 'strength', muscleGroup: 'pierna', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'gemelos_sentado', name: 'Gemelos sentado', category: 'strength', muscleGroup: 'pierna', equipment: 'Máquina', type: 'weight_reps' },
  { id: 'hip_thrust', name: 'Hip thrust', category: 'strength', muscleGroup: 'gluteo', equipment: 'Barra', type: 'weight_reps' },
  { id: 'patada_gluteo', name: 'Patada de glúteo en polea', category: 'strength', muscleGroup: 'gluteo', equipment: 'Polea', type: 'weight_reps' },
  { id: 'abductora', name: 'Abductora en máquina', category: 'strength', muscleGroup: 'gluteo', equipment: 'Máquina', type: 'weight_reps' },
  // BÍCEPS / TRÍCEPS
  { id: 'curl_biceps_b', name: 'Curl de bíceps con barra', category: 'strength', muscleGroup: 'biceps', equipment: 'Barra', type: 'weight_reps' },
  { id: 'curl_biceps_mc', name: 'Curl de bíceps con mancuernas', category: 'strength', muscleGroup: 'biceps', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'curl_martillo', name: 'Curl martillo', category: 'strength', muscleGroup: 'biceps', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'curl_predicador', name: 'Curl predicador', category: 'strength', muscleGroup: 'biceps', equipment: 'Banco', type: 'weight_reps' },
  { id: 'curl_concentrado', name: 'Curl concentrado', category: 'strength', muscleGroup: 'biceps', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'curl_polea', name: 'Curl en polea', category: 'strength', muscleGroup: 'biceps', equipment: 'Polea', type: 'weight_reps' },
  { id: 'press_frances', name: 'Press francés', category: 'strength', muscleGroup: 'triceps', equipment: 'Barra', type: 'weight_reps' },
  { id: 'ext_triceps_polea', name: 'Extensión de tríceps en polea', category: 'strength', muscleGroup: 'triceps', equipment: 'Polea', type: 'weight_reps' },
  { id: 'ext_overhead', name: 'Extensión por encima de la cabeza', category: 'strength', muscleGroup: 'triceps', equipment: 'Mancuernas', type: 'weight_reps' },
  { id: 'fondos_triceps', name: 'Fondos para tríceps', category: 'strength', muscleGroup: 'triceps', equipment: 'Peso corporal', type: 'reps' },
  { id: 'press_cerrado', name: 'Press cerrado', category: 'strength', muscleGroup: 'triceps', equipment: 'Barra', type: 'weight_reps' },
  { id: 'patada_triceps', name: 'Patada de tríceps', category: 'strength', muscleGroup: 'triceps', equipment: 'Mancuernas', type: 'weight_reps' },
  // CORE
  { id: 'crunch', name: 'Crunch', category: 'strength', muscleGroup: 'core', equipment: 'Peso corporal', type: 'reps' },
  { id: 'plancha', name: 'Plancha', category: 'strength', muscleGroup: 'core', equipment: 'Peso corporal', type: 'duration' },
  { id: 'plancha_lateral', name: 'Plancha lateral', category: 'strength', muscleGroup: 'core', equipment: 'Peso corporal', type: 'duration' },
  { id: 'russian_twist', name: 'Russian twist', category: 'strength', muscleGroup: 'core', equipment: 'Peso corporal', type: 'reps' },
  { id: 'elev_piernas', name: 'Elevación de piernas colgado', category: 'strength', muscleGroup: 'core', equipment: 'Barra', type: 'reps' },
  { id: 'crunch_polea', name: 'Crunch en polea', category: 'strength', muscleGroup: 'core', equipment: 'Polea', type: 'weight_reps' },
  { id: 'rueda_abdominal', name: 'Rueda abdominal', category: 'strength', muscleGroup: 'core', equipment: 'Otros', type: 'reps' },
  { id: 'mountain_climbers', name: 'Mountain climbers', category: 'strength', muscleGroup: 'core', equipment: 'Peso corporal', type: 'duration' },
  // CARDIO
  { id: 'correr_exterior', name: 'Correr (exterior)', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Calle', type: 'distance_duration', distanceUnit: 'km' },
  { id: 'correr_cinta', name: 'Correr en cinta', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Cinta', type: 'distance_duration', distanceUnit: 'km' },
  { id: 'caminar', name: 'Caminar', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Calle', type: 'distance_duration', distanceUnit: 'km' },
  { id: 'bicicleta_ext', name: 'Bicicleta (exterior)', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Bicicleta', type: 'distance_duration', distanceUnit: 'km' },
  { id: 'bicicleta_est', name: 'Bicicleta estática', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Bici estática', type: 'distance_duration', distanceUnit: 'km' },
  { id: 'spinning', name: 'Spinning', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Bici estática', type: 'duration' },
  { id: 'natacion', name: 'Natación', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Piscina', type: 'distance_duration', distanceUnit: 'm' },
  { id: 'remo_maquina', name: 'Remo (máquina)', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Máquina remo', type: 'distance_duration', distanceUnit: 'm' },
  { id: 'eliptica', name: 'Elíptica', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Elíptica', type: 'duration' },
  { id: 'stair_climber', name: 'Stair climber', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Stair climber', type: 'duration' },
  { id: 'comba', name: 'Saltar a la comba', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Comba', type: 'duration' },
  { id: 'hiit', name: 'HIIT', category: 'cardio', muscleGroup: 'cardio_general', equipment: 'Varios', type: 'duration' },
  // OTROS
  { id: 'yoga', name: 'Yoga', category: 'other', muscleGroup: 'cuerpo_completo', equipment: 'Esterilla', type: 'duration' },
  { id: 'estiramientos', name: 'Estiramientos', category: 'other', muscleGroup: 'cuerpo_completo', equipment: 'Esterilla', type: 'duration' },
  { id: 'movilidad', name: 'Movilidad', category: 'other', muscleGroup: 'cuerpo_completo', equipment: 'Esterilla', type: 'duration' },
  ...CATALOG_ADDITIONS,
];

const searchText = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase();
const exerciseMatches = (exercise, search) => !search ||
  searchText([exercise.name, exercise.equipment, ...(exercise.aliases || [])].join(' '))
    .includes(searchText(search));

// ============================================================
// UTILS
// ============================================================

const dateKey = d => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const formatLong = d => new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatShort = d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const formatTime = d => new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const fmtDur = s => {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
};
const parseDur = str => {
  if (typeof str === 'number') return Math.max(0, Math.round(str));
  if (!str) return 0;
  const s = String(str).trim();
  if (s.includes(':')) {
    const parts = s.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }
  // No colon: digit-only string interpreted as compact MMSS / HMMSS / HHMMSS
  // e.g. "30" → 0:30, "230" → 2:30, "0230" → 2:30, "1200" → 12:00, "12345" → 1:23:45
  const digits = s.replace(/\D/g, '');
  if (!digits) return 0;
  if (digits.length <= 2) return parseInt(digits, 10);
  const ss = parseInt(digits.slice(-2), 10);
  if (digits.length <= 4) {
    const mm = parseInt(digits.slice(0, -2), 10);
    return mm * 60 + ss;
  }
  const mm = parseInt(digits.slice(-4, -2), 10);
  const hh = parseInt(digits.slice(0, -4), 10);
  return hh * 3600 + mm * 60 + ss;
};
const sessionDuration = ses => ses.duration || (ses.entries?.reduce((a, e) =>
  a + e.sets.reduce((b, s) => b + (s.duration || 0), 0), 0) || 0);
const availableRoutineEntries = (routine, exMap) =>
  (routine.exercises || []).filter(re => exMap[re.exerciseId] && !exMap[re.exerciseId].hidden);

// Build info injected by Vite at compile time (see vite.config.js `define`).
// Falls back to safe defaults when the bundle hasn't been built (e.g. running
// utils-only tests with raw source).
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : null;
// Short build label: "v1.1 · 12 may" — small, low-contrast, lives in the
// header so the user can tell at a glance whether the update they just
// deployed is the one they're seeing.
const buildLabel = () => {
  const v = APP_VERSION.replace(/^v?/, '').replace(/\.0+$/, ''); // 1.1.0 → 1.1, 1.1.3 → 1.1.3
  if (!BUILD_DATE) return `v${v}`;
  const d = new Date(BUILD_DATE);
  const day = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\.$/, '');
  return `v${v} · ${day}`;
};

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [customExercises, setCustomExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null); // working copy of a finished session being edited
  const [routines, setRoutines] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bodyWeights, setBodyWeights] = useState([]); // [{date: ISO, kg: number}], newest first
  const [plateConfig, setPlateConfig] = useState(DEFAULT_PLATE_CONFIG);
  const [view, setView] = useState(null); // {kind, data} for sub-views
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null); // {title, body, onConfirm, danger, confirmLabel, cancelLabel}
  const [persistGranted, setPersistGranted] = useState(null); // null | true | false
  const [showBackupNudge, setShowBackupNudge] = useState(false);

  const allExercises = useMemo(() => [...DEFAULT_EXERCISES, ...customExercises], [customExercises]);
  const availableExercises = useMemo(() => allExercises.filter(ex => !ex.hidden), [allExercises]);
  const exMap = useMemo(() => Object.fromEntries(allExercises.map(e => [e.id, e])), [allExercises]);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const [ce, ss, cs, rt, bw, pc] = await Promise.all([
          storage.get('custom-exercises'),
          storage.get('sessions'),
          storage.get('current-session'),
          storage.get('routines'),
          storage.get('body-weights'),
          storage.get('plate-config'),
        ]);
        if (ce) setCustomExercises(ce);
        if (ss) setSessions(ss);
        if (cs) setCurrentSession(cs);
        if (rt) setRoutines(rt);
        if (Array.isArray(bw)) setBodyWeights(bw);
        if (pc && typeof pc === 'object') {
          // Merge with defaults so new fields added in future versions are
          // present even if the stored config is from an older version.
          setPlateConfig({
            barWeightKg: Number.isFinite(pc.barWeightKg) ? pc.barWeightKg : DEFAULT_PLATE_CONFIG.barWeightKg,
            plates: Array.isArray(pc.plates) && pc.plates.length ? pc.plates : DEFAULT_PLATE_CONFIG.plates,
          });
        }
        setHydrated(true);
        setLoading(false);
        setLoadError(false);

        // Ask the browser to mark our data as persistent (won't be evicted on storage pressure).
        // Browsers usually grant this when the site is installed as a PWA.
        requestPersistentStorage().then(persist => setPersistGranted(persist.granted));

        // Decide whether to nudge the user about backing up
        shouldRemindBackup(ss || []).then(remind => {
          if (remind) setShowBackupNudge(true);
        }).catch(err => console.warn('backup reminder failed', err));
      } catch (err) {
        console.error('Unable to load IronLog data', err);
        setLoadError(true);
      }
    })();
  }, [loadAttempt]);

  // Persist
  const trackSave = useCallback(promise => {
    promise.then(ok => { if (!ok) setSaveError(true); })
      .catch(() => setSaveError(true));
  }, []);
  useEffect(() => { if (hydrated) trackSave(storage.set('sessions', sessions)); }, [sessions, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('custom-exercises', customExercises)); }, [customExercises, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('routines', routines)); }, [routines, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('body-weights', bodyWeights)); }, [bodyWeights, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('plate-config', plateConfig)); }, [plateConfig, hydrated, trackSave]);
  useEffect(() => {
    if (!hydrated) return;
    trackSave(currentSession
      ? storage.set('current-session', currentSession)
      : storage.del('current-session'));
  }, [currentSession, hydrated, trackSave]);

  const retrySave = async () => {
    const results = await Promise.all([
      storage.set('sessions', sessions),
      storage.set('custom-exercises', customExercises),
      storage.set('routines', routines),
      storage.set('body-weights', bodyWeights),
      storage.set('plate-config', plateConfig),
      currentSession ? storage.set('current-session', currentSession) : storage.del('current-session'),
    ]);
    setSaveError(results.some(ok => !ok));
  };

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const showConfirm = useCallback((opts) => setDialog(opts), []);

  // ---------- session lifecycle ----------
  const startSession = (routineId) => {
    let entries = [];
    let name = 'Entrenamiento';
    let routineNotes = '';
    if (routineId) {
      const r = routines.find(x => x.id === routineId);
      if (r) {
        name = r.name || name;
        routineNotes = r.notes || '';
        entries = availableRoutineEntries(r, exMap).map(re => {
          const ex = exMap[re.exerciseId];
          const last = findLastEntryForExercise(re.exerciseId, sessions);
          const routineSets = re.sets || [{}];
          return {
            exerciseId: re.exerciseId,
            restSeconds: re.restSeconds || 0,
            notes: re.notes || '',
            sets: routineSets.map((s, idx) => {
              // Pair each routine set with the corresponding previous set
              // by index (set 1 ↔ set 1, etc.). If the previous session had
              // fewer sets, fall back to its last set as a hint.
              const prev = last?.sets
                ? (last.sets[idx] || last.sets[last.sets.length - 1])
                : null;
              return inheritSet(ex, prev, {
                repsMin: s.repsMin ?? null,
                repsMax: s.repsMax ?? null,
                rir: s.rir ?? null,
              });
            }),
          };
        });
      }
    }
    setCurrentSession({
      id: 'ses_' + Date.now(),
      date: new Date().toISOString(),
      startedAt: Date.now(),
      name,
      notes: routineNotes,
      routineId: routineId || null,
      entries,
    });
    setView({ kind: 'active' });
  };

  const startRepeatedSession = source => {
    if (currentSession) {
      showToast('Termina o descarta la sesión en curso primero');
      return;
    }
    setCurrentSession(repeatSession(source, exMap));
    setView({ kind: 'active' });
  };

  const finishSession = async () => {
    if (!currentSession || finishing) return;
    if (!hasCompletedSet(currentSession)) {
      showToast('Marca al menos una serie como completada');
      return;
    }
    setFinishing(true);
    const duration = Math.round((Date.now() - currentSession.startedAt) / 1000);
    const finished = { ...currentSession, duration, finishedAt: Date.now() };
    const nextSessions = [finished, ...sessions.filter(s => s.id !== finished.id)];
    const saved = await storage.set('sessions', nextSessions);
    const cleared = saved && await storage.del('current-session');
    setFinishing(false);
    if (!saved || !cleared) {
      setSaveError(true);
      showToast('No se pudo guardar. Reinténtalo.');
      return;
    }
    setSessions(nextSessions);
    setCurrentSession(null);
    setView({ kind: 'summary', data: finished });
    showToast('Entrenamiento guardado ✓');
  };

  const cancelSession = () => {
    // If empty (no exercises and no notes), cancel without confirmation
    if (!currentSession || (currentSession.entries.length === 0 && !currentSession.notes?.trim())) {
      setCurrentSession(null);
      setView(null);
      return;
    }
    showConfirm({
      title: 'Descartar entrenamiento',
      body: 'Se perderán los datos no guardados de esta sesión.',
      confirmLabel: 'Descartar',
      danger: true,
      onConfirm: () => {
        setCurrentSession(null);
        setView(null);
      },
    });
  };

  const deleteSession = (id) => {
    showConfirm({
      title: 'Eliminar entrenamiento',
      body: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => {
        setSessions(prev => prev.filter(s => s.id !== id));
        setView(null);
        showToast('Entrenamiento eliminado');
      },
    });
  };

  const startEditSession = (session) => {
    setEditingSession(JSON.parse(JSON.stringify(session)));
    setView({ kind: 'editSession' });
  };

  const saveEditedSession = async () => {
    if (!editingSession) return;
    const nextSessions = sessions.map(s => s.id === editingSession.id ? editingSession : s)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!await storage.set('sessions', nextSessions)) {
      setSaveError(true);
      showToast('No se pudo guardar. Reinténtalo.');
      return;
    }
    setSessions(nextSessions);
    setEditingSession(null);
    setView(null);
    showToast('Cambios guardados ✓');
  };

  const cancelEditSession = () => {
    showConfirm({
      title: 'Descartar cambios',
      body: 'Se perderán las modificaciones realizadas.',
      confirmLabel: 'Descartar',
      danger: true,
      onConfirm: () => {
        setEditingSession(null);
        setView(null);
      },
    });
  };

  const addCustomExercise = ex => {
    const id = 'cust_' + Date.now();
    setCustomExercises(prev => [...prev, { ...ex, id }]);
    showToast('Ejercicio creado ✓');
  };

  const deleteCustomExercise = (id) => {
    showConfirm({
      title: 'Archivar ejercicio',
      body: 'Dejará de aparecer al añadir ejercicios. Su historial se conservará.',
      confirmLabel: 'Archivar',
      danger: true,
      onConfirm: () => setCustomExercises(prev => prev.map(ex =>
        ex.id === id ? { ...ex, hidden: true } : ex)),
    });
  };

  const restoreCustomExercise = (id) => {
    setCustomExercises(prev => prev.map(ex =>
      ex.id === id ? { ...ex, hidden: false } : ex));
  };

  // ---------- routines ----------
  const saveRoutine = (routine) => {
    if (routine.id) {
      setRoutines(prev => prev.map(r => r.id === routine.id ? routine : r));
      showToast('Rutina actualizada ✓');
    } else {
      const newR = { ...routine, id: 'rt_' + Date.now(), createdAt: Date.now() };
      setRoutines(prev => [newR, ...prev]);
      showToast('Rutina creada ✓');
    }
    setView(null);
  };

  const deleteRoutine = (id) => {
    showConfirm({
      title: 'Eliminar rutina',
      body: 'Los entrenamientos ya guardados no se verán afectados.',
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => setRoutines(prev => prev.filter(r => r.id !== id)),
    });
  };

  const duplicateRoutine = (id) => {
    const r = routines.find(x => x.id === id);
    if (!r) return;
    const copy = { ...JSON.parse(JSON.stringify(r)), id: 'rt_' + Date.now(), name: r.name + ' (copia)', createdAt: Date.now() };
    setRoutines(prev => [copy, ...prev]);
    showToast('Rutina duplicada ✓');
  };

  // ---------- import / export ----------
  const exportData = async () => {
    const data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      customExercises,
      sessions,
      currentSession,
      routines,
      bodyWeights,
      plateConfig,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlog-${dateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await markBackupDone();
    setShowBackupNudge(false);
    showToast('Copia guardada ✓');
  };

  const importData = file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.sessions || !Array.isArray(data.sessions)) throw new Error('Formato inválido');
        const importedBw = Array.isArray(data.bodyWeights) ? data.bodyWeights : [];
        showConfirm({
          title: 'Importar datos',
          body: `Importar ${data.sessions.length} sesión(es), ${data.customExercises?.length || 0} ejercicio(s) propios, ${data.routines?.length || 0} rutina(s)${importedBw.length ? ` y ${importedBw.length} registro(s) de peso` : ''}${data.currentSession ? ' y una sesión en curso' : ''}. Se fusionarán con los datos actuales.`,
          confirmLabel: 'Importar',
          onConfirm: () => {
            const newCustom = [...customExercises];
            (data.customExercises || []).forEach(ex => {
              if (!newCustom.find(c => c.id === ex.id)) newCustom.push(ex);
            });
            const newSessions = [...sessions];
            data.sessions.forEach(s => {
              if (!newSessions.find(n => n.id === s.id)) newSessions.push(s);
            });
            newSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
            const newRoutines = [...routines];
            (data.routines || []).forEach(r => {
              if (!newRoutines.find(n => n.id === r.id)) newRoutines.push(r);
            });
            // Body weights: dedupe by date (same calendar day = same entry,
            // last wins). Then sort newest first.
            const bwByDay = new Map();
            [...bodyWeights, ...importedBw].forEach(b => {
              if (!b || !b.date || !Number.isFinite(Number(b.kg))) return;
              bwByDay.set(dateKey(b.date), { date: b.date, kg: Number(b.kg) });
            });
            const newBw = [...bwByDay.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
            setCustomExercises(newCustom);
            setSessions(newSessions);
            if (!currentSession && data.currentSession?.id &&
                Array.isArray(data.currentSession.entries) &&
                Number.isFinite(data.currentSession.startedAt) &&
                !newSessions.some(s => s.id === data.currentSession.id)) {
              setCurrentSession(data.currentSession);
            }
            setRoutines(newRoutines);
            setBodyWeights(newBw);
            // Plate config: only override if the export contains one.
            // Otherwise keep the user's current config untouched.
            if (data.plateConfig && typeof data.plateConfig === 'object') {
              setPlateConfig({
                barWeightKg: Number.isFinite(data.plateConfig.barWeightKg) ? data.plateConfig.barWeightKg : DEFAULT_PLATE_CONFIG.barWeightKg,
                plates: Array.isArray(data.plateConfig.plates) && data.plateConfig.plates.length ? data.plateConfig.plates : DEFAULT_PLATE_CONFIG.plates,
              });
            }
            showToast('Datos importados ✓');
          },
        });
      } catch (err) {
        showConfirm({
          title: 'Error al importar',
          body: err.message,
          confirmLabel: 'Cerrar',
          hideCancel: true,
          onConfirm: () => {},
        });
      }
    };
    reader.readAsText(file);
  };

  const resetAll = () => {
    showConfirm({
      title: '¿Borrar TODOS los datos?',
      body: 'Esto eliminará TODAS tus sesiones, rutinas, ejercicios personalizados y registros de peso corporal. La configuración de discos se mantiene. Acción IRREVERSIBLE.',
      confirmLabel: 'Continuar',
      danger: true,
      onConfirm: () => {
        showConfirm({
          title: 'Confirmación final',
          body: '¿Estás seguro absoluto? Esto no se puede deshacer.',
          confirmLabel: 'BORRAR TODO',
          danger: true,
          onConfirm: () => {
            setSessions([]);
            setCustomExercises([]);
            setRoutines([]);
            setBodyWeights([]);
            setCurrentSession(null);
            showToast('Todos los datos eliminados');
          },
        });
      },
    });
  };

  // ---------- body weight ----------
  // Insert / update a body-weight log entry. One entry per calendar day:
  // logging twice on the same day overwrites (last write wins). We sort
  // newest-first so [0] is always the latest.
  const saveBodyWeight = (kg, dateISO) => {
    const n = Number(kg);
    if (!Number.isFinite(n) || n <= 0 || n > 500) return;
    const iso = dateISO || new Date().toISOString();
    const day = dateKey(iso);
    setBodyWeights(prev => {
      const others = prev.filter(b => dateKey(b.date) !== day);
      return [{ date: iso, kg: n }, ...others].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  };
  const deleteBodyWeight = (dateISO) => {
    setBodyWeights(prev => prev.filter(b => b.date !== dateISO));
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-300" />
          <h1 className="font-display text-2xl mb-2">NO SE PUDIERON LEER TUS DATOS</h1>
          <p className="text-sm text-zinc-400 mb-5">No se ha sobrescrito nada. Comprueba el almacenamiento del navegador e inténtalo de nuevo.</p>
          <button onClick={() => { setLoadError(false); setLoadAttempt(n => n + 1); }}
            className="bg-lime-300 text-zinc-950 px-5 py-2 rounded-full font-bold">REINTENTAR</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 animate-pulse text-lime-300" />
          <div>Cargando…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-display { font-family: 'Anton', 'Arial Narrow', sans-serif; letter-spacing: 0.02em; }
        .font-body { font-family: 'Outfit', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum'; }
        .grain { background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 3px 3px; }
        .stripe { background-image: repeating-linear-gradient(45deg, rgba(212,255,55,0.08) 0 6px, transparent 6px 12px); }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fade { animation: fadeIn 0.18s ease-out; }
        .anim-slide-up { animation: slideUp 0.22s ease-out; }
      `}</style>

      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-body grain">
        <div className="max-w-md mx-auto pb-24 relative">
          {view?.kind === 'active' && currentSession ? (
            <WorkoutSession
              mode="active"
              session={currentSession}
              setSession={setCurrentSession}
              exercises={availableExercises}
              exMap={exMap}
              onFinish={finishSession}
              finishing={finishing}
              onCancel={cancelSession}
              previousSessions={sessions}
              plateConfig={plateConfig}
              showConfirm={showConfirm}
            />
          ) : view?.kind === 'editSession' && editingSession ? (
            <WorkoutSession
              mode="edit"
              session={editingSession}
              setSession={setEditingSession}
              exercises={availableExercises}
              exMap={exMap}
              onFinish={saveEditedSession}
              onCancel={cancelEditSession}
              previousSessions={sessions.filter(s => s.id !== editingSession.id)}
              plateConfig={plateConfig}
              showConfirm={showConfirm}
            />
          ) : view?.kind === 'session' ? (
            <SessionDetail
              session={view.data}
              exMap={exMap}
              onBack={() => setView(null)}
              onDelete={() => deleteSession(view.data.id)}
              onEdit={() => startEditSession(view.data)}
              onRepeat={() => startRepeatedSession(view.data)}
              hasActive={!!currentSession}
            />
          ) : view?.kind === 'summary' ? (
            <SessionSummary
              session={view.data}
              previousSessions={sessions.filter(s => s.id !== view.data.id)}
              allSessions={sessions}
              exMap={exMap}
              onClose={() => setView(null)}
              onDetail={() => setView({ kind: 'session', data: view.data })}
            />
          ) : view?.kind === 'exercise' ? (
            <ExerciseDetail exercise={view.data} sessions={sessions} onBack={() => setView(null)} />
          ) : view?.kind === 'newExercise' ? (
            <NewExerciseForm onSave={ex => { addCustomExercise(ex); setView(null); }} onCancel={() => setView(null)} />
          ) : view?.kind === 'newRoutine' || view?.kind === 'editRoutine' ? (
            <RoutineEditor
              initial={view?.kind === 'editRoutine' ? view.data : null}
              exercises={availableExercises}
              exMap={exMap}
              onSave={saveRoutine}
              onCancel={() => setView(null)}
              showConfirm={showConfirm}
            />
          ) : (
            <>
              {tab === 'home' && (
                <HomeView
                  sessions={sessions}
                  exMap={exMap}
                  routines={routines}
                  currentSession={currentSession}
                  bodyWeights={bodyWeights}
                  onSaveBodyWeight={saveBodyWeight}
                  onDeleteBodyWeight={deleteBodyWeight}
                  showConfirm={showConfirm}
                  onStart={() => startSession()}
                  onStartRoutine={(rid) => startSession(rid)}
                  onResume={() => setView({ kind: 'active' })}
                  onOpenSession={s => setView({ kind: 'session', data: s })}
                  onGoRoutines={() => setTab('routines')}
                />
              )}
              {tab === 'routines' && (
                <RoutinesView
                  routines={routines}
                  exMap={exMap}
                  onStart={(rid) => startSession(rid)}
                  onNew={() => setView({ kind: 'newRoutine' })}
                  onEdit={(r) => setView({ kind: 'editRoutine', data: r })}
                  onDelete={deleteRoutine}
                  onDuplicate={duplicateRoutine}
                  hasActive={!!currentSession}
                />
              )}
              {tab === 'calendar' && (
                <CalendarView
                  sessions={sessions}
                  exMap={exMap}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  onOpenSession={s => setView({ kind: 'session', data: s })}
                />
              )}
              {tab === 'exercises' && (
                <ExercisesView
                  exercises={availableExercises}
                  customExercises={customExercises}
                  onOpen={ex => setView({ kind: 'exercise', data: ex })}
                  onNew={() => setView({ kind: 'newExercise' })}
                  onDelete={deleteCustomExercise}
                  onRestore={restoreCustomExercise}
                />
              )}
              {tab === 'progress' && (
                <ProgressView sessions={sessions} exercises={allExercises} exMap={exMap} />
              )}
              {tab === 'settings' && (
                <SettingsView
                  sessions={sessions}
                  customExercises={customExercises}
                  routines={routines}
                  bodyWeights={bodyWeights}
                  plateConfig={plateConfig}
                  onUpdatePlateConfig={setPlateConfig}
                  persistGranted={persistGranted}
                  onExport={exportData}
                  onImport={importData}
                  onReset={resetAll}
                />
              )}
            </>
          )}

          {toast && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-lime-300 text-zinc-950 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50 anim-fade">
              {toast}
            </div>
          )}
          {saveError && (
            <div role="alert" className="fixed left-4 right-4 bottom-24 max-w-md mx-auto bg-red-950 border border-red-500 rounded-xl p-3 z-50 flex items-center gap-3 shadow-lg">
              <span className="text-xs text-red-100 flex-1">Hay cambios sin guardar en este dispositivo.</span>
              <button onClick={exportData} className="text-xs font-bold text-white underline">COPIA JSON</button>
              <button onClick={retrySave} className="text-xs font-bold text-white underline">REINTENTAR</button>
            </div>
          )}
        </div>

        {!view && showBackupNudge && (
          <BackupNudge
            onBackup={async () => { await exportData(); }}
            onDismiss={async () => { await dismissBackupReminder(3); setShowBackupNudge(false); }}
          />
        )}

        {!view && (
          <BottomNav tab={tab} setTab={setTab} hasActive={!!currentSession} onResumeActive={() => setView({ kind: 'active' })} />
        )}

        {dialog && (
          <ConfirmDialog
            {...dialog}
            onClose={() => setDialog(null)}
          />
        )}
      </div>
    </>
  );
}

function BackupNudge({ onBackup, onDismiss }) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-1rem)] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-40 anim-slide-up">
      <div className="flex items-center gap-3 p-3">
        <div className="bg-amber-500/15 text-amber-400 rounded-lg p-2 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-zinc-100">Haz una copia de seguridad</div>
          <div className="text-[11px] text-zinc-400">Llevas tiempo sin guardar tus datos en un archivo.</div>
        </div>
        <button
          onClick={onBackup}
          className="bg-lime-300 hover:bg-lime-400 text-zinc-950 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
        >
          GUARDAR
        </button>
        <button
          onClick={onDismiss}
          className="text-zinc-500 hover:text-zinc-300 p-1 shrink-0"
          aria-label="Posponer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function defaultSetForExId(exId, exMap) {
  const ex = exMap[exId];
  return defaultSet(ex);
}

// ============================================================
// CONFIRM DIALOG
// ============================================================

function ConfirmDialog({ title, body, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger, hideCancel, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-zinc-950/70 backdrop-blur-sm anim-fade" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl anim-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          {danger && (
            <div className="bg-red-500/15 text-red-400 rounded-lg p-2 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-display text-xl text-zinc-100 leading-tight mb-1">{title}</h3>
            {body && <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!hideCancel && (
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-full font-semibold text-sm transition"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={() => {
              // Close first, then run onConfirm. If onConfirm opens another
              // dialog (chained confirms, like "Borrar todos los datos"),
              // its setDialog call wins over our setDialog(null) thanks to
              // React event-handler batching. With the previous order
              // (onConfirm then onClose), the second dialog was being
              // wiped out immediately and the action never ran.
              onClose();
              onConfirm?.();
            }}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-lime-300 hover:bg-lime-400 text-zinc-950'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAVIGATION
// ============================================================

function BottomNav({ tab, setTab, hasActive, onResumeActive }) {
  const items = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'routines', icon: ClipboardList, label: 'Rutinas' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calend.' },
    { id: 'exercises', icon: Dumbbell, label: 'Ejerc.' },
    { id: 'progress', icon: TrendingUp, label: 'Progreso' },
    { id: 'settings', icon: Settings, label: 'Ajustes' },
  ];
  return (
    <>
      {hasActive && (
        <button
          onClick={onResumeActive}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-lime-300 text-zinc-950 px-5 py-2.5 rounded-full text-sm font-bold shadow-2xl shadow-lime-300/30 z-40 max-w-md flex items-center gap-2 hover:bg-lime-400 transition"
        >
          <Play className="w-4 h-4 fill-current" /> ENTRENAMIENTO EN CURSO
        </button>
      )}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 z-30">
        <div className="max-w-md mx-auto grid grid-cols-6">
          {items.map(it => {
            const Icon = it.icon;
            const active = tab === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setTab(it.id)}
                className={`flex flex-col items-center justify-center py-3 transition ${active ? 'text-lime-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[9px] mt-1 tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{it.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// ============================================================
// HOME VIEW
// ============================================================

function HomeView({ sessions, exMap, routines, currentSession, bodyWeights = [], onSaveBodyWeight, onDeleteBodyWeight, showConfirm, onStart, onStartRoutine, onResume, onOpenSession, onGoRoutines }) {
  const [bwModalOpen, setBwModalOpen] = useState(false);
  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    const week = sessions.filter(s => new Date(s.date).getTime() >= weekAgo);
    const totalTime = week.reduce((a, s) => a + sessionDuration(s), 0);
    const streak = computeStreak(sessions);
    return { weekCount: week.length, weekTime: totalTime, totalCount: sessions.length, streak };
  }, [sessions]);

  return (
    <div>
      <header className="px-5 pt-8 pb-4 relative overflow-hidden">
        <div className="absolute inset-0 stripe opacity-30" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold">IRONLOG</div>
            <div className="text-[10px] text-zinc-600 font-mono tracking-tight" aria-label="versión">{buildLabel()}</div>
          </div>
          <h1 className="font-display text-5xl text-zinc-50 leading-none">A ENTRENAR.</h1>
          <p className="text-zinc-400 text-sm mt-2">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="px-5">
        {currentSession ? (
          <button
            onClick={onResume}
            className="w-full bg-lime-300 text-zinc-950 rounded-2xl p-5 flex items-center justify-between hover:bg-lime-400 transition shadow-lg shadow-lime-300/20"
          >
            <div className="text-left">
              <div className="text-xs font-bold tracking-wider opacity-70">CONTINUAR</div>
              <div className="font-display text-2xl">SESIÓN EN CURSO</div>
              <div className="text-xs mt-1 opacity-70">{currentSession.entries.length} ejercicio(s) registrados</div>
            </div>
            <Play className="w-7 h-7 fill-current" />
          </button>
        ) : (
          <button
            onClick={onStart}
            className="w-full bg-lime-300 text-zinc-950 rounded-2xl p-5 flex items-center justify-between hover:bg-lime-400 active:scale-[0.99] transition shadow-lg shadow-lime-300/20"
          >
            <div className="text-left">
              <div className="text-xs font-bold tracking-wider opacity-70">EMPEZAR</div>
              <div className="font-display text-3xl">ENTRENO LIBRE</div>
              <div className="text-xs mt-1 opacity-70">Sin rutina prefijada</div>
            </div>
            <div className="bg-zinc-950 text-lime-300 rounded-full w-12 h-12 flex items-center justify-center">
              <Plus className="w-7 h-7" strokeWidth={3} />
            </div>
          </button>
        )}
      </div>

      {!currentSession && routines.length > 0 && (
        <div className="px-5 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl text-zinc-300">TUS RUTINAS</h2>
            <button onClick={onGoRoutines} className="text-xs text-zinc-500 hover:text-lime-300 font-bold tracking-wide">VER TODAS →</button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
            {routines.slice(0, 8).map(r => (
              <button
                key={r.id}
                onClick={() => onStartRoutine(r.id)}
                className="shrink-0 w-44 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-lime-300/40 rounded-xl p-3 text-left transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">RUTINA</div>
                  <div className="bg-lime-300/15 text-lime-300 rounded-full p-1">
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
                <div className="font-display text-lg leading-tight text-zinc-100 truncate mb-1">{r.name.toUpperCase()}</div>
                <div className="text-[10px] text-zinc-500">{availableRoutineEntries(r, exMap).length} ejercicio(s) · {availableRoutineEntries(r, exMap).reduce((a, e) => a + (e.sets?.length || 0), 0)} series</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 mt-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Flame} label="Esta semana" value={stats.weekCount} suffix={stats.weekCount === 1 ? 'sesión' : 'sesiones'} accent />
          <StatCard icon={Clock} label="Tiempo semana" value={Math.floor(stats.weekTime / 60)} suffix="min" />
          <StatCard icon={Award} label="Racha" value={stats.streak} suffix={stats.streak === 1 ? 'día' : 'días'} />
          <StatCard icon={Activity} label="Total" value={stats.totalCount} suffix="entrenos" />
        </div>
      </div>

      <div className="px-5 mt-4">
        <BodyWeightCard bodyWeights={bodyWeights} onOpen={() => setBwModalOpen(true)} />
      </div>

      <div className="px-5 mt-7">
        <h2 className="font-display text-xl text-zinc-300 mb-3">RECIENTES</h2>
        {sessions.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">Aún no has registrado entrenamientos.</div>
            <div className="text-xs mt-1 text-zinc-600">Pulsa el botón de arriba para empezar.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 8).map(s => (
              <SessionCard key={s.id} session={s} exMap={exMap} onClick={() => onOpenSession(s)} />
            ))}
          </div>
        )}
      </div>

      {bwModalOpen && (
        <BodyWeightModal
          bodyWeights={bodyWeights}
          onSave={onSaveBodyWeight}
          onDelete={onDeleteBodyWeight}
          showConfirm={showConfirm}
          onClose={() => setBwModalOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, accent }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? 'bg-zinc-900 border-lime-300/30' : 'bg-zinc-900 border-zinc-800'}`}>
      <Icon className={`w-4 h-4 mb-2 ${accent ? 'text-lime-300' : 'text-zinc-500'}`} />
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="font-display text-3xl">{value}</span>
        <span className="text-xs text-zinc-500">{suffix}</span>
      </div>
    </div>
  );
}

function BodyWeightCard({ bodyWeights, onOpen }) {
  const current = bodyWeights[0];
  const d7 = useMemo(() => bodyWeightDelta(bodyWeights, 7), [bodyWeights]);
  const d30 = useMemo(() => bodyWeightDelta(bodyWeights, 30), [bodyWeights]);

  // Tiny sparkline data: take the last ~14 entries, oldest-first.
  const spark = useMemo(() => {
    if (!bodyWeights.length) return [];
    const last = bodyWeights.slice(0, 14).slice().reverse();
    return last.map(b => ({ kg: b.kg }));
  }, [bodyWeights]);

  const fmtDelta = d => {
    if (d == null) return null;
    if (Math.abs(d) < 0.01) return '±0';
    const s = d > 0 ? '+' : '';
    return `${s}${d.toFixed(d % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '')}`;
  };
  const deltaCls = d => d == null ? 'text-zinc-500' : d > 0.05 ? 'text-amber-300' : d < -0.05 ? 'text-lime-300' : 'text-zinc-400';

  return (
    <button
      onClick={onOpen}
      className="w-full bg-zinc-900 border border-zinc-800 hover:border-lime-300/40 rounded-2xl p-4 text-left transition flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">Peso corporal</div>
        {current ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-zinc-100">{current.kg}</span>
              <span className="text-xs text-zinc-500">kg</span>
              <span className="text-[10px] text-zinc-600 ml-1">{formatShort(current.date)}</span>
            </div>
            <div className="flex gap-3 mt-1 text-[11px] font-mono">
              <span className={deltaCls(d7)}>{d7 != null ? `${fmtDelta(d7)} kg · 7d` : '—  · 7d'}</span>
              <span className={deltaCls(d30)}>{d30 != null ? `${fmtDelta(d30)} kg · 30d` : '—  · 30d'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="font-display text-xl text-zinc-300">REGISTRA TU PESO</div>
            <div className="text-[11px] text-zinc-500">Toca para añadir el primero</div>
          </>
        )}
      </div>
      {spark.length >= 2 && (
        <div className="w-20 h-12 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <Area type="monotone" dataKey="kg" stroke="#d4ff37" fill="#d4ff37" fillOpacity={0.2} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="bg-zinc-800 text-lime-300 rounded-full w-9 h-9 flex items-center justify-center shrink-0">
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </div>
    </button>
  );
}

function BodyWeightModal({ bodyWeights, onSave, onDelete, showConfirm, onClose }) {
  // Default the input to last value (so user just adjusts), or empty if first.
  const last = bodyWeights[0];
  const [value, setValue] = useState(last ? String(last.kg) : '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input on mount so mobile users can type immediately.
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const todayKey = dateKey(new Date());
  const todaysEntry = bodyWeights.find(b => dateKey(b.date) === todayKey);

  const save = () => {
    const n = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > 500) {
      setError('Introduce un peso válido (entre 1 y 500 kg)');
      return;
    }
    onSave(n);
    onClose();
  };

  const removeEntry = (entry) => {
    showConfirm?.({
      title: 'Eliminar registro',
      body: `Se eliminará el registro de ${formatShort(entry.date)}: ${entry.kg} kg.`,
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => onDelete(entry.date),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-zinc-950/70 backdrop-blur-sm anim-fade" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl anim-slide-up max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-2xl text-zinc-100 leading-tight">PESO CORPORAL</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            {todaysEntry ? 'Actualizar hoy' : 'Registrar hoy'} ({new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
          </label>
          {/* Input + "kg" suffix in a relative wrapper, then a full-width save
              button below. Stacking vertically guarantees the save button
              stays visible and tappable on narrow phone screens. */}
          <div className="relative mt-1">
            <input
              ref={inputRef}
              type="number"
              step="0.1"
              inputMode="decimal"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') save(); }}
              placeholder={last ? String(last.kg) : '—'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-12 py-3 text-3xl font-display text-center outline-none focus:border-lime-300/60 placeholder:text-zinc-600"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold pointer-events-none">kg</span>
          </div>
          <button
            onClick={save}
            className="w-full bg-lime-300 hover:bg-lime-400 text-zinc-950 mt-2 py-3 rounded-full font-bold text-sm transition"
          >
            GUARDAR
          </button>
          {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
          {todaysEntry && !error && (
            <div className="text-[10px] text-zinc-500 italic mt-1">
              Ya hay un registro hoy ({todaysEntry.kg} kg). Guardar lo sobreescribe.
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Historial</div>
          {bodyWeights.length === 0 ? (
            <div className="text-xs text-zinc-500 italic text-center py-6">Sin registros aún.</div>
          ) : (
            <div className="space-y-1">
              {bodyWeights.slice(0, 30).map((b) => (
                <div key={b.date} className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-3 py-2">
                  <div className="font-mono text-sm">
                    <span className="text-zinc-100 font-semibold">{b.kg}</span>
                    <span className="text-zinc-500 text-xs ml-1">kg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{formatShort(b.date)}</span>
                    <button
                      onClick={() => removeEntry(b)}
                      className="text-zinc-500 hover:text-red-400 p-1"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {bodyWeights.length > 30 && (
                <div className="text-[10px] text-zinc-600 italic text-center pt-1">
                  Mostrando los 30 más recientes de {bodyWeights.length}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, exMap, onClick }) {
  const dur = sessionDuration(session);
  const vol = sessionVolume(session);
  const muscles = useMemo(() => {
    const set = new Set();
    session.entries?.forEach(e => {
      const ex = exMap[e.exerciseId];
      if (ex) set.add(ex.muscleGroup);
    });
    return Array.from(set);
  }, [session, exMap]);

  return (
    <button onClick={onClick} className="w-full bg-zinc-900 hover:bg-zinc-800/80 transition rounded-xl p-4 border border-zinc-800 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-500 mb-0.5">{formatLong(session.date)}</div>
          <div className="font-semibold text-zinc-100">{session.name || 'Entrenamiento'}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {muscles.slice(0, 4).map(m => (
              <span key={m} className="text-[10px] uppercase tracking-wide bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-semibold">
                {MUSCLE_GROUPS[m] || m}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm text-lime-300">{fmtDur(dur)}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">{session.entries?.length || 0} ejercicios</div>
          {vol > 0 && <div className="text-[10px] text-zinc-500">{vol.toLocaleString('es-ES')} kg vol.</div>}
        </div>
      </div>
    </button>
  );
}

function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => dateKey(s.date)));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Allow "today" or "yesterday" as starting point
  if (!days.has(dateKey(today))) {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    if (!days.has(dateKey(y))) return 0;
    today.setDate(today.getDate() - 1);
  }
  let cur = new Date(today);
  while (days.has(dateKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

// ============================================================
// ACTIVE SESSION
// ============================================================

function WorkoutSession({ mode, session, setSession, exercises, exMap, onFinish, onCancel, previousSessions, plateConfig, showConfirm, finishing = false }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [focusMode, setFocusMode] = useState(mode !== 'edit');
  const [focusIndex, setFocusIndex] = useState(() => {
    const sets = session.entries.flatMap(entry => entry.sets);
    const firstOpen = sets.findIndex(set => !set.done);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [inputError, setInputError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState(null); // { secondsLeft, total, exerciseName }
  const [showSessionNotes, setShowSessionNotes] = useState(!!session.notes);
  const isEdit = mode === 'edit';
  const positions = session.entries.flatMap((entry, entryIdx) =>
    entry.sets.map((_, setIdx) => ({ entryIdx, setIdx })));
  const safeFocusIndex = Math.min(focusIndex, Math.max(0, positions.length - 1));
  const focusedPosition = positions[safeFocusIndex];
  const focusedEntry = focusedPosition ? session.entries[focusedPosition.entryIdx] : null;
  const focusedExercise = focusedEntry ? exMap[focusedEntry.exerciseId] : null;
  const focusedSet = focusedPosition ? focusedEntry?.sets[focusedPosition.setIdx] : null;
  const focusedGhost = focusedSet?.done ? focusedSet.ghost || null
    : focusedExercise && focusedSet ? predictGhost({
      exercise: focusedExercise, setIndex: focusedPosition.setIdx,
      sessions: previousSessions, routineId: session.routineId,
      targetSet: focusedSet, currentEntry: focusedEntry,
    }) : null;
  const focusedComparison = focusedExercise
    ? exerciseComparisons(previousSessions, focusedExercise.id, session.routineId) : null;

  // Live timer (active mode only)
  useEffect(() => {
    if (isEdit) {
      setElapsed(session.duration || 0);
      return;
    }
    const tick = () => setElapsed(Math.round((Date.now() - session.startedAt) / 1000));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [session.startedAt, session.duration, isEdit]);

  // Rest countdown
  useEffect(() => {
    if (!restTimer || restTimer.secondsLeft <= 0) return;
    const i = setInterval(() => {
      setRestTimer(rt => {
        if (!rt) return null;
        if (rt.secondsLeft <= 1) {
          // Beep at end
          tryBeep();
          return null;
        }
        return { ...rt, secondsLeft: rt.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(i);
  }, [restTimer]);

  const startRest = (exerciseId) => {
    const entry = session.entries.find(e => e.exerciseId === exerciseId);
    const ex = exMap[exerciseId];
    const seconds = entry?.restSeconds || 0;
    if (seconds <= 0) return;
    setRestTimer({ secondsLeft: seconds, total: seconds, exerciseName: ex?.name || '' });
  };

  const dismissRest = () => setRestTimer(null);
  const adjustRest = (delta) => setRestTimer(rt => rt ? { ...rt, secondsLeft: Math.max(0, rt.secondsLeft + delta) } : null);

  const addExercise = ex => {
    setFocusIndex(positions.length);
    setFocusMode(true);
    setSession(s => {
      const last = findLastEntryForExercise(ex.id, previousSessions);
      // If we found history, mirror the previous session's set count and
      // pre-fill weight/reps/etc per set. Otherwise create one empty set
      // as before.
      const sets = (last && last.sets?.length)
        ? last.sets.map(ps => inheritSet(ex, ps, null))
        : [defaultSet(ex)];
      return {
        ...s,
        entries: [...s.entries, {
          exerciseId: ex.id,
          restSeconds: 0,
          notes: '',
          sets,
        }],
      };
    });
    setPickerOpen(false);
  };

  const removeEntry = (idx) => {
    showConfirm({
      title: 'Quitar ejercicio',
      body: `Se eliminará este ejercicio y sus series del entrenamiento.`,
      confirmLabel: 'Quitar',
      danger: true,
      onConfirm: () => setSession(s => ({ ...s, entries: s.entries.filter((_, i) => i !== idx) })),
    });
  };

  const moveEntry = (idx, dir) => {
    setSession(s => {
      const entries = [...s.entries];
      const target = idx + dir;
      if (target < 0 || target >= entries.length) return s;
      [entries[idx], entries[target]] = [entries[target], entries[idx]];
      return { ...s, entries };
    });
  };

  const updateEntry = (idx, patch) => {
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, i) => i !== idx ? e : { ...e, ...patch }),
    }));
  };

  const updateSet = (entryIdx, setIdx, patch) => {
    const entry = session.entries[entryIdx];
    const previous = entry?.sets[setIdx];
    if (!previous) return false;
    const next = { ...previous, ...patch };
    if (patch.done === true && !validCompletedSet(next, exMap[entry.exerciseId]?.type)) {
      setInputError('Completa los valores reales antes de marcar la serie.');
      return false;
    }
    setInputError('');
    const setBecameDone = patch.done === true && !previous.done;
    const ghost = setBecameDone && !isEdit ? predictGhost({
      exercise: exMap[entry.exerciseId], setIndex: setIdx,
      sessions: previousSessions, routineId: session.routineId,
      targetSet: previous, currentEntry: entry,
    }) : previous.ghost;
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, ei) => ei !== entryIdx ? e : {
        ...e,
        sets: e.sets.map((st, si) => {
          if (si !== setIdx) return st;
          return { ...st, ...patch, ...(setBecameDone && ghost ? { ghost } : {}) };
        }),
      }),
    }));
    if (setBecameDone && !isEdit) {
      // Trigger rest timer if exercise has restSeconds
      const entry = session.entries[entryIdx];
      if (entry?.restSeconds > 0) {
        const ex = exMap[entry.exerciseId];
        setRestTimer({ secondsLeft: entry.restSeconds, total: entry.restSeconds, exerciseName: ex?.name || '' });
      }
    }
    return true;
  };

  const completeFocusedSet = () => {
    if (!focusedPosition || !updateSet(focusedPosition.entryIdx, focusedPosition.setIdx, { done: true })) return;
    const next = positions.findIndex((pos, index) => index > safeFocusIndex &&
      !session.entries[pos.entryIdx].sets[pos.setIdx].done);
    const earlier = positions.findIndex((pos, index) => index < safeFocusIndex &&
      !session.entries[pos.entryIdx].sets[pos.setIdx].done);
    if (next >= 0) setFocusIndex(next);
    else if (earlier >= 0) setFocusIndex(earlier);
  };

  const addFocusedSet = () => {
    if (!focusedPosition) return;
    const nextEntry = positions.findIndex(pos => pos.entryIdx > focusedPosition.entryIdx);
    setFocusIndex(nextEntry >= 0 ? nextEntry : positions.length);
    addSet(focusedPosition.entryIdx);
  };

  const addSet = entryIdx => {
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, ei) => {
        if (ei !== entryIdx) return e;
        const ex = exMap[e.exerciseId];
        const last = e.sets[e.sets.length - 1] || {};
        // Inherit weight/reps but reset done; preserve targets if existed
        const newSet = {
          ...defaultSet(ex),
          weight: last.weight ?? '',
          reps: last.reps ?? '',
          distance: last.distance ?? '',
          duration: last.duration ?? 0,
          repsMin: last.repsMin ?? null,
          repsMax: last.repsMax ?? null,
          rir: last.rir ?? null,
          done: false,
        };
        return { ...e, sets: [...e.sets, newSet] };
      }),
    }));
  };

  const removeSet = (entryIdx, setIdx) => {
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, ei) => ei !== entryIdx ? e : { ...e, sets: e.sets.filter((_, i) => i !== setIdx) }),
    }));
  };

  const updateDuration = (newDur) => {
    setSession(s => ({ ...s, duration: newDur }));
    setElapsed(newDur);
  };

  const updateDate = (newIso) => {
    setSession(s => ({ ...s, date: newIso }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20">
        <div className="px-5 py-3 flex items-center justify-between">
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-200 p-1 -ml-1" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-mono text-lg text-lime-300">
            {isEdit ? (
              <DurationInput value={elapsed} onChange={updateDuration} />
            ) : (
              <><Timer className="w-4 h-4" />{fmtDur(elapsed)}</>
            )}
          </div>
          <button
            onClick={onFinish}
            disabled={session.entries.length === 0 || finishing}
            className="bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 hover:bg-lime-400 transition"
          >
            {isEdit ? <><Save className="w-4 h-4" strokeWidth={3} /> GUARDAR</> : <><Check className="w-4 h-4" strokeWidth={3} /> FIN</>}
          </button>
        </div>
        <div className="px-5 pb-3">
          {editingName ? (
            <input
              autoFocus
              value={session.name}
              onChange={e => setSession(s => ({ ...s, name: e.target.value }))}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 font-display text-2xl w-full"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="font-display text-3xl text-zinc-100 leading-none flex items-center gap-2 group">
              {session.name} <Edit2 className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
            </button>
          )}
          {!isEdit && (
            <button onClick={() => setFocusMode(value => !value)}
              className="mt-2 text-[11px] font-bold text-lime-300 border border-lime-300/30 rounded-full px-3 py-1">
              {focusMode ? 'VER ENTRENAMIENTO COMPLETO' : 'MODO SERIE'}
            </button>
          )}
          {isEdit && (
            <div className="mt-2">
              <input
                type="datetime-local"
                value={toLocalInput(session.date)}
                onChange={e => updateDate(fromLocalInput(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-400 outline-none focus:border-lime-300/50"
              />
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-5 space-y-4">
        {focusMode && !isEdit ? (
          <>
            {focusedPosition && focusedExercise && focusedSet ? (
              <FocusSetCard
                key={`${focusedPosition.entryIdx}-${focusedPosition.setIdx}`}
                entry={focusedEntry}
                exercise={focusedExercise}
                set={focusedSet}
                setIndex={focusedPosition.setIdx}
                position={safeFocusIndex}
                total={positions.length}
                completed={positions.filter(pos => session.entries[pos.entryIdx].sets[pos.setIdx].done).length}
                ghost={focusedGhost}
                comparison={focusedComparison}
                error={inputError}
                onPrevious={() => setFocusIndex(Math.max(0, safeFocusIndex - 1))}
                onNext={() => setFocusIndex(Math.min(positions.length - 1, safeFocusIndex + 1))}
                onUpdate={patch => updateSet(focusedPosition.entryIdx, focusedPosition.setIdx, patch)}
                onComplete={completeFocusedSet}
                onAddSet={addFocusedSet}
              />
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <div>Añade un ejercicio para empezar.</div>
              </div>
            )}
            <button onClick={() => setPickerOpen(true)}
              className="w-full border-2 border-dashed border-zinc-700 rounded-2xl py-4 text-zinc-400 font-bold">
              <Plus className="w-4 h-4 inline mr-1" /> AÑADIR EJERCICIO
            </button>
          </>
        ) : (
        <>
        {inputError && <div role="alert" className="text-xs text-red-300">{inputError}</div>}
        {session.entries.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">Añade tu primer ejercicio para empezar.</div>
          </div>
        )}

        {session.entries.map((entry, ei) => {
          const ex = exMap[entry.exerciseId];
          if (!ex) return null;
          return (
            <ExerciseEntryCard
              key={ei}
              entry={entry}
              exercise={ex}
              routineId={session.routineId}
              showGhost={!isEdit}
              previousSessions={previousSessions}
              plateConfig={plateConfig}
              isFirst={ei === 0}
              isLast={ei === session.entries.length - 1}
              onAddSet={() => addSet(ei)}
              onUpdateSet={(si, patch) => updateSet(ei, si, patch)}
              onRemoveSet={si => removeSet(ei, si)}
              onUpdateEntry={patch => updateEntry(ei, patch)}
              onRemove={() => removeEntry(ei)}
              onMoveUp={() => moveEntry(ei, -1)}
              onMoveDown={() => moveEntry(ei, +1)}
              onStartRestNow={isEdit ? null : () => startRest(entry.exerciseId)}
              showConfirm={showConfirm}
            />
          );
        })}

        <button
          onClick={() => setPickerOpen(true)}
          className="w-full border-2 border-dashed border-zinc-700 hover:border-lime-300 hover:bg-lime-300/5 rounded-2xl py-6 text-zinc-400 hover:text-lime-300 transition flex flex-col items-center gap-1 font-bold"
        >
          <Plus className="w-6 h-6" /> AÑADIR EJERCICIO
        </button>

        {/* Session notes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSessionNotes(v => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <span className="font-bold text-sm">Notas de la sesión</span>
              {session.notes && <span className="text-[10px] bg-lime-300/20 text-lime-300 px-1.5 py-0.5 rounded font-bold">CON NOTAS</span>}
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showSessionNotes ? 'rotate-180' : ''}`} />
          </button>
          {showSessionNotes && (
            <div className="px-4 pb-4">
              <textarea
                value={session.notes || ''}
                onChange={e => setSession(s => ({ ...s, notes: e.target.value }))}
                placeholder="Cómo te has sentido, energía, sueño, comentarios generales..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-lime-300/50 resize-none"
              />
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {pickerOpen && (
        <ExercisePicker exercises={exercises} onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}

      {restTimer && (
        <RestTimerWidget
          timer={restTimer}
          onDismiss={dismissRest}
          onAdjust={adjustRest}
        />
      )}
    </div>
  );
}

function validCompletedSet(set, type) {
  const isPositive = value => value !== '' && value !== null && value !== undefined &&
    Number.isFinite(Number(value)) && Number(value) > 0;
  if (type === 'weight_reps') return isPositive(set.weight) && isPositive(set.reps);
  if (type === 'reps') return isPositive(set.reps);
  if (type === 'distance_duration') return isPositive(set.distance) && isPositive(set.duration);
  if (type === 'duration') return isPositive(set.duration);
  return false;
}

function setBrief(set, type) {
  if (!set) return '—';
  if (type === 'weight_reps') return `${set.weight ?? '—'} kg × ${set.reps ?? '—'}${set.rir != null ? ` @${set.rir}` : ''}`;
  if (type === 'reps') return `${set.reps ?? '—'} reps${set.rir != null ? ` @${set.rir}` : ''}`;
  if (type === 'distance_duration') return `${set.distance ?? '—'} · ${set.duration ? fmtDur(set.duration) : '—'}`;
  return set.duration ? fmtDur(set.duration) : '—';
}

function firstComparableSet(item, index) {
  if (!item) return null;
  return item.entry.sets[index]?.done ? item.entry.sets[index]
    : item.entry.sets.find(set => set.done) || null;
}

function StepperField({ label, value, onChange, step = 1, min = 0, unit = '' }) {
  const change = delta => {
    const next = Number((Math.max(min, (Number(value) || 0) + delta)).toFixed(2));
    onChange(next);
  };
  return (
    <div className="bg-zinc-800 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <button onClick={() => change(-step)} aria-label={`Reducir ${label}`}
          className="w-11 h-11 bg-zinc-700 rounded-lg text-xl font-bold shrink-0">−</button>
        <input type="number" inputMode={step % 1 ? 'decimal' : 'numeric'} step="any"
          value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="min-w-0 w-full bg-zinc-950 border border-zinc-700 rounded-lg text-center font-mono text-xl h-11 outline-none focus:border-lime-300"
          aria-label={label} />
        <button onClick={() => change(step)} aria-label={`Aumentar ${label}`}
          className="w-11 h-11 bg-zinc-700 rounded-lg text-xl font-bold shrink-0">+</button>
      </div>
      {unit && <div className="text-[10px] text-zinc-500 text-center mt-1">{unit}</div>}
    </div>
  );
}

function FocusSetCard({ entry, exercise, set, setIndex, position, total, completed,
  ghost, comparison, error, onPrevious, onNext, onUpdate, onComplete, onAddSet }) {
  const routinePrevious = comparison?.routine;
  const generalPrevious = comparison?.general;
  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onPrevious} disabled={position === 0} aria-label="Serie anterior"
            className="p-2 text-zinc-300 disabled:opacity-20"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center min-w-0">
            <div className="text-[10px] text-zinc-500 font-bold tracking-widest">SERIE {position + 1} DE {total} · {completed} HECHAS</div>
            <div className="font-display text-2xl text-zinc-100 truncate">{exercise.name.toUpperCase()}</div>
            <div className="text-xs text-zinc-500">Serie {setIndex + 1} de {entry.sets.length}{entry.restSeconds ? ` · descanso ${fmtDur(entry.restSeconds)}` : ''}</div>
          </div>
          <button onClick={onNext} disabled={position >= total - 1} aria-label="Serie siguiente"
            className="p-2 text-zinc-300 disabled:opacity-20"><ChevronRight className="w-6 h-6" /></button>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-lime-300" style={{ width: `${total ? 100 * completed / total : 0}%` }} />
        </div>
      </div>

      {ghost ? (
        <div className="bg-lime-300/10 border border-lime-300/40 rounded-2xl p-4">
          <div className="text-[10px] text-lime-300 font-bold tracking-widest mb-1">GHOST · PROPUESTA PARA ESTA SERIE</div>
          <div className="font-mono text-2xl text-lime-200">{setBrief(ghost, exercise.type)}</div>
          <div className="text-xs text-zinc-300 mt-2">{ghost.reason}</div>
          <div className="text-[10px] text-zinc-500 mt-2">Basado en {ghost.scope === 'rutina' ? 'esta rutina' : 'tu historial general'} · {formatShort(ghost.referenceDate)}</div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-400">
          {['weight_reps', 'reps'].includes(exercise.type)
            ? 'GHOST: registra este ejercicio para recibir una propuesta la próxima vez.'
            : 'Ghost de progresión disponible para ejercicios de fuerza.'}
        </div>
      )}

      {(routinePrevious || generalPrevious) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-zinc-400 space-y-1">
          {routinePrevious && <div>Última en esta rutina: <span className="text-zinc-100 font-mono">{setBrief(firstComparableSet(routinePrevious, setIndex), exercise.type)}</span></div>}
          {generalPrevious && generalPrevious.session.id !== routinePrevious?.session.id &&
            <div>Última general: <span className="text-zinc-100 font-mono">{setBrief(firstComparableSet(generalPrevious, setIndex), exercise.type)}</span></div>}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div>
          <div className="font-display text-xl">RESULTADO REAL</div>
          <div className="text-xs text-zinc-500">Confirma o corrige los valores después de hacer la serie.</div>
        </div>
        {exercise.type === 'weight_reps' && <StepperField label="Peso" unit="kg" value={set.weight}
          step={/mancuern/i.test(exercise.equipment) ? 1 : 2.5} onChange={weight => onUpdate({ weight })} />}
        {['weight_reps', 'reps'].includes(exercise.type) && <>
          <StepperField label="Repeticiones" value={set.reps} onChange={reps => onUpdate({ reps })} />
          <StepperField label="RIR" value={set.rir ?? ''} min={0} onChange={rir => onUpdate({ rir: rir === '' ? null : rir })} />
        </>}
        {exercise.type === 'distance_duration' && <StepperField label={`Distancia (${exercise.distanceUnit || 'km'})`}
          value={set.distance} step={0.1} onChange={distance => onUpdate({ distance })} />}
        {['distance_duration', 'duration'].includes(exercise.type) && <div>
          <div className="text-xs text-zinc-400 mb-1">Duración</div>
          <DurField value={set.duration || 0} onChange={duration => onUpdate({ duration })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-center font-mono text-xl" />
        </div>}
        {error && <div role="alert" className="text-xs text-red-300">{error}</div>}
        {set.done ? (
          <button onClick={() => onUpdate({ done: false })}
            className="w-full bg-zinc-800 text-lime-300 rounded-xl py-4 font-bold">SERIE HECHA ✓ · DESMARCAR</button>
        ) : (
          <button onClick={onComplete}
            className="w-full bg-lime-300 text-zinc-950 rounded-xl py-4 text-lg font-bold">MARCAR SERIE HECHA ✓</button>
        )}
      </div>
      <button onClick={onAddSet} className="w-full text-sm text-zinc-400 py-3">+ AÑADIR SERIE A {exercise.name.toUpperCase()}</button>
    </div>
  );
}

// Date input helpers
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(str) {
  if (!str) return new Date().toISOString();
  return new Date(str).toISOString();
}

// Editable duration input (mm:ss or h:mm:ss)
function DurationInput({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(fmtDur(value));
  useEffect(() => { if (!editing) setText(fmtDur(value)); }, [value, editing]);
  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => { onChange(parseDur(text)); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(parseDur(text)); setEditing(false); } }}
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 font-mono text-base text-lime-300 w-24 text-center outline-none"
        placeholder="mm:ss"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-2 hover:text-lime-200 transition">
      <Timer className="w-4 h-4" />
      <span>{fmtDur(value)}</span>
      <Edit2 className="w-3 h-3 opacity-50" />
    </button>
  );
}

// Inline duration input — user types raw digits, we only re-format on blur (avoids cursor jump)
function DurField({ value, onChange, placeholder = 'mm:ss', className = '' }) {
  const [text, setText] = useState(value > 0 ? fmtDur(value) : '');
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value > 0 ? fmtDur(value) : '');
  }, [value, focused]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onFocus={e => { setFocused(true); e.target.select(); }}
      onBlur={() => { onChange(parseDur(text)); setFocused(false); }}
      onChange={e => setText(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      className={className}
    />
  );
}

// Tiny audio beep when rest finishes
function tryBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close(), 800);
  } catch {}
  try { if (navigator.vibrate) navigator.vibrate([200, 80, 200]); } catch {}
}

function RestTimerWidget({ timer, onDismiss, onAdjust }) {
  const pct = timer.total > 0 ? ((timer.total - timer.secondsLeft) / timer.total) * 100 : 0;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-1rem)] bg-zinc-900 border border-lime-300/40 rounded-2xl shadow-2xl shadow-lime-300/10 z-40 anim-slide-up overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-zinc-800">
        <div className="h-full bg-lime-300 transition-all duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-3 p-3 pt-4">
        <div className="bg-lime-300/15 text-lime-300 rounded-full p-2 shrink-0">
          <Timer className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">DESCANSO</div>
          <div className="font-mono text-2xl text-lime-300 leading-none">{fmtDur(timer.secondsLeft)}</div>
          {timer.exerciseName && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{timer.exerciseName}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onAdjust(-15)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center">-15</button>
          <button onClick={() => onAdjust(+15)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center">+15</button>
          <button onClick={onDismiss} className="bg-zinc-800 hover:bg-red-500 text-zinc-200 hover:text-white rounded-full w-8 h-8 flex items-center justify-center" aria-label="Saltar descanso">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function defaultSet(ex) {
  if (!ex) return { done: false };
  switch (ex.type) {
    case 'weight_reps': return { weight: '', reps: '', done: false };
    case 'reps': return { reps: '', done: false };
    case 'distance_duration': return { distance: '', duration: 0, done: false };
    case 'duration': return { duration: 0, done: false };
    default: return { done: false };
  }
}

function ExerciseEntryCard({ entry, exercise, routineId, showGhost, previousSessions, plateConfig, isFirst, isLast, onAddSet, onUpdateSet, onRemoveSet, onUpdateEntry, onRemove, onMoveUp, onMoveDown, onStartRestNow, showConfirm }) {
  const [showNotes, setShowNotes] = useState(!!entry.notes);
  const [showRestEdit, setShowRestEdit] = useState(false);

  const comparison = useMemo(() =>
    exerciseComparisons(previousSessions, exercise.id, routineId),
  [previousSessions, exercise.id, routineId]);
  const lastSession = comparison.preferred
    ? { date: comparison.preferred.session.date, sets: comparison.preferred.entry.sets } : null;

  // Plate breakdown only makes sense for barbell weight-rep work.
  const showPlates = exercise.type === 'weight_reps' && exercise.equipment === 'Barra' && !!plateConfig;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 gap-2">
        <div className="flex flex-col -ml-1 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 disabled:hover:text-zinc-500 p-0.5" aria-label="Subir">
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 disabled:hover:text-zinc-500 p-0.5" aria-label="Bajar">
            <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl leading-tight">{exercise.name.toUpperCase()}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            {MUSCLE_GROUPS[exercise.muscleGroup] || exercise.muscleGroup} • {exercise.equipment}
          </div>
        </div>
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400 p-1 shrink-0" aria-label="Quitar ejercicio">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Rest + notes mini-toolbar */}
      <div className="flex items-center gap-1 px-3 pt-3 flex-wrap">
        <button
          onClick={() => setShowRestEdit(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${entry.restSeconds > 0 ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <Timer className="w-3 h-3" /> {entry.restSeconds > 0 ? fmtDur(entry.restSeconds) : 'Descanso'}
        </button>
        <button
          onClick={() => setShowNotes(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${entry.notes ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <MessageSquare className="w-3 h-3" /> Notas
        </button>
        {entry.restSeconds > 0 && onStartRestNow && (
          <button
            onClick={onStartRestNow}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-lime-300 transition ml-auto"
          >
            <Play className="w-3 h-3 fill-current" /> Iniciar
          </button>
        )}
      </div>

      {showRestEdit && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Descanso:</span>
          <DurField
            value={entry.restSeconds || 0}
            onChange={v => onUpdateEntry({ restSeconds: v })}
            placeholder="mm:ss"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200 w-20 outline-none focus:border-lime-300/50 placeholder:text-zinc-500 text-center"
          />
          <div className="flex gap-1 ml-auto">
            {[60, 90, 120, 180].map(sec => (
              <button
                key={sec}
                onClick={() => onUpdateEntry({ restSeconds: sec })}
                className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
              >
                {sec / 60 < 1 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      {showNotes && (
        <div className="px-3 pt-2">
          <textarea
            value={entry.notes || ''}
            onChange={e => onUpdateEntry({ notes: e.target.value })}
            placeholder="Notas para este ejercicio (técnica, sensaciones...)"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-lime-300/50 resize-none"
          />
        </div>
      )}

      <div className="p-3 space-y-1.5 mt-2">
        <SetHeader type={exercise.type} unit={exercise.distanceUnit} />
        {entry.sets.map((s, si) => (
          <SetRow
            key={si}
            idx={si}
            set={s}
            type={exercise.type}
            unit={exercise.distanceUnit}
            previous={lastSession?.sets[si]}
            ghost={showGhost ? (s.done ? s.ghost || null : predictGhost({ exercise, setIndex: si,
              sessions: previousSessions, routineId, targetSet: s, currentEntry: entry })) : null}
            plateConfig={showPlates ? plateConfig : null}
            onUpdate={patch => onUpdateSet(si, patch)}
            onRemove={() => onRemoveSet(si)}
            showConfirm={showConfirm}
          />
        ))}
        <button
          onClick={onAddSet}
          className="w-full text-sm text-zinc-400 hover:text-lime-300 hover:bg-zinc-800 py-2 rounded transition flex items-center justify-center gap-1 mt-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Añadir serie
        </button>
        {lastSession && (
          <div className="text-[10px] text-zinc-600 italic mt-1 text-center">
            Última vez {comparison.scope === 'rutina' ? 'en esta rutina' : '(general)'}: {formatShort(lastSession.date)}
          </div>
        )}
        {comparison.routine && comparison.general?.session.id !== comparison.routine.session.id && (
          <div className="text-[10px] text-zinc-600 italic text-center">
            Última general: {formatShort(comparison.general.session.date)}
          </div>
        )}
      </div>
    </div>
  );
}

function SetHeader({ type, unit, editable = true }) {
  const cols = [];
  if (editable) cols.push({ label: '', w: 'w-7' }); // delete column
  cols.push({ label: '#', w: editable ? 'w-5' : 'w-7' });
  if (type === 'weight_reps') {
    cols.push({ label: 'KG', w: 'flex-1' });
    cols.push({ label: 'REPS', w: 'flex-1' });
    cols.push({ label: 'RIR', w: 'w-11' });
  } else if (type === 'reps') {
    cols.push({ label: 'REPS', w: 'flex-1' });
    cols.push({ label: 'RIR', w: 'w-11' });
  } else if (type === 'distance_duration') {
    cols.push({ label: (unit || 'KM').toUpperCase(), w: 'flex-1' });
    cols.push({ label: 'TIEMPO', w: 'flex-1' });
  } else if (type === 'duration') {
    cols.push({ label: 'TIEMPO', w: 'flex-1' });
  }
  cols.push({ label: '', w: 'w-9' }); // check column
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold tracking-wider px-1">
      {cols.map((c, i) => <div key={i} className={`${c.w} text-center`}>{c.label}</div>)}
    </div>
  );
}

function SetRow({ idx, set, type, unit, previous, ghost, plateConfig, onUpdate, onRemove, showConfirm }) {
  const placeholder = previous ? {
    weight: previous.weight ? String(previous.weight) : '',
    reps: previous.reps ? String(previous.reps) : '',
    distance: previous.distance ? String(previous.distance) : '',
    duration: previous.duration ? fmtDur(previous.duration) : '',
    rir: previous.rir != null ? String(previous.rir) : '',
  } : {};
  const repRangePh = (set.repsMin && set.repsMax) ? `${set.repsMin}-${set.repsMax}` : (set.repsMin || set.repsMax || placeholder.reps || '–');
  const cellCls = `bg-zinc-800 focus:bg-zinc-700 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none min-w-0 transition placeholder:text-zinc-500`;

  const handleRemoveClick = () => {
    if (showConfirm) {
      showConfirm({
        title: 'Eliminar serie',
        body: `Se eliminará la serie #${idx + 1}.`,
        confirmLabel: 'Eliminar',
        danger: true,
        onConfirm: onRemove,
      });
    } else {
      onRemove();
    }
  };

  // Extras (1RM + plate breakdown) only when both weight & reps inputs have
  // concrete numbers. We re-derive the values here rather than reading them
  // off the input DOM to keep the source of truth in `set`.
  const w = Number(set.weight);
  const r = Number(set.reps);
  const hasW = Number.isFinite(w) && w > 0;
  const hasR = Number.isFinite(r) && r > 0;
  const oneRm = (type === 'weight_reps' && hasW && hasR) ? Math.round(epley(w, r)) : null;
  const plateInfo = (type === 'weight_reps' && plateConfig && hasW) ? computePlates(w, plateConfig) : null;
  const plateText = plateInfo && !plateInfo.belowBar
    ? (plateInfo.exact
        ? `${platesSummary(plateInfo.perSide)}/lado`
        : (plateInfo.perSide.length
            ? `${platesSummary(plateInfo.perSide)}/lado · faltan ${plateInfo.remainder.toFixed(2).replace(/\.?0+$/, '')} kg`
            : `no entra con tus discos`))
    : null;
  const showExtras = oneRm != null || plateText != null;

  // Reusable RIR input — placeholder shows previous session's RIR if any,
  // so the user can quickly confirm or override.
  const rirInput = (
    <input
      className={`${cellCls} w-11 shrink-0`}
      type="number"
      inputMode="numeric"
      value={set.rir ?? ''}
      placeholder={placeholder.rir || '–'}
      onChange={e => onUpdate({ rir: e.target.value === '' ? null : parseInt(e.target.value) })}
    />
  );

  return (
    <div className="flex flex-col">
      {ghost && !set.done && <div className="text-[10px] text-lime-300/80 font-mono pl-12 pb-0.5">
        GHOST: {setBrief(ghost, type)}
      </div>}
      <div className={`flex items-center gap-1.5 ${set.done ? 'bg-lime-300/5' : ''} rounded transition`}>
        <button
          onClick={handleRemoveClick}
          className="w-7 h-9 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition shrink-0"
          aria-label="Eliminar serie"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
        <div className="w-5 text-center font-mono text-xs text-zinc-500">{idx + 1}</div>
        {type === 'weight_reps' && (
          <>
            <input className={`${cellCls} flex-1 w-0`} type="number" step="0.5" inputMode="decimal" value={set.weight ?? ''} placeholder={placeholder.weight || '–'} onChange={e => onUpdate({ weight: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
            <input className={`${cellCls} flex-1 w-0`} type="number" inputMode="numeric" value={set.reps ?? ''} placeholder={repRangePh} onChange={e => onUpdate({ reps: e.target.value === '' ? '' : parseInt(e.target.value) })} />
            {rirInput}
          </>
        )}
        {type === 'reps' && (
          <>
            <input className={`${cellCls} flex-1 w-0`} type="number" inputMode="numeric" value={set.reps ?? ''} placeholder={repRangePh} onChange={e => onUpdate({ reps: e.target.value === '' ? '' : parseInt(e.target.value) })} />
            {rirInput}
          </>
        )}
        {type === 'distance_duration' && (
          <>
            <input className={`${cellCls} flex-1 w-0`} type="number" step="0.01" inputMode="decimal" value={set.distance ?? ''} placeholder={placeholder.distance || '–'} onChange={e => onUpdate({ distance: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
            <DurField value={set.duration || 0} onChange={v => onUpdate({ duration: v })} placeholder={placeholder.duration || 'mm:ss'} className={`${cellCls} flex-1 w-0`} />
          </>
        )}
        {type === 'duration' && (
          <DurField value={set.duration || 0} onChange={v => onUpdate({ duration: v })} placeholder={placeholder.duration || 'mm:ss'} className={`${cellCls} flex-1 w-0`} />
        )}
        <button
          onClick={() => onUpdate({ done: !set.done })}
          className={`w-9 h-9 rounded flex items-center justify-center transition shrink-0 ${set.done ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'}`}
          aria-label={set.done ? 'Desmarcar' : 'Marcar completada'}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
      {showExtras && (
        <div className="flex items-center gap-2 pl-12 pr-11 text-[10px] text-zinc-500 font-mono leading-tight pt-0.5 pb-1">
          {oneRm != null && <span>≈ {oneRm} kg</span>}
          {oneRm != null && plateText && <span className="text-zinc-700">·</span>}
          {plateText && <span className="truncate">{plateText}</span>}
        </div>
      )}
    </div>
  );
}

function ExercisePicker({ exercises, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [muscle, setMuscle] = useState('all');
  const filtered = useMemo(() => {
    return exercises.filter(e => {
      if (cat !== 'all' && e.category !== cat) return false;
      if (muscle !== 'all' && e.muscleGroup !== muscle) return false;
      if (!exerciseMatches(e, search)) return false;
      return true;
    });
  }, [exercises, search, cat, muscle]);
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(e => {
      const k = MUSCLE_GROUPS[e.muscleGroup] || e.muscleGroup;
      if (!g[k]) g[k] = [];
      g[k].push(e);
    });
    return g;
  }, [filtered]);

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50">
      <div className="max-w-md mx-auto h-full w-full bg-zinc-950 flex flex-col">
        <header className="shrink-0 bg-zinc-950 border-b border-zinc-800 px-5 py-3 flex items-center gap-3">
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-display text-2xl flex-1">EJERCICIOS</h2>
        </header>
        <div className="shrink-0 px-5 py-3 space-y-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-lime-300/50 outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[['all', 'Todos'], ['strength', 'Fuerza'], ['cardio', 'Cardio'], ['other', 'Otros']].map(([id, lbl]) => (
              <button
                key={id}
                onClick={() => setCat(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${cat === id ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
              >
                {lbl.toUpperCase()}
              </button>
            ))}
          </div>
          <select value={muscle} onChange={e => setMuscle(e.target.value)}
            aria-label="Filtrar por grupo muscular"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300">
            <option value="all">Todos los grupos musculares</option>
            {Object.entries(MUSCLE_GROUPS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-8">
          {Object.entries(grouped).map(([group, list]) => (
            <div key={group} className="px-5 pt-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">{group}</div>
              <div className="space-y-1">
                {list.map(e => (
                  <button
                    key={e.id}
                    onClick={() => onPick(e)}
                    className="w-full text-left bg-zinc-900 hover:bg-zinc-800 rounded-lg px-3 py-2.5 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-zinc-100">{e.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{e.equipment}</div>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm">No hay resultados</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SESSION DETAIL
// ============================================================

function SessionDetail({ session, exMap, onBack, onDelete, onEdit, onRepeat, hasActive }) {
  const dur = sessionDuration(session);
  const vol = sessionVolume(session);
  return (
    <div>
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 px-5 py-3 flex items-center gap-2">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-200 p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-xl flex-1 truncate">DETALLE</h2>
        <button onClick={onEdit} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
          <Pencil className="w-3.5 h-3.5" /> EDITAR
        </button>
        <button onClick={onDelete} className="text-zinc-500 hover:text-red-400 p-1" aria-label="Eliminar entrenamiento">
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <div className="px-5 py-5">
        <div className="text-xs text-zinc-500 mb-1">{formatLong(session.date)} • {formatTime(session.date)}</div>
        <h1 className="font-display text-4xl leading-none mb-4">{session.name || 'Entrenamiento'}</h1>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Duración</div>
            <div className="font-mono text-lg text-lime-300">{fmtDur(dur)}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Ejercicios</div>
            <div className="font-display text-2xl">{session.entries?.length || 0}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Volumen</div>
            <div className="font-mono text-sm text-zinc-300">{vol > 0 ? `${vol.toLocaleString('es-ES')} kg` : '—'}</div>
          </div>
        </div>

        <button onClick={onRepeat} disabled={hasActive}
          className="w-full bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 rounded-xl py-3 mb-5 font-bold flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> REPETIR ENTRENAMIENTO
        </button>
        {hasActive && <p className="text-xs text-zinc-500 -mt-3 mb-5 text-center">Termina la sesión en curso para repetir esta.</p>}

        {session.notes && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
              <MessageSquare className="w-3 h-3" /> Notas de la sesión
            </div>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{session.notes}</p>
          </div>
        )}

        <div className="space-y-4">
          {session.entries?.map((entry, i) => {
            const ex = exMap[entry.exerciseId];
            if (!ex) return null;
            return (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <div className="font-display text-lg leading-tight">{ex.name.toUpperCase()}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{MUSCLE_GROUPS[ex.muscleGroup] || ex.muscleGroup}</span>
                    {entry.restSeconds > 0 && <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {fmtDur(entry.restSeconds)}</span>}
                  </div>
                </div>
                {entry.notes && (
                  <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-800/30">
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap italic">{entry.notes}</p>
                  </div>
                )}
                <div className="p-4">
                  <SetHeader type={ex.type} unit={ex.distanceUnit} editable={false} />
                  <div className="space-y-1.5 mt-2">
                    {entry.sets.map((s, si) => (
                      <div key={si} className="flex items-center gap-1.5 font-mono text-sm">
                        <div className="w-7 text-center text-xs text-zinc-500">{si + 1}</div>
                        {ex.type === 'weight_reps' && (<>
                          <div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.weight || '–'}</div>
                          <div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.reps || '–'}</div>
                          <div className="w-11 text-center bg-zinc-800/50 py-1.5 rounded text-xs">{s.rir != null ? s.rir : '–'}</div>
                        </>)}
                        {ex.type === 'reps' && (<>
                          <div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.reps || '–'}</div>
                          <div className="w-11 text-center bg-zinc-800/50 py-1.5 rounded text-xs">{s.rir != null ? s.rir : '–'}</div>
                        </>)}
                        {ex.type === 'distance_duration' && (<><div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.distance || '–'}</div><div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.duration ? fmtDur(s.duration) : '–'}</div></>)}
                        {ex.type === 'duration' && (<div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.duration ? fmtDur(s.duration) : '–'}</div>)}
                        <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${s.done ? 'bg-lime-300/20 text-lime-300' : 'bg-zinc-800/30 text-zinc-700'}`}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SessionSummary({ session, previousSessions, allSessions, exMap, onClose, onDetail }) {
  const summary = summarizeSession(session, previousSessions, exMap);
  return (
    <div className="px-5 pt-8 pb-8">
      <div className="text-xs text-lime-300 font-bold tracking-widest">ENTRENAMIENTO GUARDADO</div>
      <h1 className="font-display text-4xl mt-1">{session.name.toUpperCase()}</h1>
      <div className="grid grid-cols-3 gap-2 mt-5">
        <div className="bg-zinc-900 rounded-xl p-3"><div className="text-[10px] text-zinc-500">SERIES</div><div className="font-display text-2xl">{summary.sets}</div></div>
        <div className="bg-zinc-900 rounded-xl p-3"><div className="text-[10px] text-zinc-500">EJERCICIOS</div><div className="font-display text-2xl">{summary.exercises}</div></div>
        <div className="bg-zinc-900 rounded-xl p-3"><div className="text-[10px] text-zinc-500">VOLUMEN</div><div className="font-display text-xl">{summary.volume.toLocaleString('es-ES')}<span className="text-xs"> kg</span></div></div>
      </div>
      <h2 className="font-display text-xl mt-7 mb-3">HOY Y LA PRÓXIMA VEZ</h2>
      <div className="space-y-3">
        {summary.rows.map(row => {
          const exercise = exMap[row.exerciseId];
          const entry = session.entries[row.entryIndex];
          const next = exercise ? predictGhost({ exercise, setIndex: 0,
            sessions: allSessions, routineId: session.routineId,
            targetSet: entry?.sets[0], currentEntry: null }) : null;
          return (
            <div key={`${row.exerciseId}-${row.entryIndex}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="font-bold text-zinc-100">{row.name}</div>
              <div className="text-xs text-zinc-400 mt-1">{row.sets} serie(s) · primera: {setBrief(row.first, exercise?.type)}</div>
              {row.before && <div className="text-xs text-zinc-500 mt-1">Anterior {row.scope === 'rutina' ? 'en esta rutina' : 'general'}: {setBrief(row.before, exercise?.type)}</div>}
              {next && <div className="text-xs text-lime-300 mt-2">Próximo ghost: {setBrief(next, exercise.type)}</div>}
            </div>
          );
        })}
      </div>
      <button onClick={onDetail} className="w-full mt-6 bg-zinc-800 text-zinc-100 py-3 rounded-xl font-bold">VER DETALLE</button>
      <button onClick={onClose} className="w-full mt-2 bg-lime-300 text-zinc-950 py-3 rounded-xl font-bold">VOLVER AL INICIO</button>
    </div>
  );
}

// ============================================================
// ROUTINES VIEW (list)
// ============================================================

function RoutinesView({ routines, exMap, onStart, onNew, onEdit, onDelete, onDuplicate, hasActive }) {
  return (
    <div>
      <header className="px-5 pt-8 pb-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">PLANTILLAS</div>
          <h1 className="font-display text-4xl leading-none">RUTINAS</h1>
          <div className="text-xs text-zinc-500 mt-1">{routines.length} guardada(s)</div>
        </div>
        <button
          onClick={onNew}
          className="bg-lime-300 text-zinc-950 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-lime-400"
        >
          <Plus className="w-4 h-4" strokeWidth={3} /> CREAR
        </button>
      </header>

      <div className="px-5 pb-4">
        {routines.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">Aún no tienes rutinas creadas.</div>
            <div className="text-xs mt-1 text-zinc-600">Crea una para tener tu plantilla de ejercicios lista.</div>
            <button
              onClick={onNew}
              className="mt-4 bg-lime-300 text-zinc-950 px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1 hover:bg-lime-400"
            >
              <Plus className="w-4 h-4" strokeWidth={3} /> CREAR RUTINA
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map(r => {
              const routineEntries = availableRoutineEntries(r, exMap);
              const totalSets = routineEntries.reduce((a, e) => a + (e.sets?.length || 0), 0);
              return (
                <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="font-display text-2xl text-zinc-100 leading-tight mb-1">{r.name.toUpperCase()}</div>
                    <div className="text-xs text-zinc-500 mb-3">
                      {routineEntries.length} ejercicio(s) · {totalSets} serie(s)
                    </div>
                    {routineEntries.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {routineEntries.slice(0, 4).map((re, i) => {
                          const ex = exMap[re.exerciseId];
                          return (
                            <span key={i} className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-medium">
                              {ex?.name || '?'}
                            </span>
                          );
                        })}
                        {routineEntries.length > 4 && (
                          <span className="text-[10px] text-zinc-500 px-2 py-0.5">+{routineEntries.length - 4}</span>
                        )}
                      </div>
                    )}
                    {r.notes && (
                      <p className="text-xs text-zinc-400 italic line-clamp-2 mb-3">{r.notes}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onStart(r.id)}
                        disabled={hasActive}
                        className="flex-1 bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-1 hover:bg-lime-400 transition"
                      >
                        <Play className="w-4 h-4 fill-current" /> INICIAR
                      </button>
                      <button onClick={() => onEdit(r)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-full" aria-label="Editar rutina">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDuplicate(r.id)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-full" aria-label="Duplicar rutina">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(r.id)} className="bg-zinc-800 hover:bg-red-500/30 text-zinc-400 hover:text-red-400 p-2 rounded-full" aria-label="Eliminar rutina">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {hasActive && (
                      <div className="text-[10px] text-zinc-500 italic mt-2 text-center">
                        Termina o cancela el entrenamiento en curso para iniciar una rutina
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ROUTINE EDITOR (create / edit)
// ============================================================

function RoutineEditor({ initial, exercises, exMap, onSave, onCancel, showConfirm }) {
  const [routine, setRoutine] = useState(() => initial ? {
    ...JSON.parse(JSON.stringify(initial)),
    exercises: availableRoutineEntries(initial, exMap),
  } : {
    name: '',
    notes: '',
    exercises: [],
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch) => { setRoutine(r => ({ ...r, ...patch })); setDirty(true); };
  const updateExercise = (idx, patch) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => i !== idx ? e : { ...e, ...patch }),
    }));
    setDirty(true);
  };

  const addExercise = (ex) => {
    setRoutine(r => ({
      ...r,
      exercises: [...r.exercises, {
        exerciseId: ex.id,
        restSeconds: 0,
        notes: '',
        sets: [{ repsMin: 8, repsMax: 12, rir: 2 }, { repsMin: 8, repsMax: 12, rir: 2 }, { repsMin: 8, repsMax: 12, rir: 2 }],
      }],
    }));
    setDirty(true);
    setPickerOpen(false);
  };

  const removeExercise = (idx) => {
    showConfirm({
      title: 'Quitar ejercicio',
      body: 'Se eliminará de esta rutina.',
      confirmLabel: 'Quitar',
      danger: true,
      onConfirm: () => {
        setRoutine(r => ({ ...r, exercises: r.exercises.filter((_, i) => i !== idx) }));
        setDirty(true);
      },
    });
  };

  const moveExercise = (idx, dir) => {
    setRoutine(r => {
      const exs = [...r.exercises];
      const t = idx + dir;
      if (t < 0 || t >= exs.length) return r;
      [exs[idx], exs[t]] = [exs[t], exs[idx]];
      return { ...r, exercises: exs };
    });
    setDirty(true);
  };

  const addSet = (exIdx) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const last = e.sets[e.sets.length - 1] || { repsMin: 8, repsMax: 12, rir: 2 };
        return { ...e, sets: [...e.sets, { ...last }] };
      }),
    }));
    setDirty(true);
  };

  const removeSet = (exIdx, setIdx) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.filter((_, j) => j !== setIdx) }),
    }));
    setDirty(true);
  };

  const updateSet = (exIdx, setIdx, patch) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => i !== exIdx ? e : {
        ...e,
        sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, ...patch }),
      }),
    }));
    setDirty(true);
  };

  const handleCancel = () => {
    if (!dirty) { onCancel(); return; }
    showConfirm({
      title: 'Descartar cambios',
      body: 'Se perderán las modificaciones de la rutina.',
      confirmLabel: 'Descartar',
      danger: true,
      onConfirm: onCancel,
    });
  };

  const handleSave = () => {
    if (!routine.name.trim()) {
      showConfirm({ title: 'Falta el nombre', body: 'Ponle un nombre a la rutina antes de guardar.', confirmLabel: 'OK', hideCancel: true, onConfirm: () => {} });
      return;
    }
    if (!routine.exercises.length) {
      showConfirm({ title: 'Sin ejercicios', body: 'Añade al menos un ejercicio a la rutina.', confirmLabel: 'OK', hideCancel: true, onConfirm: () => {} });
      return;
    }
    onSave(routine);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 px-5 py-3 flex items-center gap-2">
        <button onClick={handleCancel} className="text-zinc-400 hover:text-zinc-200 p-1 -ml-1">
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-display text-xl flex-1 truncate">{initial ? 'EDITAR RUTINA' : 'NUEVA RUTINA'}</h2>
        <button
          onClick={handleSave}
          className="bg-lime-300 text-zinc-950 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 hover:bg-lime-400 transition"
        >
          <Save className="w-4 h-4" strokeWidth={3} /> GUARDAR
        </button>
      </header>

      <div className="p-5 space-y-4">
        {/* Routine info */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">Nombre</label>
          <input
            value={routine.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="Ej: Pecho + Bíceps"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 outline-none focus:border-lime-300/50 font-display text-xl"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">Notas (opcional)</label>
          <textarea
            value={routine.notes || ''}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Notas generales sobre la rutina, objetivos, etc."
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-lime-300/50 resize-none"
          />
        </div>

        {/* Exercises */}
        <div>
          <h3 className="font-display text-xl text-zinc-300 mb-2">EJERCICIOS</h3>
          {routine.exercises.length === 0 ? (
            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
              Aún no has añadido ejercicios.
            </div>
          ) : (
            <div className="space-y-3">
              {routine.exercises.map((re, ei) => {
                const ex = exMap[re.exerciseId];
                if (!ex) return null;
                return (
                  <RoutineExerciseEditor
                    key={ei}
                    re={re}
                    ex={ex}
                    isFirst={ei === 0}
                    isLast={ei === routine.exercises.length - 1}
                    onUpdate={patch => updateExercise(ei, patch)}
                    onRemove={() => removeExercise(ei)}
                    onMoveUp={() => moveExercise(ei, -1)}
                    onMoveDown={() => moveExercise(ei, +1)}
                    onAddSet={() => addSet(ei)}
                    onRemoveSet={si => removeSet(ei, si)}
                    onUpdateSet={(si, patch) => updateSet(ei, si, patch)}
                  />
                );
              })}
            </div>
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full mt-3 border-2 border-dashed border-zinc-700 hover:border-lime-300 hover:bg-lime-300/5 rounded-2xl py-5 text-zinc-400 hover:text-lime-300 transition flex flex-col items-center gap-1 font-bold"
          >
            <Plus className="w-6 h-6" /> AÑADIR EJERCICIO
          </button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker exercises={exercises} onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

function RoutineExerciseEditor({ re, ex, isFirst, isLast, onUpdate, onRemove, onMoveUp, onMoveDown, onAddSet, onRemoveSet, onUpdateSet }) {
  const [showNotes, setShowNotes] = useState(!!re.notes);
  const [showRest, setShowRest] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        <div className="flex flex-col -ml-1 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 p-0.5">
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 p-0.5">
            <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg leading-tight">{ex.name.toUpperCase()}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{MUSCLE_GROUPS[ex.muscleGroup] || ex.muscleGroup}</div>
        </div>
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400 p-1 shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 pt-3 flex-wrap">
        <button
          onClick={() => setShowRest(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${re.restSeconds > 0 ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <Timer className="w-3 h-3" /> {re.restSeconds > 0 ? fmtDur(re.restSeconds) : 'Descanso'}
        </button>
        <button
          onClick={() => setShowNotes(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${re.notes ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <MessageSquare className="w-3 h-3" /> Notas
        </button>
      </div>

      {showRest && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Descanso:</span>
          <DurField
            value={re.restSeconds || 0}
            onChange={v => onUpdate({ restSeconds: v })}
            placeholder="mm:ss"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200 w-20 outline-none focus:border-lime-300/50 placeholder:text-zinc-500 text-center"
          />
          <div className="flex gap-1 ml-auto">
            {[60, 90, 120, 180].map(sec => (
              <button
                key={sec}
                onClick={() => onUpdate({ restSeconds: sec })}
                className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
              >
                {sec / 60 < 1 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      {showNotes && (
        <div className="px-3 pt-2">
          <textarea
            value={re.notes || ''}
            onChange={e => onUpdate({ notes: e.target.value })}
            placeholder="Técnica, indicaciones, recordatorios..."
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-lime-300/50 resize-none"
          />
        </div>
      )}

      <div className="p-3 mt-2">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold tracking-wider px-1 mb-1.5">
          <div className="w-7" />
          <div className="w-5 text-center">#</div>
          <div className="flex-1 text-center">REPS MIN</div>
          <div className="flex-1 text-center">REPS MAX</div>
          <div className="w-11 text-center">RIR</div>
        </div>
        <div className="space-y-1.5">
          {re.sets.map((s, si) => (
            <div key={si} className="flex items-center gap-1.5">
              <button
                onClick={() => onRemoveSet(si)}
                className="w-7 h-9 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition shrink-0"
                aria-label="Eliminar serie"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-5 text-center font-mono text-xs text-zinc-500">{si + 1}</div>
              <input
                type="number"
                inputMode="numeric"
                value={s.repsMin ?? ''}
                placeholder="8"
                onChange={e => onUpdateSet(si, { repsMin: e.target.value === '' ? null : parseInt(e.target.value) })}
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none placeholder:text-zinc-500"
              />
              <input
                type="number"
                inputMode="numeric"
                value={s.repsMax ?? ''}
                placeholder="12"
                onChange={e => onUpdateSet(si, { repsMax: e.target.value === '' ? null : parseInt(e.target.value) })}
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none placeholder:text-zinc-500"
              />
              <input
                type="number"
                inputMode="numeric"
                value={s.rir ?? ''}
                placeholder="2"
                onChange={e => onUpdateSet(si, { rir: e.target.value === '' ? null : parseInt(e.target.value) })}
                className="w-11 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none placeholder:text-zinc-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={onAddSet}
          className="w-full text-sm text-zinc-400 hover:text-lime-300 hover:bg-zinc-800 py-2 rounded transition flex items-center justify-center gap-1 mt-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Añadir serie
        </button>
      </div>
    </div>
  );
}

// ============================================================
// CALENDAR
// ============================================================

function CalendarView({ sessions, exMap, selectedDate, setSelectedDate, onOpenSession }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const sessionsByDay = useMemo(() => {
    const m = {};
    sessions.forEach(s => {
      const k = dateKey(s.date);
      if (!m[k]) m[k] = [];
      m[k].push(s);
    });
    return m;
  }, [sessions]);

  const days = useMemo(() => buildMonthGrid(month), [month]);
  const monthName = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const today = dateKey(new Date());
  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const selectedSessions = selectedKey ? (sessionsByDay[selectedKey] || []) : [];

  return (
    <div>
      <header className="px-5 pt-8 pb-4">
        <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">CALENDARIO</div>
        <h1 className="font-display text-4xl leading-none">HISTORIAL</h1>
      </header>

      <div className="px-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="text-zinc-400 hover:text-zinc-100 p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-display text-xl capitalize">{monthName}</div>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="text-zinc-400 hover:text-zinc-100 p-1">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-[10px] font-bold text-zinc-500 px-2 pt-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 p-2">
            {days.map((d, i) => {
              const k = dateKey(d.date);
              const has = !!sessionsByDay[k];
              const isToday = k === today;
              const isSelected = k === selectedKey;
              const inMonth = d.inMonth;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(d.date)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition relative
                    ${!inMonth ? 'text-zinc-700' : 'text-zinc-200'}
                    ${isSelected ? 'bg-lime-300 text-zinc-950 font-bold' :
                      has ? 'bg-lime-300/15 hover:bg-lime-300/25 text-lime-200' :
                        'hover:bg-zinc-800'}
                    ${isToday && !isSelected ? 'ring-1 ring-zinc-500' : ''}
                  `}
                >
                  <span className={`font-mono ${isToday && !isSelected ? 'font-bold' : ''}`}>{d.date.getDate()}</span>
                  {has && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 bg-lime-300 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 mt-6">
        {selectedDate ? (
          <>
            <h2 className="font-display text-xl text-zinc-300 mb-3 capitalize">{formatLong(selectedDate)}</h2>
            {selectedSessions.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
                Sin entrenamientos este día.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSessions.map(s => (
                  <SessionCard key={s.id} session={s} exMap={exMap} onClick={() => onOpenSession(s)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-zinc-500 text-sm py-4">
            Toca un día para ver el detalle.
          </div>
        )}
      </div>
    </div>
  );
}

function buildMonthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // monday-first
  const days = [];
  for (let i = startWeekday; i > 0; i--) {
    const d = new Date(first);
    d.setDate(first.getDate() - i);
    days.push({ date: d, inMonth: false });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push({ date: new Date(month.getFullYear(), month.getMonth(), i), inMonth: true });
  }
  while (days.length < 42) {
    const last = days[days.length - 1].date;
    const d = new Date(last);
    d.setDate(last.getDate() + 1);
    days.push({ date: d, inMonth: d.getMonth() === month.getMonth() });
  }
  return days.slice(0, 42);
}

// ============================================================
// EXERCISES VIEW
// ============================================================

function ExercisesView({ exercises, customExercises, onOpen, onNew, onDelete, onRestore }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [muscle, setMuscle] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const archived = customExercises.filter(ex => ex.hidden);

  const filtered = useMemo(() => {
    return exercises.filter(e => {
      if (cat !== 'all' && e.category !== cat) return false;
      if (muscle !== 'all' && e.muscleGroup !== muscle) return false;
      if (!exerciseMatches(e, search)) return false;
      return true;
    });
  }, [exercises, search, cat, muscle]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(e => {
      const k = MUSCLE_GROUPS[e.muscleGroup] || e.muscleGroup;
      if (!g[k]) g[k] = [];
      g[k].push(e);
    });
    return g;
  }, [filtered]);

  const customIds = new Set(customExercises.map(c => c.id));

  return (
    <div>
      <header className="px-5 pt-8 pb-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">CATÁLOGO</div>
          <h1 className="font-display text-4xl leading-none">EJERCICIOS</h1>
          <div className="text-xs text-zinc-500 mt-1">{exercises.length} disponibles</div>
        </div>
        <button
          onClick={onNew}
          className="bg-lime-300 text-zinc-950 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-lime-400"
        >
          <Plus className="w-4 h-4" strokeWidth={3} /> CREAR
        </button>
      </header>

      <div className="px-5 space-y-3 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-lime-300/50 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {[['all', 'Todos'], ['strength', 'Fuerza'], ['cardio', 'Cardio'], ['other', 'Otros']].map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setCat(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${cat === id ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
            >
              {lbl.toUpperCase()}
            </button>
          ))}
        </div>
        <select value={muscle} onChange={e => setMuscle(e.target.value)}
          aria-label="Filtrar por grupo muscular"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300">
          <option value="all">Todos los grupos musculares</option>
          {Object.entries(MUSCLE_GROUPS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      <div className="pb-4">
        {Object.entries(grouped).map(([group, list]) => (
          <div key={group} className="px-5 pt-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">{group} • {list.length}</div>
            <div className="space-y-1">
              {list.map(e => {
                const isCustom = customIds.has(e.id);
                return (
                  <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-lg flex items-center hover:bg-zinc-800/80 transition">
                    <button onClick={() => onOpen(e)} className="flex-1 text-left px-3 py-2.5">
                      <div className="font-medium text-zinc-100 flex items-center gap-2">
                        {e.name}
                        {isCustom && <span className="text-[9px] bg-lime-300/20 text-lime-300 px-1.5 py-0.5 rounded font-bold">CUSTOM</span>}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                        {e.equipment} • {TYPE_LABELS[e.type]}
                      </div>
                    </button>
                    {isCustom && (
                      <button onClick={() => onDelete(e.id)} className="text-zinc-500 hover:text-red-400 p-3">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {archived.length > 0 && (
          <div className="px-5 pt-5">
            <button onClick={() => setShowArchived(open => !open)}
              className="text-xs text-zinc-500 hover:text-zinc-200 font-bold">
              {showArchived ? 'OCULTAR' : 'VER'} ARCHIVADOS ({archived.length})
            </button>
            {showArchived && (
              <div className="space-y-1 mt-2">
                {archived.map(ex => (
                  <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-lg flex items-center px-3 py-2.5 gap-3">
                    <span className="flex-1 text-sm text-zinc-400">{ex.name}</span>
                    <button onClick={() => onRestore(ex.id)} className="text-xs text-lime-300 font-bold">RECUPERAR</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NewExerciseForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('strength');
  const [muscleGroup, setMuscleGroup] = useState('pecho');
  const [equipment, setEquipment] = useState('');
  const [type, setType] = useState('weight_reps');
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) { setError('Pon un nombre al ejercicio'); return; }
    const ex = { name: name.trim(), category, muscleGroup, equipment: equipment.trim() || 'Otros', type };
    if (type === 'distance_duration') ex.distanceUnit = distanceUnit;
    onSave(ex);
  };

  return (
    <div>
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 px-5 py-3 flex items-center gap-3">
        <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-xl flex-1">NUEVO EJERCICIO</h2>
      </header>
      <div className="px-5 py-5 space-y-4">
        <Field label="Nombre">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Press inclinado smith" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 outline-none focus:border-lime-300/50" />
        </Field>
        <Field label="Categoría">
          <Select value={category} onChange={setCategory} options={[['strength', 'Fuerza'], ['cardio', 'Cardio'], ['other', 'Otros']]} />
        </Field>
        <Field label="Grupo muscular">
          <Select value={muscleGroup} onChange={setMuscleGroup} options={Object.entries(MUSCLE_GROUPS)} />
        </Field>
        <Field label="Material / equipamiento">
          <input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="Ej: Mancuernas, Barra, Polea..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 outline-none focus:border-lime-300/50" />
        </Field>
        <Field label="Tipo de registro">
          <Select value={type} onChange={setType} options={Object.entries(TYPE_LABELS)} />
          <div className="text-xs text-zinc-500 mt-1.5">
            {type === 'weight_reps' && 'Para ejercicios con pesas (peso × repeticiones).'}
            {type === 'reps' && 'Sólo repeticiones (ej. peso corporal).'}
            {type === 'distance_duration' && 'Cardio con distancia y tiempo (correr, nadar, ciclismo...).'}
            {type === 'duration' && 'Sólo tiempo (yoga, plancha, HIIT...).'}
          </div>
        </Field>
        {type === 'distance_duration' && (
          <Field label="Unidad de distancia">
            <Select value={distanceUnit} onChange={setDistanceUnit} options={[['km', 'Kilómetros (km)'], ['m', 'Metros (m)'], ['mi', 'Millas (mi)']]} />
          </Field>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <button onClick={submit} className="w-full bg-lime-300 text-zinc-950 py-3 rounded-full font-bold hover:bg-lime-400 transition mt-4">
          GUARDAR EJERCICIO
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 outline-none focus:border-lime-300/50 appearance-none pr-8">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
    </div>
  );
}

// ============================================================
// EXERCISE DETAIL (history for one exercise)
// ============================================================

function ExerciseDetail({ exercise, sessions, onBack }) {
  const history = useMemo(() => {
    const out = [];
    sessions.forEach(s => {
      const e = s.entries?.find(x => x.exerciseId === exercise.id);
      if (e && completedSets(e).length) out.push({ session: s, entry: e });
    });
    return out;
  }, [sessions, exercise.id]);

  const stats = useMemo(() => computeExerciseStats(exercise, history), [exercise, history]);

  return (
    <div>
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 px-5 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl truncate">{exercise.name.toUpperCase()}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{MUSCLE_GROUPS[exercise.muscleGroup] || exercise.muscleGroup} • {exercise.equipment}</div>
        </div>
      </header>

      <div className="px-5 py-5">
        {history.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">Sin historial todavía.</div>
            <div className="text-xs mt-1 text-zinc-600">Inclúyelo en un entrenamiento para ver tu progreso.</div>
          </div>
        ) : (
          <>
            <PRBlock stats={stats} type={exercise.type} unit={exercise.distanceUnit} />
            <ExerciseChart history={history} exercise={exercise} />
            <div className="mt-6">
              <h3 className="font-display text-lg mb-2">HISTORIAL</h3>
              <div className="space-y-2">
                {history.map(({ session, entry }, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-zinc-400">{formatLong(session.date)}</div>
                      <div className="text-[10px] text-zinc-600">{completedSets(entry).length} series</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {completedSets(entry).map((s, si) => (
                        <SetPill key={si} set={s} type={exercise.type} unit={exercise.distanceUnit} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SetPill({ set, type, unit }) {
  let txt = '';
  if (type === 'weight_reps') txt = `${set.weight || '?'}kg × ${set.reps || '?'}`;
  else if (type === 'reps') txt = `× ${set.reps || '?'}`;
  else if (type === 'distance_duration') txt = `${set.distance || '?'}${unit || ''} / ${fmtDur(set.duration)}`;
  else if (type === 'duration') txt = fmtDur(set.duration);
  return <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-1 rounded">{txt}</span>;
}

function computeExerciseStats(exercise, history) {
  if (history.length === 0) return null;
  const stats = {};
  if (exercise.type === 'weight_reps') {
    let maxWeight = 0, max1RM = 0, totalVolume = 0, bestSet = null;
    history.forEach(({ entry }) => {
      completedSets(entry).forEach(s => {
        if (s.weight && s.reps) {
          if (s.weight > maxWeight) maxWeight = s.weight;
          const oneRm = epley(s.weight, s.reps);
          if (oneRm > max1RM) { max1RM = oneRm; bestSet = s; }
          totalVolume += s.weight * s.reps;
        }
      });
    });
    stats.maxWeight = maxWeight;
    stats.max1RM = max1RM;
    stats.totalVolume = totalVolume;
    stats.bestSet = bestSet;
    stats.totalSessions = history.length;
  } else if (exercise.type === 'reps') {
    let maxReps = 0, totalReps = 0;
    history.forEach(({ entry }) => completedSets(entry).forEach(s => {
      if (s.reps > maxReps) maxReps = s.reps;
      totalReps += s.reps || 0;
    }));
    stats.maxReps = maxReps;
    stats.totalReps = totalReps;
    stats.totalSessions = history.length;
  } else if (exercise.type === 'distance_duration') {
    let maxDist = 0, totalDist = 0, bestPace = Infinity, longestRun = 0;
    history.forEach(({ entry }) => completedSets(entry).forEach(s => {
      if (s.distance) totalDist += s.distance;
      if (s.distance > maxDist) maxDist = s.distance;
      if (s.duration > longestRun) longestRun = s.duration;
      if (s.distance && s.duration && s.distance > 0) {
        const pace = s.duration / s.distance;
        if (pace < bestPace) bestPace = pace;
      }
    }));
    stats.maxDist = maxDist;
    stats.totalDist = totalDist;
    stats.bestPace = bestPace === Infinity ? 0 : bestPace;
    stats.longestRun = longestRun;
    stats.totalSessions = history.length;
  } else if (exercise.type === 'duration') {
    let maxDur = 0, totalDur = 0;
    history.forEach(({ entry }) => completedSets(entry).forEach(s => {
      if (s.duration > maxDur) maxDur = s.duration;
      totalDur += s.duration || 0;
    }));
    stats.maxDur = maxDur;
    stats.totalDur = totalDur;
    stats.totalSessions = history.length;
  }
  return stats;
}

function PRBlock({ stats, type, unit }) {
  if (!stats) return null;
  const items = [];
  if (type === 'weight_reps') {
    items.push(['PR Peso', `${stats.maxWeight} kg`]);
    items.push(['1RM est.', `${Math.round(stats.max1RM)} kg`]);
    items.push(['Volumen total', `${stats.totalVolume.toLocaleString('es-ES')} kg`]);
  } else if (type === 'reps') {
    items.push(['Mejor serie', `${stats.maxReps} reps`]);
    items.push(['Reps totales', stats.totalReps]);
  } else if (type === 'distance_duration') {
    items.push([`Mejor distancia`, `${stats.maxDist} ${unit || ''}`]);
    items.push(['Distancia total', `${stats.totalDist.toFixed(1)} ${unit || ''}`]);
    items.push(['Mejor pace', stats.bestPace ? `${fmtDur(stats.bestPace)} /${unit}` : '—']);
  } else if (type === 'duration') {
    items.push(['Más largo', fmtDur(stats.maxDur)]);
    items.push(['Tiempo total', fmtDur(stats.totalDur)]);
  }
  items.push(['Sesiones', stats.totalSessions]);

  return (
    <div className="grid grid-cols-2 gap-2 mb-5">
      {items.map(([l, v], i) => (
        <div key={i} className={`rounded-xl p-3 ${i === 0 ? 'bg-lime-300/10 border border-lime-300/30' : 'bg-zinc-900 border border-zinc-800'}`}>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1">
            {i === 0 && <Award className="w-3 h-3 text-lime-300" />}{l}
          </div>
          <div className={`font-display text-2xl ${i === 0 ? 'text-lime-300' : ''}`}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function ExerciseChart({ history, exercise }) {
  const chartData = useMemo(() => {
    return history.slice().reverse().map(({ session, entry }) => {
      const d = formatShort(session.date);
      if (exercise.type === 'weight_reps') {
        let maxW = 0, vol = 0, max1 = 0;
        completedSets(entry).forEach(s => {
          if (s.weight && s.reps) {
            if (s.weight > maxW) maxW = s.weight;
            vol += s.weight * s.reps;
            const e1 = epley(s.weight, s.reps);
            if (e1 > max1) max1 = e1;
          }
        });
        return { date: d, max: maxW, volume: vol, est1RM: Math.round(max1) };
      } else if (exercise.type === 'reps') {
        let total = 0, maxR = 0;
        completedSets(entry).forEach(s => { total += s.reps || 0; if (s.reps > maxR) maxR = s.reps; });
        return { date: d, total, max: maxR };
      } else if (exercise.type === 'distance_duration') {
        let dist = 0, dur = 0;
        completedSets(entry).forEach(s => { dist += s.distance || 0; dur += s.duration || 0; });
        const pace = dist > 0 ? dur / dist : 0;
        return { date: d, distance: dist, pace: Math.round(pace) };
      } else {
        let dur = 0;
        completedSets(entry).forEach(s => { dur += s.duration || 0; });
        return { date: d, duration: Math.round(dur / 60) };
      }
    });
  }, [history, exercise]);

  const tickStyle = { fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' };
  const tooltipStyle = { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 };

  return (
    <div>
      <h3 className="font-display text-lg mb-2">EVOLUCIÓN</h3>
      {exercise.type === 'weight_reps' && (
        <>
          <ChartCard title="Peso máximo (kg)">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
                <YAxis tick={tickStyle} stroke="#3f3f46" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="max" stroke="#d4ff37" strokeWidth={2.5} dot={{ fill: '#d4ff37', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Volumen por sesión (kg)">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
                <YAxis tick={tickStyle} stroke="#3f3f46" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="volume" fill="#d4ff37" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="1RM estimado (Epley)">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
                <YAxis tick={tickStyle} stroke="#3f3f46" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="est1RM" stroke="#d4ff37" fill="#d4ff37" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
      {exercise.type === 'reps' && (
        <>
          <ChartCard title="Reps totales por sesión">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
                <YAxis tick={tickStyle} stroke="#3f3f46" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="#d4ff37" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
      {exercise.type === 'distance_duration' && (
        <>
          <ChartCard title={`Distancia (${exercise.distanceUnit || 'km'})`}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
                <YAxis tick={tickStyle} stroke="#3f3f46" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="distance" fill="#d4ff37" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={`Pace (seg/${exercise.distanceUnit || 'km'} - menor = más rápido)`}>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
                <YAxis tick={tickStyle} stroke="#3f3f46" reversed />
                <Tooltip contentStyle={tooltipStyle} formatter={v => fmtDur(v)} />
                <Line type="monotone" dataKey="pace" stroke="#d4ff37" strokeWidth={2.5} dot={{ fill: '#d4ff37', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
      {exercise.type === 'duration' && (
        <ChartCard title="Duración por sesión (min)">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
              <YAxis tick={tickStyle} stroke="#3f3f46" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="duration" fill="#d4ff37" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">{title}</div>
      {children}
    </div>
  );
}

// ============================================================
// PROGRESS VIEW (overall)
// ============================================================

function ProgressView({ sessions, exercises, exMap }) {
  const [subTab, setSubTab] = useState('metrics'); // 'metrics' | 'volume'
  const [selectedExId, setSelectedExId] = useState('');
  const [range, setRange] = useState('all');

  const exercisesWithHistory = useMemo(() => {
    const ids = new Set();
    sessions.forEach(s => s.entries?.forEach(e => {
      if (completedSets(e).length) ids.add(e.exerciseId);
    }));
    return exercises.filter(e => ids.has(e.id));
  }, [sessions, exercises]);

  useEffect(() => {
    if (!selectedExId && exercisesWithHistory.length) {
      setSelectedExId(exercisesWithHistory[0].id);
    }
  }, [exercisesWithHistory, selectedExId]);

  const filtered = useMemo(() => {
    if (range === 'all') return sessions;
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[range];
    if (!days) return sessions;
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    return sessions.filter(s => new Date(s.date).getTime() >= cutoff);
  }, [sessions, range]);

  const overallStats = useMemo(() => {
    const total = filtered.length;
    const totalDur = filtered.reduce((a, s) => a + sessionDuration(s), 0);
    const totalVol = filtered.reduce((a, s) => a + sessionVolume(s), 0);
    const byMuscle = {};
    filtered.forEach(s => s.entries?.forEach(e => {
      const ex = exMap[e.exerciseId];
      if (!ex) return;
      const m = ex.muscleGroup;
      if (!byMuscle[m]) byMuscle[m] = 0;
      byMuscle[m] += completedSets(e).length;
    }));
    return { total, totalDur, totalVol, byMuscle };
  }, [filtered, exMap]);

  const activityChart = useMemo(() => {
    // Last N weeks volume / sessions
    const now = new Date();
    const weeks = [];
    const numWeeks = range === '7d' ? 1 : range === '30d' ? 5 : range === '90d' ? 13 : range === '365d' ? 52 : 16;
    for (let i = numWeeks - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i * 7 - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const inWeek = filtered.filter(s => {
        const t = new Date(s.date);
        return t >= start && t < end;
      });
      weeks.push({
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        sesiones: inWeek.length,
        volumen: inWeek.reduce((a, s) => a + sessionVolume(s), 0),
        minutos: Math.round(inWeek.reduce((a, s) => a + sessionDuration(s), 0) / 60),
      });
    }
    return weeks;
  }, [filtered, range]);

  const selectedEx = exMap[selectedExId];
  const selectedHistory = useMemo(() => {
    if (!selectedExId) return [];
    const out = [];
    filtered.forEach(s => {
      const e = s.entries?.find(x => x.exerciseId === selectedExId);
      if (e && completedSets(e).length) out.push({ session: s, entry: e });
    });
    return out;
  }, [filtered, selectedExId]);

  const tickStyle = { fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' };
  const tooltipStyle = { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 };

  return (
    <div>
      <header className="px-5 pt-8 pb-4">
        <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">PROGRESO</div>
        <h1 className="font-display text-4xl leading-none">EVOLUCIÓN</h1>
      </header>

      <div className="px-5">
        {/* Sub-tab switcher: metrics (everything that was here before) vs
            volume (the new body-map view) */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSubTab('metrics')}
            className={`flex-1 px-3 py-2 rounded-full text-xs font-bold transition ${subTab === 'metrics' ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
          >
            MÉTRICAS
          </button>
          <button
            onClick={() => setSubTab('volume')}
            className={`flex-1 px-3 py-2 rounded-full text-xs font-bold transition ${subTab === 'volume' ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
          >
            VOLUMEN
          </button>
        </div>

        {subTab === 'volume' ? (
          <VolumePanel sessions={sessions} exMap={exMap} />
        ) : (
        <>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 mb-4">
          {[['7d', '7 días'], ['30d', '30 días'], ['90d', '3 meses'], ['365d', '1 año'], ['all', 'Todo']].map(([id, l]) => (
            <button
              key={id}
              onClick={() => setRange(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${range === id ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {sessions.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">No hay datos suficientes para mostrar progreso.</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Sesiones</div>
                <div className="font-display text-2xl">{overallStats.total}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Tiempo</div>
                <div className="font-display text-2xl">{Math.floor(overallStats.totalDur / 60)}<span className="text-xs">min</span></div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Vol. total</div>
                <div className="font-display text-xl text-lime-300">{(overallStats.totalVol / 1000).toFixed(1)}<span className="text-xs">tn</span></div>
              </div>
            </div>

            <ChartCard title="Actividad semanal">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={activityChart}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={tickStyle} stroke="#3f3f46" />
                  <YAxis tick={tickStyle} stroke="#3f3f46" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sesiones" fill="#d4ff37" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {Object.keys(overallStats.byMuscle).length > 0 && (
              <ChartCard title="Series por grupo muscular">
                <div className="space-y-2 mt-1">
                  {Object.entries(overallStats.byMuscle)
                    .sort(([, a], [, b]) => b - a)
                    .map(([m, count]) => {
                      const max = Math.max(...Object.values(overallStats.byMuscle));
                      const pct = (count / max) * 100;
                      return (
                        <div key={m}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-zinc-300">{MUSCLE_GROUPS[m] || m}</span>
                            <span className="font-mono text-zinc-500">{count}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                            <div className="h-full bg-lime-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ChartCard>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Comparar ejercicio</div>
              <Select
                value={selectedExId}
                onChange={setSelectedExId}
                options={exercisesWithHistory.map(e => [e.id, e.name])}
              />
              {selectedEx && selectedHistory.length > 0 && (
                <div className="mt-3">
                  <CompactExerciseChart history={selectedHistory} exercise={selectedEx} />
                </div>
              )}
              {selectedEx && selectedHistory.length === 0 && (
                <div className="text-xs text-zinc-500 mt-3 text-center py-4">Sin datos en este rango.</div>
              )}
            </div>
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function VolumePanel({ sessions, exMap }) {
  const [windowKey, setWindowKey] = useState('week_rolling');
  const [view, setView] = useState('front');
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Compute everything in one pass — totals, drill-down, session count.
  // `now` captured at render keeps the result stable within a render pass.
  const now = Date.now();
  const breakdown = useMemo(
    () => computeVolumeBreakdown(sessions, exMap, windowKey, now),
    [sessions, exMap, windowKey, now]
  );

  // Pre-built ordered list for the "by group" summary card under the body.
  const groupSummary = useMemo(() => {
    return PRIMARY_MUSCLE_GROUPS.map(g => ({
      group: g,
      label: MUSCLE_GROUPS[g],
      count: breakdown.totalSets[g] || 0,
      level: volumeLevel(breakdown.totalSets[g] || 0, g),
      landmarks: VOLUME_LANDMARKS[g],
    }));
  }, [breakdown]);

  // Group label shown in the drill-down header
  const selectedLabel = selectedGroup ? MUSCLE_GROUPS[selectedGroup] : null;
  const selectedExercises = selectedGroup ? breakdown.byExercise[selectedGroup] : [];
  const selectedCount = selectedGroup ? breakdown.totalSets[selectedGroup] : 0;
  const selectedLandmarks = selectedGroup ? VOLUME_LANDMARKS[selectedGroup] : null;

  // Helper to colour the count text in the summary list.
  const levelColor = lvl => ({
    none: 'text-zinc-600',
    low:  'text-zinc-400',
    ok:   'text-lime-300',
    high: 'text-orange-400',
    over: 'text-red-400',
  }[lvl] || 'text-zinc-400');

  return (
    <div>
      {/* Window selector */}
      <div className="flex gap-2 mb-4">
        {Object.entries(VOLUME_WINDOWS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => { setWindowKey(key); setSelectedGroup(null); }}
            className={`flex-1 px-2 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${windowKey === key ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {breakdown.sessionCount === 0 ? (
        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
          <div className="text-sm">Sin sesiones completadas en esta ventana.</div>
          <div className="text-xs mt-1 text-zinc-600">Solo cuentan series marcadas como hechas.</div>
        </div>
      ) : (
        <>
          {/* Body map */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
            <BodyMap
              totals={breakdown.totalSets}
              view={view}
              onToggleView={setView}
              onSelectGroup={g => setSelectedGroup(prev => prev === g ? null : g)}
              selectedGroup={selectedGroup}
            />
            <div className="text-[10px] text-zinc-500 text-center mt-2">
              {breakdown.sessionCount} {breakdown.sessionCount === 1 ? 'sesión' : 'sesiones'} en la ventana · pulsa una zona para detalle
            </div>
          </div>

          {/* Drill-down: appears below when a group is selected */}
          {selectedGroup && (
            <div className="bg-zinc-900 border border-lime-300/40 rounded-2xl p-4 mb-4 anim-fade">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Detalle</div>
                  <div className="font-display text-2xl text-zinc-100 leading-tight">
                    {selectedLabel?.toUpperCase()}
                    <span className={`ml-2 text-base ${levelColor(volumeLevel(selectedCount, selectedGroup))}`}>
                      {selectedCount} series
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-zinc-500 hover:text-zinc-200 p-1"
                  aria-label="Cerrar detalle"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {selectedLandmarks && (
                <div className="text-[10px] text-zinc-500 mb-3">
                  Recomendado para hipertrofia: {selectedLandmarks.ok[0]}–{selectedLandmarks.ok[1]} series · exceso ≥ {selectedLandmarks.over}
                </div>
              )}
              {selectedExercises.length === 0 ? (
                <div className="text-sm text-zinc-500 italic">Sin ejercicios para este grupo.</div>
              ) : (
                <div className="space-y-2">
                  {selectedExercises.map(ex => (
                    <ExerciseSetsBreakdown key={ex.exerciseId} exercise={ex} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* By-group numeric summary, always visible */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Por grupo</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {groupSummary.map(({ group, label, count, level, landmarks }) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(prev => prev === group ? null : group)}
                  className={`flex items-baseline justify-between px-2 py-1 rounded transition text-left ${selectedGroup === group ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                >
                  <span className="text-xs text-zinc-300">{label}</span>
                  <span className={`font-mono text-sm ${levelColor(level)}`}>
                    {count}
                    {landmarks && <span className="text-[10px] text-zinc-600 ml-1">/{landmarks.ok[1]}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Shows one exercise's contribution to a muscle group: header line with
// total + a per-set breakdown grouped by session date. Collapsed by
// default — tap to expand — because long histories can be tall.
function ExerciseSetsBreakdown({ exercise }) {
  const [open, setOpen] = useState(false);
  const { name, sets, setDetails, type } = exercise;

  // Group setDetails by sessionId. Sessions already in newest-first order.
  const bySession = useMemo(() => {
    const groups = new Map();
    for (const s of setDetails || []) {
      const key = s.sessionId;
      if (!groups.has(key)) groups.set(key, { date: s.date, sets: [] });
      groups.get(key).sets.push(s);
    }
    return [...groups.values()];
  }, [setDetails]);

  // Render one set's payload in a compact, type-aware way:
  //   weight_reps:        80 × 10  @2
  //   reps:               12  @1
  //   distance_duration:  5.2 km · 25:00
  //   duration:           45:00
  const renderSet = (s) => {
    if (type === 'weight_reps') {
      const parts = [`${s.weight ?? '–'}`, '×', `${s.reps ?? '–'}`];
      return (
        <>
          <span className="text-zinc-100">{parts.join(' ')}</span>
          {s.rir != null && <span className="text-zinc-500 ml-1">@{s.rir}</span>}
        </>
      );
    }
    if (type === 'reps') {
      return (
        <>
          <span className="text-zinc-100">{s.reps ?? '–'}</span>
          {s.rir != null && <span className="text-zinc-500 ml-1">@{s.rir}</span>}
        </>
      );
    }
    if (type === 'distance_duration') {
      return (
        <span className="text-zinc-100">
          {s.distance ?? '–'} <span className="text-zinc-500 text-xs">·</span> {s.duration ? fmtDur(s.duration) : '–'}
        </span>
      );
    }
    if (type === 'duration') {
      return <span className="text-zinc-100">{s.duration ? fmtDur(s.duration) : '–'}</span>;
    }
    return <span className="text-zinc-500">–</span>;
  };

  return (
    <div className="bg-zinc-800/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800 transition text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="text-sm text-zinc-200 truncate">{name}</span>
        </div>
        <div className="font-mono text-sm text-zinc-100 ml-2 shrink-0">
          {sets} <span className="text-xs text-zinc-500">{sets === 1 ? 'serie' : 'series'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-zinc-800/60">
          {bySession.map((g, gi) => (
            <div key={gi}>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
                {formatShort(g.date)}
              </div>
              <div className="space-y-0.5">
                {g.sets.map((s, si) => (
                  <div key={si} className="flex items-center justify-between px-2 py-1 bg-zinc-900/60 rounded font-mono text-xs">
                    <span className="text-zinc-600 w-5 shrink-0">{si + 1}</span>
                    <span className="flex-1 text-center">{renderSet(s)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompactExerciseChart({ history, exercise }) {
  const tickStyle = { fontSize: 9, fill: '#71717a', fontFamily: 'JetBrains Mono' };
  const tooltipStyle = { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 };
  const data = useMemo(() => history.slice().reverse().map(({ session, entry }) => {
    const d = formatShort(session.date);
    if (exercise.type === 'weight_reps') {
      let maxW = 0, vol = 0;
      completedSets(entry).forEach(s => { if (s.weight > maxW) maxW = s.weight; vol += (s.weight || 0) * (s.reps || 0); });
      return { date: d, valor: maxW, secundario: vol };
    } else if (exercise.type === 'reps') {
      let total = 0;
      completedSets(entry).forEach(s => { total += s.reps || 0; });
      return { date: d, valor: total };
    } else if (exercise.type === 'distance_duration') {
      let dist = 0;
      completedSets(entry).forEach(s => dist += s.distance || 0);
      return { date: d, valor: dist };
    } else {
      let dur = 0;
      completedSets(entry).forEach(s => dur += s.duration || 0);
      return { date: d, valor: Math.round(dur / 60) };
    }
  }), [history, exercise]);

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={tickStyle} stroke="#3f3f46" />
        <YAxis tick={tickStyle} stroke="#3f3f46" />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="valor" stroke="#d4ff37" strokeWidth={2} dot={{ fill: '#d4ff37', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// SETTINGS
// ============================================================

function SettingsView({ sessions, customExercises, routines = [], bodyWeights = [], plateConfig, onUpdatePlateConfig, persistGranted, onExport, onImport, onReset }) {
  const fileInput = useRef();
  const totalDur = sessions.reduce((a, s) => a + sessionDuration(s), 0);
  const totalVol = sessions.reduce((a, s) => a + sessionVolume(s), 0);
  const [lastBackup, setLastBackup] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [plateEditorOpen, setPlateEditorOpen] = useState(false);

  useEffect(() => {
    getLastBackupAt().then(setLastBackup)
      .catch(err => console.warn('Unable to read last backup date', err));
    getStorageEstimate().then(setEstimate);
  }, [sessions]);

  const lastBackupText = useMemo(() => {
    if (!lastBackup) return 'Nunca';
    const days = Math.floor((Date.now() - lastBackup) / (24 * 3600 * 1000));
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 30) return `Hace ${days} días`;
    if (days < 365) return `Hace ${Math.floor(days / 30)} mes(es)`;
    return `Hace ${Math.floor(days / 365)} año(s)`;
  }, [lastBackup]);

  const usageText = useMemo(() => {
    if (!estimate) return null;
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    if (!quota) return null;
    const fmt = b => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${fmt(used)} usados de ${fmt(quota)}`;
  }, [estimate]);

  return (
    <div>
      <header className="px-5 pt-8 pb-4">
        <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">AJUSTES</div>
        <h1 className="font-display text-4xl leading-none">DATOS</h1>
      </header>

      <div className="px-5 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-3">Resumen</div>
          <div className="grid grid-cols-2 gap-3 font-mono text-sm">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Sesiones</div>
              <div className="font-display text-2xl text-zinc-100">{sessions.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Tiempo total</div>
              <div className="font-display text-2xl text-zinc-100">{fmtDur(totalDur)}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Volumen total</div>
              <div className="font-display text-2xl text-lime-300">{(totalVol / 1000).toFixed(1)} <span className="text-sm">tn</span></div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Rutinas</div>
              <div className="font-display text-2xl text-zinc-100">{routines.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Ej. propios</div>
              <div className="font-display text-2xl text-zinc-100">{customExercises.length}</div>
            </div>
          </div>
        </div>

        {/* Storage status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Almacenamiento</div>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${persistGranted ? 'bg-lime-300/15 text-lime-300' : 'bg-amber-500/15 text-amber-400'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-100">
                {persistGranted === null ? 'Comprobando…' : persistGranted ? 'Almacenamiento persistente' : 'Almacenamiento estándar'}
              </div>
              <div className="text-[11px] text-zinc-500 leading-snug">
                {persistGranted
                  ? 'El navegador ha marcado tus datos como protegidos: no los borrará automáticamente para liberar espacio.'
                  : 'Tus datos se guardan localmente, pero el navegador podría borrarlos si se queda sin espacio. Instala la app en la pantalla de inicio para activar la protección.'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg shrink-0 bg-zinc-800 text-zinc-300">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-100">Última copia: {lastBackupText}</div>
              <div className="text-[11px] text-zinc-500 leading-snug">
                {usageText && <span>{usageText} · </span>}
                Recomendación: descarga el JSON cada 1-2 semanas y guárdalo en Google Drive / iCloud.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
          <button
            onClick={() => setPlateEditorOpen(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/60 transition text-left"
          >
            <div className="bg-zinc-800 text-lime-300 p-2 rounded-lg">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Discos disponibles</div>
              <div className="text-xs text-zinc-500 truncate">
                Barra {plateConfig.barWeightKg} kg · {plateConfig.plates.filter(p => p.pairs > 0 && p.enabled !== false).length} disco(s) activos
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
          <button
            onClick={onExport}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/60 transition text-left"
          >
            <div className="bg-lime-300/15 text-lime-300 p-2 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Exportar a JSON</div>
              <div className="text-xs text-zinc-500">Descarga todos tus datos como archivo .json</div>
            </div>
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/60 transition text-left"
          >
            <div className="bg-zinc-800 text-zinc-300 p-2 rounded-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Importar desde JSON</div>
              <div className="text-xs text-zinc-500">Recupera datos exportados anteriormente</div>
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="bg-zinc-900 border border-red-900/30 rounded-2xl">
          <button
            onClick={onReset}
            className="w-full flex items-center gap-3 p-4 hover:bg-red-950/30 transition text-left"
          >
            <div className="bg-red-500/15 text-red-400 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-red-400">Borrar todos los datos</div>
              <div className="text-xs text-zinc-500">Elimina sesiones, rutinas y peso corporal</div>
            </div>
          </button>
        </div>

        <div className="text-center text-xs text-zinc-600 pt-4 pb-2">
          IRONLOG · {buildLabel()}
        </div>
      </div>

      {plateEditorOpen && (
        <PlateConfigEditor
          config={plateConfig}
          onSave={cfg => { onUpdatePlateConfig(cfg); setPlateEditorOpen(false); }}
          onReset={() => onUpdatePlateConfig(DEFAULT_PLATE_CONFIG)}
          onClose={() => setPlateEditorOpen(false)}
        />
      )}
    </div>
  );
}

function PlateConfigEditor({ config, onSave, onReset, onClose }) {
  // Work on a draft so the user can hit Cancel without persisting changes.
  const [draft, setDraft] = useState(() => ({
    barWeightKg: config.barWeightKg,
    plates: config.plates.map(p => ({ ...p })),
  }));

  const updateBar = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    setDraft(d => ({ ...d, barWeightKg: Number.isFinite(n) && n >= 0 ? n : 0 }));
  };
  const updatePlate = (idx, field, v) => {
    setDraft(d => ({
      ...d,
      plates: d.plates.map((p, i) => {
        if (i !== idx) return p;
        if (field === 'weight') {
          const n = parseFloat(String(v).replace(',', '.'));
          return { ...p, weight: Number.isFinite(n) && n > 0 ? n : 0 };
        }
        if (field === 'pairs') {
          const n = parseInt(v, 10);
          return { ...p, pairs: Number.isFinite(n) && n >= 0 ? n : 0 };
        }
        if (field === 'enabled') {
          return { ...p, enabled: !!v };
        }
        return p;
      }),
    }));
  };
  const togglePlate = (idx) => {
    setDraft(d => ({
      ...d,
      plates: d.plates.map((p, i) =>
        i !== idx ? p : { ...p, enabled: p.enabled === false ? true : false }
      ),
    }));
  };
  const removePlate = (idx) => setDraft(d => ({ ...d, plates: d.plates.filter((_, i) => i !== idx) }));
  const addPlate = () => setDraft(d => ({ ...d, plates: [...d.plates, { weight: 0, pairs: 0, enabled: true }] }));

  const save = () => {
    // Keep disabled plates in the saved config so the user can re-enable
    // them later without losing their inventory count. Only drop truly
    // empty rows.
    const cleaned = draft.plates
      .filter(p => p.weight > 0 && p.pairs > 0)
      .map(p => ({ weight: p.weight, pairs: p.pairs, enabled: p.enabled !== false }))
      .sort((a, b) => b.weight - a.weight);
    onSave({ barWeightKg: draft.barWeightKg, plates: cleaned });
  };

  // Live demo of the breakdown so the user sees the effect.
  const demoTargets = [60, 80, 100];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-zinc-950/70 backdrop-blur-sm anim-fade" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl anim-slide-up max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-2xl text-zinc-100 leading-tight">DISCOS</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Peso de la barra</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={draft.barWeightKg}
                onChange={e => updateBar(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-lg font-mono text-center outline-none focus:border-lime-300/60 w-24"
              />
              <span className="text-zinc-400 text-sm font-bold">kg</span>
              <div className="ml-auto flex gap-1">
                {[10, 15, 20].map(w => (
                  <button
                    key={w}
                    onClick={() => updateBar(w)}
                    className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Inventario (1 par = 2 discos)</label>
            </div>
            <div className="space-y-1.5">
              {draft.plates.map((p, idx) => {
                const isDisabled = p.enabled === false;
                return (
                  <div key={idx} className={`flex items-center gap-2 rounded-lg p-2 transition ${isDisabled ? 'bg-zinc-900/40 opacity-50' : 'bg-zinc-800/60'}`}>
                    <button
                      onClick={() => togglePlate(idx)}
                      className={`shrink-0 w-7 h-7 rounded flex items-center justify-center transition ${isDisabled ? 'bg-zinc-800 text-zinc-600 hover:text-zinc-400' : 'bg-lime-300/20 text-lime-300 hover:bg-lime-300/30'}`}
                      aria-label={isDisabled ? 'Activar disco' : 'Desactivar disco'}
                      title={isDisabled ? 'Disco desactivado · pulsa para activar' : 'Disco activo · pulsa para desactivar'}
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      inputMode="decimal"
                      value={p.weight || ''}
                      onChange={e => updatePlate(idx, 'weight', e.target.value)}
                      placeholder="kg"
                      className={`bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm font-mono text-center outline-none focus:border-lime-300/60 w-20 ${isDisabled ? 'line-through' : ''}`}
                    />
                    <span className="text-zinc-500 text-xs">kg ·</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={p.pairs || ''}
                      onChange={e => updatePlate(idx, 'pairs', e.target.value)}
                      placeholder="0"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm font-mono text-center outline-none focus:border-lime-300/60 w-16"
                    />
                    <span className="text-zinc-500 text-xs">pares</span>
                    <button
                      onClick={() => removePlate(idx)}
                      className="ml-auto text-zinc-500 hover:text-red-400 p-1"
                      aria-label="Eliminar disco"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addPlate}
                className="w-full text-xs text-zinc-400 hover:text-lime-300 hover:bg-zinc-800 py-2 rounded transition flex items-center justify-center gap-1 font-semibold border border-dashed border-zinc-700 hover:border-lime-300/40"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir disco
              </button>
            </div>
          </div>

          <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-800">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Vista previa</div>
            <div className="space-y-1 text-xs font-mono">
              {demoTargets.map(t => {
                const info = computePlates(t, draft);
                let txt;
                if (info.belowBar) txt = info.exact ? 'solo barra' : '< peso barra';
                else if (info.exact) txt = `${platesSummary(info.perSide)}/lado`;
                else txt = info.perSide.length
                  ? `${platesSummary(info.perSide)}/lado · faltan ${info.remainder.toFixed(2).replace(/\.?0+$/, '')} kg`
                  : 'no entra';
                return (
                  <div key={t} className="flex justify-between gap-2">
                    <span className="text-zinc-400 shrink-0">{t} kg</span>
                    <span className={info.exact ? 'text-lime-300 text-right' : 'text-amber-300 text-right'}>{txt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 mt-2 border-t border-zinc-800">
          <button
            onClick={onReset}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
          >
            Restaurar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-full font-semibold text-sm transition"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 bg-lime-300 hover:bg-lime-400 text-zinc-950 py-2.5 rounded-full font-bold text-sm transition"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
