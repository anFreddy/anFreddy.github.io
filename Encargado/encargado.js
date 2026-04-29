// Obtener token
const token = localStorage.getItem("token");

if (token == null){
    alert("Por favor, inicia sesión.");
    window.location.href = "../index.html";
}

// Decodificar usuario
const payload = JSON.parse(atob(token.split('.')[1]));

// Mostrar datos
document.getElementById("nombreInstitucion").innerText = payload.institutionName;
document.getElementById("nombreUsuario").innerText = "Bienvenid@ " + payload.name;
document.getElementById("rolUsuario").innerText = payload.role;

if (payload.institutionLogo != "") {
    document.getElementById("logoInstitucion").src = payload.institutionLogo;
}

// Cargar alumnos
async function cargarAlumnos() {
    try {
        mostrarLoading();
        const data = await apiFetch("encargado/mis-alumnos");
        const tabla = document.getElementById("tablaAlumnos");

        tabla.innerHTML = "";

        data.forEach(a => {
            tabla.innerHTML += `
                <tr>
                    <td>${a.nieID}</td>
                    <td>${a.nombre}</td>
                    <td>${a.apellido}</td>
                    <td>${a.seccion}</td>
                    <td>
                        <div class="d-flex flex-column flex-md-row gap-2">
                            <button class="btn btn-success btn-sm"
                                onclick='irAsistencia(${JSON.stringify(a)})'>
                                Ver
                            </button>

                            <button class="btn btn-danger btn-sm"
                                onclick='eliminarNIE(${JSON.stringify(a)})'>
                                Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../index.html";
            return;
        }

    } finally {
        ocultarLoading();
    }
}

// Agregar NIE
async function agregarNie() {
    const nie = document.getElementById("inputNie").value;

    if (!nie) {
        alert("Por favor ingrese un NIE");
        return;
    }

    if (nie.length > 9) {
        alert("El NIE no puede tener más de 9 caracteres");
        return;
    }

    try {
        mostrarLoading();

        await apiFetch("encargado/agregar-nie", {
            method: "POST",
            body: JSON.stringify({ nieID: nie })
        });

        cargarAlumnos();
        document.getElementById("inputNie").value = "";

        alert("NIE agregado");

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../index.html";
            return;
        }

    } finally {
        ocultarLoading();
    }
}

// Navegación
function volver() {
    window.location.href = "../index.html";
}

function irAsistencia(alumno) {
    if (!alumno) {
        alert("Seleccione un alumno primero");
        return;
    }

    // Guardar en localStorage
    localStorage.setItem("alumnoSeleccionado", JSON.stringify(alumno));

    window.location.href = "verAsistencia.html";
}

async function eliminarNIE(alumno) {
    if (!alumno) {
        alert("Seleccione un alumno primero");
        return;
    }

    const confirmacion = confirm(`¿Eliminar NIE de ${alumno.nombre}?`);

    if (!confirmacion) return;

    try {
        mostrarLoading();
        await apiFetch("encargado/eliminar-nie", {
            method: "POST",
            body: JSON.stringify({
                id: alumno.id,
                nieID: alumno.nieID
            })
        });

        // Volver a cargar datos
        location.reload();

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../index.html";
            return;
        }
    } finally {
        ocultarLoading();
    }
}

// Logout
function logout() {
    localStorage.removeItem("token");
    window.location.href = "../index.html";
}

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
    cargarAlumnos();
});
