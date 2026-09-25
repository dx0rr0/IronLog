// End-to-end DOM smoke test for repeat → ghost → completed set → summary.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { storage } from '../src/infrastructure/storage/storage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'dist', 'assets');
const code = fs.readFileSync(path.join(assets,
  fs.readdirSync(assets).find(file => /^index-.*\.js$/.test(file))), 'utf8');
const makeSession = (id, date, name, routineId, sets) => ({ id, date, name, routineId,
  duration: 1800, entries: [{ exerciseId: 'press_banca', restSeconds: 0, sets }] });
await storage.set('sessions', [
  makeSession('s-other', '2026-01-10', 'Sesión R2', 'r2', [
    { weight: 85, reps: 8, rir: 2, done: true },
  ]),
  makeSession('s-r1', '2026-01-01', 'Sesión R1', 'r1', [
    { weight: 80, reps: 12, rir: 2, repsMin: 8, repsMax: 12, done: true },
    { weight: 80, reps: 10, rir: 2, repsMin: 8, repsMax: 12, done: true },
  ]),
]);

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true,
});
const { window } = dom;
window.indexedDB = globalThis.indexedDB;
window.IDBKeyRange = globalThis.IDBKeyRange;
window.navigator.serviceWorker = { register: () => Promise.resolve({ scope: '/' }),
  ready: Promise.resolve({ scope: '/' }), addEventListener() {} };
Object.defineProperty(window.navigator, 'storage', { value: {
  persist: () => Promise.resolve(true), persisted: () => Promise.resolve(true),
  estimate: () => Promise.resolve({ usage: 1024, quota: 1024 * 1024 }),
} });
window.eval(code);
const flush = () => new Promise(resolve => setTimeout(resolve, 250));
const button = text => [...window.document.querySelectorAll('button')]
  .find(el => el.textContent.includes(text));
const check = (name, passed) => {
  if (!passed) throw new Error(name);
  console.log('  ✓', name);
};

await flush();
button('Sesión R1').click();
await flush();
check('past session offers repeat action', !!button('REPETIR ENTRENAMIENTO'));
button('REPETIR ENTRENAMIENTO').click();
await flush();
check('repeat opens focused set mode', window.document.body.textContent.includes('RESULTADO REAL'));
const overview = () => window.document.querySelector('#workout-sets-overview');
check('focused mode lists every set without changing modes', overview()?.querySelectorAll('button[aria-label^="Ver serie"]').length === 2);
check('ghost prefers same routine', window.document.body.textContent.includes('82.5 kg × 8'));
check('previous set is shown as comparison', window.document.body.textContent.includes('Última en esta rutina'));
button('MARCAR SERIE HECHA').click();
await flush();
check('completing a set advances focus', window.document.body.textContent.includes('Serie 2 de 2'));
check('completed set and its actual values stay visible', overview()?.textContent.includes('80 kg × 12 @2') && overview()?.textContent.includes('HECHA'));
overview().querySelector('button[aria-label^="Ver serie 1"]').click();
await flush();
check('tapping a completed set reopens it for review',
  window.document.querySelector('button[aria-label^="Ver serie 1"]').getAttribute('aria-current') === 'step' &&
  !!button('SERIE HECHA ✓ · DESMARCAR'));
overview().querySelector('button[aria-label^="Ver serie 2"]').click();
await flush();
check('tapping another set returns to the pending one',
  window.document.querySelector('button[aria-label^="Ver serie 2"]').getAttribute('aria-current') === 'step' &&
  !!button('MARCAR SERIE HECHA'));
button('FIN').click();
await flush();
check('finish opens actionable summary', window.document.body.textContent.includes('HOY Y LA PRÓXIMA VEZ'));
check('summary shows next ghost', window.document.body.textContent.includes('Próximo ghost'));
check('repeat preserved original session', (await storage.get('sessions')).length === 3);

console.log('12 workout flow runtime checks passed');
