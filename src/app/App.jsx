import { DEFAULT_REST_SECONDS } from '../domain/training/training-defaults.js';
import React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PLATE_CONFIG, findLastEntryForExercise, inheritSet, upgradePlateConfig } from '../domain/exercises/exercise-utils.js';
import { storage } from '../infrastructure/storage/storage.js';
import { buildBackup, describeBackup, mergeBackup, parseBackup } from '../domain/backup/backup.js';
import { mergeCustomExercises } from '../domain/exercises/custom-exercises.js';
import { dismissBackupReminder, markBackupDone, requestPersistentStorage, shouldRemindBackup } from '../infrastructure/storage/persistence.js';
import { repeatSession } from '../domain/training/workout-intelligence.js';
import { hasCompletedSet } from '../domain/training/session-utils.js';
import { routineDraftFromSession } from '../domain/training/routine-from-session.js';
import { normalizeSupersets } from '../domain/training/supersets.js';
import { closeRestNotification } from '../infrastructure/notifications/rest-notification.js';
import { AlertTriangle, Dumbbell, ShieldCheck, X } from 'lucide-react';
import { DEFAULT_EXERCISES, availableRoutineEntries } from '../domain/exercises/catalog.js';
import { dateKey } from '../presentation/shared/formatters.js';
import { SessionDetail, SessionSummary, WorkoutSession, defaultSet } from '../presentation/features/workout/WorkoutViews.jsx';
import { ExerciseDetail, ExercisesView, NewExerciseForm } from '../presentation/features/exercises/ExerciseViews.jsx';
import { RoutineEditor, RoutinesView } from '../presentation/features/routines/RoutineViews.jsx';
import { HomeView } from '../presentation/features/home/HomeView.jsx';
import { BodyWeightView } from '../presentation/features/body-weight/BodyWeightViews.jsx';
import { ProgressView } from '../presentation/features/progress/ProgressView.jsx';
import { SettingsView } from '../presentation/features/settings/SettingsView.jsx';
import { BottomNav, ConfirmDialog } from '../presentation/shell/Navigation.jsx';
import { goalMessage, goalReachedBySession, weeklyGoalProgress } from '../domain/training/motivation.js';
import { WeeklyGoalSetup } from '../presentation/features/motivation/MotivationUI.jsx';
import { BrowserNavigationContext, useBrowserNavigation } from '../presentation/shared/BrowserNavigation.jsx';

export default function App() {
  const { tab: rawTab, setTab, view, setView, navigation } = useBrowserNavigation();
  // The calendar tab moved into Inicio (1.10); old history entries may still point at it.
  const tab = rawTab === 'calendar' ? 'home' : rawTab;

  // Pages open at the top; going back to a tab returns to where you were.
  const screenKey = view ? `view:${view.kind}` : `tab:${tab}`;
  const scrollMemory = useRef({});
  useEffect(() => {
    const remember = () => { scrollMemory.current[screenKey] = window.scrollY; };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [screenKey]);
  useLayoutEffect(() => {
    const target = view ? 0 : scrollMemory.current[screenKey] || 0;
    if (window.scrollY !== target) window.scrollTo(0, target);
  // Only a change of screen should move the page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [customExercises, setCustomExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null); // working copy of a finished session being edited
  const [routines, setRoutines] = useState([]);
  const [bodyWeights, setBodyWeights] = useState([]); // [{date: ISO, kg: number}], newest first
  const [plateConfig, setPlateConfig] = useState(DEFAULT_PLATE_CONFIG);
  const [weeklyGoal, setWeeklyGoal] = useState(null);
  const [goalPromptDismissed, setGoalPromptDismissed] = useState(false);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null); // {title, body, onConfirm, danger, confirmLabel, cancelLabel}
  const [persistGranted, setPersistGranted] = useState(null); // null | true | false
  const [showBackupNudge, setShowBackupNudge] = useState(false);

  const allExercises = useMemo(() => [...DEFAULT_EXERCISES, ...customExercises], [customExercises]);
  const availableExercises = useMemo(() => allExercises.filter(ex => !ex.hidden), [allExercises]);
  const exMap = useMemo(() => Object.fromEntries(allExercises.map(e => [e.id, e])), [allExercises]);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const [ce, ss, cs, rt, bw, pc, wg] = await Promise.all([
          storage.get('custom-exercises'),
          storage.get('sessions'),
          storage.get('current-session'),
          storage.get('routines'),
          storage.get('body-weights'),
          storage.get('plate-config'),
          storage.get('weekly-goal'),
        ]);
        if (ce) setCustomExercises(ce);
        if (ss) setSessions(ss);
        if (cs) setCurrentSession(cs);
        if (rt) setRoutines(rt);
        if (Array.isArray(bw)) setBodyWeights(bw);
        if (Number.isInteger(wg) && wg >= 1 && wg <= 7) setWeeklyGoal(wg);
        if (pc && typeof pc === 'object') setPlateConfig(upgradePlateConfig(pc));
        setHydrated(true);
        setLoading(false);
        setLoadError(false);

        // Ask the browser to mark our data as persistent (won't be evicted on storage pressure).
        // Browsers usually grant this when the site is installed as a PWA.
        requestPersistentStorage().then(persist => setPersistGranted(persist.granted));

        // Decide whether to nudge the user about backing up
        shouldRemindBackup(ss || []).then(remind => {
          if (remind) setShowBackupNudge(true);
        }).catch(err => console.warn('backup reminder failed', err));
      } catch (err) {
        console.error('Unable to load IronLog data', err);
        setLoadError(true);
      }
    })();
  }, [loadAttempt]);

  // Persist
  const trackSave = useCallback(promise => {
    promise.then(ok => { if (!ok) setSaveError(true); })
      .catch(() => setSaveError(true));
  }, []);
  useEffect(() => { if (hydrated) trackSave(storage.set('sessions', sessions)); }, [sessions, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('custom-exercises', customExercises)); }, [customExercises, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('routines', routines)); }, [routines, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('body-weights', bodyWeights)); }, [bodyWeights, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('plate-config', plateConfig)); }, [plateConfig, hydrated, trackSave]);
  useEffect(() => { if (hydrated) trackSave(storage.set('weekly-goal', weeklyGoal)); }, [weeklyGoal, hydrated, trackSave]);
  useEffect(() => {
    if (!hydrated) return;
    trackSave(currentSession
      ? storage.set('current-session', currentSession)
      : storage.del('current-session'));
  }, [currentSession, hydrated, trackSave]);

  const retrySave = async () => {
    const results = await Promise.all([
      storage.set('sessions', sessions),
      storage.set('custom-exercises', customExercises),
      storage.set('routines', routines),
      storage.set('body-weights', bodyWeights),
      storage.set('plate-config', plateConfig),
      storage.set('weekly-goal', weeklyGoal),
      currentSession ? storage.set('current-session', currentSession) : storage.del('current-session'),
    ]);
    setSaveError(results.some(ok => !ok));
  };

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const showConfirm = useCallback((opts) => setDialog(opts), []);

  // ---------- session lifecycle ----------
  const startSession = (routineId) => {
    let entries = [];
    let name = 'Entrenamiento';
    let routineNotes = '';
    if (routineId) {
      const r = routines.find(x => x.id === routineId);
      if (r) {
        name = r.name || name;
        routineNotes = r.notes || '';
        entries = normalizeSupersets(availableRoutineEntries(r, exMap).map(re => {
          const ex = exMap[re.exerciseId];
          const last = findLastEntryForExercise(re.exerciseId, sessions);
          const routineSets = re.sets || [{}];
          return {
            exerciseId: re.exerciseId,
            ...(re.supersetId ? { supersetId: re.supersetId } : {}),
            restSeconds: re.restSeconds ?? DEFAULT_REST_SECONDS,
            ...(re.transitionSeconds > 0 ? { transitionSeconds: re.transitionSeconds } : {}),
            // Notes belong to the day; the routine's note is a read-only hint.
            notes: '',
            ...(re.notes ? { routineNote: re.notes } : {}),
            sets: routineSets.map((s, idx) => {
              // Pair each routine set with the corresponding previous set
              // by index (set 1 ↔ set 1). Never substitute another ordinal.
              const prev = last?.sets?.[idx]?.done ? last.sets[idx] : null;
              return inheritSet(ex, prev, {
                repsMin: s.repsMin ?? null,
                repsMax: s.repsMax ?? null,
                rir: s.rir ?? null,
              });
            }),
          };
        }));
      }
    }
    setCurrentSession({
      id: 'ses_' + Date.now(),
      date: new Date().toISOString(),
      startedAt: Date.now(),
      name,
      notes: '',
      ...(routineNotes ? { routineNotes } : {}),
      routineId: routineId || null,
      entries,
    });
    setView({ kind: 'active' });
  };

  const startRepeatedSession = source => {
    if (currentSession) {
      showToast('Termina o descarta la sesión en curso primero');
      return;
    }
    setCurrentSession(repeatSession(source, exMap));
    setView({ kind: 'active' });
  };

  const finishSession = async () => {
    if (!currentSession || finishing) return;
    if (!hasCompletedSet(currentSession)) {
      showToast('Marca al menos una serie como completada');
      return;
    }
    setFinishing(true);
    const duration = Math.round((Date.now() - currentSession.startedAt) / 1000);
    const { restTimer: _restTimer, ...completedSession } = currentSession;
    const finished = { ...completedSession, duration, finishedAt: Date.now() };
    const nextSessions = [finished, ...sessions.filter(s => s.id !== finished.id)];
    const saved = await storage.set('sessions', nextSessions);
    const cleared = saved && await storage.del('current-session');
    setFinishing(false);
    if (!saved || !cleared) {
      setSaveError(true);
      showToast('No se pudo guardar. Reinténtalo.');
      return;
    }
    setSessions(nextSessions);
    setCurrentSession(null);
    void closeRestNotification();
    const goalReached = goalReachedBySession(sessions, finished, weeklyGoal);
    const progress = goalReached ? weeklyGoalProgress(nextSessions, weeklyGoal, finished.date) : null;
    setView({ kind: 'summary', data: finished,
      celebration: progress ? goalMessage(progress.weekStart) : null }, { replace: true });
    showToast('Entrenamiento guardado ✓');
  };

  const cancelSession = () => {
    // If empty (no exercises and no notes), cancel without confirmation
    if (!currentSession || (currentSession.entries.length === 0 && !currentSession.notes?.trim())) {
      setCurrentSession(null);
      void closeRestNotification();
      setView(null);
      return;
    }
    showConfirm({
      title: 'Descartar entrenamiento',
      body: 'Se perderán los datos no guardados de esta sesión.',
      confirmLabel: 'Descartar',
      danger: true,
      onConfirm: () => {
        setCurrentSession(null);
        void closeRestNotification();
        setView(null);
      },
    });
  };

  const deleteSession = (id) => {
    showConfirm({
      title: 'Eliminar entrenamiento',
      body: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => {
        setSessions(prev => prev.filter(s => s.id !== id));
        setView(null);
        showToast('Entrenamiento eliminado');
      },
    });
  };

  const startEditSession = (session) => {
    setEditingSession(JSON.parse(JSON.stringify(session)));
    setView({ kind: 'editSession' });
  };

  const saveEditedSession = async () => {
    if (!editingSession) return;
    const nextSessions = sessions.map(s => s.id === editingSession.id ? editingSession : s)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!await storage.set('sessions', nextSessions)) {
      setSaveError(true);
      showToast('No se pudo guardar. Reinténtalo.');
      return;
    }
    setSessions(nextSessions);
    setEditingSession(null);
    setView({ kind: 'session', data: editingSession });
    showToast('Cambios guardados ✓');
  };

  const cancelEditSession = () => {
    showConfirm({
      title: 'Descartar cambios',
      body: 'Se perderán las modificaciones realizadas.',
      confirmLabel: 'Descartar',
      danger: true,
      onConfirm: () => {
        const original = sessions.find(s => s.id === editingSession?.id);
        setEditingSession(null);
        setView(original ? { kind: 'session', data: original } : null);
      },
    });
  };

  const addCustomExercise = async ex => {
    const created = { ...ex, updatedAt: Date.now(), id: 'cust_' + (globalThis.crypto?.randomUUID?.()
      || `${Date.now()}_${Math.random().toString(36).slice(2)}`) };
    const next = [...customExercises, created];
    if (!await storage.set('custom-exercises', next)) {
      setSaveError(true);
      return null;
    }
    const saved = await storage.get('custom-exercises');
    setCustomExercises(prev => mergeCustomExercises(prev, saved, next));
    showToast('Ejercicio creado ✓');
    return created;
  };

  const deleteCustomExercise = (id) => {
    showConfirm({
      title: 'Archivar ejercicio',
      body: 'Dejará de aparecer al añadir ejercicios. Su historial se conservará.',
      confirmLabel: 'Archivar',
      danger: true,
      onConfirm: () => setCustomExercises(prev => prev.map(ex =>
        ex.id === id ? { ...ex, hidden: true, updatedAt: Math.max(Date.now(), (Number(ex.updatedAt) || 0) + 1) } : ex)),
    });
  };

  const restoreCustomExercise = (id) => {
    setCustomExercises(prev => prev.map(ex =>
      ex.id === id ? { ...ex, hidden: false, updatedAt: Math.max(Date.now(), (Number(ex.updatedAt) || 0) + 1) } : ex));
  };

  // ---------- routines ----------
  const saveRoutine = (routine) => {
    if (routine.id) {
      setRoutines(prev => prev.map(r => r.id === routine.id ? routine : r));
      showToast('Rutina actualizada ✓');
    } else {
      const newR = { ...routine, id: 'rt_' + Date.now(), createdAt: Date.now() };
      setRoutines(prev => [newR, ...prev]);
      showToast('Rutina creada ✓');
    }
    setView(null);
  };

  const deleteRoutine = (id) => {
    showConfirm({
      title: 'Eliminar rutina',
      body: 'Los entrenamientos ya guardados no se verán afectados.',
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => setRoutines(prev => prev.filter(r => r.id !== id)),
    });
  };

  const duplicateRoutine = (id) => {
    const r = routines.find(x => x.id === id);
    if (!r) return;
    const copy = { ...JSON.parse(JSON.stringify(r)), id: 'rt_' + Date.now(), name: r.name + ' (copia)', createdAt: Date.now() };
    setRoutines(prev => [copy, ...prev]);
    showToast('Rutina duplicada ✓');
  };

  // ---------- import / export ----------
  const exportData = async () => {
    const data = buildBackup({
      customExercises: mergeCustomExercises(customExercises, await storage.get('custom-exercises')),
      sessions, currentSession, routines, bodyWeights, plateConfig, weeklyGoal,
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlog-${dateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await markBackupDone();
    setShowBackupNudge(false);
    showToast('Copia guardada ✓');
  };

  const importData = file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = parseBackup(e.target.result);
        showConfirm({
          title: 'Importar datos',
          body: describeBackup(data),
          confirmLabel: 'Importar',
          onConfirm: () => {
            const next = mergeBackup({ customExercises, sessions, currentSession, routines, bodyWeights, plateConfig, weeklyGoal }, data);
            setCustomExercises(next.customExercises);
            setSessions(next.sessions);
            setCurrentSession(next.currentSession);
            setRoutines(next.routines);
            setBodyWeights(next.bodyWeights);
            setPlateConfig(next.plateConfig);
            setWeeklyGoal(next.weeklyGoal);
            if (next.weeklyGoal) setGoalPromptDismissed(true);
            showToast('Datos importados ✓');
          },
        });
      } catch (err) {
        showConfirm({
          title: 'Error al importar',
          body: err.message,
          confirmLabel: 'Cerrar',
          hideCancel: true,
          onConfirm: () => {},
        });
      }
    };
    reader.readAsText(file);
  };

  const resetAll = () => {
    showConfirm({
      title: '¿Borrar TODOS los datos?',
      body: 'Esto eliminará TODAS tus sesiones, rutinas, ejercicios personalizados y registros de peso corporal. La configuración de discos se mantiene. Acción IRREVERSIBLE.',
      confirmLabel: 'Continuar',
      danger: true,
      onConfirm: () => {
        showConfirm({
          title: 'Confirmación final',
          body: '¿Estás seguro absoluto? Esto no se puede deshacer.',
          confirmLabel: 'BORRAR TODO',
          danger: true,
          onConfirm: async () => {
            // Empty snapshots intentionally keep custom data during upserts.
            // The explicit reset must delete both stores before saving [].
            if (!await storage.del('custom-exercises')) {
              setSaveError(true);
              return;
            }
            setSessions([]);
            setCustomExercises([]);
            setRoutines([]);
            setBodyWeights([]);
            setCurrentSession(null);
            setWeeklyGoal(null);
            setGoalPromptDismissed(false);
            showToast('Todos los datos eliminados');
          },
        });
      },
    });
  };

  // ---------- body weight ----------
  // Insert / update a body-weight log entry. One entry per calendar day:
  // logging twice on the same day overwrites (last write wins). We sort
  // newest-first so [0] is always the latest.
  const saveBodyWeight = (kg, dateISO) => {
    const n = Number(kg);
    if (!Number.isFinite(n) || n <= 0 || n > 500) return;
    const iso = dateISO || new Date().toISOString();
    const day = dateKey(iso);
    setBodyWeights(prev => {
      const others = prev.filter(b => dateKey(b.date) !== day);
      return [{ date: iso, kg: n }, ...others].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  };
  const deleteBodyWeight = (dateISO) => {
    setBodyWeights(prev => prev.filter(b => b.date !== dateISO));
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-300" />
          <h1 className="font-display text-2xl mb-2">NO SE PUDIERON LEER TUS DATOS</h1>
          <p className="text-sm text-zinc-400 mb-5">No se ha sobrescrito nada. Comprueba el almacenamiento del navegador e inténtalo de nuevo.</p>
          <button onClick={() => { setLoadError(false); setLoadAttempt(n => n + 1); }}
            className="bg-lime-300 text-zinc-950 px-5 py-2 rounded-full font-bold">REINTENTAR</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 animate-pulse text-lime-300" />
          <div>Cargando…</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserNavigationContext.Provider value={navigation}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-display { font-family: 'Anton', 'Arial Narrow', sans-serif; letter-spacing: 0.02em; }
        .font-body { font-family: 'Outfit', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum'; }
        .grain { background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 3px 3px; }
        .stripe { background-image: repeating-linear-gradient(45deg, rgba(212,255,55,0.08) 0 6px, transparent 6px 12px); }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fade { animation: fadeIn 0.18s ease-out; }
        .anim-slide-up { animation: slideUp 0.22s ease-out; }
      `}</style>

      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-body grain">
        <div className="max-w-md mx-auto pb-24 relative">
          {view?.kind === 'active' && currentSession ? (
            <WorkoutSession
              mode="active"
              session={currentSession}
              setSession={setCurrentSession}
              exercises={availableExercises}
              exMap={exMap}
              onCreateExercise={addCustomExercise}
              onFinish={finishSession}
              finishing={finishing}
              onCancel={cancelSession}
              previousSessions={sessions}
              plateConfig={plateConfig}
              showConfirm={showConfirm}
            />
          ) : view?.kind === 'editSession' && editingSession ? (
            <WorkoutSession
              mode="edit"
              session={editingSession}
              setSession={setEditingSession}
              exercises={availableExercises}
              exMap={exMap}
              onCreateExercise={addCustomExercise}
              onFinish={saveEditedSession}
              onCancel={cancelEditSession}
              previousSessions={sessions.filter(s => s.id !== editingSession.id)}
              plateConfig={plateConfig}
              showConfirm={showConfirm}
            />
          ) : view?.kind === 'session' ? (
            <SessionDetail
              session={view.data}
              exMap={exMap}
              onBack={() => setView(null)}
              onDelete={() => deleteSession(view.data.id)}
              onEdit={() => startEditSession(view.data)}
              onRepeat={() => startRepeatedSession(view.data)}
              onSaveAsRoutine={() => setView({
                kind: 'newRoutineFromSession',
                data: { draft: routineDraftFromSession(view.data, exMap), sourceSession: view.data },
              })}
              hasActive={!!currentSession}
            />
          ) : view?.kind === 'summary' ? (
            <SessionSummary
              session={view.data}
              previousSessions={sessions.filter(s => s.id !== view.data.id)}
              allSessions={sessions}
              exMap={exMap}
              celebration={view.celebration}
              weeklyGoal={weeklyGoal}
              onClose={() => setView(null)}
              onDetail={() => setView({ kind: 'session', data: view.data })}
            />
          ) : view?.kind === 'bodyWeight' ? (
            <BodyWeightView
              bodyWeights={bodyWeights}
              onSave={kg => { saveBodyWeight(kg); showToast('Peso guardado ✓'); }}
              onDelete={deleteBodyWeight}
              showConfirm={showConfirm}
              onBack={() => setView(null)}
            />
          ) : view?.kind === 'exercise' ? (
            <ExerciseDetail exercise={view.data} sessions={sessions} onBack={() => setView(null)} />
          ) : view?.kind === 'newExercise' ? (
            <NewExerciseForm onSave={async ex => {
              const created = await addCustomExercise(ex);
              if (created) setView(null);
              return created;
            }} onCancel={() => setView(null)} />
          ) : ['newRoutine', 'editRoutine', 'newRoutineFromSession'].includes(view?.kind) ? (
            <RoutineEditor
              initial={view?.kind === 'editRoutine' ? view.data : null}
              draft={view?.kind === 'newRoutineFromSession' ? view.data.draft : null}
              exercises={availableExercises}
              exMap={exMap}
              onCreateExercise={addCustomExercise}
              onSave={routine => {
                saveRoutine(routine);
                if (view?.kind === 'newRoutineFromSession') setTab('routines');
              }}
              onCancel={() => setView(view?.kind === 'newRoutineFromSession'
                ? { kind: 'session', data: view.data.sourceSession } : null)}
              showConfirm={showConfirm}
            />
          ) : (
            <>
              {tab === 'home' && (
                <HomeView
                  sessions={sessions}
                  exMap={exMap}
                  routines={routines}
                  currentSession={currentSession}
                  bodyWeights={bodyWeights}
                  onOpenBodyWeight={() => setView({ kind: 'bodyWeight' })}
                  onStart={() => startSession()}
                  onStartRoutine={(rid) => startSession(rid)}
                  onResume={() => setView({ kind: 'active' })}
                  onOpenSession={s => setView({ kind: 'session', data: s })}
                  onGoRoutines={() => setTab('routines')}
                  weeklyGoal={weeklyGoal}
                  onChangeGoal={() => setTab('settings')}
                />
              )}
              {tab === 'routines' && (
                <RoutinesView
                  routines={routines}
                  exMap={exMap}
                  onStart={(rid) => startSession(rid)}
                  onNew={() => setView({ kind: 'newRoutine' })}
                  onEdit={(r) => setView({ kind: 'editRoutine', data: r })}
                  onDelete={deleteRoutine}
                  onDuplicate={duplicateRoutine}
                  hasActive={!!currentSession}
                />
              )}
              {tab === 'exercises' && (
                <ExercisesView
                  exercises={availableExercises}
                  customExercises={customExercises}
                  onOpen={ex => setView({ kind: 'exercise', data: ex })}
                  onNew={() => setView({ kind: 'newExercise' })}
                  onDelete={deleteCustomExercise}
                  onRestore={restoreCustomExercise}
                />
              )}
              {tab === 'progress' && (
                <ProgressView sessions={sessions} exercises={allExercises} exMap={exMap}
                  bodyWeights={bodyWeights} onOpenBodyWeight={() => setView({ kind: 'bodyWeight' })} />
              )}
              {tab === 'settings' && (
                <SettingsView
                  sessions={sessions}
                  customExercises={customExercises}
                  routines={routines}
                  bodyWeights={bodyWeights}
                  plateConfig={plateConfig}
                  onUpdatePlateConfig={setPlateConfig}
                  persistGranted={persistGranted}
                  onExport={exportData}
                  onImport={importData}
                  onReset={resetAll}
                  weeklyGoal={weeklyGoal}
                  onUpdateWeeklyGoal={setWeeklyGoal}
                />
              )}
            </>
          )}

          {toast && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-lime-300 text-zinc-950 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50 anim-fade">
              {toast}
            </div>
          )}
          {saveError && (
            <div role="alert" className="fixed left-4 right-4 bottom-24 max-w-md mx-auto bg-red-950 border border-red-500 rounded-xl p-3 z-50 flex items-center gap-3 shadow-lg">
              <span className="text-xs text-red-100 flex-1">Hay cambios sin guardar en este dispositivo.</span>
              <button onClick={exportData} className="text-xs font-bold text-white underline">COPIA JSON</button>
              <button onClick={retrySave} className="text-xs font-bold text-white underline">REINTENTAR</button>
            </div>
          )}
        </div>

        {!view && showBackupNudge && (
          <BackupNudge
            onBackup={async () => { await exportData(); }}
            onDismiss={async () => { await dismissBackupReminder(3); setShowBackupNudge(false); }}
          />
        )}

        {!view && (
          <BottomNav tab={tab} setTab={setTab} hasActive={!!currentSession} onResumeActive={() => setView({ kind: 'active' })} />
        )}

        {dialog && (
          <ConfirmDialog
            {...dialog}
            onClose={() => setDialog(null)}
          />
        )}
        {weeklyGoal === null && !goalPromptDismissed && (
          <WeeklyGoalSetup onSave={days => { setWeeklyGoal(days); setGoalPromptDismissed(true); }}
            onDismiss={() => setGoalPromptDismissed(true)} />
        )}
      </div>
    </BrowserNavigationContext.Provider>
  );
}

function BackupNudge({ onBackup, onDismiss }) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-1rem)] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-40 anim-slide-up">
      <div className="flex items-center gap-3 p-3">
        <div className="bg-amber-500/15 text-amber-400 rounded-lg p-2 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-zinc-100">Haz una copia de seguridad</div>
          <div className="text-[11px] text-zinc-400">Llevas tiempo sin guardar tus datos en un archivo.</div>
        </div>
        <button
          onClick={onBackup}
          className="bg-lime-300 hover:bg-lime-400 text-zinc-950 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
        >
          GUARDAR
        </button>
        <button
          onClick={onDismiss}
          className="text-zinc-500 hover:text-zinc-300 p-1 shrink-0"
          aria-label="Posponer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function defaultSetForExId(exId, exMap) {
  const ex = exMap[exId];
  return defaultSet(ex);
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
