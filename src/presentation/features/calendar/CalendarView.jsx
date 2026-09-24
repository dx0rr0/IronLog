import React from 'react';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, formatLong } from '../../shared/formatters.js';
import { SessionCard } from '../../shared/SessionCard.jsx';

export function CalendarView({ sessions, exMap, selectedDate, setSelectedDate, onOpenSession }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const sessionsByDay = useMemo(() => {
    const m = {};
    sessions.forEach(s => {
      const k = dateKey(s.date);
      if (!m[k]) m[k] = [];
      m[k].push(s);
    });
    return m;
  }, [sessions]);

  const days = useMemo(() => buildMonthGrid(month), [month]);
  const monthName = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const today = dateKey(new Date());
  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const selectedSessions = selectedKey ? (sessionsByDay[selectedKey] || []) : [];

  return (
    <div>
      <header className="px-5 pt-8 pb-4">
        <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">CALENDARIO</div>
        <h1 className="font-display text-4xl leading-none">HISTORIAL</h1>
      </header>

      <div className="px-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="text-zinc-400 hover:text-zinc-100 p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-display text-xl capitalize">{monthName}</div>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="text-zinc-400 hover:text-zinc-100 p-1">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-[10px] font-bold text-zinc-500 px-2 pt-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 p-2">
            {days.map((d, i) => {
              const k = dateKey(d.date);
              const has = !!sessionsByDay[k];
              const isToday = k === today;
              const isSelected = k === selectedKey;
              const inMonth = d.inMonth;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(d.date)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition relative
                    ${!inMonth ? 'text-zinc-700' : 'text-zinc-200'}
                    ${isSelected ? 'bg-lime-300 text-zinc-950 font-bold' :
                      has ? 'bg-lime-300/15 hover:bg-lime-300/25 text-lime-200' :
                        'hover:bg-zinc-800'}
                    ${isToday && !isSelected ? 'ring-1 ring-zinc-500' : ''}
                  `}
                >
                  <span className={`font-mono ${isToday && !isSelected ? 'font-bold' : ''}`}>{d.date.getDate()}</span>
                  {has && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 bg-lime-300 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 mt-6">
        {selectedDate ? (
          <>
            <h2 className="font-display text-xl text-zinc-300 mb-3 capitalize">{formatLong(selectedDate)}</h2>
            {selectedSessions.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
                Sin entrenamientos este día.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSessions.map(s => (
                  <SessionCard key={s.id} session={s} exMap={exMap} onClick={() => onOpenSession(s)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-zinc-500 text-sm py-4">
            Toca un día para ver el detalle.
          </div>
        )}
      </div>
    </div>
  );
}

export function buildMonthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // monday-first
  const days = [];
  for (let i = startWeekday; i > 0; i--) {
    const d = new Date(first);
    d.setDate(first.getDate() - i);
    days.push({ date: d, inMonth: false });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push({ date: new Date(month.getFullYear(), month.getMonth(), i), inMonth: true });
  }
  while (days.length < 42) {
    const last = days[days.length - 1].date;
    const d = new Date(last);
    d.setDate(last.getDate() + 1);
    days.push({ date: d, inMonth: d.getMonth() === month.getMonth() });
  }
  return days.slice(0, 42);
}

// ============================================================
// EXERCISES VIEW
// ============================================================
