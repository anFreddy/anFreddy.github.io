// loading.js

function crearLoading() {
    if (document.getElementById("loadingGlobal")) return;

    const div = document.createElement("div");
    div.id = "loadingGlobal";
    div.className = "d-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex justify-content-center align-items-center";
    div.style.zIndex = "9999";

    div.innerHTML = `
        <div class="text-center text-white">
            <div class="spinner-border"></div>
            <p class="mt-2">Cargando...</p>
        </div>
    `;

    document.body.appendChild(div);
}

function mostrarLoading() {
    crearLoading();
    document.getElementById("loadingGlobal").classList.remove("d-none");
}

function ocultarLoading() {
    const el = document.getElementById("loadingGlobal");
    if (el) el.classList.add("d-none");
}