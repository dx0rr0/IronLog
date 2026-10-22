import { SessionCard } from '../../shared/SessionCard.jsx';
import React from 'react';
import { useMemo } from 'react';
import { Activity, Award, ChevronRight, Clock, Dumbbell, Flame, Play, Plus } from 'lucide-react';
import { bodyWeightDelta } from '../../../domain/exercises/exercise-utils.js';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { hasCompletedSet } from '../../../domain/training/session-utils.js';
import { dateKey, formatShort, sessionDuration } from '../../shared/formatters.js';
import { buildLabel } from '../../../app/build-info.js';
import { availableRoutineEntries } from '../../../domain/exercises/catalog.js';
import { goalMessage, weeklyGoalProgress } from '../../../domain/training/motivation.js';
import { WeeklyGoalCard } from '../motivation/MotivationUI.jsx';
import { TrainingCalendar } from '../calendar/TrainingCalendar.jsx';

export function HomeView({ sessions, exMap, routines, currentSession, bodyWeights = [], onOpenBodyWeight, onStart, onStartRoutine, onResume, onOpenSession, onGoRoutines, weeklyGoal, onChangeGoal }) {
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

      {goalProgress && (
        <div className="px-5 mt-4">
          <WeeklyGoalCard progress={goalProgress} message={goalMessage(goalProgress.weekStart)} onChange={onChangeGoal} />
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
        <BodyWeightCard bodyWeights={bodyWeights} onOpen={onOpenBodyWeight} />
      </div>

      <div className="px-5 mt-7">
        <h2 className="font-display text-xl text-zinc-300 mb-3">CALENDARIO</h2>
        <TrainingCalendar sessions={sessions} exMap={exMap} onOpenSession={onOpenSession} />
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
            {sessions.slice(0, 5).map(s => (
              <SessionCard key={s.id} session={s} exMap={exMap} onClick={() => onOpenSession(s)} />
            ))}
          </div>
        )}
      </div>
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
      aria-label="Peso corporal: registrar y ver evolución"
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
            <div className="text-[11px] text-zinc-500">Toca para añadir el primero y ver tu evolución</div>
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
      <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
    </button>
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
