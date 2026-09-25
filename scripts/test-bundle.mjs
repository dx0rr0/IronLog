// Validates the production bundle:
//   - is parseable (no syntax errors)
//   - contains expected app strings (proves modules were included)
//   - doesn't reference window.storage (confirms migration to IndexedDB)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '..', 'dist');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, extra ?? ''); fail++; }
}

console.log('bundle validation');

// Find the main JS bundle
const assetsDir = path.join(dist, 'assets');
const jsFile = fs.readdirSync(assetsDir).find(f => f.startsWith('index-') && f.endsWith('.js'));
ok('main bundle exists', !!jsFile);

const code = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');

// 1) Parses without syntax errors
try {
  new vm.Script(code, { filename: jsFile });
  ok('bundle parses (no syntax errors)', true);
} catch (e) {
  ok('bundle parses', false, e.message);
}

// 2) Contains expected app content
ok('bundle contains "IRONLOG"',     code.includes('IRONLOG'));
ok('bundle contains "ENTRENAR"',    code.includes('ENTRENAR'));
ok('bundle contains "PRESS DE BANCA"', code.includes('Press de banca') || code.includes('press_banca'));
ok('bundle contains storage key "sessions"', code.includes('sessions') && code.includes('routines'));
ok('bundle references IndexedDB',   code.includes('indexedDB') || code.includes('IDBKeyRange') || /openDB|openCursor|objectStore/.test(code));
ok('bundle references persist API', code.includes('navigator.storage') || code.includes('.persist(') || code.includes('persisted'));

// New feature presence checks (Nov 2025 release: autofill, plates, 1RM, bodyweight)
ok('bundle persists body-weights key', code.includes('body-weights'));
ok('bundle persists plate-config key', code.includes('plate-config'));
ok('bundle exports version 4 of backup format', code.includes('version:4') || code.includes('"version":4') || code.includes('version: 4'));
ok('bundle ships plate calculator UI ("DISCOS")', code.includes('DISCOS'));
ok('bundle ships body-weight UI ("PESO CORPORAL")', code.includes('PESO CORPORAL'));
ok('bundle ships volume tab ("VOLUMEN")', code.includes('VOLUMEN'));
ok('bundle ships body map ("DELANTE"/"DETRÁS")', code.includes('DELANTE') && code.includes('DETR'));
ok('bundle references hypertrophy landmarks', code.includes('hipertrofia') || /under|VOLUME_LANDMARKS/.test(code));
ok('bundle still references epley (1RM)', /epley|\(\s*1\s*\+\s*\w+\s*\/\s*30\s*\)/.test(code));
// Build-time version injection: pkg.version should be inlined as a literal,
// and the build date should be a recent ISO timestamp.
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8'));
ok(`bundle has injected version (${pkg.version})`, code.includes(`"${pkg.version}"`));
// Look for an ISO-ish timestamp like "2026-05-12T..." in the code.
const buildTsMatch = code.match(/"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^"]*)"/);
ok('bundle has injected build timestamp', !!buildTsMatch, buildTsMatch?.[1]);
// Sanity: it should be reasonably close to "now" (within the last hour).
if (buildTsMatch) {
  const stamp = new Date(buildTsMatch[1]).getTime();
  ok('build timestamp is recent (< 1h old)', Date.now() - stamp < 60 * 60 * 1000);
}

// 3) Critical: must NOT reference window.storage (the artifact-only API)
const referencesArtifactStorage = /window\.storage\.|getStorage\s*\(/.test(code);
ok('bundle does NOT use window.storage', !referencesArtifactStorage);

// 4) Service worker generated
ok('service worker generated', fs.existsSync(path.join(dist, 'sw.js')));
ok('manifest generated', fs.existsSync(path.join(dist, 'manifest.webmanifest')));
ok('icons generated',
  fs.existsSync(path.join(dist, 'icon-192.png')) &&
  fs.existsSync(path.join(dist, 'icon-512.png')) &&
  fs.existsSync(path.join(dist, 'icon-512-maskable.png')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
