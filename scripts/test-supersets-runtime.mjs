// Exercise the production UI and its persisted state, including a reload.
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
await storage.set('weekly-goal', 3);
await storage.set('routines', [{ id: 'superset-routine', name: 'Torso superseries', exercises: [
  { exerciseId: 'press_banca', restSeconds: 90, sets: [{ repsMin: 8, repsMax: 12, rir: 2 }] },
  { exerciseId: 'dominadas', restSeconds: 60, sets: [{ repsMin: 6, repsMax: 10, rir: 2 }] },
] }]);
let dom, window;
const boot = () => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  window = dom.window;
  window.indexedDB = globalThis.indexedDB;
  window.IDBKeyRange = globalThis.IDBKeyRange;
  window.navigator.serviceWorker = { register: () => Promise.resolve({ scope: '/' }),
    ready: Promise.resolve({ scope: '/' }), addEventListener() {} };
  Object.defineProperty(window.navigator, 'storage', { value: {
    persist: () => Promise.resolve(true), persisted: () => Promise.resolve(true),
    estimate: () => Promise.resolve({ usage: 1024, quota: 1024 * 1024 }),
  } });
  window.eval(code);
};
const flush = () => new Promise(resolve => setTimeout(resolve, 100));
const waitFor = async predicate => {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await predicate()) return;
    await flush();
  }
  throw new Error('Timed out waiting for UI: ' + window.document.body.textContent.slice(-1000));
};
const button = label => [...window.document.querySelectorAll('button')]
  .find(element => element.textContent.includes(label));
const inputValue = (input, value) => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const doneButtons = () => [...window.document.querySelectorAll('button[aria-label="Marcar completada"]')];
try {
  boot();
  await waitFor(() => !!button('RUTINAS'));
  button('RUTINAS').click();
  await waitFor(() => !!window.document.querySelector('[aria-label="Editar rutina"]'));
  window.document.querySelector('[aria-label="Editar rutina"]').click();
  await waitFor(() => !!button('Superserie con siguiente'));
  button('Superserie con siguiente').click();
  await waitFor(() => window.document.body.textContent.includes('SUPERSERIE 1 · 2/2'));
  assert.equal(button('Añadir siguiente a superserie'), undefined);
  button('GUARDAR').click();
  await waitFor(async () => !!(await storage.get('routines'))[0].exercises[0].supersetId);
  const routine = (await storage.get('routines'))[0];
  assert.equal(routine.exercises[0].supersetId, routine.exercises[1].supersetId);
  assert.deepEqual(routine.exercises.map(e => e.restSeconds), [90, 90]);
  await waitFor(() => !!button('INICIAR'));
  button('INICIAR').click();
  await waitFor(() => doneButtons().length === 2);
  let active = await storage.get('current-session');
  assert.equal(active.entries[1].supersetId, routine.exercises[0].supersetId);
  const values = [...window.document.querySelectorAll('input[type="number"]')];
  const weight = values[0];
  const reps = [values[1], values[3]];
  assert.equal(values.length, 5, 'all weight, reps and RIR inputs remain visible');
  inputValue(weight, '50');
  inputValue(reps[0], '10');
  inputValue(reps[1], '8');
  doneButtons()[0].click();
  await waitFor(async () => (await storage.get('current-session')).entries[0].sets[0].done);
  assert.equal((await storage.get('current-session')).restTimer, undefined, 'no timer after first member');
  assert.match(window.document.body.textContent, /Siguiente: Dominadas · serie 1/);
  doneButtons()[0].click();
  await waitFor(async () => !!(await storage.get('current-session')).restTimer);
  active = await storage.get('current-session');
  assert.equal(active.restTimer.total, 90);
  assert.equal(active.restTimer.exerciseName, 'Superserie');
  const deadline = active.restTimer.endsAt;
  window.close();
  boot();
  await waitFor(() => !!button('CONTINUAR'));
  button('CONTINUAR').click();
  await waitFor(() => !!button('Deshacer superserie'));
  assert.equal((await storage.get('current-session')).restTimer.endsAt, deadline);
  assert.match(window.document.body.textContent, /SUPERSERIE 1 · 2\/2/);
  button('FIN').click();
  await waitFor(() => !!button('VER DETALLE'));
  assert.equal((await storage.get('sessions'))[0].entries[1].supersetId, routine.exercises[0].supersetId);
  button('VER DETALLE').click();
  await waitFor(() => !!button('REPETIR ENTRENAMIENTO'));
  assert.match(window.document.body.textContent, /SUPERSERIE 1 · 2\/2/);
  button('REPETIR ENTRENAMIENTO').click();
  await waitFor(() => doneButtons().length === 2);
  const repeated = await storage.get('current-session');
  assert.equal(repeated.entries[1].supersetId, routine.exercises[0].supersetId);
  assert.ok(repeated.entries.every(e => e.sets.every(s => !s.done)));
  button('Deshacer superserie').click();
  await waitFor(async () => !(await storage.get('current-session')).entries[0].supersetId);
  assert.ok((await storage.get('current-session')).entries.every(e => !e.supersetId));
  button('Superserie con siguiente').click();
  await waitFor(async () => !!(await storage.get('current-session')).entries[0].supersetId);
  window.document.querySelector('[aria-label="Quitar ejercicio"]').click();
  await waitFor(() => !!button('Quitar'));
  button('Quitar').click();
  await waitFor(async () => (await storage.get('current-session')).entries.length === 1);
  assert.equal((await storage.get('current-session')).entries[0].supersetId, undefined);
  console.log('Superset routine, active workout, round rest, reload, history, repeat and removal UI checks passed');
} finally {
  window?.close();
}
