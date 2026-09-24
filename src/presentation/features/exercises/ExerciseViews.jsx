import { Select } from '../../shared/Select.jsx';
import { ChartCard } from '../../shared/ChartCard.jsx';
import React from 'react';
import { useMemo, useState } from 'react';
import { Activity, ArrowLeft, Award, ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import { completedSets } from '../../../domain/training/session-utils.js';
import { epley } from '../../../domain/exercises/exercise-utils.js';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MUSCLE_GROUPS, TYPE_LABELS, exerciseMatches } from '../../../domain/exercises/catalog.js';
import { fmtDur, formatLong, formatShort } from '../../shared/formatters.js';

export function ExercisesView({ exercises, customExercises, onOpen, onNew, onDelete, onRestore }) {
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
export function NewExerciseForm({ onSave, onCancel }) {
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

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}


// ============================================================
// EXERCISE DETAIL (history for one exercise)
// ============================================================

export function ExerciseDetail({ exercise, sessions, onBack }) {
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

export function SetPill({ set, type, unit }) {
  let txt = '';
  if (type === 'weight_reps') txt = `${set.weight || '?'}kg × ${set.reps || '?'}`;
  else if (type === 'reps') txt = `× ${set.reps || '?'}`;
  else if (type === 'distance_duration') txt = `${set.distance || '?'}${unit || ''} / ${fmtDur(set.duration)}`;
  else if (type === 'duration') txt = fmtDur(set.duration);
  return <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-1 rounded">{txt}</span>;
}

export function computeExerciseStats(exercise, history) {
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

export function PRBlock({ stats, type, unit }) {
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

export function ExerciseChart({ history, exercise }) {
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
