const API_URL = "http://localhost:5000/api";

async function apiFetch(endpoint, options = {}) {
    const loader = document.getElementById("loader");
    const errorDiv = document.getElementById("mensajeError");

    if (loader) loader.classList.remove("d-none");
    if (errorDiv) errorDiv.classList.add("d-none");

    try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_URL}/${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers
            }
        });

        if (!res.ok) {
            const text = await res.text();

            let mensaje;

            try {
                const data = JSON.parse(text);
                mensaje = data.mensaje || data.message || text;
            } catch {
                mensaje = text;
            }

            // 🔥 AQUÍ EL CAMBIO IMPORTANTE
            const err = new Error(mensaje || "Error en el servidor");
            err.status = res.status;

            throw err;
        }

        const contentType = res.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            return await res.json();
        } else {
            return await res.text();
        }

    } catch (error) {
        if (errorDiv && !error.status) {
            errorDiv.innerText = "El servidor no está disponible. Intente más tarde.";
            errorDiv.classList.remove("d-none");
        }

        console.error(error);
        throw error;

    } finally {
        if (loader) loader.classList.add("d-none");
    }
}