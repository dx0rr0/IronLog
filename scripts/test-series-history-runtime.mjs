import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { storage } from '../src/infrastructure/storage/storage.js';

const assetDir = new URL('../dist/assets/', import.meta.url);
const asset = fs.readdirSync(assetDir).find(name => /^index-.*\.js$/.test(name));
const code = fs.readFileSync(new URL(asset, assetDir), 'utf8');
await storage.set('sessions', [{ id: 'previous', date: '2026-09-27T12:00:00Z', entries: [
  { exerciseId: 'press_banca', sets: [
    { weight: 60, reps: 12, rir: 2, done: true },
    { weight: 60, reps: 8, rir: 1, done: true },
    { weight: 60, reps: 6, done: false },
  ] },
] }]);
await storage.set('current-session', { id: 'today', name: 'Prueba series', date: new Date().toISOString(),
  startedAt: Date.now(), entries: [{ exerciseId: 'press_banca', restSeconds: 0, sets: [
    { weight: 60, reps: 10, done: false },
    { weight: 60, reps: 9, done: false },
    { weight: 60, reps: 6, done: false },
  ] }] });
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true,
});
const { window } = dom;
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.indexedDB = globalThis.indexedDB;
window.IDBKeyRange = globalThis.IDBKeyRange;
window.navigator.serviceWorker = { register: () => Promise.resolve({ scope: '/' }),
  ready: Promise.resolve({ scope: '/' }), addEventListener() {} };
Object.defineProperty(window.navigator, 'storage', { value: {
  persist: () => Promise.resolve(true), persisted: () => Promise.resolve(true),
  estimate: () => Promise.resolve({ usage: 1024, quota: 1000000 }),
} });
// Recover an exercise stored only in the old backend while IDB already exists.
window.localStorage.setItem('custom-exercises', JSON.stringify([
  { id: 'local-only', name: 'Extensión personal', category: 'strength', type: 'weight_reps',
    muscleGroup: 'triceps', equipment: 'Polea' },
]));
window.eval(code);
const waitFor = async predicate => {
  for (let i = 0; i < 30; i++) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for UI');
};
const button = label => [...window.document.querySelectorAll('button')].find(el => el.textContent.includes(label));
const body = () => window.document.body.textContent;
await waitFor(() => button('CONTINUAR'));
button('CONTINUAR').click();
await waitFor(() => button('Historial de series'));
assert.match(body(), /Serie 2 anterior.*60 kg × 8 @1/);
assert.doesNotMatch(body(), /Serie 3 anterior/);
window.document.querySelectorAll('button[aria-label="Marcar completada"]')[1].click();
await waitFor(() => body().includes('Superaste la serie 2'));
assert.match(body(), /Superaste la serie 2 del .*\+1 reps con el mismo peso/);
assert.doesNotMatch(body(), /TU MEJOR SERIE|★ RÉCORD PERSONAL/);
button('Historial de series').click();
await waitFor(() => window.document.querySelector('[data-exercise-history]'));
const history = window.document.querySelector('[data-exercise-history]');
assert.match(history.textContent, /#1.*60kg × 12 · RIR 2/);
assert.match(history.textContent, /#2.*60kg × 8 · RIR 1/);
assert.doesNotMatch(history.textContent, /#3/);
history.querySelector('header button').click();
await waitFor(() => !window.document.querySelector('[data-exercise-history]'));
assert.equal(window.document.querySelectorAll('button[aria-label="Desmarcar"]').length, 1);
button('AÑADIR EJERCICIO').click();
await waitFor(() => window.document.querySelector('input[placeholder="Buscar ejercicio o grupo muscular..."]'));
const search = window.document.querySelector('input[placeholder="Buscar ejercicio o grupo muscular..."]');
Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, 'triceps');
search.dispatchEvent(new window.Event('input', { bubbles: true }));
await waitFor(() => button('Extensión personal'));
assert.match(button('Extensión personal').textContent, /Tríceps.*Polea/);
button('Extensión personal').click();
await waitFor(async () => (await storage.get('current-session')).entries.length === 2);
assert.equal((await storage.get('current-session')).entries[1].restSeconds, 120);
assert.equal((await storage.get('custom-exercises')).find(ex => ex.id === 'local-only').name, 'Extensión personal');
window.close();
console.log('Series comparison, history modal, legacy recovery, muscle search and new rest default passed');
