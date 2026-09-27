import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const VAPID_KEY = "BPU9fESDL4EIcWTGOE0jfC8pLlqWnYEFwbQed-ZHN6DiCsEbQgxf486jpCTXEktxNlRj0V56fyCAyatssJjHhg0";

async function storeDeviceToken(currentUser) {
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token || !currentUser?.id || !db) return false;

  await setDoc(doc(db, 'users', currentUser.id), {
    fcmTokens: arrayUnion(token),
  }, { merge: true });
  return true;
}

export async function enablePushNotifications(currentUser) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) return 'unsupported';

    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission !== 'granted') return 'denied';

    return await storeDeviceToken(currentUser) ? 'enabled' : 'failed';
  } catch (err) {
    console.error('Could not enable push notifications:', err);
    return 'failed';
  }
}

export async function refreshPushToken(currentUser) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)
      || Notification.permission !== 'granted' || !(await isSupported())) return false;
    return await storeDeviceToken(currentUser);
  } catch (err) {
    console.error('Could not refresh push token:', err);
    return false;
  }
}

export async function listenForForegroundNotifications() {
  try {
    if (!(await isSupported())) return () => {};
    return onMessage(getMessaging(), async (payload) => {
      if (!payload.notification || !('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(payload.notification.title || 'RoomSplit', {
        body: payload.notification.body || 'A group expense was added.',
        icon: '/roomsplit-icon-192.png',
        badge: '/roomsplit-icon-192.png',
        data: { link: payload.fcmOptions?.link || '/' },
      });
    });
  } catch (err) {
    console.error('Could not start foreground notifications:', err);
    return () => {};
  }
}