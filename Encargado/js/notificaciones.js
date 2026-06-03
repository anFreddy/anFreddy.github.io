import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js";
import { cargarToast, mostrarToast} from './toast.js';

const firebaseConfig = {
  apiKey: "AIzaSyClLVAlo0B1Y8M6YVr2kA5kRQ0WdWZkTBc",
  authDomain: "seadnotificaciones.firebaseapp.com",
  projectId: "seadnotificaciones",
  storageBucket: "seadnotificaciones.firebasestorage.app",
  messagingSenderId: "815553875391",
  appId: "1:815553875391:web:58111f213c89011bd1e50a"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

await cargarToast();

onMessage(messaging, (payload) => {

    console.log(payload);

    mostrarToast(
        payload.data.title,
        payload.data.body
    );

});

window.activarNotificaciones = async () => {

    try {
        mostrarLoading();
        const permiso = await Notification.requestPermission();

        if (permiso !== "granted") {
            alert("Permiso denegado");
            return;
        }

        toggleNotificaciones();

    } catch (error) {
        console.error(error);
    }
};

async function toggleNotificaciones() {

    const token = await getToken(messaging, {
        vapidKey: "BNXcSGKM9JCQERew22NZ86Lh7guCT6CIuPCSxBRvN4N6Ot1cdfLZuME73h5rSFdq9zakZHwT0iIFl-oPLVAUVgs"
    });

    const estado = await apiFetch(
        "encargado/verificar-token",
        {
            method: "POST",
            body: JSON.stringify({
                tokenFCM: token
            })
        });

    if (estado.activo) {

        await apiFetch(
            "encargado/eliminar-token",
            {
                method: "DELETE",
                body: JSON.stringify({
                    tokenFCM: token
                })
            });

        marcarNotificacionesDesactivadas();

    } else {

        await apiFetch(
            "encargado/guardar-token",
            {
                method: "POST",
                body: JSON.stringify({
                    tokenFCM: token
                })
            });

        marcarNotificacionesActivas();
    }

    ocultarLoading();
}

function marcarNotificacionesActivas() {

    const btn = document.getElementById("btnNotificaciones");

    btn.classList.add("activo");

    btn.innerHTML = "🔔 Notificaciones activadas";
}

async function marcarNotificacionesDesactivadas() {

    const btn = document.getElementById("btnNotificaciones");

    btn.classList.remove("activo");

    btn.innerHTML = " ⚪ Activar notificaciones";

    await apiFetch("encargado/eliminar-token", {
        method: "DELETE",
        body: JSON.stringify({
            tokenFCM: token
        })
    });
}

async function cargarEstadoNotificaciones() {

    mostrarLoading();

    const permiso = Notification.permission;

    if (permiso !== "granted") {
        marcarNotificacionesDesactivadas();
        return;
    }

    const token = await getToken(messaging, {
        vapidKey: "BNXcSGKM9JCQERew22NZ86Lh7guCT6CIuPCSxBRvN4N6Ot1cdfLZuME73h5rSFdq9zakZHwT0iIFl-oPLVAUVgs"
    });

    const respuesta = await apiFetch(
        "encargado/verificar-token",
        {
            method: "POST",
            body: JSON.stringify({
                tokenFCM: token
            })
        });

    if (respuesta.activo) {
        marcarNotificacionesActivas();
    } else {
        marcarNotificacionesDesactivadas();
    }

    ocultarLoading();
}

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
    cargarEstadoNotificaciones();
});