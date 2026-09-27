/* eslint-disable no-undef */
const firebaseAppOrigin = self.location.origin;
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.link || '/', firebaseAppOrigin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    const appWindow = clients.find((client) => client.url.startsWith(firebaseAppOrigin));
    if (appWindow) {
      await appWindow.navigate(target);
      return appWindow.focus();
    }
    return self.clients.openWindow(target);
  }));
});

importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCOJBE94_PA5RYG4pZ83zYpKszPndDx5a4",
  authDomain: "roomsplit-86601.firebaseapp.com",
  projectId: "roomsplit-86601",
  storageBucket: "roomsplit-86601.firebasestorage.app",
  messagingSenderId: "6706257446",
  appId: "1:6706257446:web:7d7f65518aea493cc310e7"
});

const messaging = firebase.messaging();

// Handle background notification display
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'RoomSplit';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New room activity!',
    icon: '/roomsplit-icon-192.png',
    badge: '/roomsplit-icon-192.png',
    data: { ...payload.data, link: payload.data?.link || '/' }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});