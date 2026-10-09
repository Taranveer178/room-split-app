import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, app } from '../firebase';

const VAPID_KEY = 'BPU9fESDL4EIcWTGOE0jfC8pLlqWnYEFwbQed-ZHN6DiCsEbQgxf486jpCTXEktxNlRj0V56fyCAyatssJjHhg0';
const VERCEL_API_URL = 'https://room-split-app.vercel.app/api/send-push';
let nativePushListenersRegistered = false;
let nativePushUserId = null;

async function savePushToken(token, userId) {
  if (!token || !userId) return;
  if (!db) throw new Error('Firebase is unavailable; the push token could not be saved.');

  await updateDoc(doc(db, 'users', userId), {
    fcmTokens: arrayUnion(token),
    lastActive: new Date().toISOString(),
  });
}

export async function requestNotificationPermission(currentUser) {
  try {
    if (Capacitor.isNativePlatform()) {
      nativePushUserId = currentUser?.id || null;
      if (!nativePushUserId) return { success: false, error: 'No user ID logged in' };

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') {
        console.warn('Push notification permission not granted.');
        return { success: false, error: 'Notification permission denied' };
      }

      await PushNotifications.createChannel({
        id: 'default',
        name: 'General Notifications',
        description: 'RoomSplit group activities and updates',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      }).catch((err) => console.warn('Failed to create default notification channel:', err));

      return new Promise((resolve) => {
        let settled = false;

        PushNotifications.removeAllListeners().then(() => {
          PushNotifications.addListener('registration', async ({ value }) => {
            console.log('Native FCM Token generated:', value);
            try {
              await savePushToken(value, nativePushUserId);
              if (!settled) {
                settled = true;
                resolve({ success: true, token: value });
              }
            } catch (err) {
              if (!settled) {
                settled = true;
                resolve({ success: false, token: value, error: err.message });
              }
            }
          });

          PushNotifications.addListener('registrationError', (error) => {
            console.error('Native FCM registration failed:', error);
            if (!settled) {
              settled = true;
              resolve({ success: false, error: JSON.stringify(error) });
            }
          });

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received:', notification);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Push notification action performed:', action);
          });

          PushNotifications.register();
        });

        setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve({ success: false, error: 'Token generation timed out (check Play Services or network)' });
          }
        }, 12000);
      });
    }

    const supported = await isSupported();
    if (!supported || !('Notification' in window)) {
      console.warn('FCM notifications are not supported on this browser.');
      return { success: false, error: 'Notifications unsupported on browser' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted.');
      return { success: false, error: 'Permission not granted' };
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_KEY,
    });

    if (token && currentUser?.id) {
      await savePushToken(token, currentUser.id);
      return { success: true, token };
    }
    return { success: false, error: 'Failed to generate token' };
  } catch (error) {
    console.error('Failed to register FCM device token:', error);
    return { success: false, error: error.message };
  }
}

export async function listenToForegroundMessages(onMessageReceived) {
  const supported = await isSupported();
  if (!supported) return;

  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    if (onMessageReceived) onMessageReceived(payload);
  });
}

export async function triggerPushNotification({ recipientId, title, message, groupId }) {
  const response = await fetch(VERCEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipientId,
      title: title || 'RoomSplit',
      message: message || 'You have a new update in your group.',
      groupId: groupId || '',
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Push delivery failed (${response.status}): ${detail}`);
  }
}
