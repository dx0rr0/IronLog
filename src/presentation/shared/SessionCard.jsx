import React, { useMemo } from 'react';
import { sessionVolume } from '../../domain/training/session-utils.js';
import { MUSCLE_GROUPS } from '../../domain/exercises/catalog.js';
import { fmtDur, formatLong, sessionDuration } from './formatters.js';

export function SessionCard({ session, exMap, onClick }) {
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
