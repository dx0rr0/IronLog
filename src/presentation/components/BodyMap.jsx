// Body map for the Volume tab.
// Uses `react-body-highlighter`'s anatomical SVG and paints our muscle
// groups using OUR 5 levels (none / low / ok / high / over). Click on
// any of the library's muscles maps back to the IronLog group.

import React, { useMemo } from 'react';
import Model from 'react-body-highlighter';
import { volumeLevel } from '../../domain/training/volume.js';

// Map IronLog group → list of library muscle slugs that compose it.
// The library is fine-grained (e.g. it splits trapezius from upper-back);
// we collapse those into our simpler grouping so colouring is consistent.
export const GROUP_TO_LIB_MUSCLES = {
  pecho:   ['chest'],
  espalda: ['trapezius', 'upper-back', 'lower-back'],
  hombros: ['front-deltoids', 'back-deltoids'],
  biceps:  ['biceps'],
  triceps: ['triceps'],
  pierna:  ['quadriceps', 'hamstring', 'calves'],
  gluteo:  ['gluteal'],
  core:    ['abs', 'obliques'],
};

// Reverse lookup: library muscle slug → our group. Built once.
const LIB_MUSCLE_TO_GROUP = (() => {
  const out = {};
  for (const [group, muscles] of Object.entries(GROUP_TO_LIB_MUSCLES)) {
    for (const m of muscles) out[m] = group;
  }
  return out;
})();

// Library uses a "frequency" number as colour index (1-based into
// highlightedColors). We pick a slot per level. Index 0 = none (we keep
// it out — none stays as bodyColor instead).
const LEVEL_TO_INTENSITY = {
  none: 0,   // sentinel: don't add to data, falls back to bodyColor
  low:  1,
  ok:   2,
  high: 3,
  over: 4,
};

// Colours, tuned for our zinc background. Index N here = frequency=N+1.
const HIGHLIGHTED_COLORS = [
  '#52525b', // 1 = low      (zinc-600)
  '#d4ff37', // 2 = ok       (lime-300, productive)
  '#fb923c', // 3 = high     (orange-400)
  '#ef4444', // 4 = over     (red-500)
];
const BODY_COLOR = '#3f3f46'; // zinc-700, default for unworked muscles

// Build the `data` array that the library expects. Each unique
// non-zero intensity becomes one entry whose `muscles` includes all
// library slugs at that level.
function buildLibData(totals) {
  const byIntensity = new Map(); // intensity → Set(libSlug)
  for (const [group, muscles] of Object.entries(GROUP_TO_LIB_MUSCLES)) {
    const count = totals?.[group] || 0;
    const level = volumeLevel(count, group);
    const intensity = LEVEL_TO_INTENSITY[level];
    if (!intensity) continue;
    if (!byIntensity.has(intensity)) byIntensity.set(intensity, new Set());
    for (const m of muscles) byIntensity.get(intensity).add(m);
  }
  return [...byIntensity.entries()]
    .sort(([a], [b]) => a - b)
    .map(([intensity, set]) => ({
      name: `level-${intensity}`,
      muscles: [...set],
      frequency: intensity,
    }));
}

export function BodyMap({ totals, view, onToggleView, onSelectGroup, selectedGroup }) {
  const libData = useMemo(() => buildLibData(totals), [totals]);

  // Library type is 'anterior' / 'posterior'.
  const libType = view === 'back' ? 'posterior' : 'anterior';

  // When the user clicks any muscle, the library passes the muscle slug.
  // Translate to our group, or ignore if it's outside our 8 primary
  // groups (forearm, neck, etc. — we don't track).
  const handleClick = ({ muscle }) => {
    const group = LIB_MUSCLE_TO_GROUP[muscle];
    if (!group) return;
    onSelectGroup?.(group);
  };

  // Selection highlight: bump stroke of all polygons matching the
  // selected group's slugs, via a scoped <style>.
  const selectedSlugs = selectedGroup ? GROUP_TO_LIB_MUSCLES[selectedGroup] : [];

  return (
    <div className="flex flex-col items-center">
      <style>{`
        .ironlog-bodymap svg polygon { transition: stroke 0.15s ease; cursor: pointer; }
        .ironlog-bodymap svg polygon:hover { stroke: #fafafa !important; stroke-width: 1.5; }
        ${selectedSlugs.map(s => `
          .ironlog-bodymap svg polygon[data-muscle-group="${s}"] {
            stroke: #fafafa !important;
            stroke-width: 2 !important;
          }
        `).join('')}
      `}</style>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onToggleView('front')}
          className={`text-xs font-bold px-3 py-1 rounded-full transition ${view === 'front' ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          DELANTE
        </button>
        <button
          onClick={() => onToggleView('back')}
          className={`text-xs font-bold px-3 py-1 rounded-full transition ${view === 'back' ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
        >
          DETRÁS
        </button>
      </div>

      <div className="ironlog-bodymap">
        <Model
          type={libType}
          data={libData}
          bodyColor={BODY_COLOR}
          highlightedColors={HIGHLIGHTED_COLORS}
          onClick={handleClick}
          style={{ width: '180px', height: 'auto' }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-[10px] text-zinc-500">
        <LegendDot color={BODY_COLOR}              label="0" />
        <LegendDot color={HIGHLIGHTED_COLORS[0]}   label="bajo" />
        <LegendDot color={HIGHLIGHTED_COLORS[1]}   label="óptimo" />
        <LegendDot color={HIGHLIGHTED_COLORS[2]}   label="alto" />
        <LegendDot color={HIGHLIGHTED_COLORS[3]}   label="exceso" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}
