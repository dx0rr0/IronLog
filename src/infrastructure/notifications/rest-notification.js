const TAG = 'ironlog-rest';
let notificationVersion = 0;
let notificationQueue = Promise.resolve();

const registration = async () => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return null;
  let timeout;
  try {
    // ready never rejects and can remain pending forever after a failed install.
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise(resolve => { timeout = setTimeout(() => resolve(null), 4000); }),
    ]);
  } finally { clearTimeout(timeout); }
};

const enqueue = operation => {
  const pending = notificationQueue.then(operation);
  notificationQueue = pending.catch(() => {});
  return pending;
};

const closeExisting = async serviceWorker => {
  if (!serviceWorker?.getNotifications) return;
  const notifications = await serviceWorker.getNotifications({ tag: TAG });
  notifications.forEach(notification => notification.close());
};

export const closeRestNotification = async () => {
  const version = ++notificationVersion;
  try {
    const worker = await registration();
    await enqueue(() => version === notificationVersion ? closeExisting(worker) : undefined);
  } catch {}
};

// Permission and successful delivery are separate states.
export const showRestNotification = async (timer, requestPermission = false, announce = requestPermission) => {
  const version = ++notificationVersion;
  try {
    if (typeof Notification === 'undefined') return { status: 'unsupported' };
    if (Notification.permission === 'default' && requestPermission) {
      await Notification.requestPermission();
    }
    if (version !== notificationVersion) return { status: 'cancelled' };
    if (Notification.permission !== 'granted') return {
      status: Notification.permission === 'denied' ? 'denied' : 'permission',
    };
    const worker = await registration();
    if (version !== notificationVersion) return { status: 'cancelled' };
    if (!worker?.showNotification) return { status: 'unavailable' };
    return await enqueue(async () => {
      if (version !== notificationVersion) return { status: 'cancelled' };
      if (!timer || timer.endsAt <= Date.now()) return { status: 'expired' };
      const endTime = new Date(timer.endsAt).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      // Replace by tag without closing first. Only new rests alert; adjustments
      // and restoring an existing rest update quietly without buzzing again.
      await worker.showNotification('Descanso en curso', {
        body: `Termina a las ${endTime}${timer.exerciseName ? ` · ${timer.exerciseName}` : ''}`,
        tag: TAG,
        icon: '/icon-192.png',
        requireInteraction: true,
        ...(announce ? { renotify: true } : { silent: true }),
        data: { url: '/', endsAt: timer.endsAt },
      });
      return { status: version === notificationVersion ? 'shown' : 'cancelled' };
    });
  } catch (error) {
    console.warn('No se pudo mostrar el aviso de descanso', error);
    return { status: version === notificationVersion ? 'failed' : 'cancelled' };
  }
};
