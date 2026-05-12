// Obtener token
const token = localStorage.getItem("token");

if (token == null) {
    alert("Por favor, inicia sesión.");
    window.location.href = "../index.html";
}

// Cargar secciones
async function cargarSecciones() {
    try {
        mostrarLoading();
        const secciones = await apiFetch("docentes/secciones-usuario")

        llenarSelect("seccion", secciones);

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../index.html";
        }
    } finally{
        ocultarLoading();
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

        // Validar rango máximo 31 días
        const fecha1 = new Date(fechaDesde);
        const fecha2 = new Date(fechaHasta);

        const diff = (fecha2 - fecha1) / (1000 * 60 * 60 * 24);

        if (diff > 31) {
            alert("El rango no puede ser mayor a 31 días");
            return;
        }

        const data = await apiFetch(`alumnos/asistencia-periodo?seccion=${seccion}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`)

        if (data.length === 0) {
            alert("No se encontraron registros en el rango de fechas seleccionado");
            return;
        }

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

function crearBadge(valor, clase) {
    if (!valor || valor === "" || valor === null) {
        return `<span style="
    min-width: 60px;
    height: 22px;
    display: inline-block;
    border-radius: 6px;
    background-color: #e9ecef;
    "></span>`;
    }
    return `<span class="badge ${clase}" style="min-width: 60px; display: inline-block; text-align: center;">
    ${valor}</span>`;
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
            ${crearBadge(registro ? formatearHora(registro.hora) : "", "badge-green")}
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

async function exportarExcelAsync() {
    const dataTable = $('#tabla').DataTable();

    // Guardar paginación actual
    const paginaActual = dataTable.page.len();

    // Mostrar todas las filas
    dataTable.page.len(-1).draw();

    // Esperar render
    try{
        mostrarLoading()
        setTimeout(() => {

        exportarExcel();

        // Restaurar paginación
        dataTable.page.len(paginaActual).draw();

    }, 100);

    }catch(error){
        alert("Error "+error.message)
    }finally{
        ocultarLoading();
    }
}

async function exportarPDFAsync() {
    const dataTable = $('#tabla').DataTable();

    // Guardar paginación actual
    const paginaActual = dataTable.page.len();

    // Mostrar todas las filas
    dataTable.page.len(-1).draw();

    // Esperar render
    try{
        mostrarLoading()
        setTimeout(() => {

        exportarPDF();

        // Restaurar paginación
        dataTable.page.len(paginaActual).draw();

    }, 100);

    }catch(error){
        alert("Error "+error.message)
    }finally{
        ocultarLoading();
    }
}

// Exportación
function exportarExcel() {

    if (!confirm("¿Exportar los datos a Excel?")) return;

    // Mostrar toda la tabla antes de exportar
    const dataTable = $('#tabla').DataTable();
    dataTable.page.len(-1).draw();

    const tabla = document.getElementById("tabla");

    // 🔹 Clonar tabla
    const tablaClon = tabla.cloneNode(true);

    const filas = tablaClon.querySelectorAll("tbody tr");

    if (filas.length === 0) {

        alert("¡No hay datos para exportar!");
        return;
    }

    // =====================================================
    // 🔹 CAMBIAR ENCABEZADO DETALLES
    // =====================================================

    const headerRow =
        tablaClon.querySelector("thead tr");

    const thDetalles =
        headerRow.lastElementChild;

    thDetalles.remove();

    [
        "Entrada 1",
        "Salida 1",
        "Entrada 2",
        "Salida 2"
    ].forEach(texto => {

        const th =
            document.createElement("th");

        th.textContent = texto;

        headerRow.appendChild(th);
    });

    // =====================================================
    // 🔹 CONVERTIR BADGES A COLUMNAS
    // =====================================================

    filas.forEach(fila => {

        const celdas =
            fila.querySelectorAll("td");

        const detalles =
            celdas[celdas.length - 1];

        const badges =
            detalles.querySelectorAll("span");

        // 🔹 Obtener valores
        const valores = [];

        badges.forEach(badge => {

            valores.push(
                badge.textContent.trim()
            );
        });

        // 🔹 Eliminar celda detalles
        detalles.remove();

        // 🔹 Agregar nuevas columnas
        for (let i = 0; i < 4; i++) {

            const td =
                document.createElement("td");

            td.textContent =
                valores[i] || "";

            fila.appendChild(td);
        }
    });

    // =====================================================
    // 🔹 DATOS REPORTE
    // =====================================================

    const seccion =
        document.getElementById("lbAsistenciaSeccion").innerText;

    const fecha =
        document.getElementById("fecha").value;

    const presentes =
        document.getElementById("total").innerText;

    const ausentes =
        document.getElementById("diferencia").innerText;

    const total =
        document.getElementById("totalAlumnos").innerText;

    // =====================================================
    // 🔹 TÍTULO
    // =====================================================

    const titulo =
        `Reporte de asistencia ${seccion} ` +
        `Presentes ${presentes} ` +
        `Ausentes ${ausentes} ` +
        `Total ${total} ` +
        `Fecha ${formatearFecha(fecha)}`;

    const thead =
        tablaClon.querySelector("thead");

    const filaTitulo =
        document.createElement("tr");

    const thTitulo =
        document.createElement("th");

    const totalCols =
        thead.querySelectorAll("tr:last-child th").length;

    thTitulo.colSpan =
        totalCols;

    thTitulo.textContent =
        titulo;

    thTitulo.style.textAlign =
        "center";

    thTitulo.style.fontWeight =
        "bold";

    filaTitulo.appendChild(thTitulo);

    thead.insertBefore(
        filaTitulo,
        thead.firstChild
    );

    // =====================================================
    // 🔹 CREAR WORKBOOK
    // =====================================================

    const wb =
        XLSX.utils.table_to_book(
            tablaClon,
            {
                sheet: "Asistencia"
            }
        );

    const ws =
        wb.Sheets["Asistencia"];

    // =====================================================
    // 🔹 AUTO AJUSTE COLUMNAS
    // =====================================================

    const colWidths = [];

    const todasFilas =
        tablaClon.querySelectorAll("tr");

    todasFilas.forEach(tr => {

        const esTitulo =
            tr.querySelector("th")?.colSpan > 1;

        if (esTitulo) return;

        tr.querySelectorAll("th, td")
            .forEach((celda, i) => {

                const texto =
                    celda.innerText || "";

                const largo =
                    texto.length;

                colWidths[i] = Math.max(
                    colWidths[i] || 10,
                    largo + 2
                );
            });
    });

    ws["!cols"] =
        colWidths.map(w => ({
            wch: w
        }));

    // =====================================================
    // 🔹 EXPORTAR
    // =====================================================

    XLSX.writeFile(
        wb,
        "SEAD_Reporte_asistencia.xlsx"
    );
}

async function exportarPDF() {

    if (!confirm("¿Exportar a PDF?")) return;

    // Mostrar toda la tabla antes de exportar
    const dataTable = $('#tabla').DataTable();
    dataTable.page.len(-1).draw();

    const filas = document.querySelectorAll("#tabla tbody tr");

    if (filas.length === 0) {

        alert("¡No hay datos para exportar!");
        return;
    }

    const { jsPDF } = window.jspdf;

    // 🔹 PDF horizontal
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "letter"
    });

    // =========================================================
    // 🔹 DATOS DEL REPORTE
    // =========================================================

    const seccion =
        document.getElementById("seccion")?.value || "";

    const fechaDesde =
        document.getElementById("fechaInicio").value;

    const fechaHasta =
        document.getElementById("fechaFin").value;

    // =========================================================
    // 🔹 TÍTULO
    // =========================================================

    doc.setFontSize(14);
    doc.text(`Reporte de la sección ${seccion}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Desde ${formatearFecha(fechaDesde)} Hasta ${formatearFecha(fechaHasta)}`, 14, 22);

    // =========================================================
    // 🔹 CLONAR TABLA
    // =========================================================

    const tabla =
        document.getElementById("tabla");

    const tablaClon =
        tabla.cloneNode(true);

    // 🔹 Necesario para leer spans
    const contenedor = document.createElement("div");
    contenedor.style.position = "absolute";
    contenedor.style.left = "-9999px";
    contenedor.appendChild(tablaClon);
    document.body.appendChild(contenedor);

    // =========================================================
    // 🔹 GENERAR TABLA PDF
    // =========================================================

    doc.autoTable({
        html: tablaClon,
        startY: 30,
        theme: "grid",

        styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: "linebreak",
            halign: "center",
            valign: "middle"
        },

        // 🔹 Header azul
        headStyles: {
            fillColor: [13, 110, 253],
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },

        // 🔹 Filas alternas
        alternateRowStyles: {
            fillColor: [248, 249, 250]
        },

        // =====================================================
        // 🔹 CONVERTIR BADGES A TEXTO
        // =====================================================

        didParseCell: function (data) {

            // Solo body
            if (data.section !== "body") return;
            const td = data.cell.raw;
            if (!td) return;

            const badges = td.querySelectorAll("span");

            if (badges.length === 0) return;

            // 🔹 Obtener valores
            const entrada = badges[0]?.innerText.trim() || "";
            const salida = badges[1]?.innerText.trim() || "";
            const total = badges[2]?.innerText.trim() || "";

            // 🔹 Construir texto
            let texto = "";

            if (entrada)
                texto += entrada;

            if (salida)
                texto += ` | ${salida}`;

            if (total)
                texto += ` = ${total}`;

            // 🔹 Reemplazar contenido
            data.cell.text = [texto];

            // 🔹 Estilo texto
            data.cell.styles.fontStyle =
                "bold";

            data.cell.styles.textColor = [33, 37, 41];
        }
    });

    // =========================================================
    // 🔹 LIMPIAR DOM
    // =========================================================

    document.body.removeChild(contenedor);

    // =========================================================
    // 🔹 EXPORTAR
    // =========================================================

    doc.save(
        "SEAD_Reporte.pdf"
    );
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