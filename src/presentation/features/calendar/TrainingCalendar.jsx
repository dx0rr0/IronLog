import React from 'react';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, formatLong } from '../../shared/formatters.js';
import { SessionCard } from '../../shared/SessionCard.jsx';

// Month grid of training days, shown on the home screen. Tapping a day
// lists that day's sessions below the grid; tapping it again hides them.
export function TrainingCalendar({ sessions, exMap, onOpenSession }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState(null);

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
  const monthName = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
  const monthCount = days.filter(d => d.inMonth && sessionsByDay[dateKey(d.date)]).length;
  const today = dateKey(new Date());
  const selectedSessions = selectedKey ? (sessionsByDay[selectedKey] || []) : [];
  const shiftMonth = delta => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    setSelectedKey(null);
  };

  return (
    <div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
          <button onClick={() => shiftMonth(-1)} className="text-zinc-400 hover:text-zinc-100 p-1" aria-label="Mes anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="font-display text-lg leading-tight">{monthName}</div>
            <div className="text-[10px] text-zinc-500 font-bold tracking-wide">
              {monthCount} {monthCount === 1 ? 'DÍA ENTRENADO' : 'DÍAS ENTRENADOS'}
            </div>
          </div>
          <button onClick={() => shiftMonth(1)} className="text-zinc-400 hover:text-zinc-100 p-1" aria-label="Mes siguiente">
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
            return (
              <button
                key={i}
                onClick={() => setSelectedKey(isSelected ? null : k)}
                aria-label={`${d.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}${has ? ', entrenado' : ''}`}
                aria-pressed={isSelected}
                className={`h-9 flex items-center justify-center rounded-lg text-sm transition
                  ${!d.inMonth ? 'opacity-30' : ''}
                  ${isSelected ? 'bg-zinc-100 text-zinc-950 font-bold' :
                    has ? 'bg-lime-300 text-zinc-950 font-bold hover:bg-lime-400' :
                      'text-zinc-300 hover:bg-zinc-800'}
                  ${isToday && !isSelected ? 'ring-1 ring-zinc-400' : ''}
                `}
              >
                <span className="font-mono">{d.date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedKey && (
        <div className="mt-3 anim-fade">
          <div className="text-xs text-zinc-400 mb-2">{formatLong(selectedKey + 'T12:00:00').replace(/^./, c => c.toUpperCase())}</div>
          {selectedSessions.length === 0 ? (
            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-4 text-center text-zinc-500 text-sm">
              Sin entrenamientos este día.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedSessions.map(s => (
                <SessionCard key={s.id} session={s} exMap={exMap} onClick={() => onOpenSession(s)} />
              ))}
            </div>
          )}
        </div>
      )}
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

