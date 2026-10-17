// ---------------------------------------------------------------
// Storage layer
//
// Uses IndexedDB as primary store (much larger quota than
// localStorage and survives browser cleanup more aggressively).
// Falls back to localStorage if IDB is unavailable for any reason.
// Public API is async key/value with JSON-serialized values, matching
// the original window.storage shape so the rest of the app is untouched.
// ---------------------------------------------------------------

import { mergeCustomExercises } from '../../domain/exercises/custom-exercises.js';

const DB_NAME = 'ironlog';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function idbDel(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const decode = value => typeof value === 'string' ? JSON.parse(value) : value;
const readLocal = key => {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(key);
  return raw == null ? null : JSON.parse(raw);
};

// Read and merge in a single readwrite transaction. Two tabs adding exercises
// cannot replace each other's collections with stale snapshots.
async function idbUpsertCustom(incoming) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('custom-exercises');
    let merged;
    let error;
    req.onsuccess = () => {
      try {
        const existing = decode(req.result);
        let legacy;
        try { legacy = readLocal('custom-exercises'); }
        catch (e) {
          // Some browsers allow IDB but block Web Storage. Keep primary data
          // usable; malformed JSON still stops the merge to avoid data loss.
          if (existing !== undefined && e.name === 'SecurityError') legacy = null;
          else throw e;
        }
        merged = mergeCustomExercises(existing, legacy, incoming);
        store.put(JSON.stringify(merged), 'custom-exercises');
      } catch (e) { error = e; tx.abort(); }
    };
    tx.oncomplete = () => resolve(merged);
    tx.onerror = tx.onabort = () => reject(error || tx.error);
  });
}

function mirrorCustom(value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('custom-exercises', JSON.stringify(value));
    }
  } catch (e) {
    // The primary transaction has committed; a blocked/full secondary store
    // must not make a successfully saved exercise appear to have failed.
    console.warn('Custom exercise secondary copy unavailable', e);
  }
}

// Decide once whether to use IDB or fall back to localStorage
let useIDB = null;
const writeQueues = new Map();

function queueWrite(key, operation) {
  const previous = writeQueues.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  writeQueues.set(key, next);
  next.finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  }).catch(() => {});
  return next;
}

async function detectBackend() {
  if (useIDB !== null) return useIDB;
  try {
    await openDB();
    useIDB = true;
  } catch {
    useIDB = false;
  }
  return useIDB;
}

export const storage = {
  async get(key) {
    try {
      // A read after a queued write should see the latest value.
      await writeQueues.get(key)?.catch(() => {});
      if (await detectBackend()) {
        if (key === 'custom-exercises') {
          return await queueWrite(key, async () => {
            const merged = await idbUpsertCustom([]);
            mirrorCustom(merged);
            return merged;
          });
        }
        return await queueWrite(key, async () => {
          const v = await idbGet(key);
          if (v !== undefined) return decode(v);
          // Recover data written by the fallback backend before IDB worked.
          const legacy = readLocal(key);
          if (legacy !== null) {
            await idbSet(key, JSON.stringify(legacy));
            localStorage.removeItem(key);
          }
          return legacy;
        });
      }
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('storage.get failed for', key, e);
      // A failed read is different from a missing key. Returning null here
      // would make the app load empty state and overwrite existing data.
      throw e;
    }
  },

  async set(key, value) {
    try {
      await queueWrite(key, async () => {
        if (await detectBackend()) {
          if (key === 'custom-exercises') {
            const merged = await idbUpsertCustom(value);
            mirrorCustom(merged);
          } else await idbSet(key, JSON.stringify(value));
        } else {
          const saved = key === 'custom-exercises'
            ? mergeCustomExercises(readLocal(key), value) : value;
          localStorage.setItem(key, JSON.stringify(saved));
        }
      });
      return true;
    } catch (e) {
      console.warn('storage.set failed for', key, e);
      return false;
    }
  },

  async del(key) {
    try {
      await queueWrite(key, async () => {
        if (await detectBackend()) await idbDel(key);
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      });
      return true;
    } catch (e) {
      console.warn('storage.del failed for', key, e);
      return false;
    }
  },
};
