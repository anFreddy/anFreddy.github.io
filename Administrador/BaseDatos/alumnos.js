// Obtener token
const token = localStorage.getItem("token");

if (token == null){
    alert("Por favor, inicia sesión.");
    window.location.href = "../../index.html";
}

// Para abrir y ocultar el modal
let modal;

window.onload = () => {
    modal = new bootstrap.Modal(document.getElementById('modalAlumno'));
    cargarSecciones();
    cargarAlumnos();
};

async function cargarAlumnos() {
    try {
        mostrarLoading();
        const data = await apiFetch("alumnos/lista");

        const tabla = $('#tabla');

        if ($.fn.DataTable.isDataTable('#tabla')) {
            tabla.DataTable().clear().destroy();
        }

        const tbody = document.getElementById("tablaAlumnos");

        if (!tbody) {
            console.error("No existe #tablaAlumnos");
            return;
        }

        let html = "";
        data.forEach(a => {
            html += `
            <tr>
                <td>${a.nieId}</td>
                <td>${a.apellido}</td>
                <td>${a.nombre}</td>
                <td>${a.seccion}</td>
                <td>${a.correo}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick='editar(${JSON.stringify(a)})'>Editar</button>
                    <button class="btn btn-danger btn-sm" onclick='eliminar(${a.id})'>Eliminar</button>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html;

        activarDataTable();

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
        }

    } finally {
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
    activarFiltroSeccion();
}

function activarFiltroSeccion() {
    const tabla = $('#tabla').DataTable();

    $('#filtroSeccion').off('change').on('change', function () {
        tabla.column(3).search(this.value).draw();
    });
}

// Cargar secciones
async function cargarSecciones() {
    try {
        const secciones = await apiFetch("alumnos/secciones");

        llenarSelect("seccion", secciones);
        llenarSelect("filtroSeccion", secciones);
        llenarSelect("seccionModal", secciones);

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
        }
    } 
}

function llenarSelect(id, data) {
    const select = document.getElementById(id);

    if (!select) {
        console.warn(`No existe #${id}`);
        return;
    }

    // limpiar antes de llenar
    select.innerHTML = '<option value="">Seleccione</option>';

    data.forEach(sec => {
        const option = document.createElement("option");
        option.value = sec.nombre;
        option.textContent = sec.nombre;
        select.appendChild(option);
    });
}

function abrirModal() {
    document.getElementById("id").value = "";
    document.getElementById("nie").value = "";
    document.getElementById("nombre").value = "";
    document.getElementById("apellido").value = "";
    document.getElementById("seccion").value = "";
    document.getElementById("correo").value = "";

    limpiarValidaciones();
    modal.show();
}

function editar(a) {
    document.getElementById("id").value = a.id;
    document.getElementById("nie").value = a.nieId;
    document.getElementById("nombre").value = a.nombre;
    document.getElementById("apellido").value = a.apellido;
    document.getElementById("seccion").value = a.seccion;
    document.getElementById("correo").value = a.correo;

    limpiarValidaciones();
    modal.show();
}

function validarFormulario() {
    let valido = true;

    const campos = ["nie", "nombre", "apellido", "seccion"];

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

function limpiarValidaciones(){
    const campos = ["nie", "nombre", "apellido", "seccion"];

    campos.forEach(id => {
        const input = document.getElementById(id);
        input.classList.remove("is-invalid");
    });
}

async function guardarAlumno() {
    try {
        if (!validarFormulario()) return;

        mostrarLoading();

        const alumno = {
            id: parseInt(document.getElementById("id").value) || 0,
            nieId: parseInt(document.getElementById("nie").value) || 0,
            apellido: document.getElementById("apellido").value.trim(),
            nombre: document.getElementById("nombre").value.trim(),
            seccion: document.getElementById("seccion").value.trim(),
            correo: document.getElementById("correo").value.trim()
        };

        console.log(alumno);

        if (alumno.id) {
            await apiFetch("alumnos/editar", {
                method: "PUT",
                body: JSON.stringify(alumno)
            });
        } else {
            await apiFetch("alumnos/nuevo", {
                method: "POST",
                body: JSON.stringify(alumno)
            });
        }

        modal.hide();
        cargarAlumnos();

    } catch (error) {
        alert("Error al guardar el alumno " + error.message);
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
    if (!confirm("¿Eliminar alumno?")) return;

    try {
        mostrarLoading();

        await apiFetch(`alumnos/eliminar/${id}`, {
            method: "DELETE"
        });

        cargarAlumnos();

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

// Exportación
function exportarExcel() {

    if(!confirm("¿Exportar a Excel?")) return;

    const tabla = document.getElementById("tabla");

    // Clonar la tabla
    const tablaClon = tabla.cloneNode(true);

    // ELIMINAR ÚLTIMA COLUMNA (ACCIONES)
    
    // 1. Quitar encabezado
    const encabezado = tablaClon.querySelector("thead tr");
    if (encabezado) {
        encabezado.removeChild(encabezado.lastElementChild);
    }

    // 2. Quitar columna en cada fila
    const filas = tablaClon.querySelectorAll("tbody tr");

    if (filas === 0){
        alert("¡No hay datos para exportar!");
        return;
    }

    filas.forEach(fila => {
        fila.removeChild(fila.lastElementChild);
    });

    // Exportar
    const wb = XLSX.utils.table_to_book(tablaClon, { sheet: "Registros" });

    XLSX.writeFile(wb, "SEAD_Base_de_datos.xlsx");
}

async function exportarPDF() {

    if(!confirm("¿Exportar a PDF?")) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Base de datos", 14, 15);

    // Clonar tabla completa
    const tabla = document.getElementById("tabla");
    const tablaClon = tabla.cloneNode(true);

    // eliminar columna "Acciones"

    // encabezado
    const encabezado = tablaClon.querySelector("thead tr");
    encabezado.removeChild(encabezado.lastElementChild);

    // filas
    const filas = tablaClon.querySelectorAll("tbody tr");

    if (filas.length === 0){
        alert("¡No hay datos para exportar!");
        return;
    }

    filas.forEach(fila => {
        fila.removeChild(fila.lastElementChild);
    });

    // Crear tabla limpia en el DOM (temporal)
    const contenedor = document.createElement("div");
    contenedor.appendChild(tablaClon);
    document.body.appendChild(contenedor);

    // generar PDF
    doc.autoTable({
        html: tablaClon,
        startY: 20,
        styles: { fontSize: 8 }
    });

    // limpiar
    document.body.removeChild(contenedor);

    doc.save("SEAD_Base_de_datos.pdf");
}

function cerrarSesion() {
    if (!confirm("¿Cerrar sesión?")) return;

    localStorage.removeItem("token");
    window.location.href = "../../index.html";
}