export async function cargarToast() {

    const response =
        await fetch('/Componentes/toast.html');

    const html = await response.text();

    document.body.insertAdjacentHTML(
        'beforeend',
        html
    );
}

export function mostrarToast(titulo, mensaje) {

    document.getElementById("toastTitulo")
        .textContent = titulo;

    document.getElementById("toastMensaje")
        .textContent = mensaje;

    const toast = new bootstrap.Toast(
        document.getElementById("toastNotificacion")
    );

    toast.show();
}