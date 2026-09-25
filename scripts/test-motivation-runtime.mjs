// Onboarding → repeat → live PR → goal and mass comparison in the saved summary.
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
await storage.set('sessions', [{ id: 'historic', date: new Date(Date.now() - 14 * 86400000).toISOString(),
  name: 'Base', entries: [{ exerciseId: 'press_banca', sets: [
    { weight: 80, reps: 8, rir: 2, done: true },
  ] }] }]);
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
check('onboarding asks for a weekly target', !!window.document.querySelector('[aria-labelledby="weekly-goal-title"]'));
window.document.querySelector('[aria-labelledby="weekly-goal-title"] button[aria-pressed]:first-child').click();
await flush();
button('FIJAR MI META').click();
await flush();
check('weekly goal is stored', (await storage.get('weekly-goal')) === 1);
check('home shows the weekly goal card', window.document.body.textContent.includes('TU META SEMANAL'));
button('Base').click();
await flush();
button('REPETIR ENTRENAMIENTO').click();
await flush();
window.document.querySelector('[aria-label="Aumentar Repeticiones"]').click();
await flush();
button('MARCAR SERIE HECHA').click();
await flush();
check('a live record appears immediately', window.document.body.textContent.includes('NUEVO RÉCORD'));
check('same-weight repetition record is explained', window.document.body.textContent.includes('Más reps con este peso'));
window.document.querySelector('[aria-label="Cerrar aviso de récord"]').click();
await flush();
button('SERIE HECHA ✓ · DESMARCAR').click();
await flush();
button('MARCAR SERIE HECHA').click();
await flush();
check('marking the same performance again does not repeat the alert',
  !window.document.body.textContent.includes('NUEVO RÉCORD'));
button('FIN').click();
await flush();
check('weekly goal has a celebration message', window.document.body.textContent.includes('1 DÍA ESTA SEMANA'));
check('saved summary has a mass comparison', window.document.body.textContent.includes('TODO LO QUE HAS MOVIDO HOY'));
check('record appears in the saved summary', window.document.body.textContent.includes('serie con récord'));
check('actual reps are saved', (await storage.get('sessions'))[0].entries[0].sets[0].reps === 9);

console.log('10 motivation runtime checks passed');
