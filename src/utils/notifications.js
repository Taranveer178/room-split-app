import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, app } from '../firebase';

const VAPID_KEY = 'BPU9fESDL4EIcWTGOE0jfC8pLlqWnYEFwbQed-ZHN6DiCsEbQgxf486jpCTXEktxNlRj0V56fyCAyatssJjHhg0';
const VERCEL_API_URL = 'https://room-split-app.vercel.app/api/send-push';
const PUSH_TOKEN_STORAGE_KEY = 'rs_fcm_device_token';
let desiredUserId = null;
let currentPushToken = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
let boundToken = null;
let boundUserId = null;
let nativeTokenVerified = false;
let nativeListenersPromise = null;
let activationPromise = null;
let activationUserId = null;
let tokenMutationQueue = Promise.resolve();
let pushActionHandler = null;
const registrationWaiters = new Set();

function enqueueTokenMutation(operation) {
  const result = tokenMutationQueue.then(operation);
  tokenMutationQueue = result.catch((error) => {
    console.error('Push token ownership update failed:', error);
  });
  return result;
}

async function removeTokenFromAllUsers(token) {
  if (!db) throw new Error('Firebase is unavailable; the push token could not be removed.');

  return enqueueTokenMutation(async () => {
    const usersWithToken = await getDocs(query(
      collection(db, 'users'),
      where('fcmTokens', 'array-contains', token)
    ));
    const userDocs = usersWithToken.docs;

    for (let offset = 0; offset < userDocs.length; offset += 500) {
      const batch = writeBatch(db);
      userDocs.slice(offset, offset + 500).forEach((userDoc) => {
        batch.update(userDoc.ref, { fcmTokens: arrayRemove(token) });
      });
      await batch.commit();
    }

    if (boundToken === token) {
      boundToken = null;
      boundUserId = null;
    }
  });
}

async function bindTokenToUser(token, userId) {
  if (!token || !userId) return false;
  if (!db) throw new Error('Firebase is unavailable; the push token could not be saved.');

  return enqueueTokenMutation(async () => {
    if (desiredUserId !== userId) return false;

    const usersWithToken = await getDocs(query(
      collection(db, 'users'),
      where('fcmTokens', 'array-contains', token)
    ));
    if (desiredUserId !== userId) return false;

    const previousOwners = usersWithToken.docs.filter((userDoc) => userDoc.id !== userId);
    if (previousOwners.length + 1 > 500) {
      throw new Error('The device token is associated with too many accounts to update safely.');
    }

    const batch = writeBatch(db);
    previousOwners.forEach((userDoc) => {
      batch.update(userDoc.ref, { fcmTokens: arrayRemove(token) });
    });
    batch.set(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token),
      lastActive: new Date().toISOString(),
    }, { merge: true });
    await batch.commit();

    if (desiredUserId === userId) {
      boundToken = token;
      boundUserId = userId;
      return true;
    }
    return false;
  });
}

function settleRegistrationWaiters(result) {
  for (const waiter of registrationWaiters) {
    window.clearTimeout(waiter.timeout);
    waiter.resolve(
      waiter.userId === desiredUserId
        ? result
        : { success: false, error: 'The active account changed during push registration.' }
    );
  }
  registrationWaiters.clear();
}

function waitForNativeRegistration(userId) {
  return new Promise((resolve) => {
    const waiter = {
      userId,
      resolve,
      timeout: window.setTimeout(() => {
        registrationWaiters.delete(waiter);
        resolve({ success: false, error: 'Token generation timed out (check Play Services or network).' });
      }, 12000),
    };
    registrationWaiters.add(waiter);
  });
}

async function processNativeToken(token) {
  const previousToken = currentPushToken || localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  currentPushToken = token;
  localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  nativeTokenVerified = true;

  if (previousToken && previousToken !== token) {
    await removeTokenFromAllUsers(previousToken);
  }

  const ownerId = desiredUserId;
  if (!ownerId) {
    await removeTokenFromAllUsers(token);
    return;
  }

  if (boundToken !== token || boundUserId !== ownerId) {
    const bound = await bindTokenToUser(token, ownerId);
    if (!bound) return;
  }
  settleRegistrationWaiters({ success: true, token });
}

function ensureNativeListeners() {
  if (nativeListenersPromise) return nativeListenersPromise;

  nativeListenersPromise = (async () => {
    const handles = [];
    try {
      handles.push(await PushNotifications.addListener('registration', ({ value }) => {
          if (!value) {
            settleRegistrationWaiters({ success: false, error: 'Native push registration returned an empty token.' });
            return;
          }
          processNativeToken(value).catch((error) => {
          console.error('Could not associate the refreshed push token.', error);
          settleRegistrationWaiters({ success: false, error: error.message });
        });
      }));
      handles.push(await PushNotifications.addListener('registrationError', (error) => {
        console.error('Native push registration failed:', error);
        settleRegistrationWaiters({
          success: false,
          error: error.message || 'Native push registration failed.',
        });
      }));
      handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const notification = action.notification;
        if (
          desiredUserId
          && notification?.data?.recipientId === desiredUserId
          && typeof pushActionHandler === 'function'
        ) {
          pushActionHandler(notification);
        }
      }));
    } catch (error) {
      await Promise.all(handles.map((handle) => handle.remove()));
      nativeListenersPromise = null;
      throw error;
    }
  })();

  return nativeListenersPromise;
}

async function registerNativePush(userId) {
  await ensureNativeListeners();
  if (desiredUserId !== userId) {
    return { success: false, error: 'The active account changed during push registration.' };
  }

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== 'granted') {
    permission = await PushNotifications.requestPermissions();
  }
  const canDisplayNotifications = permission.receive === 'granted';
  if (desiredUserId !== userId) {
    return { success: false, error: 'The active account changed during push registration.' };
  }

  await PushNotifications.createChannel({
    id: 'default',
    name: 'General Notifications',
    description: 'RoomSplit group activities and updates',
    importance: 5,
    visibility: 1,
    sound: 'default',
    vibration: true,
  });

  if (currentPushToken && nativeTokenVerified) {
    const bound = await bindTokenToUser(currentPushToken, userId);
    if (!bound) return { success: false, error: 'The active account changed during push registration.' };
    return canDisplayNotifications
      ? { success: true, token: currentPushToken }
      : { success: false, error: 'Notification permission denied.' };
  }

  const registration = waitForNativeRegistration(userId);
  try {
    await PushNotifications.register();
  } catch (error) {
    settleRegistrationWaiters({ success: false, error: error.message || 'Native push registration failed.' });
  }
  const result = await registration;
  if (result.success) nativeTokenVerified = true;
  return result.success && !canDisplayNotifications
    ? { success: false, error: 'Notification permission denied.' }
    : result;
}

async function registerWebPush(userId) {
  const supported = await isSupported();
  if (!supported || !('Notification' in window)) {
    return { success: false, error: 'Notifications unsupported on browser.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Notification permission denied.' };
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), {
    serviceWorkerRegistration: registration,
    vapidKey: VAPID_KEY,
  });

  if (!token) return { success: false, error: 'Failed to generate a push token.' };
  if (desiredUserId !== userId) {
    currentPushToken = token;
    return { success: false, error: 'The active account changed during push registration.' };
  }
  const previousToken = currentPushToken || localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  currentPushToken = token;
  localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  if (previousToken && previousToken !== token) {
    await removeTokenFromAllUsers(previousToken);
  }
  const bound = await bindTokenToUser(token, userId);
  return bound
    ? { success: true, token }
    : { success: false, error: 'The active account changed during push registration.' };
}

export function requestNotificationPermission(currentUser) {
  const userId = currentUser?.id;
  if (!userId) return Promise.resolve({ success: false, error: 'No user ID logged in.' });

  desiredUserId = userId;
  if (activationPromise && activationUserId === userId) return activationPromise;

  activationUserId = userId;
  const activation = (Capacitor.isNativePlatform()
    ? registerNativePush(userId)
    : registerWebPush(userId)
  ).catch((error) => {
    console.error('Failed to register push notifications.', error);
    return { success: false, error: error.message || 'Push registration failed.' };
  });

  const trackedActivation = activation.finally(() => {
    if (activationPromise === trackedActivation) {
      activationPromise = null;
      activationUserId = null;
    }
  });
  activationPromise = trackedActivation;
  return trackedActivation;
}

export async function unregisterPushNotifications(userId) {
  if (userId && desiredUserId && userId !== desiredUserId) return;

  const pendingActivation = activationPromise;
  desiredUserId = null;
  activationPromise = null;
  activationUserId = null;
  settleRegistrationWaiters({
    success: false,
    error: 'Push registration cancelled because the account was signed out.',
  });

  await pendingActivation;
  await tokenMutationQueue;
  const token = currentPushToken || localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (token) {
    await removeTokenFromAllUsers(token);
  }
  boundToken = null;
  boundUserId = null;
  if (Capacitor.isNativePlatform()) {
    await PushNotifications.removeAllDeliveredNotifications();
  }
}

export function setPushNotificationActionHandler(handler) {
  pushActionHandler = handler;
  return () => {
    if (pushActionHandler === handler) pushActionHandler = null;
  };
}

export async function listenToForegroundMessages(onMessageReceived) {
  const supported = await isSupported();
  if (!supported) return undefined;

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
