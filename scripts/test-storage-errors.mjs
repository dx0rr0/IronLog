// Run separately from the IndexedDB smoke test to exercise the fallback path.
import { storage } from '../src/infrastructure/storage/storage.js';

globalThis.localStorage = {
  getItem() { throw new Error('read blocked'); },
  setItem() { throw new Error('write blocked'); },
  removeItem() { throw new Error('delete blocked'); },
};

let readFailed = false;
try {
  await storage.get('sessions');
} catch (error) {
  readFailed = error.message === 'read blocked';
}
if (!readFailed) throw new Error('A failed read must not look like an empty key');
if (await storage.set('sessions', []) !== false) throw new Error('A failed write must be reported');
if (await storage.del('sessions') !== false) throw new Error('A failed delete must be reported');

console.log('3 storage failure checks passed');
