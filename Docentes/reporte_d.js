// Obtener token
const token = localStorage.getItem("token");

if (token == null) {
    alert("Por favor, inicia sesión.");
    window.location.href = "../index.html";
}

// Cargar secciones
async function cargarSecciones() {
    try {
        const secciones = await apiFetch("docentes/secciones-usuario")

        llenarSelect("seccion", secciones);

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../index.html";
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
        const lbSeccion = document.getElementById("lbSeccion");

        if (seccion === '') {
            alert("Sección inválida")
            return;
        }

        const fechaDesde = document.getElementById("fechaInicio").value;
        const fechaHasta = document.getElementById("fechaFin").value;

        const data = await apiFetch(`alumnos/asistencia-periodo?seccion=${seccion}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`)

        lbSeccion.innerText = seccion;

        renderTabla(data, seccion);

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../index.html";
        }

    } finally {
        ocultarLoading();
    }
}

async function renderTabla(data, seccion) {
    const tbody = document.getElementById("tablaReporte");
    const thead = document.getElementById("tablaReporteHead")

    if (!tbody || !thead) {
        console.error("No existe #tablaReporte o #tablaReporteHead");
        return;
    }

    const alumnosUnicos = await apiFetch(`alumnos/lista-seccion/${encodeURIComponent(seccion)}`);

    const fechasUnicas = [...new Set(data.map(a => a.fecha))]
        .sort((a, b) => new Date(a) - new Date(b));

    let html = "";
    // Agregar columnas
    html = `
    <tr>
       <th>NIE</th>
       <th>Apellido</th>
       <th>Nombre</th>
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
        <td>${a.nieId}</td>
        <td>${a.apellido}</td>
        <td>${a.nombre}</td>
    `;

        fechasUnicas.forEach(f => {
            const registro = data.find(d =>
                d.nie === a.nieId && d.fecha === f
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
    const [year, month, day] = fecha.split(/[-\/]/);
    return `${day}/${month}/${year}`;
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

    // 🔹 Crear hoja vacía
    const ws = XLSX.utils.aoa_to_sheet([]);

    // 🔹 Crear título
    const seccion = document.getElementById("seccion")?.value || "";
    const fechaDesde = document.getElementById("fechaInicio").value;
    const fechaHasta = document.getElementById("fechaFin").value;
    const titulo = `Reporte de la sección ${seccion} Desde ${formatearFecha(fechaDesde)} Hasta ${formatearFecha(fechaHasta)}`;

    // 🔹 Insertar título (fila 1)
    XLSX.utils.sheet_add_aoa(ws, [[titulo]], { origin: "A1" });

    // 🔹 Insertar encabezados (fila 2)
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A2" });

    // 🔹 Insertar datos (desde fila 3)
    XLSX.utils.sheet_add_json(ws, data, {
        origin: "A3",
        skipHeader: true
    });

    // 🔥 Combinar celdas del título
    ws["!merges"] = [{
        s: { r: 0, c: 0 },
        e: { r: 0, c: headers.length - 1 }
    }];

    // 🔥 Estilo del título
    const tituloCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    ws[tituloCell].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center" }
    };

    // 🔥 Negrita en encabezados (fila 2)
    headers.forEach((_, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 1, c: i });
        if (!ws[cellRef]) return;

        ws[cellRef].s = {
            font: { bold: true }
        };
    });

    // 📏 Auto ajuste de columnas
    const colWidths = headers.map((header) => {
        let maxLength = header.length;

        data.forEach(row => {
            const value = row[header] || "";
            maxLength = Math.max(maxLength, value.length);
        });

        return { wch: maxLength + 2 };
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

    const seccion = document.getElementById("seccion")?.value || "";
    const fechaDesde = document.getElementById("fechaInicio").value;
    const fechaHasta = document.getElementById("fechaFin").value;
    doc.text(`Reporte de la sección ${seccion}\nDesde ${formatearFecha(fechaDesde)} Hasta ${formatearFecha(fechaHasta)}`, 14, 15);

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
        startY: 25,
        styles: { fontSize: 8 }
    });

    // limpiar
    document.body.removeChild(contenedor);

    doc.save("SEAD_Reporte.pdf");
}

function cerrarSesion() {
    if (!confirm("¿Cerrar sesión?")) return;

    localStorage.removeItem("token");
    window.location.href = "../index.html";
}

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
    cargarSecciones();
    establecerFechas();
});