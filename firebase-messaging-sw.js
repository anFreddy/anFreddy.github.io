importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyClLVAlo0B1Y8M6YVr2kA5kRQ0WdWZkTBc",
  authDomain: "seadnotificaciones.firebaseapp.com",
  projectId: "seadnotificaciones",
  storageBucket: "seadnotificaciones.firebasestorage.app",
  messagingSenderId: "815553875391",
  appId: "1:815553875391:web:58111f213c89011bd1e50a"
});

const messaging = firebase.messaging();

self.addEventListener('notificationclick', (event) => {

    event.notification.close();

    const url =
        event.notification.data?.FCM_MSG?.data?.url ||
        'https://seadpubliphoto.com/Encargado/encargado.html';

    event.waitUntil(
        clients.openWindow(url)
    );

});

messaging.onBackgroundMessage((payload) => {

    const titulo = payload.notification.title;

    const opciones = {
        body: payload.notification.body,
        icon: payload.notification.icon,
        badge: payload.notification.badge,
        data: payload
    };

    self.registration.showNotification(
        titulo,
        opciones
    );

});
