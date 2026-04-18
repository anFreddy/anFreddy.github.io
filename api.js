const API_URL = "https://seadapi.onrender.com/api/api";

// fetch base reutilizable
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
            const text = await res.text(); // leer UNA sola vez

            let mensaje;

            try {
                const data = JSON.parse(text); // convertir manual
                mensaje = data.mensaje || JSON.stringify(data);
            } catch {
                mensaje = text;
            }

            throw new Error(mensaje || "Error en el servidor");
        }

        const contentType = res.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            return await res.json(); // OK si no lo leíste antes
        } else {
            return await res.text();
        }

    } catch (error) {
        if (errorDiv) {
            errorDiv.innerText = "El servidor no está disponible. Intente más tarde.";
            errorDiv.classList.remove("d-none");
        }

        console.error(error);
        throw error;

    } finally {
        if (loader) loader.classList.add("d-none");
    }
}
