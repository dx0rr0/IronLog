const TAG = 'ironlog-rest';
let notificationVersion = 0;

const registration = async () => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return null;
  return navigator.serviceWorker.ready;
};

const closeExisting = async serviceWorker => {
  if (!serviceWorker?.getNotifications) return;
  const notifications = await serviceWorker.getNotifications({ tag: TAG });
  notifications.forEach(notification => notification.close());
};

export const closeRestNotification = async () => {
  notificationVersion += 1;
  try { await closeExisting(await registration()); } catch {}
};

export const showRestNotification = async (timer, requestPermission = false) => {
  const version = ++notificationVersion;
  try {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'default' && requestPermission) {
      await Notification.requestPermission();
    }
    if (Notification.permission !== 'granted') return false;
    const serviceWorker = await registration();
    if (!serviceWorker || version !== notificationVersion) return false;
    await closeExisting(serviceWorker);
    if (version !== notificationVersion) return false;
    const endTime = new Date(timer.endsAt).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    await serviceWorker.showNotification('Descanso en curso', {
      body: `Termina a las ${endTime}${timer.exerciseName ? ` · ${timer.exerciseName}` : ''}`,
      tag: TAG,
      icon: '/icon-192.png',
      requireInteraction: true,
      silent: true,
    });
    return true;
  } catch {
    return false;
  }
};
