// First completed set of each exercise must celebrate even without history.
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
  id: 'first-marks', name: 'Primer entrenamiento', date: new Date().toISOString(),
  startedAt: Date.now(), notes: '', entries: [
    { exerciseId: 'press_banca', restSeconds: 0, sets: [{ weight: 80, reps: 8, rir: 2, done: false }] },
    { exerciseId: 'dominadas', restSeconds: 0, sets: [{ reps: 6, rir: 2, done: false }] },
  ],
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
await waitFor(() => window.document.querySelectorAll('button[aria-label="Marcar completada"]').length === 2);
window.document.querySelector('button[aria-label="Marcar completada"]').click();
await waitFor(() => window.document.body.textContent.includes('NUEVO RÉCORD PERSONAL'));
assert.match(window.document.body.textContent, /Primera marca: 80 kg × 8 reps/);
window.document.querySelector('button[aria-label="Cerrar aviso de récord"]').click();
await flush();
window.document.querySelector('button[aria-label="Marcar completada"]').click();
await waitFor(() => window.document.body.textContent.includes('Primera marca: 6 reps'));
const session = await storage.get('current-session');
assert.equal(session.entries[0].sets[0].personalRecords[0].kind, 'first');
assert.equal(session.entries[1].sets[0].personalRecords[0].kind, 'first');
window.document.querySelector('button[aria-label="Cerrar aviso de récord"]').click();
button('FIN').click();
await waitFor(() => window.document.body.textContent.includes('series con récord'));
assert.equal((await storage.get('sessions'))[0].entries.length, 2);
window.close();
console.log('First marks celebrate for two exercises without history');
