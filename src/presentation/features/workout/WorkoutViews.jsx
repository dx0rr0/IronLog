import { DurField } from '../../shared/DurField.jsx';
import { ExercisePicker } from '../../shared/ExercisePicker.jsx';
import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exerciseComparisons, predictGhost, summarizeSession } from '../../../domain/training/workout-intelligence.js';
import { computePlates, epley, findLastEntryForExercise, inheritSet, platesSummary } from '../../../domain/exercises/exercise-utils.js';
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Edit2, MessageSquare, Pencil, Play, Plus, RotateCcw, Save, Search, SkipForward, Timer, Trash2, X } from 'lucide-react';
import { completedSets, sessionVolume } from '../../../domain/training/session-utils.js';
import { routineDraftFromSession } from '../../../domain/training/routine-from-session.js';
import { fmtDur, formatLong, formatShort, formatTime, parseDur, sessionDuration } from '../../shared/formatters.js';
import { MUSCLE_GROUPS, exerciseMatches } from '../../../domain/exercises/catalog.js';
import { detectSetRecords } from '../../../domain/training/records.js';
import { volumeComparison } from '../../../domain/training/motivation.js';
import { GoalCelebration, RecordCelebration } from '../motivation/MotivationUI.jsx';

export function WorkoutSession({ mode, session, setSession, exercises, exMap, onFinish, onCancel, previousSessions, plateConfig, showConfirm, finishing = false }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [focusMode, setFocusMode] = useState(mode !== 'edit');
  const [showSetOverview, setShowSetOverview] = useState(true);
  const [focusIndex, setFocusIndex] = useState(() => {
    const sets = session.entries.flatMap(entry => entry.sets);
    const firstOpen = sets.findIndex(set => !set.done);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [inputError, setInputError] = useState('');
  const [recordAlert, setRecordAlert] = useState(null);
  const closeRecordAlert = useCallback(() => setRecordAlert(null), []);
  const recordEditTimer = useRef(null);
  useEffect(() => () => clearTimeout(recordEditTimer.current), []);
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState(null); // { secondsLeft, total, exerciseName }
  const [showSessionNotes, setShowSessionNotes] = useState(!!session.notes);
  const isEdit = mode === 'edit';
  const positions = session.entries.flatMap((entry, entryIdx) =>
    entry.sets.map((_, setIdx) => ({ entryIdx, setIdx })));
  const safeFocusIndex = Math.min(focusIndex, Math.max(0, positions.length - 1));
  const focusedPosition = positions[safeFocusIndex];
  const focusedEntry = focusedPosition ? session.entries[focusedPosition.entryIdx] : null;
  const focusedExercise = focusedEntry ? exMap[focusedEntry.exerciseId] : null;
  const focusedSet = focusedPosition ? focusedEntry?.sets[focusedPosition.setIdx] : null;
  const focusedGhost = focusedSet?.done ? focusedSet.ghost || null
    : focusedExercise && focusedSet ? predictGhost({
      exercise: focusedExercise, setIndex: focusedPosition.setIdx,
      sessions: previousSessions, routineId: session.routineId,
      targetSet: focusedSet, currentEntry: focusedEntry,
    }) : null;
  const focusedComparison = focusedExercise
    ? exerciseComparisons(previousSessions, focusedExercise.id, session.routineId) : null;

  // Live timer (active mode only)
  useEffect(() => {
    if (isEdit) {
      setElapsed(session.duration || 0);
      return;
    }
    const tick = () => setElapsed(Math.round((Date.now() - session.startedAt) / 1000));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [session.startedAt, session.duration, isEdit]);

  // Rest countdown
  useEffect(() => {
    if (!restTimer || restTimer.secondsLeft <= 0) return;
    const i = setInterval(() => {
      setRestTimer(rt => {
        if (!rt) return null;
        if (rt.secondsLeft <= 1) {
          // Beep at end
          tryBeep();
          return null;
        }
        return { ...rt, secondsLeft: rt.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(i);
  }, [restTimer]);

  const startRest = (exerciseId) => {
    const entry = session.entries.find(e => e.exerciseId === exerciseId);
    const ex = exMap[exerciseId];
    const seconds = entry?.restSeconds || 0;
    if (seconds <= 0) return;
    setRestTimer({ secondsLeft: seconds, total: seconds, exerciseName: ex?.name || '' });
  };

  const dismissRest = () => setRestTimer(null);
  const adjustRest = (delta) => setRestTimer(rt => rt ? { ...rt, secondsLeft: Math.max(0, rt.secondsLeft + delta) } : null);

  const addExercise = ex => {
    setFocusIndex(positions.length);
    setFocusMode(true);
    setSession(s => {
      const last = findLastEntryForExercise(ex.id, previousSessions);
      // If we found history, mirror the previous session's set count and
      // pre-fill weight/reps/etc per set. Otherwise create one empty set
      // as before.
      const sets = (last && last.sets?.length)
        ? last.sets.map(ps => inheritSet(ex, ps, null))
        : [defaultSet(ex)];
      return {
        ...s,
        entries: [...s.entries, {
          exerciseId: ex.id,
          restSeconds: 0,
          notes: '',
          sets,
        }],
      };
    });
    setPickerOpen(false);
  };

  const removeEntry = (idx) => {
    showConfirm({
      title: 'Quitar ejercicio',
      body: `Se eliminará este ejercicio y sus series del entrenamiento.`,
      confirmLabel: 'Quitar',
      danger: true,
      onConfirm: () => setSession(s => ({ ...s, entries: s.entries.filter((_, i) => i !== idx) })),
    });
  };

  const moveEntry = (idx, dir) => {
    setSession(s => {
      const entries = [...s.entries];
      const target = idx + dir;
      if (target < 0 || target >= entries.length) return s;
      [entries[idx], entries[target]] = [entries[target], entries[idx]];
      return { ...s, entries };
    });
  };

  const updateEntry = (idx, patch) => {
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, i) => i !== idx ? e : { ...e, ...patch }),
    }));
  };

  const updateSet = (entryIdx, setIdx, patch) => {
    const entry = session.entries[entryIdx];
    const previous = entry?.sets[setIdx];
    if (!previous) return false;
    const next = { ...previous, ...patch };
    if (patch.done === true && !validCompletedSet(next, exMap[entry.exerciseId]?.type)) {
      setInputError('Completa los valores reales antes de marcar la serie.');
      return false;
    }
    setInputError('');
    const setBecameDone = patch.done === true && !previous.done;
    const performanceChanged = ['weight', 'reps', 'distance', 'duration']
      .some(field => Object.hasOwn(patch, field) && patch[field] !== previous[field]);
    if (performanceChanged || Object.hasOwn(patch, 'done')) {
      clearTimeout(recordEditTimer.current);
      recordEditTimer.current = null;
    }
    const refreshRecords = !isEdit && (setBecameDone || (previous.done && performanceChanged));
    const records = refreshRecords ? detectSetRecords({
      exercise: exMap[entry.exerciseId], set: { ...next, done: true },
      previousSessions, currentSession: session, entryIndex: entryIdx, setIndex: setIdx,
    }) : previous.personalRecords || [];
    const recordSnapshot = { weight: next.weight, reps: next.reps,
      distance: next.distance, duration: next.duration };
    const samePerformance = previous.recordSnapshot &&
      Object.keys(recordSnapshot).every(key => previous.recordSnapshot[key] === recordSnapshot[key]);
    const ghost = setBecameDone && !isEdit ? predictGhost({
      exercise: exMap[entry.exerciseId], setIndex: setIdx,
      sessions: previousSessions, routineId: session.routineId,
      targetSet: previous, currentEntry: entry,
    }) : previous.ghost;
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, ei) => ei !== entryIdx ? e : {
        ...e,
        sets: e.sets.map((st, si) => {
          if (si !== setIdx) return st;
          return { ...st, ...patch, ...(setBecameDone && ghost ? { ghost } : {}),
            ...(refreshRecords ? { personalRecords: records, recordSnapshot } : {}) };
        }),
      }),
    }));
    if (!isEdit && records.length && !samePerformance && (setBecameDone || (previous.done && performanceChanged))) {
      const alert = { exerciseName: exMap[entry.exerciseId]?.name || entry.exerciseId,
        records, id: `${session.id}-${entryIdx}-${setIdx}-${Date.now()}` };
      if (setBecameDone) setRecordAlert(alert);
      else recordEditTimer.current = setTimeout(() => setRecordAlert(alert), 700);
    }
    if (setBecameDone && !isEdit) {
      // Trigger rest timer if exercise has restSeconds
      if (entry?.restSeconds > 0) {
        const ex = exMap[entry.exerciseId];
        setRestTimer({ secondsLeft: entry.restSeconds, total: entry.restSeconds, exerciseName: ex?.name || '' });
      }
    }
    return true;
  };

  const completeFocusedSet = () => {
    if (!focusedPosition || !updateSet(focusedPosition.entryIdx, focusedPosition.setIdx, { done: true })) return;
    const next = positions.findIndex((pos, index) => index > safeFocusIndex &&
      !session.entries[pos.entryIdx].sets[pos.setIdx].done);
    const earlier = positions.findIndex((pos, index) => index < safeFocusIndex &&
      !session.entries[pos.entryIdx].sets[pos.setIdx].done);
    if (next >= 0) setFocusIndex(next);
    else if (earlier >= 0) setFocusIndex(earlier);
  };

  const addFocusedSet = () => {
    if (!focusedPosition) return;
    const nextEntry = positions.findIndex(pos => pos.entryIdx > focusedPosition.entryIdx);
    setFocusIndex(nextEntry >= 0 ? nextEntry : positions.length);
    addSet(focusedPosition.entryIdx);
  };

  const addSet = entryIdx => {
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, ei) => {
        if (ei !== entryIdx) return e;
        const ex = exMap[e.exerciseId];
        const last = e.sets[e.sets.length - 1] || {};
        // Inherit weight/reps but reset done; preserve targets if existed
        const newSet = {
          ...defaultSet(ex),
          weight: last.weight ?? '',
          reps: last.reps ?? '',
          distance: last.distance ?? '',
          duration: last.duration ?? 0,
          repsMin: last.repsMin ?? null,
          repsMax: last.repsMax ?? null,
          rir: last.rir ?? null,
          done: false,
        };
        return { ...e, sets: [...e.sets, newSet] };
      }),
    }));
  };

  const removeSet = (entryIdx, setIdx) => {
    setSession(s => ({
      ...s,
      entries: s.entries.map((e, ei) => ei !== entryIdx ? e : { ...e, sets: e.sets.filter((_, i) => i !== setIdx) }),
    }));
  };

  const updateDuration = (newDur) => {
    setSession(s => ({ ...s, duration: newDur }));
    setElapsed(newDur);
  };

  const updateDate = (newIso) => {
    setSession(s => ({ ...s, date: newIso }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20">
        <div className="px-5 py-3 flex items-center justify-between">
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-200 p-1 -ml-1" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-mono text-lg text-lime-300">
            {isEdit ? (
              <DurationInput value={elapsed} onChange={updateDuration} />
            ) : (
              <><Timer className="w-4 h-4" />{fmtDur(elapsed)}</>
            )}
          </div>
          <button
            onClick={onFinish}
            disabled={session.entries.length === 0 || finishing}
            className="bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 hover:bg-lime-400 transition"
          >
            {isEdit ? <><Save className="w-4 h-4" strokeWidth={3} /> GUARDAR</> : <><Check className="w-4 h-4" strokeWidth={3} /> FIN</>}
          </button>
        </div>
        <div className="px-5 pb-3">
          {editingName ? (
            <input
              autoFocus
              value={session.name}
              onChange={e => setSession(s => ({ ...s, name: e.target.value }))}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 font-display text-2xl w-full"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="font-display text-3xl text-zinc-100 leading-none flex items-center gap-2 group">
              {session.name} <Edit2 className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
            </button>
          )}
          {!isEdit && (
            <button onClick={() => setFocusMode(value => !value)}
              className="mt-2 text-[11px] font-bold text-lime-300 border border-lime-300/30 rounded-full px-3 py-1">
              {focusMode ? 'VER ENTRENAMIENTO COMPLETO' : 'MODO SERIE'}
            </button>
          )}
          {isEdit && (
            <div className="mt-2">
              <input
                type="datetime-local"
                value={toLocalInput(session.date)}
                onChange={e => updateDate(fromLocalInput(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-400 outline-none focus:border-lime-300/50"
              />
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-5 space-y-4">
        {focusMode && !isEdit ? (
          <>
            {positions.length > 0 && (
              <FocusedSetsOverview
                entries={session.entries}
                exMap={exMap}
                activeEntryIndex={focusedPosition?.entryIdx}
                activeSetIndex={focusedPosition?.setIdx}
                open={showSetOverview}
                onToggle={() => setShowSetOverview(value => !value)}
                onSelect={(entryIdx, setIdx) => {
                  const index = positions.findIndex(pos => pos.entryIdx === entryIdx && pos.setIdx === setIdx);
                  if (index >= 0) {
                    setFocusIndex(index);
                    requestAnimationFrame(() => document.getElementById('focused-set-editor')?.scrollIntoView?.({
                      behavior: 'smooth', block: 'start',
                    }));
                  }
                }}
              />
            )}
            {focusedPosition && focusedExercise && focusedSet ? (
              <FocusSetCard
                key={`${focusedPosition.entryIdx}-${focusedPosition.setIdx}`}
                entry={focusedEntry}
                exercise={focusedExercise}
                set={focusedSet}
                setIndex={focusedPosition.setIdx}
                position={safeFocusIndex}
                total={positions.length}
                completed={positions.filter(pos => session.entries[pos.entryIdx].sets[pos.setIdx].done).length}
                ghost={focusedGhost}
                comparison={focusedComparison}
                error={inputError}
                onPrevious={() => setFocusIndex(Math.max(0, safeFocusIndex - 1))}
                onNext={() => setFocusIndex(Math.min(positions.length - 1, safeFocusIndex + 1))}
                onUpdate={patch => updateSet(focusedPosition.entryIdx, focusedPosition.setIdx, patch)}
                onComplete={completeFocusedSet}
                onAddSet={addFocusedSet}
              />
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <div>Añade un ejercicio para empezar.</div>
              </div>
            )}
            <button onClick={() => setPickerOpen(true)}
              className="w-full border-2 border-dashed border-zinc-700 rounded-2xl py-4 text-zinc-400 font-bold">
              <Plus className="w-4 h-4 inline mr-1" /> AÑADIR EJERCICIO
            </button>
          </>
        ) : (
        <>
        {inputError && <div role="alert" className="text-xs text-red-300">{inputError}</div>}
        {session.entries.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">Añade tu primer ejercicio para empezar.</div>
          </div>
        )}

        {session.entries.map((entry, ei) => {
          const ex = exMap[entry.exerciseId];
          if (!ex) return null;
          return (
            <ExerciseEntryCard
              key={ei}
              entry={entry}
              exercise={ex}
              routineId={session.routineId}
              showGhost={!isEdit}
              previousSessions={previousSessions}
              plateConfig={plateConfig}
              isFirst={ei === 0}
              isLast={ei === session.entries.length - 1}
              onAddSet={() => addSet(ei)}
              onUpdateSet={(si, patch) => updateSet(ei, si, patch)}
              onRemoveSet={si => removeSet(ei, si)}
              onUpdateEntry={patch => updateEntry(ei, patch)}
              onRemove={() => removeEntry(ei)}
              onMoveUp={() => moveEntry(ei, -1)}
              onMoveDown={() => moveEntry(ei, +1)}
              onStartRestNow={isEdit ? null : () => startRest(entry.exerciseId)}
              showConfirm={showConfirm}
            />
          );
        })}

        <button
          onClick={() => setPickerOpen(true)}
          className="w-full border-2 border-dashed border-zinc-700 hover:border-lime-300 hover:bg-lime-300/5 rounded-2xl py-6 text-zinc-400 hover:text-lime-300 transition flex flex-col items-center gap-1 font-bold"
        >
          <Plus className="w-6 h-6" /> AÑADIR EJERCICIO
        </button>

        {/* Session notes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSessionNotes(v => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <span className="font-bold text-sm">Notas de la sesión</span>
              {session.notes && <span className="text-[10px] bg-lime-300/20 text-lime-300 px-1.5 py-0.5 rounded font-bold">CON NOTAS</span>}
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showSessionNotes ? 'rotate-180' : ''}`} />
          </button>
          {showSessionNotes && (
            <div className="px-4 pb-4">
              <textarea
                value={session.notes || ''}
                onChange={e => setSession(s => ({ ...s, notes: e.target.value }))}
                placeholder="Cómo te has sentido, energía, sueño, comentarios generales..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-lime-300/50 resize-none"
              />
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {pickerOpen && (
        <ExercisePicker exercises={exercises} onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}

      <RecordCelebration alert={recordAlert} onClose={closeRecordAlert} />

      {restTimer && (
        <RestTimerWidget
          timer={restTimer}
          onDismiss={dismissRest}
          onAdjust={adjustRest}
        />
      )}
    </div>
  );
}

export function validCompletedSet(set, type) {
  const isPositive = value => value !== '' && value !== null && value !== undefined &&
    Number.isFinite(Number(value)) && Number(value) > 0;
  if (type === 'weight_reps') return isPositive(set.weight) && isPositive(set.reps);
  if (type === 'reps') return isPositive(set.reps);
  if (type === 'distance_duration') return isPositive(set.distance) && isPositive(set.duration);
  if (type === 'duration') return isPositive(set.duration);
  return false;
}

export function setBrief(set, type) {
  if (!set) return '—';
  if (type === 'weight_reps') return `${set.weight ?? '—'} kg × ${set.reps ?? '—'}${set.rir != null ? ` @${set.rir}` : ''}`;
  if (type === 'reps') return `${set.reps ?? '—'} reps${set.rir != null ? ` @${set.rir}` : ''}`;
  if (type === 'distance_duration') return `${set.distance ?? '—'} · ${set.duration ? fmtDur(set.duration) : '—'}`;
  return set.duration ? fmtDur(set.duration) : '—';
}

export function firstComparableSet(item, index) {
  if (!item) return null;
  return item.entry.sets[index]?.done ? item.entry.sets[index]
    : item.entry.sets.find(set => set.done) || null;
}

export function StepperField({ label, value, onChange, step = 1, min = 0, unit = '' }) {
  const change = delta => {
    const next = Number((Math.max(min, (Number(value) || 0) + delta)).toFixed(2));
    onChange(next);
  };
  return (
    <div className="bg-zinc-800 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <button onClick={() => change(-step)} aria-label={`Reducir ${label}`}
          className="w-11 h-11 bg-zinc-700 rounded-lg text-xl font-bold shrink-0">−</button>
        <input type="number" inputMode={step % 1 ? 'decimal' : 'numeric'} step="any"
          value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="min-w-0 w-full bg-zinc-950 border border-zinc-700 rounded-lg text-center font-mono text-xl h-11 outline-none focus:border-lime-300"
          aria-label={label} />
        <button onClick={() => change(step)} aria-label={`Aumentar ${label}`}
          className="w-11 h-11 bg-zinc-700 rounded-lg text-xl font-bold shrink-0">+</button>
      </div>
      {unit && <div className="text-[10px] text-zinc-500 text-center mt-1">{unit}</div>}
    </div>
  );
}

export function FocusedSetsOverview({ entries, exMap, activeEntryIndex, activeSetIndex, open, onToggle, onSelect }) {
  const completed = entries.reduce((count, entry) => count + entry.sets.filter(set => set.done).length, 0);
  const total = entries.reduce((count, entry) => count + entry.sets.length, 0);
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden" aria-label="Series del entrenamiento">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="workout-sets-overview"
        className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <span>
          <span className="block font-display text-xl text-zinc-100">TUS SERIES</span>
          <span className="block text-xs text-zinc-400">{completed} de {total} hechas · toca una para verla o corregirla</span>
        </span>
        <ChevronDown className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id="workout-sets-overview" className="px-3 pb-3 space-y-3 border-t border-zinc-800 pt-3">
          {entries.map((entry, entryIdx) => {
            const exercise = exMap[entry.exerciseId];
            if (!exercise) return null;
            return (
              <div key={entryIdx}>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide px-1 mb-1.5">
                  {exercise.name}
                </div>
                <div className="space-y-1.5">
                  {entry.sets.map((set, setIdx) => {
                    const active = entryIdx === activeEntryIndex && setIdx === activeSetIndex;
                    return (
                      <button key={setIdx} type="button" onClick={() => onSelect(entryIdx, setIdx)}
                        aria-label={`Ver serie ${setIdx + 1} de ${exercise.name}`}
                        aria-current={active ? 'step' : undefined}
                        aria-controls="focused-set-editor"
                        className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${active
                          ? 'border-lime-300 bg-lime-300/10'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${set.done
                          ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                          {setIdx + 1}
                        </span>
                        <span className="min-w-0 flex-1 font-mono text-sm text-zinc-100 truncate">
                          {set.done || validCompletedSet(set, exercise.type)
                            ? setBrief(set, exercise.type) : 'Sin datos aún'}
                        </span>
                        <span className={`text-[10px] font-bold shrink-0 ${set.personalRecords?.length && set.done
                          ? 'text-amber-300' : set.done ? 'text-lime-300' : 'text-zinc-500'}`}>
                          {set.done ? (set.personalRecords?.length ? '★ RÉCORD' : 'HECHA') : 'POR HACER'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FocusSetCard({ entry, exercise, set, setIndex, position, total, completed,
  ghost, comparison, error, onPrevious, onNext, onUpdate, onComplete, onAddSet }) {
  const routinePrevious = comparison?.routine;
  const generalPrevious = comparison?.general;
  return (
    <div id="focused-set-editor" className="space-y-4 scroll-mt-36">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onPrevious} disabled={position === 0} aria-label="Serie anterior"
            className="p-2 text-zinc-300 disabled:opacity-20"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center min-w-0">
            <div className="text-[10px] text-zinc-500 font-bold tracking-widest">SERIE {position + 1} DE {total} · {completed} HECHAS</div>
            <div className="font-display text-2xl text-zinc-100 truncate">{exercise.name.toUpperCase()}</div>
            <div className="text-xs text-zinc-500">Serie {setIndex + 1} de {entry.sets.length}{entry.restSeconds ? ` · descanso ${fmtDur(entry.restSeconds)}` : ''}</div>
          </div>
          <button onClick={onNext} disabled={position >= total - 1} aria-label="Serie siguiente"
            className="p-2 text-zinc-300 disabled:opacity-20"><ChevronRight className="w-6 h-6" /></button>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-lime-300" style={{ width: `${total ? 100 * completed / total : 0}%` }} />
        </div>
      </div>

      {set.done && set.personalRecords?.length > 0 && (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-300/10 p-4 text-amber-100">
          <div className="text-[11px] font-bold tracking-[0.18em] text-amber-300">★ RÉCORD PERSONAL EN ESTA SERIE</div>
          <div className="text-sm mt-1">{set.personalRecords.map(record => `${record.label}: ${record.detail}`).join(' · ')}</div>
        </div>
      )}

      {ghost ? (
        <div className="bg-lime-300/10 border border-lime-300/40 rounded-2xl p-4">
          <div className="text-[10px] text-lime-300 font-bold tracking-widest mb-1">GHOST · PROPUESTA PARA ESTA SERIE</div>
          <div className="font-mono text-2xl text-lime-200">{setBrief(ghost, exercise.type)}</div>
          <div className="text-xs text-zinc-300 mt-2">{ghost.reason}</div>
          <div className="text-[10px] text-zinc-500 mt-2">Basado en {ghost.scope === 'rutina' ? 'esta rutina' : 'tu historial general'} · {formatShort(ghost.referenceDate)}</div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-400">
          {['weight_reps', 'reps'].includes(exercise.type)
            ? 'GHOST: registra este ejercicio para recibir una propuesta la próxima vez.'
            : 'Ghost de progresión disponible para ejercicios de fuerza.'}
        </div>
      )}

      {(routinePrevious || generalPrevious) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-zinc-400 space-y-1">
          {routinePrevious && <div>Última en esta rutina: <span className="text-zinc-100 font-mono">{setBrief(firstComparableSet(routinePrevious, setIndex), exercise.type)}</span></div>}
          {generalPrevious && generalPrevious.session.id !== routinePrevious?.session.id &&
            <div>Última general: <span className="text-zinc-100 font-mono">{setBrief(firstComparableSet(generalPrevious, setIndex), exercise.type)}</span></div>}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div>
          <div className="font-display text-xl">RESULTADO REAL</div>
          <div className="text-xs text-zinc-500">Confirma o corrige los valores después de hacer la serie.</div>
        </div>
        {exercise.type === 'weight_reps' && <StepperField label="Peso" unit="kg" value={set.weight}
          step={/mancuern/i.test(exercise.equipment) ? 1 : 2.5} onChange={weight => onUpdate({ weight })} />}
        {['weight_reps', 'reps'].includes(exercise.type) && <>
          <StepperField label="Repeticiones" value={set.reps} onChange={reps => onUpdate({ reps })} />
          <StepperField label="RIR" value={set.rir ?? ''} min={0} onChange={rir => onUpdate({ rir: rir === '' ? null : rir })} />
        </>}
        {exercise.type === 'distance_duration' && <StepperField label={`Distancia (${exercise.distanceUnit || 'km'})`}
          value={set.distance} step={0.1} onChange={distance => onUpdate({ distance })} />}
        {['distance_duration', 'duration'].includes(exercise.type) && <div>
          <div className="text-xs text-zinc-400 mb-1">Duración</div>
          <DurField value={set.duration || 0} onChange={duration => onUpdate({ duration })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-center font-mono text-xl" />
        </div>}
        {error && <div role="alert" className="text-xs text-red-300">{error}</div>}
        {set.done ? (
          <button onClick={() => onUpdate({ done: false })}
            className="w-full bg-zinc-800 text-lime-300 rounded-xl py-4 font-bold">SERIE HECHA ✓ · DESMARCAR</button>
        ) : (
          <button onClick={onComplete}
            className="w-full bg-lime-300 text-zinc-950 rounded-xl py-4 text-lg font-bold">MARCAR SERIE HECHA ✓</button>
        )}
      </div>
      <button onClick={onAddSet} className="w-full text-sm text-zinc-400 py-3">+ AÑADIR SERIE A {exercise.name.toUpperCase()}</button>
    </div>
  );
}

// Date input helpers
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(str) {
  if (!str) return new Date().toISOString();
  return new Date(str).toISOString();
}

// Editable duration input (mm:ss or h:mm:ss)
export function DurationInput({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(fmtDur(value));
  useEffect(() => { if (!editing) setText(fmtDur(value)); }, [value, editing]);
  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => { onChange(parseDur(text)); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(parseDur(text)); setEditing(false); } }}
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 font-mono text-base text-lime-300 w-24 text-center outline-none"
        placeholder="mm:ss"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-2 hover:text-lime-200 transition">
      <Timer className="w-4 h-4" />
      <span>{fmtDur(value)}</span>
      <Edit2 className="w-3 h-3 opacity-50" />
    </button>
  );
}

// Inline duration input — user types raw digits, we only re-format on blur (avoids cursor jump)

// Tiny audio beep when rest finishes
export function tryBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close(), 800);
  } catch {}
  try { if (navigator.vibrate) navigator.vibrate([200, 80, 200]); } catch {}
}

export function RestTimerWidget({ timer, onDismiss, onAdjust }) {
  const pct = timer.total > 0 ? ((timer.total - timer.secondsLeft) / timer.total) * 100 : 0;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-1rem)] bg-zinc-900 border border-lime-300/40 rounded-2xl shadow-2xl shadow-lime-300/10 z-40 anim-slide-up overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-zinc-800">
        <div className="h-full bg-lime-300 transition-all duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-3 p-3 pt-4">
        <div className="bg-lime-300/15 text-lime-300 rounded-full p-2 shrink-0">
          <Timer className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">DESCANSO</div>
          <div className="font-mono text-2xl text-lime-300 leading-none">{fmtDur(timer.secondsLeft)}</div>
          {timer.exerciseName && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{timer.exerciseName}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onAdjust(-15)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center">-15</button>
          <button onClick={() => onAdjust(+15)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center">+15</button>
          <button onClick={onDismiss} className="bg-zinc-800 hover:bg-red-500 text-zinc-200 hover:text-white rounded-full w-8 h-8 flex items-center justify-center" aria-label="Saltar descanso">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function defaultSet(ex) {
  if (!ex) return { done: false };
  switch (ex.type) {
    case 'weight_reps': return { weight: '', reps: '', done: false };
    case 'reps': return { reps: '', done: false };
    case 'distance_duration': return { distance: '', duration: 0, done: false };
    case 'duration': return { duration: 0, done: false };
    default: return { done: false };
  }
}

export function ExerciseEntryCard({ entry, exercise, routineId, showGhost, previousSessions, plateConfig, isFirst, isLast, onAddSet, onUpdateSet, onRemoveSet, onUpdateEntry, onRemove, onMoveUp, onMoveDown, onStartRestNow, showConfirm }) {
  const [showNotes, setShowNotes] = useState(!!entry.notes);
  const [showRestEdit, setShowRestEdit] = useState(false);

  const comparison = useMemo(() =>
    exerciseComparisons(previousSessions, exercise.id, routineId),
  [previousSessions, exercise.id, routineId]);
  const lastSession = comparison.preferred
    ? { date: comparison.preferred.session.date, sets: comparison.preferred.entry.sets } : null;

  // Plate breakdown only makes sense for barbell weight-rep work.
  const showPlates = exercise.type === 'weight_reps' && exercise.equipment === 'Barra' && !!plateConfig;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 gap-2">
        <div className="flex flex-col -ml-1 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 disabled:hover:text-zinc-500 p-0.5" aria-label="Subir">
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="text-zinc-500 hover:text-lime-300 disabled:opacity-20 disabled:hover:text-zinc-500 p-0.5" aria-label="Bajar">
            <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl leading-tight">{exercise.name.toUpperCase()}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            {MUSCLE_GROUPS[exercise.muscleGroup] || exercise.muscleGroup} • {exercise.equipment}
          </div>
        </div>
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400 p-1 shrink-0" aria-label="Quitar ejercicio">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Rest + notes mini-toolbar */}
      <div className="flex items-center gap-1 px-3 pt-3 flex-wrap">
        <button
          onClick={() => setShowRestEdit(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${entry.restSeconds > 0 ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <Timer className="w-3 h-3" /> {entry.restSeconds > 0 ? fmtDur(entry.restSeconds) : 'Descanso'}
        </button>
        <button
          onClick={() => setShowNotes(v => !v)}
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${entry.notes ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          <MessageSquare className="w-3 h-3" /> Notas
        </button>
        {entry.restSeconds > 0 && onStartRestNow && (
          <button
            onClick={onStartRestNow}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-lime-300 transition ml-auto"
          >
            <Play className="w-3 h-3 fill-current" /> Iniciar
          </button>
        )}
      </div>

      {showRestEdit && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Descanso:</span>
          <DurField
            value={entry.restSeconds || 0}
            onChange={v => onUpdateEntry({ restSeconds: v })}
            placeholder="mm:ss"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200 w-20 outline-none focus:border-lime-300/50 placeholder:text-zinc-500 text-center"
          />
          <div className="flex gap-1 ml-auto">
            {[60, 90, 120, 180].map(sec => (
              <button
                key={sec}
                onClick={() => onUpdateEntry({ restSeconds: sec })}
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
            value={entry.notes || ''}
            onChange={e => onUpdateEntry({ notes: e.target.value })}
            placeholder="Notas para este ejercicio (técnica, sensaciones...)"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-lime-300/50 resize-none"
          />
        </div>
      )}

      <div className="p-3 space-y-1.5 mt-2">
        <SetHeader type={exercise.type} unit={exercise.distanceUnit} />
        {entry.sets.map((s, si) => (
          <SetRow
            key={si}
            idx={si}
            set={s}
            type={exercise.type}
            unit={exercise.distanceUnit}
            previous={lastSession?.sets[si]}
            ghost={showGhost ? (s.done ? s.ghost || null : predictGhost({ exercise, setIndex: si,
              sessions: previousSessions, routineId, targetSet: s, currentEntry: entry })) : null}
            plateConfig={showPlates ? plateConfig : null}
            onUpdate={patch => onUpdateSet(si, patch)}
            onRemove={() => onRemoveSet(si)}
            showConfirm={showConfirm}
          />
        ))}
        <button
          onClick={onAddSet}
          className="w-full text-sm text-zinc-400 hover:text-lime-300 hover:bg-zinc-800 py-2 rounded transition flex items-center justify-center gap-1 mt-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Añadir serie
        </button>
        {lastSession && (
          <div className="text-[10px] text-zinc-600 italic mt-1 text-center">
            Última vez {comparison.scope === 'rutina' ? 'en esta rutina' : '(general)'}: {formatShort(lastSession.date)}
          </div>
        )}
        {comparison.routine && comparison.general?.session.id !== comparison.routine.session.id && (
          <div className="text-[10px] text-zinc-600 italic text-center">
            Última general: {formatShort(comparison.general.session.date)}
          </div>
        )}
      </div>
    </div>
  );
}

export function SetHeader({ type, unit, editable = true }) {
  const cols = [];
  if (editable) cols.push({ label: '', w: 'w-7' }); // delete column
  cols.push({ label: '#', w: editable ? 'w-5' : 'w-7' });
  if (type === 'weight_reps') {
    cols.push({ label: 'KG', w: 'flex-1' });
    cols.push({ label: 'REPS', w: 'flex-1' });
    cols.push({ label: 'RIR', w: 'w-11' });
  } else if (type === 'reps') {
    cols.push({ label: 'REPS', w: 'flex-1' });
    cols.push({ label: 'RIR', w: 'w-11' });
  } else if (type === 'distance_duration') {
    cols.push({ label: (unit || 'KM').toUpperCase(), w: 'flex-1' });
    cols.push({ label: 'TIEMPO', w: 'flex-1' });
  } else if (type === 'duration') {
    cols.push({ label: 'TIEMPO', w: 'flex-1' });
  }
  cols.push({ label: '', w: 'w-9' }); // check column
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold tracking-wider px-1">
      {cols.map((c, i) => <div key={i} className={`${c.w} text-center`}>{c.label}</div>)}
    </div>
  );
}

export function SetRow({ idx, set, type, unit, previous, ghost, plateConfig, onUpdate, onRemove, showConfirm }) {
  const placeholder = previous ? {
    weight: previous.weight ? String(previous.weight) : '',
    reps: previous.reps ? String(previous.reps) : '',
    distance: previous.distance ? String(previous.distance) : '',
    duration: previous.duration ? fmtDur(previous.duration) : '',
    rir: previous.rir != null ? String(previous.rir) : '',
  } : {};
  const repRangePh = (set.repsMin && set.repsMax) ? `${set.repsMin}-${set.repsMax}` : (set.repsMin || set.repsMax || placeholder.reps || '–');
  const cellCls = `bg-zinc-800 focus:bg-zinc-700 border border-zinc-700 focus:border-lime-300/60 rounded text-center font-mono text-sm py-2 outline-none min-w-0 transition placeholder:text-zinc-500`;

  const handleRemoveClick = () => {
    if (showConfirm) {
      showConfirm({
        title: 'Eliminar serie',
        body: `Se eliminará la serie #${idx + 1}.`,
        confirmLabel: 'Eliminar',
        danger: true,
        onConfirm: onRemove,
      });
    } else {
      onRemove();
    }
  };

  // Extras (1RM + plate breakdown) only when both weight & reps inputs have
  // concrete numbers. We re-derive the values here rather than reading them
  // off the input DOM to keep the source of truth in `set`.
  const w = Number(set.weight);
  const r = Number(set.reps);
  const hasW = Number.isFinite(w) && w > 0;
  const hasR = Number.isFinite(r) && r > 0;
  const oneRm = (type === 'weight_reps' && hasW && hasR) ? Math.round(epley(w, r)) : null;
  const plateInfo = (type === 'weight_reps' && plateConfig && hasW) ? computePlates(w, plateConfig) : null;
  const plateText = plateInfo && !plateInfo.belowBar
    ? (plateInfo.exact
        ? `${platesSummary(plateInfo.perSide)}/lado`
        : (plateInfo.perSide.length
            ? `${platesSummary(plateInfo.perSide)}/lado · faltan ${plateInfo.remainder.toFixed(2).replace(/\.?0+$/, '')} kg`
            : `no entra con tus discos`))
    : null;
  const showExtras = oneRm != null || plateText != null;

  // Reusable RIR input — placeholder shows previous session's RIR if any,
  // so the user can quickly confirm or override.
  const rirInput = (
    <input
      className={`${cellCls} w-11 shrink-0`}
      type="number"
      inputMode="numeric"
      value={set.rir ?? ''}
      placeholder={placeholder.rir || '–'}
      onChange={e => onUpdate({ rir: e.target.value === '' ? null : parseInt(e.target.value) })}
    />
  );

  return (
    <div className="flex flex-col">
      {ghost && !set.done && <div className="text-[10px] text-lime-300/80 font-mono pl-12 pb-0.5">
        GHOST: {setBrief(ghost, type)}
      </div>}
      <div className={`flex items-center gap-1.5 ${set.done ? 'bg-lime-300/5' : ''} rounded transition`}>
        <button
          onClick={handleRemoveClick}
          className="w-7 h-9 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition shrink-0"
          aria-label="Eliminar serie"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
        <div className="w-5 text-center font-mono text-xs text-zinc-500">{idx + 1}</div>
        {type === 'weight_reps' && (
          <>
            <input className={`${cellCls} flex-1 w-0`} type="number" step="0.5" inputMode="decimal" value={set.weight ?? ''} placeholder={placeholder.weight || '–'} onChange={e => onUpdate({ weight: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
            <input className={`${cellCls} flex-1 w-0`} type="number" inputMode="numeric" value={set.reps ?? ''} placeholder={repRangePh} onChange={e => onUpdate({ reps: e.target.value === '' ? '' : parseInt(e.target.value) })} />
            {rirInput}
          </>
        )}
        {type === 'reps' && (
          <>
            <input className={`${cellCls} flex-1 w-0`} type="number" inputMode="numeric" value={set.reps ?? ''} placeholder={repRangePh} onChange={e => onUpdate({ reps: e.target.value === '' ? '' : parseInt(e.target.value) })} />
            {rirInput}
          </>
        )}
        {type === 'distance_duration' && (
          <>
            <input className={`${cellCls} flex-1 w-0`} type="number" step="0.01" inputMode="decimal" value={set.distance ?? ''} placeholder={placeholder.distance || '–'} onChange={e => onUpdate({ distance: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
            <DurField value={set.duration || 0} onChange={v => onUpdate({ duration: v })} placeholder={placeholder.duration || 'mm:ss'} className={`${cellCls} flex-1 w-0`} />
          </>
        )}
        {type === 'duration' && (
          <DurField value={set.duration || 0} onChange={v => onUpdate({ duration: v })} placeholder={placeholder.duration || 'mm:ss'} className={`${cellCls} flex-1 w-0`} />
        )}
        <button
          onClick={() => onUpdate({ done: !set.done })}
          className={`w-9 h-9 rounded flex items-center justify-center transition shrink-0 ${set.done ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'}`}
          aria-label={set.done ? 'Desmarcar' : 'Marcar completada'}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
      {showExtras && (
        <div className="flex items-center gap-2 pl-12 pr-11 text-[10px] text-zinc-500 font-mono leading-tight pt-0.5 pb-1">
          {oneRm != null && <span>≈ {oneRm} kg</span>}
          {oneRm != null && plateText && <span className="text-zinc-700">·</span>}
          {plateText && <span className="truncate">{plateText}</span>}
        </div>
      )}
      {set.done && set.personalRecords?.length > 0 && (
        <div className="text-[10px] font-bold text-amber-300 pl-12 pb-1">★ RÉCORD PERSONAL</div>
      )}
    </div>
  );
}


// ============================================================
// SESSION DETAIL
// ============================================================

export function SessionDetail({ session, exMap, onBack, onDelete, onEdit, onRepeat, onSaveAsRoutine, hasActive }) {
  const dur = sessionDuration(session);
  const vol = sessionVolume(session);
  const canSaveAsRoutine = routineDraftFromSession(session, exMap).exercises.length > 0;
  return (
    <div>
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 px-5 py-3 flex items-center gap-2">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-200 p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-xl flex-1 truncate">DETALLE</h2>
        <button onClick={onEdit} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
          <Pencil className="w-3.5 h-3.5" /> EDITAR
        </button>
        <button onClick={onDelete} className="text-zinc-500 hover:text-red-400 p-1" aria-label="Eliminar entrenamiento">
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <div className="px-5 py-5">
        <div className="text-xs text-zinc-500 mb-1">{formatLong(session.date)} • {formatTime(session.date)}</div>
        <h1 className="font-display text-4xl leading-none mb-4">{session.name || 'Entrenamiento'}</h1>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Duración</div>
            <div className="font-mono text-lg text-lime-300">{fmtDur(dur)}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Ejercicios</div>
            <div className="font-display text-2xl">{session.entries?.length || 0}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Volumen</div>
            <div className="font-mono text-sm text-zinc-300">{vol > 0 ? `${vol.toLocaleString('es-ES')} kg` : '—'}</div>
          </div>
        </div>

        <button onClick={onRepeat} disabled={hasActive}
          className="w-full bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 rounded-xl py-3 mb-5 font-bold flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> REPETIR ENTRENAMIENTO
        </button>
        {hasActive && <p className="text-xs text-zinc-500 -mt-3 mb-5 text-center">Termina la sesión en curso para repetir esta.</p>}

        <button onClick={onSaveAsRoutine} disabled={!canSaveAsRoutine}
          className="w-full border border-lime-300/50 text-lime-300 disabled:border-zinc-800 disabled:text-zinc-600 rounded-xl py-3 mb-5 font-bold flex items-center justify-center gap-2 hover:bg-lime-300/10 transition">
          <Save className="w-4 h-4" /> GUARDAR COMO RUTINA
        </button>
        {!canSaveAsRoutine && <p className="text-xs text-zinc-500 -mt-3 mb-5 text-center">Necesitas al menos una serie completada de un ejercicio disponible.</p>}

        {session.notes && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
              <MessageSquare className="w-3 h-3" /> Notas de la sesión
            </div>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{session.notes}</p>
          </div>
        )}

        <div className="space-y-4">
          {session.entries?.map((entry, i) => {
            const ex = exMap[entry.exerciseId];
            if (!ex) return null;
            return (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <div className="font-display text-lg leading-tight">{ex.name.toUpperCase()}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{MUSCLE_GROUPS[ex.muscleGroup] || ex.muscleGroup}</span>
                    {entry.restSeconds > 0 && <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {fmtDur(entry.restSeconds)}</span>}
                  </div>
                </div>
                {entry.notes && (
                  <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-800/30">
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap italic">{entry.notes}</p>
                  </div>
                )}
                <div className="p-4">
                  <SetHeader type={ex.type} unit={ex.distanceUnit} editable={false} />
                  <div className="space-y-1.5 mt-2">
                    {entry.sets.map((s, si) => (
                      <div key={si} className="flex items-center gap-1.5 font-mono text-sm">
                        <div className="w-7 text-center text-xs text-zinc-500">{si + 1}</div>
                        {ex.type === 'weight_reps' && (<>
                          <div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.weight || '–'}</div>
                          <div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.reps || '–'}</div>
                          <div className="w-11 text-center bg-zinc-800/50 py-1.5 rounded text-xs">{s.rir != null ? s.rir : '–'}</div>
                        </>)}
                        {ex.type === 'reps' && (<>
                          <div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.reps || '–'}</div>
                          <div className="w-11 text-center bg-zinc-800/50 py-1.5 rounded text-xs">{s.rir != null ? s.rir : '–'}</div>
                        </>)}
                        {ex.type === 'distance_duration' && (<><div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.distance || '–'}</div><div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.duration ? fmtDur(s.duration) : '–'}</div></>)}
                        {ex.type === 'duration' && (<div className="flex-1 min-w-0 text-center bg-zinc-800/50 py-1.5 rounded">{s.duration ? fmtDur(s.duration) : '–'}</div>)}
                        <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${s.done ? 'bg-lime-300/20 text-lime-300' : 'bg-zinc-800/30 text-zinc-700'}`}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SessionSummary({ session, previousSessions, allSessions, exMap, celebration, weeklyGoal, onClose, onDetail }) {
  const summary = summarizeSession(session, previousSessions, exMap);
  const comparison = volumeComparison(summary.volume, session.id);
  const recordSets = (session.entries || []).flatMap(completedSets)
    .filter(set => set.personalRecords?.length).length;
  return (
    <div className="px-5 pt-8 pb-8">
      <div className="text-xs text-lime-300 font-bold tracking-widest">ENTRENAMIENTO GUARDADO</div>
      <h1 className="font-display text-4xl mt-1">{session.name.toUpperCase()}</h1>
      {celebration && <div className="mt-5"><GoalCelebration message={celebration} goal={weeklyGoal} /></div>}
      <div className="grid grid-cols-3 gap-2 mt-5">
        <div className="bg-zinc-900 rounded-xl p-3"><div className="text-[10px] text-zinc-500">SERIES</div><div className="font-display text-2xl">{summary.sets}</div></div>
        <div className="bg-zinc-900 rounded-xl p-3"><div className="text-[10px] text-zinc-500">EJERCICIOS</div><div className="font-display text-2xl">{summary.exercises}</div></div>
        <div className="bg-zinc-900 rounded-xl p-3"><div className="text-[10px] text-zinc-500">VOLUMEN</div><div className="font-display text-xl">{summary.volume.toLocaleString('es-ES')}<span className="text-xs"> kg</span></div></div>
      </div>
      {comparison && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4">
          <div className="text-[10px] font-bold tracking-[0.2em] text-lime-300">TODO LO QUE HAS MOVIDO HOY</div>
          <div className="font-display text-3xl mt-1">{summary.volume.toLocaleString('es-ES')} KG</div>
          <p className="text-sm text-zinc-300 mt-1">Aproximadamente el peso de <span className="text-lime-300 font-semibold">{comparison.amount.toLocaleString('es-ES')} {comparison.label}</span>.</p>
          <p className="text-[10px] text-zinc-500 mt-2">Comparación ilustrativa: el volumen suma peso × repeticiones de las series completadas.</p>
        </div>
      )}
      {recordSets > 0 && <div className="mt-4 rounded-xl bg-amber-300/10 border border-amber-300/30 px-4 py-3 text-sm text-amber-200 font-semibold">
        ★ {recordSets} {recordSets === 1 ? 'serie con récord' : 'series con récord'} en esta sesión
      </div>}
      <h2 className="font-display text-xl mt-7 mb-3">HOY Y LA PRÓXIMA VEZ</h2>
      <div className="space-y-3">
        {summary.rows.map(row => {
          const exercise = exMap[row.exerciseId];
          const entry = session.entries[row.entryIndex];
          const next = exercise ? predictGhost({ exercise, setIndex: 0,
            sessions: allSessions, routineId: session.routineId,
            targetSet: entry?.sets[0], currentEntry: null }) : null;
          const records = completedSets(entry).flatMap(set => set.personalRecords || []);
          return (
            <div key={`${row.exerciseId}-${row.entryIndex}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="font-bold text-zinc-100">{row.name}</div>
              <div className="text-xs text-zinc-400 mt-1">{row.sets} serie(s) · primera: {setBrief(row.first, exercise?.type)}</div>
              {row.before && <div className="text-xs text-zinc-500 mt-1">Anterior {row.scope === 'rutina' ? 'en esta rutina' : 'general'}: {setBrief(row.before, exercise?.type)}</div>}
              {next && <div className="text-xs text-lime-300 mt-2">Próximo ghost: {setBrief(next, exercise.type)}</div>}
              {records.length > 0 && <div className="text-xs text-amber-300 mt-2">★ {[...new Set(records.map(record => record.label))].join(' · ')}</div>}
            </div>
          );
        })}
      </div>
      <button onClick={onDetail} className="w-full mt-6 bg-zinc-800 text-zinc-100 py-3 rounded-xl font-bold">VER DETALLE</button>
      <button onClick={onClose} className="w-full mt-2 bg-lime-300 text-zinc-950 py-3 rounded-xl font-bold">VOLVER AL INICIO</button>
    </div>
  );
}
