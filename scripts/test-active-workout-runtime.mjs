// Active routine: create an exercise in place, persist it, and resume an accurate rest timer.
import assert from 'node:assert/strict';
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
await storage.set('current-session', {
  id: 'active-routine', name: 'Torso', date: new Date().toISOString(),
  startedAt: Date.now(), routineId: 'routine-1', notes: '',
  entries: [{ exerciseId: 'press_banca', restSeconds: 120, notes: '', sets: [
    { weight: 80, reps: 8, rir: 2, done: false },
  ] }],
});

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
const waitFor = async predicate => {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await predicate()) return;
    await flush();
  }
  throw new Error('Timed out waiting for UI update');
};
const button = label => [...window.document.querySelectorAll('button')]
  .find(element => element.textContent.includes(label));

await waitFor(() => !!button('CONTINUAR'));
button('CONTINUAR').click();
await waitFor(() => !!button('AÑADIR EJERCICIO'));
assert.equal(button('MODO SERIE'), undefined);
button('AÑADIR EJERCICIO').click();
await waitFor(() => !!button('CREAR'));
button('CREAR').click();
await waitFor(() => !!window.document.querySelector('input[placeholder="Ej: Press inclinado smith"]'));
const input = window.document.querySelector('input[placeholder="Ej: Press inclinado smith"]');
const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
setter.call(input, 'Press de prueba');
input.dispatchEvent(new window.Event('input', { bubbles: true }));
button('GUARDAR EJERCICIO').click();
await waitFor(() => !!(window.document.body.textContent.includes('PRESS DE PRUEBA')));
const savedExercise = (await storage.get('custom-exercises'))[0];
assert.equal(savedExercise.name, 'Press de prueba');
assert.equal((await storage.get('current-session')).entries[1].exerciseId, savedExercise.id);
button('Iniciar').click();
await waitFor(() => !!window.document.body.textContent.includes('DESCANSO'));
const timer = (await storage.get('current-session')).restTimer;
assert.equal(timer.total, 120);
const actualNow = window.Date.now;
let visibility = 'hidden';
Object.defineProperty(window.document, 'visibilityState', { configurable: true, get: () => visibility });
window.Date.now = () => timer.endsAt - 45000;
window.document.dispatchEvent(new window.Event('visibilitychange'));
await waitFor(() => window.document.body.textContent.includes('0:45'));
assert.equal((await storage.get('current-session')).restTimer.endsAt, timer.endsAt);
window.Date.now = () => timer.endsAt + 10000;
window.document.dispatchEvent(new window.Event('visibilitychange'));
await flush();
assert.equal((await storage.get('current-session')).restTimer.endsAt, timer.endsAt,
  'the deadline is kept while the app is hidden');
visibility = 'visible';
window.document.dispatchEvent(new window.Event('visibilitychange'));
await waitFor(async () => !(await storage.get('current-session')).restTimer);
window.Date.now = actualNow;
window.close();
console.log('Active exercise creation and background rest timer checks passed');
