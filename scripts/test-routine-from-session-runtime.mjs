// Create a routine from a past workout, then start it without altering the original.
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
const original = { id: 'session-template', date: new Date().toISOString(), name: 'Torso del lunes',
  duration: 1800, entries: [{ exerciseId: 'press_banca', restSeconds: 90, sets: [
    { weight: 80, reps: 10, rir: 2, done: true },
    { weight: 80, reps: 8, rir: 1, done: true },
    { weight: 70, reps: 8, done: false },
  ] }] };
await storage.set('sessions', [original]);

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
    if (predicate()) return;
    await flush();
  }
  throw new Error('Timed out waiting for UI update');
};
const button = label => [...window.document.querySelectorAll('button')]
  .find(element => element.textContent.includes(label));

await flush();
button('Torso del lunes').click();
await waitFor(() => !!button('GUARDAR COMO RUTINA'));
button('GUARDAR COMO RUTINA').click();
await waitFor(() => !!window.document.querySelector('input[placeholder^="Ej:"]'));
assert.match(window.document.body.textContent, /NUEVA RUTINA/);
assert.equal(window.document.querySelector('input[placeholder^="Ej:"]')?.value, 'Torso del lunes',
  window.document.body.textContent.slice(0, 450));
assert.match(window.document.body.textContent, /PRESS DE BANCA/);
const targetInputs = [...window.document.querySelectorAll('input[type="number"]')];
assert.deepEqual(targetInputs.slice(0, 6).map(input => input.value), ['8', '12', '2', '6', '10', '1']);
button('GUARDAR').click();
await waitFor(() => window.document.body.textContent.includes('RUTINAS'));
const saved = await storage.get('routines');
assert.equal(saved.length, 1);
assert.equal(saved[0].name, 'Torso del lunes');
assert.equal(saved[0].exercises[0].sets.length, 2);
assert.deepEqual(await storage.get('sessions'), [original]);
assert.match(window.document.body.textContent, /RUTINAS/);
button('INICIAR').click();
await waitFor(() => window.document.body.textContent.includes('RESULTADO REAL'));
const active = await storage.get('current-session');
assert.equal(active.entries[0].sets.length, 2);
assert.equal(active.entries[0].sets[0].weight, 80);
assert.equal(active.entries[0].sets[0].done, false);
console.log('Session-to-routine UI flow checks passed');
window.close();
