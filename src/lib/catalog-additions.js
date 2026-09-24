// Additional variants commonly used with cables, Smith machines, plate-loaded
// machines and unilateral training. Names only; no third-party media/content.
const w = (id, name, muscleGroup, equipment, aliases = []) => ({
  id, name, category: 'strength', muscleGroup, equipment, type: 'weight_reps', aliases,
});
const r = (id, name, muscleGroup, equipment, aliases = []) => ({
  id, name, category: 'strength', muscleGroup, equipment, type: 'reps', aliases,
});
const t = (id, name, muscleGroup, equipment) => ({
  id, name, category: 'strength', muscleGroup, equipment, type: 'duration',
});
const cardio = (id, name, equipment, type = 'duration', distanceUnit = 'km') => ({
  id, name, category: 'cardio', muscleGroup: 'cardio_general', equipment, type,
  ...(type === 'distance_duration' ? { distanceUnit } : {}),
});

export const CATALOG_ADDITIONS = [
  // Pecho
  w('press_smith_plano', 'Press de banca en Smith', 'pecho', 'Smith'),
  w('press_smith_inclinado', 'Press inclinado en Smith', 'pecho', 'Smith'),
  w('press_maquina_convergente', 'Press de pecho convergente', 'pecho', 'Máquina'),
  w('press_maquina_unilateral', 'Press de pecho unilateral en máquina', 'pecho', 'Máquina'),
  w('press_polea_pie', 'Press de pecho de pie en polea', 'pecho', 'Polea'),
  w('cruces_polea_alta', 'Cruces en polea alta', 'pecho', 'Polea', ['cable crossover']),
  w('cruces_polea_baja', 'Cruces en polea baja', 'pecho', 'Polea'),
  w('aperturas_polea_banco', 'Aperturas en polea sobre banco', 'pecho', 'Polea'),
  w('pec_deck_unilateral', 'Pec deck unilateral', 'pecho', 'Máquina', ['contractora unilateral']),
  w('press_suelo_mancuernas', 'Press de suelo con mancuernas', 'pecho', 'Mancuernas'),
  r('flexiones_lastre', 'Flexiones con lastre', 'pecho', 'Peso corporal'),
  r('flexiones_anillas', 'Flexiones en anillas', 'pecho', 'Anillas'),

  // Espalda
  w('remo_pecho_apoyado_mc', 'Remo con pecho apoyado y mancuernas', 'espalda', 'Mancuernas'),
  w('remo_maquina_pecho_apoyado', 'Remo en máquina con pecho apoyado', 'espalda', 'Máquina'),
  w('remo_unilateral_polea', 'Remo unilateral en polea', 'espalda', 'Polea'),
  w('seal_row', 'Seal row con barra', 'espalda', 'Barra'),
  w('remo_landmine', 'Remo landmine', 'espalda', 'Landmine'),
  w('remo_meadows', 'Remo Meadows', 'espalda', 'Landmine'),
  w('jalon_unilateral_polea', 'Jalón unilateral en polea', 'espalda', 'Polea'),
  w('jalon_agarre_neutro', 'Jalón al pecho con agarre neutro', 'espalda', 'Polea'),
  w('jalon_brazos_rectos', 'Jalón con brazos rectos', 'espalda', 'Polea', ['straight-arm pulldown']),
  w('pullover_polea', 'Pullover en polea', 'espalda', 'Polea'),
  r('dominadas_asistidas', 'Dominadas asistidas en máquina', 'espalda', 'Máquina'),
  w('remo_smith', 'Remo en Smith', 'espalda', 'Smith'),

  // Hombros
  w('elev_lateral_polea', 'Elevación lateral unilateral en polea', 'hombros', 'Polea'),
  w('elev_lateral_maquina', 'Elevación lateral en máquina', 'hombros', 'Máquina'),
  w('elev_lateral_inclinada', 'Elevación lateral inclinada', 'hombros', 'Mancuernas'),
  w('y_raise_polea', 'Y raise en polea', 'hombros', 'Polea'),
  w('reverse_pec_deck', 'Reverse pec deck', 'hombros', 'Máquina', ['pájaros máquina']),
  w('pajaros_polea', 'Pájaros en polea', 'hombros', 'Polea'),
  w('press_hombro_smith', 'Press de hombro en Smith', 'hombros', 'Smith'),
  w('press_landmine_unilateral', 'Press landmine unilateral', 'hombros', 'Landmine'),
  w('elev_frontal_polea', 'Elevación frontal en polea', 'hombros', 'Polea'),
  w('trap_3_raise', 'Trap-3 raise', 'hombros', 'Mancuernas'),

  // Pierna
  w('belt_squat', 'Belt squat', 'pierna', 'Máquina'),
  w('sentadilla_smith', 'Sentadilla en Smith', 'pierna', 'Smith'),
  w('sentadilla_pendulo', 'Sentadilla péndulo', 'pierna', 'Máquina'),
  w('sentadilla_goblet', 'Sentadilla goblet', 'pierna', 'Mancuernas'),
  w('split_squat_smith', 'Split squat en Smith', 'pierna', 'Smith'),
  w('step_up_mancuernas', 'Step-up con mancuernas', 'pierna', 'Mancuernas'),
  w('zancada_inversa_smith', 'Zancada inversa en Smith', 'pierna', 'Smith'),
  w('curl_femoral_sentado', 'Curl femoral sentado', 'pierna', 'Máquina'),
  w('curl_femoral_unilateral', 'Curl femoral unilateral', 'pierna', 'Máquina'),
  r('curl_nordico', 'Curl nórdico', 'pierna', 'Peso corporal'),
  r('sissy_squat', 'Sissy squat', 'pierna', 'Peso corporal'),
  w('aductores_maquina', 'Aductores en máquina', 'pierna', 'Máquina'),
  w('extension_cuadriceps_unilateral', 'Extensión de cuádriceps unilateral', 'pierna', 'Máquina'),
  w('gemelos_prensa', 'Elevación de gemelos en prensa', 'pierna', 'Máquina'),
  w('tibial_anterior_maquina', 'Elevación tibial en máquina', 'pierna', 'Máquina'),
  w('peso_muerto_rumano_mc', 'Peso muerto rumano con mancuernas', 'pierna', 'Mancuernas'),

  // Glúteos
  w('hip_thrust_smith', 'Hip thrust en Smith', 'gluteo', 'Smith'),
  w('hip_thrust_maquina', 'Hip thrust en máquina', 'gluteo', 'Máquina'),
  w('puente_gluteo_barra', 'Puente de glúteos con barra', 'gluteo', 'Barra'),
  w('pull_through_polea', 'Pull-through en polea', 'gluteo', 'Polea'),
  w('peso_muerto_unilateral_mc', 'Peso muerto rumano unilateral', 'gluteo', 'Mancuernas'),
  w('patada_gluteo_maquina', 'Patada de glúteo en máquina', 'gluteo', 'Máquina'),
  w('abduccion_cadera_polea', 'Abducción de cadera en polea', 'gluteo', 'Polea'),
  w('hiperextension_45_gluteo', 'Hiperextensión a 45° para glúteo', 'gluteo', 'Banco romano'),

  // Bíceps
  w('curl_bayesian', 'Curl Bayesian', 'biceps', 'Polea'),
  w('curl_inclinado_mc', 'Curl inclinado con mancuernas', 'biceps', 'Mancuernas'),
  w('curl_predicador_maquina', 'Curl predicador en máquina', 'biceps', 'Máquina'),
  w('curl_martillo_cuerda', 'Curl martillo con cuerda', 'biceps', 'Polea'),
  w('curl_spider', 'Curl spider', 'biceps', 'Mancuernas'),
  w('curl_inverso_barra', 'Curl inverso con barra', 'biceps', 'Barra'),
  w('curl_zottman', 'Curl Zottman', 'biceps', 'Mancuernas'),
  w('curl_unilateral_polea', 'Curl unilateral en polea', 'biceps', 'Polea'),

  // Tríceps
  w('extension_overhead_cuerda', 'Extensión de tríceps overhead con cuerda', 'triceps', 'Polea'),
  w('extension_cruzada_polea', 'Extensión cruzada de tríceps en polea', 'triceps', 'Polea'),
  w('rompecraneos_mc', 'Rompecráneos con mancuernas', 'triceps', 'Mancuernas'),
  w('fondos_maquina', 'Fondos asistidos en máquina', 'triceps', 'Máquina'),
  w('press_jm', 'Press JM', 'triceps', 'Barra'),
  w('extension_unilateral_polea', 'Extensión unilateral de tríceps en polea', 'triceps', 'Polea'),
  w('patada_triceps_polea', 'Patada de tríceps en polea', 'triceps', 'Polea'),
  w('extension_triceps_maquina', 'Extensión de tríceps en máquina', 'triceps', 'Máquina'),

  // Core
  w('pallof_press', 'Pallof press', 'core', 'Polea'),
  w('woodchop_polea', 'Woodchop en polea', 'core', 'Polea'),
  r('dead_bug', 'Dead bug', 'core', 'Peso corporal'),
  t('plancha_copenhague', 'Plancha Copenhague', 'core', 'Peso corporal'),
  w('sit_up_lastre', 'Sit-up con lastre', 'core', 'Disco'),
  r('rodillas_colgado', 'Elevación de rodillas colgado', 'core', 'Barra'),
  w('crunch_maquina', 'Crunch en máquina', 'core', 'Máquina'),

  // Acondicionamiento
  cardio('air_bike', 'Air bike', 'Bicicleta estática'),
  cardio('skierg', 'SkiErg', 'Ergómetro', 'distance_duration', 'm'),
  cardio('cinta_curva', 'Cinta curva', 'Cinta', 'distance_duration'),
  cardio('empuje_trineo', 'Empuje de trineo', 'Trineo', 'distance_duration', 'm'),
];
