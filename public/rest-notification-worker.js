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
