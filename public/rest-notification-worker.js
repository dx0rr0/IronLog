// Loaded by the generated PWA worker; tapping a rest opens or focuses IronLog.
self.addEventListener('notificationclick', event => {
  if (event.notification.tag !== 'ironlog-rest') return;
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL('./', self.registration.scope).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  })());
});

// Background end-of-rest alert. The page can't play sound while hidden, so
// it hands the deadline to this worker, which wakes the phone when the rest
// ends. Chrome keeps a worker alive for up to 5 minutes inside waitUntil.
let scheduledEnd = null;
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'rest-cancel') {
    scheduledEnd = null;
    return;
  }
  if (data.type !== 'rest-schedule' || !Number.isFinite(data.endsAt)) return;
  const endsAt = data.endsAt;
  const wait = endsAt - Date.now();
  scheduledEnd = endsAt;
  if (wait <= 0) return;
  event.waitUntil(new Promise(resolve => setTimeout(resolve, wait)).then(async () => {
    if (scheduledEnd !== endsAt) return;
    scheduledEnd = null;
    // With IronLog on screen, the page plays its own sound.
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.some(client => client.visibilityState === 'visible')) return;
    await self.registration.showNotification('Descanso terminado', {
      body: data.exerciseName ? `A por la siguiente serie · ${data.exerciseName}` : 'A por la siguiente serie',
      tag: 'ironlog-rest',
      icon: '/icon-192.png',
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 150, 400, 150, 400],
      data: { url: '/', endedAt: endsAt },
    });
  }));
});
