// LOGIN
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("regEmail");
    const emailValidar = emailInput.value.trim().toLowerCase();

    const error = validarEmail(emailValidar);

    if (error) {
        alert(error);
        return;
    }

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        mostrarLoading();
        const data = await apiFetch("auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
        
        // Guardar token
        localStorage.setItem("token", data.token);

        // Decodificar token
        const payload = JSON.parse(atob(data.token.split('.')[1]));

        let rol = payload.role;

        if (Array.isArray(rol)) {
            rol = rol.join(", ");
        }

        // Redirección
        if (rol === "Encargado") {
            window.location.href = "Encargado/encargado.html";
        } else if (rol == "Docente") {
            window.location.href = "Docentes/dashboard_d.html";
        } else {
            window.location.href = "Administrador/dashboard.html";
        }

    } catch (error) {
        alert(error.message);
    } finally{
        ocultarLoading();
    }
});


// REGISTER
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("regEmail");
    const emailValidar = emailInput.value.trim().toLowerCase();

    const error = validarEmail(emailValidar);

    if (error) {
        alert(error);
        return;
    }

    const nombre = document.getElementById("regNombre").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const institucionId = document.getElementById("regInstitucion").value;

    try {
        mostrarLoading();
        await apiFetch("usuarios", {
            method: "POST",
            body: JSON.stringify({
                nombre,
                email,
                password,
                institucionId
            })
        });
        ocultarLoading();

        alert("Usuario creado 🎉");

    } catch (error) {
        alert(error.message);
    } finally{
        ocultarLoading();
    }
});

//  VALIDAR CORREO
function validarEmail(email) {

    const parteLocal = email.split("@")[0];

    if (parteLocal.startsWith(".") || parteLocal.endsWith(".")) {
        return "Email: No puede iniciar o terminar con punto";
    }

    if (parteLocal.includes("..")) {
        return "Email: No puede tener puntos consecutivos";
    }

    return null; // válido
}

// CARGAR INSTITUCIÓN
async function cargarInstitucionPorCodigo() {
    try {
        mostrarLoading()

        const params = new URLSearchParams(window.location.search);
        const codigo = params.get("codigo");

        if (!codigo) {
            document.getElementById("registerForm").style.display = "none";
        }
        else {
            const data = await apiFetch(`instituciones/codigo/${codigo}`);
            ocultarLoading();

            // Mostrar Logo
            if (data.urlLogo) { document.getElementById("logoInstitucion").src = data.urlLogo; }

            // Mostrar nombre
            document.getElementById("institucionNombre").value = data.institucion;

            // Ocultar este campo
            document.getElementById("institucionNombre").parentElement.style.display = "none";

            // Guardar ID oculto
            document.getElementById("regInstitucion").value = data.id;

            // Cambiar título
            document.getElementById("tituloInstitucion").innerText = data.institucion;
        }

    } catch (error) {
        alert("Error al cargar institución: "+error.message);
        document.getElementById("registerForm").style.display = "none";
    } finally{
        ocultarLoading();
    }
}

// OLVIDO DE CONTRASEÑA
document.getElementById("forgotForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value;

    try {
        mostrarLoading();
        await apiFetch("auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email })
        });
        ocultarLoading();

        alert("Te enviamos un correo para recuperar tu contraseña 📧");

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('forgotModal'));
        modal.hide();

    } catch (error) {
        alert("Error al enviar recuperación");
    } finally{
        ocultarLoading();
    }
});

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => { cargarInstitucionPorCodigo(); });