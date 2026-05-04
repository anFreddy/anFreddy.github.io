// Obtener token
const token = localStorage.getItem("token");

if (token == null) {
    alert("Por favor, inicia sesión.");
    window.location.href = "../../index.html";
}

// Cargar secciones
async function cargarSecciones() {
    try {
        const secciones = await apiFetch("alumnos/secciones");

        llenarSelect("seccion", secciones);

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../../index.html";
        }
    }
}

function establecerFechas() {
    // Fecha automática
    document.getElementById("fechaInicio").value = new Date().toISOString().split("T")[0];
    document.getElementById("fechaFin").value = new Date().toISOString().split("T")[0];
}

function llenarSelect(id, data) {
    const select = document.getElementById(id);

    if (!select) {
        console.warn(`No existe #${id}`);
        return;
    }

    // limpiar antes de llenar
    select.innerHTML = '';

    data.forEach(sec => {
        const option = document.createElement("option");
        option.value = sec.nombre;
        option.textContent = sec.nombre;
        select.appendChild(option);
    });
}

async function obtenerAsistencias() {
    try {
        mostrarLoading();

        const seccion = document.getElementById("seccion").value;

        if (seccion === '') {
            alert("Sección inválida")
            return;
        }

        const fechaDesde = document.getElementById("fechaInicio").value;
        const fechaHasta = document.getElementById("fechaFin").value;

        const data = await apiFetch(`alumnos/asistencia-periodo?seccion=${seccion}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`)

        renderTabla(data);

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

function renderTabla(data) {
    const tbody = document.getElementById("tablaReporte");
    const thead = document.getElementById("tablaReporteHead")

    if (!tbody || !thead) {
        console.error("No existe #tablaReporte o #tablaReporteHead");
        return;
    }

    const alumnosUnicos = Array.from(
        new Map(data
            .filter(a => a.nie) // primero asegurar que tenga NIE
            .map(a => [a.nie, a])
        ).values()
    );

    const fechasUnicas = [...new Set(data.map(a => a.fecha))]
        .sort((a, b) => new Date(a) - new Date(b));

    let html = "";
    // Agregar columnas
    html = `
    <tr>
       <th>NIE</th>
       <th>Apellido</th>
       <th>Nombre</th>
       <th>Sección</th>
    `;
    fechasUnicas.forEach(f => {
        html += `
            <th>${formatearFechaCorta(f)}</th>
        `
    });
    html += `
    <th>Total</th> 
    <th>Porcentaje</th>
    </tr>`;

    thead.innerHTML = html;

    let contador;
    html = "";
    alumnosUnicos.forEach(a => {
        contador = 0;
        html += `<tr>
        <td>${a.nie}</td>
        <td>${a.apellido}</td>
        <td>${a.nombre}</td>
        <td>${a.seccion}</td>
    `;

        fechasUnicas.forEach(f => {
            const registro = data.find(d =>
                d.nie === a.nie && d.fecha === f
            );
            if (registro)
                contador++;
            html += `<td>
            ${registro ? formatearHora(registro.hora) : "-"}
        </td>`;
        });

        const porcentaje = (contador * 100 / fechasUnicas.length).toFixed(2);

        html += `
        <td>${contador}</td>
        <td>${porcentaje}%</td> 
        </tr>`;
    });

    tbody.innerHTML = html;
}

function formatearFechaCorta(fecha) {
    return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
    });
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatearHora(hora) {
    if (!hora) return "";

    // Si viene con segundos
    if (hora.length >= 5) {
        return hora.substring(0, 5);
    }

    return hora;
}

// Exportación
function exportarExcel() {

    if (!confirm("¿Exportar a Excel?")) return;

    const filas = document.querySelectorAll("#tabla tbody tr");

    if (filas.length === 0) {
        alert("¡No hay datos para exportar!");
        return;
    }

    const tabla = document.getElementById("tabla");

    // 🔹 Obtener encabezados
    const headers = [];
    tabla.querySelectorAll("thead th").forEach(th => {
        headers.push(th.innerText.trim());
    });

    // 🔹 Obtener datos
    const data = [];
    tabla.querySelectorAll("tbody tr").forEach(tr => {
        const fila = {};
        tr.querySelectorAll("td").forEach((td, i) => {
            fila[headers[i]] = td.innerText.trim();
        });
        data.push(fila);
    });

    // 🔹 Crear hoja
    const ws = XLSX.utils.json_to_sheet(data);

    // 🔥 NEGRITAS EN ENCABEZADOS
    headers.forEach((_, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!ws[cellRef]) return;

        ws[cellRef].s = {
            font: { bold: true }
        };
    });

    // 📏 AUTO AJUSTE DE COLUMNAS
    const colWidths = headers.map((header, i) => {
        let maxLength = header.length;

        data.forEach(row => {
            const value = row[header] || "";
            maxLength = Math.max(maxLength, value.length);
        });

        return { wch: maxLength + 2 }; // +2 padding
    });

    ws["!cols"] = colWidths;

    // 🔹 Crear libro
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    // 📥 Exportar
    XLSX.writeFile(wb, "SEAD_Reporte.xlsx");
}

async function exportarPDF() {

    if (!confirm("¿Exportar a PDF?")) return;
    const filas = document.querySelectorAll("#tabla tbody tr");

    if (filas.length === 0) {
        alert("¡No hay datos para exportar!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Reporte", 14, 15);

    // Clonar tabla completa
    const tabla = document.getElementById("tabla");
    const tablaClon = tabla.cloneNode(true);

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

    doc.save("SEAD_Reporte.pdf");
}

function cerrarSesion() {
    if (!confirm("¿Cerrar sesión?")) return;

    localStorage.removeItem("token");
    window.location.href = "../../index.html";
}

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
    cargarSecciones();
    establecerFechas();
});