/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

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
  const notificationTitle = payload.notification?.title || 'RoomSplit';
  const notificationOptions = {
    body: payload.notification?.body || 'New room activity!',
    icon: '/roomsplit-icon.webp',
    badge: '/roomsplit-icon.webp',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});