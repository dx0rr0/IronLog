import { SessionCard } from '../../shared/SessionCard.jsx';
import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Award, Clock, Dumbbell, Flame, Play, Plus, Trash2, X } from 'lucide-react';
import { bodyWeightDelta } from '../../../domain/exercises/exercise-utils.js';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { hasCompletedSet, sessionVolume } from '../../../domain/training/session-utils.js';
import { dateKey, fmtDur, formatLong, formatShort, sessionDuration } from '../../shared/formatters.js';
import { buildLabel } from '../../../app/build-info.js';
import { MUSCLE_GROUPS, availableRoutineEntries } from '../../../domain/exercises/catalog.js';
import { goalMessage, weeklyGoalProgress } from '../../../domain/training/motivation.js';
import { WeeklyGoalCard } from '../motivation/MotivationUI.jsx';

export function HomeView({ sessions, exMap, routines, currentSession, bodyWeights = [], onSaveBodyWeight, onDeleteBodyWeight, showConfirm, onStart, onStartRoutine, onResume, onOpenSession, onGoRoutines, weeklyGoal, onChangeGoal }) {
  const [bwModalOpen, setBwModalOpen] = useState(false);
  const goalProgress = useMemo(() => weeklyGoalProgress(sessions, weeklyGoal), [sessions, weeklyGoal]);
  const stats = useMemo(() => {
    const weekKeys = new Set(weeklyGoalProgress([], 1).weekDays.map(day => day.key));
    const week = sessions.filter(s => hasCompletedSet(s) && weekKeys.has(dateKey(s.date)));
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

      {goalProgress && (
        <div className="px-5 mt-4">
          <WeeklyGoalCard progress={goalProgress} message={goalMessage(goalProgress.weekStart)} onChange={onChangeGoal} />
        </div>
      )}

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

export function StatCard({ icon: Icon, label, value, suffix, accent }) {
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

export function BodyWeightCard({ bodyWeights, onOpen }) {
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

export function BodyWeightModal({ bodyWeights, onSave, onDelete, showConfirm, onClose }) {
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


export function computeStreak(sessions) {
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
