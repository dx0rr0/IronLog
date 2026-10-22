import React, { useState } from 'react';
import { Timer } from 'lucide-react';
import { DurField } from './DurField.jsx';
import { fmtDur } from './formatters.js';

const TRANSITION_PRESETS = [0, 30, 60];
const ROUND_PRESETS = [60, 90, 120, 180];
const presetLabel = sec => sec === 0 ? 'Sin descanso' : sec % 60 === 0 ? `${sec / 60}m` : sec < 60 ? `${sec}s` : fmtDur(sec);

// Toolbar chip. A superset shows its round rest and, when set, the short
// rest between its exercises.
export function RestChip({ entry, superset, onClick }) {
  const rest = entry.restSeconds || 0;
  const transition = superset ? entry.transitionSeconds || 0 : 0;
  const active = rest > 0 || transition > 0;
  const label = !superset
    ? (rest > 0 ? fmtDur(rest) : 'Descanso')
    : `Ronda ${rest > 0 ? fmtDur(rest) : '—'}${transition > 0 ? ` · Cambio ${fmtDur(transition)}` : ''}`;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition ${active ? 'bg-lime-300/15 text-lime-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
    >
      <Timer className="w-3 h-3" /> {label}
    </button>
  );
}

export function RestEditor({ entry, superset, onUpdate }) {
  return (
    <div className="px-3 pt-2 space-y-2">
      {superset && (
        <RestSegments label="Entre ejercicios" value={entry.transitionSeconds || 0} presets={TRANSITION_PRESETS}
          onChange={v => onUpdate({ transitionSeconds: v })} />
      )}
      <RestSegments label={superset ? 'Entre rondas' : 'Descanso'} value={entry.restSeconds || 0} presets={ROUND_PRESETS}
        onChange={v => onUpdate({ restSeconds: v })} />
    </div>
  );
}

// One-tap presets plus "⋯" for any other time, typed in place.
function RestSegments({ label, value, presets, onChange }) {
  const [typing, setTyping] = useState(false);
  const custom = !presets.includes(value);
  const segment = active => `flex-1 min-w-0 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap transition ${active ? 'bg-lime-300 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{label}</span>
        <span className="text-[11px] font-mono text-zinc-200">{value > 0 ? fmtDur(value) : 'Sin descanso'}</span>
      </div>
      <div role="group" aria-label={label} className="flex gap-0.5 p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg">
        {presets.map(sec => (
          <button key={sec} type="button" onClick={() => { setTyping(false); onChange(sec); }}
            aria-pressed={!typing && value === sec} className={segment(!typing && value === sec)}>
            {presetLabel(sec)}
          </button>
        ))}
        {typing ? (
          <DurField value={value} autoFocus aria-label={`${label}: otro tiempo`}
            onChange={v => { setTyping(false); onChange(v); }}
            className="flex-1 min-w-0 bg-zinc-800 rounded-md text-[11px] font-mono text-zinc-100 text-center outline-none placeholder:text-zinc-500" />
        ) : (
          <button type="button" onClick={() => setTyping(true)} aria-label={`${label}: otro tiempo`}
            aria-pressed={custom} className={segment(custom)}>
            {custom ? fmtDur(value) : '⋯'}
          </button>
        )}
      </div>
    </div>
  );
}
