// Obtener token
const token = localStorage.getItem("token");

if (token == null) {
    alert("Por favor, inicia sesión.");
    window.location.href = "../../index.html";
}

// Cargar secciones
async function cargarSecciones() {
    try {
        mostrarLoading();
        const secciones = await apiFetch("alumnos/secciones");

        llenarSelect("seccion", secciones);

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

    let seleccionado = false;

    data.forEach(sec => {
        const option = document.createElement("option");
        option.value = sec.nombre;
        option.textContent = sec.nombre;

        // Solo seleccionar la primera coincidencia
        if (
            !seleccionado &&
            sec.nombre.toLowerCase().includes("docente")
        ) {
            option.selected = true;
            seleccionado = true;
        }

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

        const data = await apiFetch(`alumnos/asistencia-suma-periodo?seccion=${seccion}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`);

        console.log(data);

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
            window.location.href = "../../index.html";
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
       <th>DUI o NIE</th>
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
    <th>Total horas</th>
    </tr>`;

    thead.innerHTML = html;

    let contador;
    let sumaHorasTotal;
    html = "";
    alumnosUnicos.forEach(a => {
        contador = 0;
        sumaHorasTotal = 0;

        html += `<tr>
        <td>${a.nieId}</td>
        <td>${a.apellido}</td>
        <td>${a.nombre}</td>
    `;
        fechasUnicas.forEach(f => {
            const registros = data
                .filter(d => d.nie === a.nieId && d.fecha === f);

            const horaMenor = registros
                .sort((a, b) => a.hora.localeCompare(b.hora))[0];

            const horaMayor = registros
                .filter(d => d.hora > horaMenor.hora)
                .sort((a, b) => b.hora.localeCompare(a.hora))[0];

            // Calcular diferencia de horas
            let totalHoras = "";
            if (horaMenor && horaMayor) {
                const [h1, m1, s1 = 0] = horaMenor.hora.split(":").map(Number);
                const [h2, m2, s2 = 0] = horaMayor.hora.split(":").map(Number);

                const inicio = new Date(0, 0, 0, h1, m1, s1);
                const fin = new Date(0, 0, 0, h2, m2, s2);

                const diferenciaMs = fin - inicio;

                const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
                const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));

                totalHoras = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;

                // Acumular horas
                sumaHorasTotal += (horas * 60) + minutos;
            }

            if (horaMenor)
                contador++;

            html += `<td>
                <div class="d-flex flex-wrap gap-1">
                    ${crearBadge(formatearHora(horaMenor ? horaMenor.hora : ""), "badge-green")}
                    ${crearBadge(formatearHora(horaMayor ? horaMayor.hora : ""), "badge-blue")}
                    ${crearBadge(totalHoras, "badge-yellow")}
                </div>
            </td>`;
        });

        const porcentaje = (contador * 100 / fechasUnicas.length).toFixed(0);

        // Convertir acumulado a HH:mm
        const horasTotales = Math.floor(sumaHorasTotal / 60);
        const minutosTotales = sumaHorasTotal % 60;

        const totalGeneralHoras =
            `${String(horasTotales).padStart(2, '0')}:${String(minutosTotales).padStart(2, '0')}`;

        html += `
        <td>${contador}</td>
        <td>${porcentaje}%</td>
        <td>${totalGeneralHoras}</td>
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

    const tabla = document.getElementById("tabla");
    const filas = tabla.querySelectorAll("tbody tr");

    if (filas.length === 0) {
        alert("¡No hay datos para exportar!");
        return;
    }

    // Crear hoja
    const ws = XLSX.utils.aoa_to_sheet([]);

    // OBTENER COLUMNAS DINÁMICAS

    const fechas = [];

    tabla.querySelectorAll("thead th").forEach((th, i) => {

        const texto = th.innerText.trim();

        // Columnas que NO son fechas
        const columnasFijas = [
            "DUI o NIE",
            "Apellido",
            "Nombre",
            "Total",
            "Porcentaje",
            "Total horas",
            "Acciones"
        ];

        if (!columnasFijas.includes(texto)) {

            fechas.push({
                texto,
                index: i
            });
        }
    });

    // TITULO

    const seccion = document.getElementById("seccion")?.value || "";
    const fechaDesde = document.getElementById("fechaInicio").value;
    const fechaHasta = document.getElementById("fechaFin").value;

    const titulo =
        `Reporte de la sección ${seccion} ` +
        `Desde ${formatearFecha(fechaDesde)} ` +
        `Hasta ${formatearFecha(fechaHasta)}`;

    XLSX.utils.sheet_add_aoa(ws, [[titulo]], {
        origin: "A1"
    });

    // ENCABEZADO SUPERIOR


    const filaSuperior = [
        "DUI o NIE",
        "Apellido",
        "Nombre"
    ];

    // Fechas dinámicas
    fechas.forEach(f => {

        filaSuperior.push(
            f.texto,
            "",
            ""
        );
    });

    filaSuperior.push(
        "Total",
        "Porcentaje",
        "Total horas"
    );

    XLSX.utils.sheet_add_aoa(ws, [filaSuperior], {
        origin: "A2"
    });

    // SUB ENCABEZADOS

    const filaSub = [
        "",
        "",
        ""
    ];

    fechas.forEach(() => {

        filaSub.push(
            "Entrada",
            "Salida",
            "Total"
        );
    });

    filaSub.push(
        "",
        "",
        ""
    );

    XLSX.utils.sheet_add_aoa(ws, [filaSub], {
        origin: "A3"
    });

    // DATOS

    const data = [];

    filas.forEach(tr => {

        const tds = tr.querySelectorAll("td");

        let fila = [];

        // Datos fijos
        fila.push(
            tds[0]?.innerText.trim() || "",
            tds[1]?.innerText.trim() || "",
            tds[2]?.innerText.trim() || ""
        );

        // Fechas dinámicas
        fechas.forEach(f => {

            const td = tds[f.index];

            if (!td) {

                fila.push("", "", "");
                return;
            }

            // Obtener badges
            const badges = td.querySelectorAll("span");

            fila.push(
                badges[0]?.innerText.trim() || "",
                badges[1]?.innerText.trim() || "",
                badges[2]?.innerText.trim() || ""
            );
        });

        // Totales
        const totalIndex = fechas[fechas.length - 1].index + 1;

        fila.push(
            tds[totalIndex]?.innerText.trim() || "",
            tds[totalIndex + 1]?.innerText.trim() || "",
            tds[totalIndex + 2]?.innerText.trim() || ""
        );

        data.push(fila);
    });

    XLSX.utils.sheet_add_aoa(ws, data, {
        origin: "A4"
    });

    // COMBINAR CELDAS

    ws["!merges"] = [];

    // Combinar título
    const totalColumnas =
        3 +                 // columnas fijas
        (fechas.length * 3) +
        3;                  // totales

    ws["!merges"].push({
        s: { r: 0, c: 0 },
        e: { r: 0, c: totalColumnas - 1 }
    });

    // Combinar columnas fijas verticalmente
    [0, 1, 2].forEach(c => {

        ws["!merges"].push({
            s: { r: 1, c },
            e: { r: 2, c }
        });
    });

    // Combinar fechas horizontalmente
    let col = 3;

    fechas.forEach(() => {

        ws["!merges"].push({
            s: { r: 1, c: col },
            e: { r: 1, c: col + 2 }
        });

        col += 3;
    });

    // Combinar totales verticalmente
    for (let i = col; i < col + 3; i++) {

        ws["!merges"].push({
            s: { r: 1, c: i },
            e: { r: 2, c: i }
        });
    }

    // ESTILOS

    // Título
    const tituloCell = XLSX.utils.encode_cell({
        r: 0,
        c: 0
    });

    if (ws[tituloCell]) {

        ws[tituloCell].s = {
            font: {
                bold: true,
                sz: 14
            },
            alignment: {
                horizontal: "center",
                vertical: "center"
            }
        };
    }

    // Encabezados
    for (let R = 1; R <= 2; ++R) {

        for (let C = 0; C < totalColumnas; ++C) {

            const cellRef = XLSX.utils.encode_cell({
                r: R,
                c: C
            });

            if (!ws[cellRef]) continue;

            ws[cellRef].s = {

                font: {
                    bold: true
                },

                alignment: {
                    horizontal: "center",
                    vertical: "center"
                }
            };
        }
    }

    // ANCHO COLUMNAS

    ws["!cols"] = [];

    // Columnas fijas
    ws["!cols"].push({ wch: 15 });
    ws["!cols"].push({ wch: 25 });
    ws["!cols"].push({ wch: 25 });

    // Fechas
    fechas.forEach(() => {

        ws["!cols"].push({ wch: 12 });
        ws["!cols"].push({ wch: 12 });
        ws["!cols"].push({ wch: 12 });
    });

    // Totales
    ws["!cols"].push({ wch: 10 });
    ws["!cols"].push({ wch: 12 });
    ws["!cols"].push({ wch: 15 });

    // CREAR LIBRO

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        wb,
        ws,
        "Reporte"
    );

    // EXPORTAR

    XLSX.writeFile(
        wb,
        "SEAD_Reporte_Horas_Acumuladas.xlsx"
    );
}

async function exportarPDF() {

    if (!confirm("¿Exportar a PDF?")) return;

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
                texto += ` a ${salida}`;

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
        "SEAD_Reporte_Horas_Acumuladas.pdf"
    );
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