import React from 'react';
import { Link2, Unlink } from 'lucide-react';
import { supersetInfo } from '../../domain/training/supersets.js';
import { fmtDur } from './formatters.js';

export function SupersetBadge({ entries, index }) {
  const group = supersetInfo(entries, index);
  if (!group) return null;
  return <div className="text-[10px] font-bold text-lime-300 tracking-wide mb-1">
    SUPERSERIE {group.number} · {group.position}/{group.size}
  </div>;
}

export function SupersetControls({ entries, index, exMap, onJoin, onSplit, next }) {
  const group = supersetInfo(entries, index);
  const end = group?.end ?? index;
  return <div className="px-3 pt-3 text-xs">
    <SupersetBadge entries={entries} index={index} />
    {group && index === group.start && <p className="text-zinc-400 mb-2">
      Alterna una serie de cada ejercicio. {group.transitionSeconds > 0
        ? `Descansa ${fmtDur(group.transitionSeconds)} entre ejercicios y ${fmtDur(group.restSeconds)} al completar la ronda.`
        : 'Descansa al completar la ronda.'}
      {next && <span className="block text-lime-300 mt-1" role="status">
        Siguiente: {exMap[entries[next.entryIndex].exerciseId]?.name} · serie {next.setIndex + 1}
      </span>}
    </p>}
    <div className="flex flex-wrap gap-2">
      {end === index && end < entries.length - 1 && <button onClick={onJoin}
        aria-label={`Unir ${exMap[entries[index].exerciseId]?.name} con siguiente en superserie`}
        className="flex items-center gap-1 rounded-full bg-zinc-800 text-zinc-300 hover:text-lime-300 px-2 py-1 text-[10px] font-bold">
        <Link2 className="w-3 h-3" /> {group ? 'Añadir siguiente a superserie' : 'Superserie con siguiente'}
      </button>}
      {group && index === group.start && <button onClick={onSplit}
        className="flex items-center gap-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2 py-1 text-[10px] font-bold">
        <Unlink className="w-3 h-3" /> Deshacer superserie
      </button>}
    </div>
  </div>;
}
