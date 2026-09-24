// Verify archived exercises stay readable in old sessions and can be restored.
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

await storage.set('custom-exercises', [{
  id: 'cust_archived', name: 'Curl archivado', category: 'strength',
  muscleGroup: 'biceps', equipment: 'Mancuernas', type: 'weight_reps', hidden: true,
}]);
await storage.set('sessions', [{
  id: 'ses_archived', name: 'Sesión de prueba', date: new Date().toISOString(),
  duration: 1200, entries: [{ exerciseId: 'cust_archived', sets: [
    { weight: 12, reps: 10, done: true },
  ] }],
}]);

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
const flush = () => new Promise(resolve => setTimeout(resolve, 200));
const button = text => [...window.document.querySelectorAll('button')]
  .find(el => el.textContent.toLocaleLowerCase('es').includes(text.toLocaleLowerCase('es')));
const check = (name, passed) => {
  if (!passed) throw new Error(name);
  console.log('  ✓', name);
};

await flush();
check('old session is listed', !!button('Sesión de prueba'));
button('Sesión de prueba').click();
await flush();
check('archived exercise remains in history', window.document.body.textContent.includes('CURL ARCHIVADO'));
window.document.querySelector('header button').click();
await flush();
[...window.document.querySelectorAll('button')]
  .find(el => el.textContent.trim() === 'EJERC.').click();
await flush();
check('archived exercise is absent from active catalogue',
  !window.document.body.textContent.includes('Curl archivado'));
check('archived exercises can be revealed', !!button('VER ARCHIVADOS (1)'));
button('VER ARCHIVADOS (1)').click();
await flush();
check('archived exercise can be restored', !!button('RECUPERAR'));
button('RECUPERAR').click();
await flush();
check('restored exercise returns to catalogue', window.document.body.textContent.includes('Curl archivado'));

console.log('6 archive runtime checks passed');
