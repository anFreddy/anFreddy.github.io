// Obtener token
const token = localStorage.getItem("token");

if (token == null){
    alert("Por favor, inicia sesión.");
    window.location.href = "../../index.html";
}

// Iniciar
cargarRoles();

let modal;

window.onload = () => {
    modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    cargarUsuarios();
};

async function cargarUsuarios() {
    try {
        mostrarLoading();
        const data = await apiFetch("usuarios/listaUsuarios");
        
        const tabla = $('#tabla');

        // 1. Si existe DataTable → destruirlo
        if ($.fn.DataTable.isDataTable('#tabla')) {
            tabla.DataTable().clear().destroy();
        }

        // 2. Limpiar tbody
        const tbody = document.getElementById("tablaUsuarios");
        tbody.innerHTML = "";

        let html = "";
        data.forEach(a => {
            html += `
        <tr>
            <td>${a.nombre}</td>
            <td>${a.email}</td>
            <td>${a.rol}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick='editar(${JSON.stringify(a)})'>Editar</button>
                <button class="btn btn-danger btn-sm" onclick='eliminar(${a.id})'>Eliminar</button>
            </td>
        </tr>`;
        });

        document.getElementById("tablaUsuarios").innerHTML = html;

        // 3. Insertar datos nuevos
        tbody.innerHTML = html;
       
        activarDataTable();

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
            return;
        }
    } finally{
        ocultarLoading();
    }
}

function activarDataTable() {
    if ($.fn.DataTable.isDataTable('#tabla')) {
        $('#tabla').DataTable().destroy();
    }

    $('#tabla').DataTable({
        destroy: true,
        pageLength: 10,
        ordering: false,
        lengthMenu: [10, 25, 50, 100],
        language: {
            lengthMenu: "Mostrar _MENU_ registros",
            zeroRecords: "No se encontraron datos",
            info: "Mostrando _START_ a _END_ de _TOTAL_",
            infoEmpty: "Sin registros",
            search: "Buscar:",
            paginate: {
                next: "Siguiente",
                previous: "Anterior"
            }
        }
    });
}

// Cargar Roles
async function cargarRoles() {

    try {
        const roles = await apiFetch("usuarios/listaRoles")

        const selectFiltro = document.getElementById("rol");
        roles.forEach(rol => {
            const option = document.createElement("option");
            option.value = rol.id;
            option.textContent = rol.nombre;
            selectFiltro.appendChild(option);
        });
    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
            return;
        }
    }
}

function abrirModal() {
    document.getElementById("nombre").value = "";
    document.getElementById("email").value = "";
    document.getElementById("rol").value = "";

    limpiarValidaciones();
    manejarCambioRol();

    modal.show();
}

function editar(a) {
    document.getElementById("id").value = a.id;
    document.getElementById("nombre").value = a.nombre;
    document.getElementById("email").value = a.email;
    document.getElementById("rol").value = a.rolId;

    limpiarValidaciones();
    manejarCambioRol();

    modal.show();
}

function validarFormulario() {
    let valido = true;

    const campos = ["nombre", "email", "rol"];

    campos.forEach(id => {
        const input = document.getElementById(id);

        if (!input.value.trim()) {
            input.classList.add("is-invalid");
            valido = false;
        } else {
            input.classList.remove("is-invalid");
        }
    });

    return valido;
}

function limpiarValidaciones() {
    const campos = ["nombre", "email", "rol"];

    campos.forEach(id => {
        const input = document.getElementById(id);
        input.classList.remove("is-invalid");
    });
}

// Detectar rol Docente
document.getElementById("rol").addEventListener("change", function () {manejarCambioRol()});

function manejarCambioRol() {
    const select = document.getElementById("rol");
    const selectedOption = select.options[select.selectedIndex];
    const nombreRol = selectedOption.text.trim();
    const usuarioId = document.getElementById("id").value;

    const contenedor = document.getElementById("contenedorSecciones");

    if (nombreRol === "Docente") {
        contenedor.classList.remove("d-none");
        //cargarSecciones();
        cargarSeccionesRol(usuarioId);
        
    } else {
        contenedor.classList.add("d-none");
        limpiarSecciones();
    }
}

function limpiarSecciones() {
    document.getElementById("listaSecciones").innerHTML = "";
}

// Cargar secciones
function obtenerSeccionesSeleccionadas() {
    const checks = document.querySelectorAll("#listaSecciones input:checked");
    return Array.from(checks).map(c => parseInt(c.value));
}

async function cargarSeccionesRol(usuarioId = null) {
    const lista = document.getElementById("listaSecciones");
    lista.innerHTML = "";

    let secciones = [];

    if (usuarioId) {
        // modo edición
        secciones = await apiFetch(`usuarios/secciones-usuario/${usuarioId}`);
    } else {
        // modo nuevo
        secciones = await apiFetch("alumnos/secciones");
    }

    secciones.forEach(sec => {
        const checked = sec.asignada ? "checked" : "";

        lista.innerHTML += `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${sec.id}" id="sec_${sec.id}" ${checked}>
                <label class="form-check-label" for="sec_${sec.id}">
                    ${sec.nombre}
                </label>
            </div>
        `;
    });
}

async function crearUsuario() {
    try {
        if (!validarFormulario()) return;

        mostrarLoading();

        const usuario = {
            nombre: document.getElementById("nombre").value.trim(),
            email: document.getElementById("email").value.trim(),
            rolId: document.getElementById("rol").value.trim()
        };

        await apiFetch("usuarios/nuevo", {
            method: "POST",
            body: JSON.stringify(usuario)
        });

        modal.hide();
        cargarUsuarios();

    } catch (error) {
        console.log(error);
        alert("Error al guardar el usuario " + error.message);
        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
            return;
        }

    } finally {
        ocultarLoading();
    }
}

async function guardarUsuario() {
    try {
        if (!validarFormulario()) return;

        mostrarLoading();

        const usuario = {
            id: parseInt(document.getElementById("id").value) || 0,
            nombre: document.getElementById("nombre").value.trim(),
            email: document.getElementById("email").value.trim(),
            rol: document.getElementById("rol").value,
            rolId: document.getElementById("rol").value.trim(),

            seccionesIds: obtenerSeccionesSeleccionadas() // Obtener secciones para rol Docente
        };

        if (usuario.id) {
            await apiFetch("usuarios/editar", {
                method: "PUT",
                body: JSON.stringify(usuario)
            });
        } else {
            await apiFetch("usuarios/nuevo", {
                method: "POST",
                body: JSON.stringify(usuario)
            });
        }
        
        // Guardar las secciones permitidas
        await apiFetch("usuarios/asignar-secciones", {
            method: "POST",
            body: JSON.stringify({
                rolId: usuario.rolId,
                usuarioId: usuario.id,
                seccionesIds: usuario.seccionesIds
            })
        });
        
        modal.hide();
        cargarUsuarios();

    } catch (error) {
        alert("Error al guardar el usuario " + error);
        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
            return;
        }

    } finally {
        ocultarLoading();
    }
}

async function eliminar(id) {
    if (!confirm("¿Eliminar usuario?")) return;

    try {
        mostrarLoading();

        await apiFetch(`usuarios/eliminar/${id}`, {
            method: "DELETE"
        });

        cargarUsuarios();

    } catch (error) {
        alert("Error al eliminar " + error.message);
        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
            return;
        }

    } finally {
        ocultarLoading();
    }
}

function cerrarSesion() {
    if (!confirm("¿Cerrar sesión?")) return;

    localStorage.removeItem("token");
    window.location.href = "../../index.html";
}