// src/utils/notifications.js
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, app } from '../firebase';

// REPLACE THIS with the VAPID key generated in Step 1.1
const VAPID_KEY = 'BPU9fESDL4EIcWTGOE0jfC8pLlqWnYEFwbQed-ZHN6DiCsEbQgxf486jpCTXEktxNlRj0V56fyCAyatssJjHhg0';

// REPLACE THIS with your deployed Vercel domain (from Step 4)
const VERCEL_API_URL = 'https://YOUR-VERCEL-PROJECT-NAME.vercel.app/api/send-push';

export async function requestNotificationPermission(currentUser) {
  try {
    const supported = await isSupported();
    if (!supported || !('Notification' in window)) {
      console.warn('FCM notifications are not supported on this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted.');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_KEY,
    });

    if (token && currentUser?.id) {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        lastActive: new Date().toISOString(),
      });
      return token;
    }
  } catch (error) {
    console.error('Failed to register FCM device token:', error);
  }
  return null;
}

export async function listenToForegroundMessages(onMessageReceived) {
  const supported = await isSupported();
  if (!supported) return;

  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    if (onMessageReceived) onMessageReceived(payload);
  });
}

// Function to call your Vercel push endpoint
export async function triggerPushNotification({ recipientId, title, message, groupId }) {
  try {
    await fetch(VERCEL_API_URL, {
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
  } catch (err) {
    console.warn('Silent push delivery failure:', err);
  }
}