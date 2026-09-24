// Runtime smoke test: load the built bundle inside jsdom and verify
// that React mounts without errors and renders core UI strings.
// This catches issues that static parsing misses (e.g. accessing an
// undefined import, ReferenceError at render time).
//
// Run from project root with the dist/ folder freshly built.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';
import 'fake-indexeddb/auto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '..', 'dist');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, extra ?? ''); fail++; }
}

console.log('runtime smoke test (jsdom)');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');
const assetsDir = path.join(dist, 'assets');
const jsFile = fs.readdirSync(assetsDir).find(f => f.startsWith('index-') && f.endsWith('.js'));
const cssFile = fs.readdirSync(assetsDir).find(f => f.startsWith('index-') && f.endsWith('.css'));
const code = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');

ok('html, js and css present', !!html && !!code && !!css);

// Capture errors and warnings from the page.
const errors = [];
const warnings = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(`jsdomError: ${e.message}`));
vc.on('error', (...args) => errors.push(`console.error: ${args.join(' ')}`));
vc.on('warn', (...args) => warnings.push(`console.warn: ${args.join(' ')}`));

const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head><title>test</title><style>${css}</style></head>
    <body><div id="root"></div></body>
  </html>
`, {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc,
});

// Polyfill the bits the bundle expects but jsdom doesn't cover.
const { window } = dom;
// crypto.randomUUID and fetch aren't used by our app but be defensive.
if (!window.crypto) window.crypto = { getRandomValues: arr => arr };
// Wire fake-indexeddb into the jsdom window so storage.js's openDB works.
window.indexedDB = globalThis.indexedDB;
window.IDBKeyRange = globalThis.IDBKeyRange;
// Service worker registration: stub it so the PWA glue doesn't blow up.
window.navigator.serviceWorker = {
  register: () => Promise.resolve({ scope: '/' }),
  ready: Promise.resolve({ scope: '/' }),
  addEventListener: () => {},
};
// Storage manager API our persistence layer probes.
Object.defineProperty(window.navigator, 'storage', {
  configurable: true,
  value: {
    persist: () => Promise.resolve(true),
    persisted: () => Promise.resolve(false),
    estimate: () => Promise.resolve({ usage: 1024, quota: 1024 * 1024 * 100 }),
  },
});
// AudioContext (rest timer beep). The app guards against missing AudioContext
// already, but stub it so we exercise the happy path.
window.AudioContext = function () {
  return { createOscillator: () => ({ connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { value: 0 } }), destination: {}, currentTime: 0 };
};

// Run the bundle. Most of it is a single IIFE.
try {
  window.eval(code);
  ok('bundle executes without throwing', true);
} catch (e) {
  ok('bundle executes without throwing', false, e.message);
}

// Wait one tick for React to flush + storage promises to resolve.
await new Promise(r => setTimeout(r, 200));

const root = window.document.getElementById('root');
const text = root ? root.textContent : '';

ok('react mounted (root has children)', root && root.children.length > 0);
ok('renders "A ENTRENAR." headline', text.includes('A ENTRENAR'));
ok('renders bottom-nav "Ajustes" label', text.includes('Ajustes') || text.includes('AJUSTES'));
ok('renders body-weight card', text.includes('PESO CORPORAL') || text.includes('REGISTRA TU PESO'));
ok('renders version badge in header', /v\d+\.\d+/.test(text));

// No uncaught errors during render.
if (errors.length === 0) {
  ok('no runtime errors', true);
} else {
  // Filter out benign noise from resource loading we don't care about.
  const real = errors.filter(e => !/Could not parse CSS|JSDOM does not implement|net::ERR/.test(e));
  ok(`no runtime errors (${real.length} real of ${errors.length} total)`, real.length === 0, real.slice(0, 5));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
