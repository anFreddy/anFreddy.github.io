// Obtener token
const token = localStorage.getItem("token");

if (token == null){
    alert("Por favor, inicia sesión.");
    window.location.href = "../../index.html";
}

let modal;

window.onload = () => {
    modal = new bootstrap.Modal(document.getElementById('modalSecciones'));
    cargarSecciones();
};

async function cargarSecciones() {
    try {
        mostrarLoading();
        const data = await apiFetch("alumnos/secciones");
        
        let html = "";
        data.forEach(a => {
            html += `
        <tr>
            <td>${a.nombre}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick='editar(${JSON.stringify(a)})'>Editar</button>
                <button class="btn btn-danger btn-sm" onclick='eliminar(${a.id})'>Eliminar</button>
            </td>
        </tr>`;
        });

        document.getElementById("tablaSecciones").innerHTML = html;
       
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

function abrirModal() {
    document.getElementById("id").value = "";
    document.getElementById("modalTitulo").innerText = "Agregar";
    document.getElementById("seccionActual").innerText = "Sección";
    document.getElementById("seccion").value = "";
    
    limpiarValidaciones();
    modal.show();
}

function editar(a) {
    document.getElementById("id").value = a.id;
    document.getElementById("modalTitulo").innerText = "Editar";
    document.getElementById("seccionActual").innerText = `Editar (${a.nombre})`;
    document.getElementById("seccion").value = a.nombre;

    limpiarValidaciones();
    modal.show();
}

function validarFormulario() {
    let valido = true;

    const campos = ["seccion"];

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
    const campos = ["seccion"];

    campos.forEach(id => {
        const input = document.getElementById(id);
        input.classList.remove("is-invalid");
    });
}

async function guardarCambio() {
    try {
        if (!validarFormulario()) return;

        mostrarLoading();

        const seccion = {
            id: parseInt(document.getElementById("id").value) || 0,
            nombre: document.getElementById("seccion").value.trim()
        };

        if (seccion.id > 0) {
            await apiFetch("secciones/editar", {
                method: "PUT",
                body: JSON.stringify(seccion)
            });
        } else {
            await apiFetch("secciones/nueva", {
                method: "POST",
                body: JSON.stringify(seccion.nombre)
            });
        }
                
        modal.hide();
        cargarSecciones();

    } catch (error) {
        alert("Error al guardar el sección " + error);
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
    if (!confirm("¿Eliminar sección?")) return;

    try {
        mostrarLoading();

        await apiFetch(`secciones/eliminar`, {
            method: "DELETE",
            body: JSON.stringify(id)
        });

        cargarSecciones();

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

    if (!confirm("¿Exportar a Excel?")) return;
    
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

        if (filas.length === 0) {
        alert("¡No hay datos para exportar!");
        return;
    }

    filas.forEach(fila => {
        fila.removeChild(fila.lastElementChild);
    });

    // Exportar
    const wb = XLSX.utils.table_to_book(tablaClon, { sheet: "Secciones" });

    XLSX.writeFile(wb, "SEAD_Secciones.xlsx");
}

async function exportarPDF() {

    if (!confirm("¿Exportar a PDF?")) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Secciones registradas", 14, 15);

    // Clonar tabla completa
    const tabla = document.getElementById("tabla");
    const tablaClon = tabla.cloneNode(true);

    // eliminar columna "Acciones"

    // encabezado
    const encabezado = tablaClon.querySelector("thead tr");
    encabezado.removeChild(encabezado.lastElementChild);

    // filas
    const filas = tablaClon.querySelectorAll("tbody tr");
    filas.forEach(fila => {
        fila.removeChild(fila.lastElementChild);
    });

    if (filas.length === 0) {
        alert("¡No hay datos para exportar!");
        return;
    }

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

    doc.save("SEAD_Secciones.pdf");
}

function cerrarSesion() {
    if (!confirm("¿Cerrar sesión?")) return;

    localStorage.removeItem("token");
    window.location.href = "../../index.html";
}