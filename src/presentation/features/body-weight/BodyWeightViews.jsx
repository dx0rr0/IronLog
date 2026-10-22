import React from 'react';
import { useMemo, useState } from 'react';
import { ArrowLeft, Scale, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { bodyWeightSeries, bodyWeightSummary } from '../../../domain/exercises/exercise-utils.js';
import { dateKey, formatShort } from '../../shared/formatters.js';

const RANGES = [['30', '1 mes'], ['90', '3 meses'], ['180', '6 meses'], ['365', '1 año'], ['all', 'Todo']];
const tickStyle = { fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' };
const tooltipStyle = { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 };

const fmtKg = n => String(Number(n.toFixed(2)));
const fmtChange = d => Math.abs(d) < 0.01 ? '±0' : `${d > 0 ? '+' : '−'}${fmtKg(Math.abs(d))}`;
const changeCls = d => d > 0.05 ? 'text-amber-300' : d < -0.05 ? 'text-lime-300' : 'text-zinc-300';

// Full page reached from the home card: log today's weight, see the trend,
// and manage the history.
export function BodyWeightView({ bodyWeights, onSave, onDelete, showConfirm, onBack }) {
  const last = bodyWeights[0];
  const [value, setValue] = useState(last ? String(last.kg) : '');
  const [error, setError] = useState('');
  const todaysEntry = bodyWeights.find(b => dateKey(b.date) === dateKey(new Date()));

  const save = () => {
    const n = parseFloat(String(value).replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > 500) {
      setError('Introduce un peso válido (entre 1 y 500 kg)');
      return;
    }
    onSave(n);
    setError('');
  };

  const removeEntry = entry => {
    showConfirm?.({
      title: 'Eliminar registro',
      body: `Se eliminará el registro de ${formatShort(entry.date)}: ${entry.kg} kg.`,
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => onDelete(entry.date),
    });
  };

  return (
    <div>
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 px-5 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-200" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="font-display text-xl">PESO CORPORAL</div>
      </header>

      <div className="px-5 py-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <label htmlFor="bw-input" className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            {todaysEntry ? 'Actualizar hoy' : 'Registrar hoy'} ({new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
          </label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1 min-w-0">
              <input
                id="bw-input"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={value}
                onChange={e => { setValue(e.target.value); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') save(); }}
                placeholder={last ? String(last.kg) : '—'}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-10 py-2.5 text-2xl font-display text-center outline-none focus:border-lime-300/60 placeholder:text-zinc-600"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold pointer-events-none">kg</span>
            </div>
            <button onClick={save} className="bg-lime-300 hover:bg-lime-400 text-zinc-950 px-5 rounded-lg font-bold text-sm transition shrink-0">
              GUARDAR
            </button>
          </div>
          {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
          {todaysEntry && !error && (
            <div className="text-[10px] text-zinc-500 mt-1">Hoy: {todaysEntry.kg} kg. Guardar lo sobreescribe.</div>
          )}
        </div>

        <BodyWeightProgress bodyWeights={bodyWeights} />

        <h3 className="font-display text-lg mt-6 mb-2">HISTORIAL</h3>
        {bodyWeights.length === 0 ? (
          <div className="text-xs text-zinc-500 italic text-center py-6">Sin registros aún.</div>
        ) : (
          <div className="space-y-1">
            {bodyWeights.map((b, i) => {
              const prev = bodyWeights[i + 1];
              const diff = prev ? Number((b.kg - prev.kg).toFixed(2)) : null;
              return (
                <div key={b.date} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <div className="font-mono text-sm flex items-baseline gap-2">
                    <span className="text-zinc-100 font-semibold">{b.kg}<span className="text-zinc-500 text-xs ml-1">kg</span></span>
                    {diff != null && <span className={`text-[11px] ${changeCls(diff)}`}>{fmtChange(diff)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{new Date(b.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <button onClick={() => removeEntry(b)} className="text-zinc-500 hover:text-red-400 p-1" aria-label="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

// Range picker, trend chart and summary. Also shown in Progreso → Peso.
export function BodyWeightProgress({ bodyWeights }) {
  const [range, setRange] = useState('90');
  const series = useMemo(() => bodyWeightSeries(bodyWeights, range === 'all' ? null : Number(range)), [bodyWeights, range]);
  const summary = useMemo(() => bodyWeightSummary(series), [series]);
  const data = useMemo(() => series.map(b => ({ label: formatShort(b.date), kg: b.kg })), [series]);

  if (!bodyWeights.length) {
    return (
      <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
        <Scale className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <div className="text-sm">Aún no has registrado tu peso.</div>
        <div className="text-xs mt-1 text-zinc-600">Regístralo a menudo para ver aquí tu evolución.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 mb-3">
        {RANGES.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setRange(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${range === id ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <SummaryTile label="Actual" value={fmtKg(summary.last.kg)} unit="kg" hint={formatShort(summary.last.date)} />
          <SummaryTile label="Cambio" value={fmtChange(summary.change)} unit="kg" className={changeCls(summary.change)}
            hint={`desde ${formatShort(summary.first.date)}`} />
          <SummaryTile label="Mín · Máx" value={`${fmtKg(summary.min)}·${fmtKg(summary.max)}`} small />
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Evolución</div>
        {data.length < 2 ? (
          <div className="text-xs text-zinc-500 text-center py-10">
            {data.length ? 'Necesitas al menos dos registros en este periodo para ver la gráfica.'
              : `Sin registros en este periodo. El último es del ${formatShort(bodyWeights[0].date)}.`}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={tickStyle} stroke="#3f3f46" minTickGap={24} />
              <YAxis tick={tickStyle} stroke="#3f3f46" domain={[d => Math.floor(d - 1), d => Math.ceil(d + 1)]} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kg`, 'Peso']} />
              <Line type="monotone" dataKey="kg" stroke="#d4ff37" strokeWidth={2}
                dot={data.length <= 40 ? { r: 2.5, fill: '#d4ff37' } : false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, unit, hint, small = false, className = 'text-zinc-100' }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 min-w-0">
      <div className="text-[10px] text-zinc-500 uppercase font-bold truncate">{label}</div>
      <div className={`font-display ${small ? 'text-lg' : 'text-2xl'} leading-tight truncate ${className}`}>
        {value}{unit && <span className="text-xs text-zinc-500 ml-0.5">{unit}</span>}
      </div>
      {hint && <div className="text-[10px] text-zinc-600 truncate">{hint}</div>}
    </div>
  );
}
