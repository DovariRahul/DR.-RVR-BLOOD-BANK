importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBCGhj_sEkqwGVBf2unuNiY8MrgyzCqHNc",
  authDomain: "blood-donor-platform-65dd5.firebaseapp.com",
  projectId: "blood-donor-platform-65dd5",
  storageBucket: "blood-donor-platform-65dd5.firebasestorage.app",
  messagingSenderId: "915403354646",
  appId: "1:915403354646:web:f1225242a10d4a71987b37"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body
    }
  );
});