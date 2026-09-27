import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

const VAPID_KEY = "BPU9fESDL4EIcWTGOE0jfC8pLlqWnYEFwbQed-ZHN6DiCsEbQgxf486jpCTXEktxNlRj0V56fyCAyatssJjHhg0";

export async function requestNotificationPermission(currentUser) {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Notifications not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied.');
      return null;
    }

    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token && currentUser?.id && db) {
      // Save device token to user doc in Firestore
      await updateDoc(doc(db, 'users', currentUser.id), {
        fcmTokens: arrayUnion(token)
      });
      return token;
    }
  } catch (err) {
    console.error('Error getting notification token:', err);
  }
  return null;
}