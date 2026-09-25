import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sessionVolume } from '../../../domain/training/session-utils.js';
import { getLastBackupAt, getStorageEstimate } from '../../../infrastructure/storage/persistence.js';
import { AlertTriangle, Check, ChevronRight, Download, Dumbbell, HardDrive, Plus, ShieldCheck, Target, Trash2, Upload, X } from 'lucide-react';
import { DEFAULT_PLATE_CONFIG, computePlates, platesSummary } from '../../../domain/exercises/exercise-utils.js';
import { fmtDur, sessionDuration } from '../../shared/formatters.js';
import { buildLabel } from '../../../app/build-info.js';

export function SettingsView({ sessions, customExercises, routines = [], bodyWeights = [], plateConfig, onUpdatePlateConfig, persistGranted, onExport, onImport, onReset, weeklyGoal, onUpdateWeeklyGoal }) {
  const fileInput = useRef();
  const totalDur = sessions.reduce((a, s) => a + sessionDuration(s), 0);
  const totalVol = sessions.reduce((a, s) => a + sessionVolume(s), 0);
  const [lastBackup, setLastBackup] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [plateEditorOpen, setPlateEditorOpen] = useState(false);

  useEffect(() => {
    getLastBackupAt().then(setLastBackup)
      .catch(err => console.warn('Unable to read last backup date', err));
    getStorageEstimate().then(setEstimate);
  }, [sessions]);

  const lastBackupText = useMemo(() => {
    if (!lastBackup) return 'Nunca';
    const days = Math.floor((Date.now() - lastBackup) / (24 * 3600 * 1000));
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 30) return `Hace ${days} días`;
    if (days < 365) return `Hace ${Math.floor(days / 30)} mes(es)`;
    return `Hace ${Math.floor(days / 365)} año(s)`;
  }, [lastBackup]);

  const usageText = useMemo(() => {
    if (!estimate) return null;
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    if (!quota) return null;
    const fmt = b => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${fmt(used)} usados de ${fmt(quota)}`;
  }, [estimate]);

  return (
    <div>
      <header className="px-5 pt-8 pb-4">
        <div className="text-xs text-zinc-500 tracking-[0.3em] font-semibold mb-1">AJUSTES</div>
        <h1 className="font-display text-4xl leading-none">DATOS</h1>
      </header>

      <div className="px-5 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-lime-300 mb-2"><Target className="w-4 h-4" /><span className="text-xs uppercase tracking-wider font-bold">Meta semanal</span></div>
          <p className="text-xs text-zinc-400 mb-3">Elige cuántos días distintos quieres entrenar de lunes a domingo.</p>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, index) => index + 1).map(days => (
              <button key={days} type="button" onClick={() => onUpdateWeeklyGoal(days)} aria-pressed={weeklyGoal === days}
                className={`aspect-square rounded-lg font-bold ${weeklyGoal === days ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                {days}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-zinc-500 mt-2">{weeklyGoal ? `${weeklyGoal} ${weeklyGoal === 1 ? 'día' : 'días'} por semana` : 'Sin meta definida'}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-3">Resumen</div>
          <div className="grid grid-cols-2 gap-3 font-mono text-sm">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Sesiones</div>
              <div className="font-display text-2xl text-zinc-100">{sessions.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Tiempo total</div>
              <div className="font-display text-2xl text-zinc-100">{fmtDur(totalDur)}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Volumen total</div>
              <div className="font-display text-2xl text-lime-300">{(totalVol / 1000).toFixed(1)} <span className="text-sm">tn</span></div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Rutinas</div>
              <div className="font-display text-2xl text-zinc-100">{routines.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Ej. propios</div>
              <div className="font-display text-2xl text-zinc-100">{customExercises.length}</div>
            </div>
          </div>
        </div>

        {/* Storage status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Almacenamiento</div>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${persistGranted ? 'bg-lime-300/15 text-lime-300' : 'bg-amber-500/15 text-amber-400'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-100">
                {persistGranted === null ? 'Comprobando…' : persistGranted ? 'Almacenamiento persistente' : 'Almacenamiento estándar'}
              </div>
              <div className="text-[11px] text-zinc-500 leading-snug">
                {persistGranted
                  ? 'El navegador ha marcado tus datos como protegidos: no los borrará automáticamente para liberar espacio.'
                  : 'Tus datos se guardan localmente, pero el navegador podría borrarlos si se queda sin espacio. Instala la app en la pantalla de inicio para activar la protección.'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg shrink-0 bg-zinc-800 text-zinc-300">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-100">Última copia: {lastBackupText}</div>
              <div className="text-[11px] text-zinc-500 leading-snug">
                {usageText && <span>{usageText} · </span>}
                Recomendación: descarga el JSON cada 1-2 semanas y guárdalo en Google Drive / iCloud.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
          <button
            onClick={() => setPlateEditorOpen(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/60 transition text-left"
          >
            <div className="bg-zinc-800 text-lime-300 p-2 rounded-lg">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Discos disponibles</div>
              <div className="text-xs text-zinc-500 truncate">
                Barra {plateConfig.barWeightKg} kg · {plateConfig.plates.filter(p => p.pairs > 0 && p.enabled !== false).length} disco(s) activos
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
          <button
            onClick={onExport}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/60 transition text-left"
          >
            <div className="bg-lime-300/15 text-lime-300 p-2 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Exportar a JSON</div>
              <div className="text-xs text-zinc-500">Descarga todos tus datos como archivo .json</div>
            </div>
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/60 transition text-left"
          >
            <div className="bg-zinc-800 text-zinc-300 p-2 rounded-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Importar desde JSON</div>
              <div className="text-xs text-zinc-500">Recupera datos exportados anteriormente</div>
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="bg-zinc-900 border border-red-900/30 rounded-2xl">
          <button
            onClick={onReset}
            className="w-full flex items-center gap-3 p-4 hover:bg-red-950/30 transition text-left"
          >
            <div className="bg-red-500/15 text-red-400 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-red-400">Borrar todos los datos</div>
              <div className="text-xs text-zinc-500">Elimina sesiones, rutinas y peso corporal</div>
            </div>
          </button>
        </div>

        <div className="text-center text-xs text-zinc-600 pt-4 pb-2">
          IRONLOG · {buildLabel()}
        </div>
      </div>

      {plateEditorOpen && (
        <PlateConfigEditor
          config={plateConfig}
          onSave={cfg => { onUpdatePlateConfig(cfg); setPlateEditorOpen(false); }}
          onReset={() => onUpdatePlateConfig(DEFAULT_PLATE_CONFIG)}
          onClose={() => setPlateEditorOpen(false)}
        />
      )}
    </div>
  );
}

export function PlateConfigEditor({ config, onSave, onReset, onClose }) {
  // Work on a draft so the user can hit Cancel without persisting changes.
  const [draft, setDraft] = useState(() => ({
    barWeightKg: config.barWeightKg,
    plates: config.plates.map(p => ({ ...p })),
  }));

  const updateBar = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    setDraft(d => ({ ...d, barWeightKg: Number.isFinite(n) && n >= 0 ? n : 0 }));
  };
  const updatePlate = (idx, field, v) => {
    setDraft(d => ({
      ...d,
      plates: d.plates.map((p, i) => {
        if (i !== idx) return p;
        if (field === 'weight') {
          const n = parseFloat(String(v).replace(',', '.'));
          return { ...p, weight: Number.isFinite(n) && n > 0 ? n : 0 };
        }
        if (field === 'pairs') {
          const n = parseInt(v, 10);
          return { ...p, pairs: Number.isFinite(n) && n >= 0 ? n : 0 };
        }
        if (field === 'enabled') {
          return { ...p, enabled: !!v };
        }
        return p;
      }),
    }));
  };
  const togglePlate = (idx) => {
    setDraft(d => ({
      ...d,
      plates: d.plates.map((p, i) =>
        i !== idx ? p : { ...p, enabled: p.enabled === false ? true : false }
      ),
    }));
  };
  const removePlate = (idx) => setDraft(d => ({ ...d, plates: d.plates.filter((_, i) => i !== idx) }));
  const addPlate = () => setDraft(d => ({ ...d, plates: [...d.plates, { weight: 0, pairs: 0, enabled: true }] }));

  const save = () => {
    // Keep disabled plates in the saved config so the user can re-enable
    // them later without losing their inventory count. Only drop truly
    // empty rows.
    const cleaned = draft.plates
      .filter(p => p.weight > 0 && p.pairs > 0)
      .map(p => ({ weight: p.weight, pairs: p.pairs, enabled: p.enabled !== false }))
      .sort((a, b) => b.weight - a.weight);
    onSave({ barWeightKg: draft.barWeightKg, plates: cleaned });
  };

  // Live demo of the breakdown so the user sees the effect.
  const demoTargets = [60, 80, 100];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-zinc-950/70 backdrop-blur-sm anim-fade" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl anim-slide-up max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-2xl text-zinc-100 leading-tight">DISCOS</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Peso de la barra</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={draft.barWeightKg}
                onChange={e => updateBar(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-lg font-mono text-center outline-none focus:border-lime-300/60 w-24"
              />
              <span className="text-zinc-400 text-sm font-bold">kg</span>
              <div className="ml-auto flex gap-1">
                {[10, 15, 20].map(w => (
                  <button
                    key={w}
                    onClick={() => updateBar(w)}
                    className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Inventario (1 par = 2 discos)</label>
            </div>
            <div className="space-y-1.5">
              {draft.plates.map((p, idx) => {
                const isDisabled = p.enabled === false;
                return (
                  <div key={idx} className={`flex items-center gap-2 rounded-lg p-2 transition ${isDisabled ? 'bg-zinc-900/40 opacity-50' : 'bg-zinc-800/60'}`}>
                    <button
                      onClick={() => togglePlate(idx)}
                      className={`shrink-0 w-7 h-7 rounded flex items-center justify-center transition ${isDisabled ? 'bg-zinc-800 text-zinc-600 hover:text-zinc-400' : 'bg-lime-300/20 text-lime-300 hover:bg-lime-300/30'}`}
                      aria-label={isDisabled ? 'Activar disco' : 'Desactivar disco'}
                      title={isDisabled ? 'Disco desactivado · pulsa para activar' : 'Disco activo · pulsa para desactivar'}
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      inputMode="decimal"
                      value={p.weight || ''}
                      onChange={e => updatePlate(idx, 'weight', e.target.value)}
                      placeholder="kg"
                      className={`bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm font-mono text-center outline-none focus:border-lime-300/60 w-20 ${isDisabled ? 'line-through' : ''}`}
                    />
                    <span className="text-zinc-500 text-xs">kg ·</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={p.pairs || ''}
                      onChange={e => updatePlate(idx, 'pairs', e.target.value)}
                      placeholder="0"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm font-mono text-center outline-none focus:border-lime-300/60 w-16"
                    />
                    <span className="text-zinc-500 text-xs">pares</span>
                    <button
                      onClick={() => removePlate(idx)}
                      className="ml-auto text-zinc-500 hover:text-red-400 p-1"
                      aria-label="Eliminar disco"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addPlate}
                className="w-full text-xs text-zinc-400 hover:text-lime-300 hover:bg-zinc-800 py-2 rounded transition flex items-center justify-center gap-1 font-semibold border border-dashed border-zinc-700 hover:border-lime-300/40"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir disco
              </button>
            </div>
          </div>

          <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-800">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Vista previa</div>
            <div className="space-y-1 text-xs font-mono">
              {demoTargets.map(t => {
                const info = computePlates(t, draft);
                let txt;
                if (info.belowBar) txt = info.exact ? 'solo barra' : '< peso barra';
                else if (info.exact) txt = `${platesSummary(info.perSide)}/lado`;
                else txt = info.perSide.length
                  ? `${platesSummary(info.perSide)}/lado · faltan ${info.remainder.toFixed(2).replace(/\.?0+$/, '')} kg`
                  : 'no entra';
                return (
                  <div key={t} className="flex justify-between gap-2">
                    <span className="text-zinc-400 shrink-0">{t} kg</span>
                    <span className={info.exact ? 'text-lime-300 text-right' : 'text-amber-300 text-right'}>{txt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 mt-2 border-t border-zinc-800">
          <button
            onClick={onReset}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
          >
            Restaurar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-full font-semibold text-sm transition"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 bg-lime-300 hover:bg-lime-400 text-zinc-950 py-2.5 rounded-full font-bold text-sm transition"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
