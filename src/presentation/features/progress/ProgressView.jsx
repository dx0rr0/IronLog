import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { completedSets, sessionVolume } from '../../../domain/training/session-utils.js';
import { BarChart3, ChevronRight, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PRIMARY_MUSCLE_GROUPS, VOLUME_LANDMARKS, VOLUME_WINDOWS, computeVolumeBreakdown, volumeLevel } from '../../../domain/training/volume.js';
import { BodyMap } from '../../components/BodyMap.jsx';
import { fmtDur, formatShort, sessionDuration } from '../../shared/formatters.js';
import { ChartCard } from '../../shared/ChartCard.jsx';
import { Select } from '../../shared/Select.jsx';
import { MUSCLE_GROUPS } from '../../../domain/exercises/catalog.js';

export function ProgressView({ sessions, exercises, exMap }) {
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

export function VolumePanel({ sessions, exMap }) {
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
export function ExerciseSetsBreakdown({ exercise }) {
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

export function CompactExerciseChart({ history, exercise }) {
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
