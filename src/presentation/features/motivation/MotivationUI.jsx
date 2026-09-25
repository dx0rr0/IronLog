import React, { useEffect, useState } from 'react';
import { Award, Check, Target, Trophy, X } from 'lucide-react';

const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function WeeklyGoalSetup({ onSave, onDismiss }) {
  const [days, setDays] = useState(3);
  return (
    <div className="fixed inset-0 z-[70] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-5 anim-fade">
      <div role="dialog" aria-modal="true" aria-labelledby="weekly-goal-title"
        className="w-full max-w-sm bg-zinc-900 border border-lime-300/30 rounded-3xl p-6 shadow-2xl anim-slide-up">
        <div className="w-12 h-12 rounded-2xl bg-lime-300/15 text-lime-300 flex items-center justify-center mb-5">
          <Target className="w-6 h-6" />
        </div>
        <div className="text-[11px] text-lime-300 font-bold tracking-[0.25em]">UNA META QUE SEA TUYA</div>
        <h2 id="weekly-goal-title" className="font-display text-4xl leading-tight mt-2">¿CUÁNTOS DÍAS VAS A ENTRENAR?</h2>
        <p className="text-sm text-zinc-400 mt-3">Elige una meta semanal realista. Podrás cambiarla cuando quieras en Ajustes.</p>
        <div className="grid grid-cols-7 gap-1.5 mt-6">
          {Array.from({ length: 7 }, (_, index) => index + 1).map(value => (
            <button key={value} type="button" onClick={() => setDays(value)} aria-pressed={days === value}
              className={`aspect-square rounded-xl font-display text-xl transition ${days === value ? 'bg-lime-300 text-zinc-950 scale-105' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
              {value}
            </button>
          ))}
        </div>
        <div className="text-xs text-zinc-500 mt-2">{days} {days === 1 ? 'día' : 'días'} cada semana · de lunes a domingo</div>
        <button onClick={() => onSave(days)} className="w-full bg-lime-300 text-zinc-950 rounded-xl py-3.5 font-bold mt-6">
          FIJAR MI META
        </button>
        <button onClick={onDismiss} className="w-full text-xs text-zinc-500 py-3 mt-1">AHORA NO</button>
      </div>
    </div>
  );
}

export function WeeklyGoalCard({ progress, message, onChange }) {
  if (!progress) return null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return (
    <section className={`rounded-2xl p-4 border ${progress.reached ? 'bg-lime-300/10 border-lime-300/40' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-500">TU META SEMANAL</div>
          <div className="font-display text-3xl mt-1">{progress.days}<span className="text-zinc-500"> / {progress.goal}</span> DÍAS</div>
        </div>
        <button onClick={onChange} className="text-[11px] text-lime-300 font-bold px-2 py-1">CAMBIAR</button>
      </div>
      <div className="grid grid-cols-7 gap-2 mt-4">
        {progress.weekDays.map((day, index) => (
          <div key={day.key} className="text-center">
            <div className="text-[10px] text-zinc-500 mb-1">{WEEK_LABELS[index]}</div>
            <div title={day.trained ? 'Entrenamiento completado' : 'Sin entrenamiento'}
              className={`h-8 rounded-lg flex items-center justify-center ${day.trained ? 'bg-lime-300 text-zinc-950' : day.key === todayKey ? 'border border-lime-300/50 text-lime-300' : 'bg-zinc-800 text-zinc-600'}`}>
              {day.trained ? <Check className="w-4 h-4" strokeWidth={3} /> : '·'}
            </div>
          </div>
        ))}
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-4">
        <div className="h-full bg-lime-300 transition-all" style={{ width: `${Math.min(100, progress.days / progress.goal * 100)}%` }} />
      </div>
      <p className={`text-xs mt-3 ${progress.reached ? 'text-lime-200' : 'text-zinc-400'}`}>
        {progress.reached ? `${message?.title || 'META ALCANZADA.'} ${message?.body || ''}`
          : progress.days === 0 ? 'La primera sesión de la semana empieza cuando tú decidas.'
            : `Te ${progress.remaining === 1 ? 'queda 1 día' : `quedan ${progress.remaining} días`} para cumplir lo que te propusiste.`}
      </p>
    </section>
  );
}

export function GoalCelebration({ message, goal }) {
  if (!message) return null;
  return (
    <div role="status" className="relative overflow-hidden rounded-2xl border border-lime-300/50 bg-gradient-to-br from-lime-300/20 via-zinc-900 to-zinc-900 p-5 mb-5 anim-slide-up">
      <Award className="w-7 h-7 text-lime-300 mb-3" />
      <div className="text-[10px] font-bold tracking-[0.2em] text-lime-300">{goal} {goal === 1 ? 'DÍA' : 'DÍAS'} ESTA SEMANA</div>
      <div className="font-display text-3xl mt-1 text-white">{message.title}</div>
      <p className="text-sm text-zinc-300 mt-2">{message.body}</p>
    </div>
  );
}

export function RecordCelebration({ alert, onClose }) {
  useEffect(() => {
    if (!alert) return undefined;
    const timer = setTimeout(onClose, 5200);
    return () => clearTimeout(timer);
  }, [alert, onClose]);
  if (!alert) return null;
  return (
    <div role="status" aria-live="polite" className="fixed top-24 left-4 right-4 max-w-md mx-auto z-[65] pointer-events-none">
      <div className="record-celebration relative overflow-hidden rounded-2xl border border-amber-300/70 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-amber-300/15 p-4 pointer-events-auto">
        <div className="record-sparks" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--spark-left': `${12 + i * 7}%`, '--spark-x': `${(i - 6) * 22}px` }} />)}
        </div>
        <div className="relative flex gap-3 items-start">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-300 text-zinc-950 flex items-center justify-center record-trophy">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold tracking-[0.2em] text-amber-300">NUEVO RÉCORD</div>
            <div className="font-display text-xl leading-tight mt-0.5">{alert.exerciseName.toUpperCase()}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {alert.records.map(record => (
                <span key={record.kind} className="text-[11px] rounded-full bg-amber-300/15 text-amber-100 px-2 py-1">
                  {record.label}: {record.detail}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar aviso de récord" className="text-zinc-400 p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
