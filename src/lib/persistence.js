// ---------------------------------------------------------------
// Persistence helpers
//
// 1) requestPersistentStorage — asks the browser to mark our data
//    as "persistent", meaning it shouldn't be evicted when storage
//    is tight. Browsers usually grant this when the site is installed
//    as a PWA, bookmarked, or has user engagement.
//
// 2) Backup reminder — tracks the last time the user exported a
//    backup. We expose a helper that tells the UI whether to nudge
//    the user with a "tiempo sin hacer copia" banner.
// ---------------------------------------------------------------

import { storage } from './storage.js';

export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted?.();
      if (already) return { granted: true, alreadyGranted: true };
      const granted = await navigator.storage.persist();
      return { granted, alreadyGranted: false };
    }
  } catch (e) {
    console.warn('persist failed', e);
  }
  return { granted: false, alreadyGranted: false };
}

export async function getStorageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
  } catch {}
  return null;
}

const BACKUP_KEY = 'last-backup-at';
const BACKUP_DISMISSED_KEY = 'backup-reminder-dismissed-until';

export async function markBackupDone() {
  await storage.set(BACKUP_KEY, Date.now());
  await storage.del(BACKUP_DISMISSED_KEY);
}

export async function dismissBackupReminder(days = 3) {
  await storage.set(BACKUP_DISMISSED_KEY, Date.now() + days * 24 * 3600 * 1000);
}

export async function shouldRemindBackup(sessions) {
  // Don't nudge if the user has very few sessions yet
  if (!sessions || sessions.length < 3) return false;
  const dismissedUntil = await storage.get(BACKUP_DISMISSED_KEY);
  if (dismissedUntil && Date.now() < dismissedUntil) return false;
  const last = await storage.get(BACKUP_KEY);
  if (!last) return true; // never backed up
  const daysSince = (Date.now() - last) / (24 * 3600 * 1000);
  return daysSince >= 14;
}

export async function getLastBackupAt() {
  return await storage.get(BACKUP_KEY);
}
