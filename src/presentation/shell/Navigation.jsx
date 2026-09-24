import React from 'react';
import { AlertTriangle, Calendar as CalendarIcon, ClipboardList, Dumbbell, Home, Play, Settings, TrendingUp } from 'lucide-react';

export function ConfirmDialog({ title, body, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger, hideCancel, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-zinc-950/70 backdrop-blur-sm anim-fade" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl anim-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          {danger && (
            <div className="bg-red-500/15 text-red-400 rounded-lg p-2 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-display text-xl text-zinc-100 leading-tight mb-1">{title}</h3>
            {body && <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!hideCancel && (
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-full font-semibold text-sm transition"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={() => {
              // Close first, then run onConfirm. If onConfirm opens another
              // dialog (chained confirms, like "Borrar todos los datos"),
              // its setDialog call wins over our setDialog(null) thanks to
              // React event-handler batching. With the previous order
              // (onConfirm then onClose), the second dialog was being
              // wiped out immediately and the action never ran.
              onClose();
              onConfirm?.();
            }}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-lime-300 hover:bg-lime-400 text-zinc-950'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAVIGATION
// ============================================================

export function BottomNav({ tab, setTab, hasActive, onResumeActive }) {
  const items = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'routines', icon: ClipboardList, label: 'Rutinas' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calend.' },
    { id: 'exercises', icon: Dumbbell, label: 'Ejerc.' },
    { id: 'progress', icon: TrendingUp, label: 'Progreso' },
    { id: 'settings', icon: Settings, label: 'Ajustes' },
  ];
  return (
    <>
      {hasActive && (
        <button
          onClick={onResumeActive}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-lime-300 text-zinc-950 px-5 py-2.5 rounded-full text-sm font-bold shadow-2xl shadow-lime-300/30 z-40 max-w-md flex items-center gap-2 hover:bg-lime-400 transition"
        >
          <Play className="w-4 h-4 fill-current" /> ENTRENAMIENTO EN CURSO
        </button>
      )}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 z-30">
        <div className="max-w-md mx-auto grid grid-cols-6">
          {items.map(it => {
            const Icon = it.icon;
            const active = tab === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setTab(it.id)}
                className={`flex flex-col items-center justify-center py-3 transition ${active ? 'text-lime-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[9px] mt-1 tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{it.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// ============================================================
// HOME VIEW
// ============================================================
