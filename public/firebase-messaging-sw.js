// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  
  apiKey: 'AIzaSyCOJBE94_PA5RYG4pZ83zYpKszPndDx5a4',
  authDomain: 'roomsplit-86601.firebaseapp.com',
  projectId: 'roomsplit-86601',
  storageBucket: 'roomsplit-86601.firebasestorage.app',
  messagingSenderId: '6706257446',
  appId: '1:6706257446:web:7d7f65518aea493cc310e7',
});

const messaging = firebase.messaging();

// Handle notification display when the browser is backgrounded or tab closed
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'RoomSplit Alert';
  const options = {
    body: payload.notification?.body || payload.data?.message || 'New activity in your group.',
    icon: '/roomsplit-icon.webp',
    badge: '/roomsplit-icon.webp',
    data: {
      url: payload.data?.url || '/',
      recipientId: payload.data?.recipientId || '',
      groupId: payload.data?.groupId || ''
    }
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});