import { DurField } from '../../shared/DurField.jsx';
import React from 'react';
import { ArrowDown, ArrowUp, ClipboardList, Copy, MessageSquare, Pencil, Play, Plus, Save, Timer, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { MUSCLE_GROUPS, availableRoutineEntries } from '../../../domain/exercises/catalog.js';
import { ExercisePicker } from '../../shared/ExercisePicker.jsx';
import { NewExerciseForm } from '../exercises/ExerciseViews.jsx';
import { fmtDur } from '../../shared/formatters.js';

export function RoutinesView({ routines, exMap, onStart, onNew, onEdit, onDelete, onDuplicate, hasActive }) {
  return (
    <div>
      <header className="px-5 pt-8 pb-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">PLANTILLAS</div>
          <h1 className="font-display text-4xl leading-none">RUTINAS</h1>
          <div className="text-xs text-zinc-500 mt-1">{routines.length} guardada(s)</div>
        </div>
        <button
          onClick={onNew}
          className="bg-lime-300 text-zinc-950 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-lime-400"
        >
          <Plus className="w-4 h-4" strokeWidth={3} /> CREAR
        </button>
      </header>

      <div className="px-5 pb-4">
        {routines.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">Aún no tienes rutinas creadas.</div>
            <div className="text-xs mt-1 text-zinc-600">Crea una para tener tu plantilla de ejercicios lista.</div>
            <button
              onClick={onNew}
              className="mt-4 bg-lime-300 text-zinc-950 px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1 hover:bg-lime-400"
            >
              <Plus className="w-4 h-4" strokeWidth={3} /> CREAR RUTINA
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map(r => {
              const routineEntries = availableRoutineEntries(r, exMap);
              const totalSets = routineEntries.reduce((a, e) => a + (e.sets?.length || 0), 0);
              return (
                <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="font-display text-2xl text-zinc-100 leading-tight mb-1">{r.name.toUpperCase()}</div>
                    <div className="text-xs text-zinc-500 mb-3">
                      {routineEntries.length} ejercicio(s) · {totalSets} serie(s)
                    </div>
                    {routineEntries.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {routineEntries.slice(0, 4).map((re, i) => {
                          const ex = exMap[re.exerciseId];
                          return (
                            <span key={i} className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-medium">
                              {ex?.name || '?'}
                            </span>
                          );
                        })}
                        {routineEntries.length > 4 && (
                          <span className="text-[10px] text-zinc-500 px-2 py-0.5">+{routineEntries.length - 4}</span>
                        )}
                      </div>
                    )}
                    {r.notes && (
                      <p className="text-xs text-zinc-400 italic line-clamp-2 mb-3">{r.notes}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onStart(r.id)}
                        disabled={hasActive}
                        className="flex-1 bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-1 hover:bg-lime-400 transition"
                      >
                        <Play className="w-4 h-4 fill-current" /> INICIAR
                      </button>
                      <button onClick={() => onEdit(r)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-full" aria-label="Editar rutina">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDuplicate(r.id)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-full" aria-label="Duplicar rutina">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(r.id)} className="bg-zinc-800 hover:bg-red-500/30 text-zinc-400 hover:text-red-400 p-2 rounded-full" aria-label="Eliminar rutina">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {hasActive && (
                      <div className="text-[10px] text-zinc-500 italic mt-2 text-center">
                        Termina o cancela el entrenamiento en curso para iniciar una rutina
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ROUTINE EDITOR (create / edit)
// ============================================================

export function RoutineEditor({ initial, draft, exercises, exMap, onCreateExercise, onSave, onCancel, showConfirm }) {
  const [routine, setRoutine] = useState(() => initial || draft ? {
    ...JSON.parse(JSON.stringify(initial || draft)),
    exercises: JSON.parse(JSON.stringify(availableRoutineEntries(initial || draft, exMap))),
  } : {
    name: '',
    notes: '',
    exercises: [],
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch) => { setRoutine(r => ({ ...r, ...patch })); setDirty(true); };
  const updateExercise = (idx, patch) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => i !== idx ? e : { ...e, ...patch }),
    }));
    setDirty(true);
  };

  const addExercise = (ex) => {
    setRoutine(r => ({
      ...r,
      exercises: [...r.exercises, {
        exerciseId: ex.id,
        restSeconds: 0,
        notes: '',
        sets: [{ repsMin: 8, repsMax: 12, rir: 2 }, { repsMin: 8, repsMax: 12, rir: 2 }, { repsMin: 8, repsMax: 12, rir: 2 }],
      }],
    }));
    setDirty(true);
    setPickerOpen(false);
  };

  const removeExercise = (idx) => {
    showConfirm({
      title: 'Quitar ejercicio',
      body: 'Se eliminará de esta rutina.',
      confirmLabel: 'Quitar',
      danger: true,
      onConfirm: () => {
        setRoutine(r => ({ ...r, exercises: r.exercises.filter((_, i) => i !== idx) }));
        setDirty(true);
      },
    });
  };

  const moveExercise = (idx, dir) => {
    setRoutine(r => {
      const exs = [...r.exercises];
      const t = idx + dir;
      if (t < 0 || t >= exs.length) return r;
      [exs[idx], exs[t]] = [exs[t], exs[idx]];
      return { ...r, exercises: exs };
    });
    setDirty(true);
  };

  const addSet = (exIdx) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const last = e.sets[e.sets.length - 1] || { repsMin: 8, repsMax: 12, rir: 2 };
        return { ...e, sets: [...e.sets, { ...last }] };
      }),
    }));
    setDirty(true);
  };

  const removeSet = (exIdx, setIdx) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.filter((_, j) => j !== setIdx) }),
    }));
    setDirty(true);
  };

  const updateSet = (exIdx, setIdx, patch) => {
    setRoutine(r => ({
      ...r,
      exercises: r.exercises.map((e, i) => i !== exIdx ? e : {
        ...e,
        sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, ...patch }),
      }),
    }));
    setDirty(true);
  };

  const handleCancel = () => {
    if (!dirty) { onCancel(); return; }
    showConfirm({
      title: 'Descartar cambios',
      body: 'Se perderán las modificaciones de la rutina.',
      confirmLabel: 'Descartar',
      danger: true,
      onConfirm: onCancel,
    });
  };

  const handleSave = () => {
    if (!routine.name.trim()) {
      showConfirm({ title: 'Falta el nombre', body: 'Ponle un nombre a la rutina antes de guardar.', confirmLabel: 'OK', hideCancel: true, onConfirm: () => {} });
      return;
    }
    if (!routine.exercises.length) {
      showConfirm({ title: 'Sin ejercicios', body: 'Añade al menos un ejercicio a la rutina.', confirmLabel: 'OK', hideCancel: true, onConfirm: () => {} });
      return;
    }
    onSave(routine);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 px-5 py-3 flex items-center gap-2">
        <button onClick={handleCancel} className="text-zinc-400 hover:text-zinc-200 p-1 -ml-1">
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-display text-xl flex-1 truncate">{initial ? 'EDITAR RUTINA' : 'NUEVA RUTINA'}</h2>
        <button
          onClick={handleSave}
          className="bg-lime-300 text-zinc-950 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 hover:bg-lime-400 transition"
        >
          <Save className="w-4 h-4" strokeWidth={3} /> GUARDAR
        </button>
      </header>

      <div className="p-5 space-y-4">
        {draft && <p className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          Copiamos los ejercicios y las series completadas. Ajusta los objetivos de repeticiones y RIR antes de guardar; al iniciar la rutina, los pesos se sugerirán desde tu historial.
        </p>}
        {/* Routine info */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">Nombre</label>
          <input
            value={routine.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="Ej: Pecho + Bíceps"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 outline-none focus:border-lime-300/50 font-display text-xl"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">Notas (opcional)</label>
          <textarea
            value={routine.notes || ''}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Notas generales sobre la rutina, objetivos, etc."
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-lime-300/50 resize-none"
          />
        </div>

        {/* Exercises */}
        <div>
          <h3 className="font-display text-xl text-zinc-300 mb-2">EJERCICIOS</h3>
          {routine.exercises.length === 0 ? (
            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
              Aún no has añadido ejercicios.
            </div>
          ) : (
            <div className="space-y-3">
              {routine.exercises.map((re, ei) => {
                const ex = exMap[re.exerciseId];
                if (!ex) return null;
                return (
                  <RoutineExerciseEditor
                    key={ei}
                    re={re}
                    ex={ex}
                    isFirst={ei === 0}
                    isLast={ei === routine.exercises.length - 1}
                    onUpdate={patch => updateExercise(ei, patch)}
                    onRemove={() => removeExercise(ei)}
                    onMoveUp={() => moveExercise(ei, -1)}
                    onMoveDown={() => moveExercise(ei, +1)}
                    onAddSet={() => addSet(ei)}
                    onRemoveSet={si => removeSet(ei, si)}
                    onUpdateSet={(si, patch) => updateSet(ei, si, patch)}
                  />
                );
              })}
            </div>
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full mt-3 border-2 border-dashed border-zinc-700 hover:border-lime-300 hover:bg-lime-300/5 rounded-2xl py-5 text-zinc-400 hover:text-lime-300 transition flex flex-col items-center gap-1 font-bold"
          >
            <Plus className="w-6 h-6" /> AÑADIR EJERCICIO
          </button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker exercises={exercises} onPick={addExercise} onClose={() => setPickerOpen(false)}
          onCreate={() => { setPickerOpen(false); setCreatingExercise(true); }} />
      )}
      {creatingExercise && <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950">
        <div className="max-w-md mx-auto">
          <NewExerciseForm onCancel={() => { setCreatingExercise(false); setPickerOpen(true); }}
            onSave={async values => {
              const created = await onCreateExercise(values);
              if (created) {
                addExercise(created);
                setCreatingExercise(false);
              }
              return created;
            }} />
        </div>
      </div>}
    </div>
  );
}

export function RoutineExerciseEditor({ re, ex, isFirst, isLast, onUpdate, onRemove, onMoveUp, onMoveDown, onAddSet, onRemoveSet, onUpdateSet }) {
  const [showNotes, setShowNotes] = useState(!!re.notes);
  const [showRest, setShowRest] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        <div className="flex flex-col -ml-1 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 p-0.5">
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 p-0.5">
            <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg leading-tight">{ex.name.toUpperCase()}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{MUSCLE_GROUPS[ex.muscleGroup] || ex.muscleGroup}</div>
        </div>
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400 p-1 shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 pt-3 flex-wrap">
        <button
          onClick={() => setShowRest(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${re.restSeconds > 0 ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <Timer className="w-3 h-3" /> {re.restSeconds > 0 ? fmtDur(re.restSeconds) : 'Descanso'}
        </button>
        <button
          onClick={() => setShowNotes(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${re.notes ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <MessageSquare className="w-3 h-3" /> Notas
        </button>
      </div>

      {showRest && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Descanso:</span>
          <DurField
            value={re.restSeconds || 0}
            onChange={v => onUpdate({ restSeconds: v })}
            placeholder="mm:ss"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200 w-20 outline-none focus:border-lime-300/50 placeholder:text-zinc-500 text-center"
          />
          <div className="flex gap-1 ml-auto">
            {[60, 90, 120, 180].map(sec => (
              <button
                key={sec}
                onClick={() => onUpdate({ restSeconds: sec })}
                className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
              >
                {sec / 60 < 1 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      {showNotes && (
        <div className="px-3 pt-2">
          <textarea
            value={re.notes || ''}
            onChange={e => onUpdate({ notes: e.target.value })}
            placeholder="Técnica, indicaciones, recordatorios..."
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-lime-300/50 resize-none"
          />
        </div>
      )}

      <div className="p-3 mt-2">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold tracking-wider px-1 mb-1.5">
          <div className="w-7" />
          <div className="w-5 text-center">#</div>
          <div className="flex-1 text-center">REPS MIN</div>
          <div className="flex-1 text-center">REPS MAX</div>
          <div className="w-11 text-center">RIR</div>
        </div>
        <div className="space-y-1.5">
          {re.sets.map((s, si) => (
            <div key={si} className="flex items-center gap-1.5">
              <button
                onClick={() => onRemoveSet(si)}
                className="w-7 h-9 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition shrink-0"
                aria-label="Eliminar serie"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-5 text-center font-mono text-xs text-zinc-500">{si + 1}</div>
              <input
                type="number"
                inputMode="numeric"
                value={s.repsMin ?? ''}
                placeholder="8"
                onChange={e => onUpdateSet(si, { repsMin: e.target.value === '' ? null : parseInt(e.target.value) })}
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none placeholder:text-zinc-500"
              />
              <input
                type="number"
                inputMode="numeric"
                value={s.repsMax ?? ''}
                placeholder="12"
                onChange={e => onUpdateSet(si, { repsMax: e.target.value === '' ? null : parseInt(e.target.value) })}
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none placeholder:text-zinc-500"
              />
              <input
                type="number"
                inputMode="numeric"
                value={s.rir ?? ''}
                placeholder="2"
                onChange={e => onUpdateSet(si, { rir: e.target.value === '' ? null : parseInt(e.target.value) })}
                className="w-11 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none placeholder:text-zinc-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={onAddSet}
          className="w-full text-sm text-zinc-400 hover:text-lime-300 hover:bg-zinc-800 py-2 rounded transition flex items-center justify-center gap-1 mt-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Añadir serie
        </button>
      </div>
    </div>
  );
}
