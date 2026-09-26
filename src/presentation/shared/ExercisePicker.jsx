import React, { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { MUSCLE_GROUPS, exerciseMatches } from '../../domain/exercises/catalog.js';

export function ExercisePicker({ exercises, onPick, onClose, onCreate }) {
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
          {onCreate && <button onClick={onCreate} className="text-xs font-bold text-lime-300 flex items-center gap-1">
            <Plus className="w-4 h-4" /> CREAR
          </button>}
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
            <div className="text-center py-12 text-zinc-500 text-sm">
              No hay resultados
              {onCreate && <button onClick={onCreate} className="block mx-auto mt-3 text-lime-300 font-bold">CREAR EJERCICIO</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
