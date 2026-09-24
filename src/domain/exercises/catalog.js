import { CATALOG_ADDITIONS } from './catalog-additions.js';

export const MUSCLE_GROUPS = {
  pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros',
  pierna: 'Pierna', gluteo: 'Glúteo', biceps: 'Bíceps',
  triceps: 'Tríceps', antebrazo: 'Antebrazo', core: 'Core',
  cuerpo_completo: 'Cuerpo completo', cardio_general: 'Cardio',
};

export const CATEGORY_LABELS = { strength: 'Fuerza', cardio: 'Cardio', other: 'Otros' };
export const TYPE_LABELS = {
  weight_reps: 'Peso × Reps',
  reps: 'Solo reps',
  distance_duration: 'Distancia + Tiempo',
  duration: 'Solo tiempo',
};

export const DEFAULT_EXERCISES = [
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

export const searchText = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const exerciseMatches = (exercise, search) => !search ||
  searchText([exercise.name, exercise.equipment, ...(exercise.aliases || [])].join(' '))
    .includes(searchText(search));
export const availableRoutineEntries = (routine, exMap) =>
  (routine.exercises || []).filter(re => exMap[re.exerciseId] && !exMap[re.exerciseId].hidden);
