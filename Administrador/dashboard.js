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

// Fecha automática
document.getElementById("fecha").value = new Date().toISOString().split("T")[0];

// Cargar total de institución
async function cargarTotalInstitucion() {
    try {
        mostrarLoading();

        const data = await apiFetch("alumnos/totalInstitucion");
        document.getElementById("totalAlumnosInstitucion").innerText = data;

    } catch (error) {
        alert(error.message);

        if (error.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "../index.html";
            return;
        }
    } finally{
        ocultarLoading();
    }
}

// Cargar secciones
async function cargarSecciones() {
    try {
        mostrarLoading();
        const secciones = await apiFetch("alumnos/secciones")
        
        const select = document.getElementById("seccion");
        secciones.forEach(sec => {
            const option = document.createElement("option");
            option.value = sec.nombre;
            option.textContent = sec.nombre;
            select.appendChild(option);
        });

        const selectModal = document.getElementById("seccionModal");
        secciones.forEach(sec => {
            const option = document.createElement("option");
            option.value = sec.nombre;
            option.textContent = sec.nombre;
            selectModal.appendChild(option);
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

// Cargar asistencia
async function cargarAsistencia() {
    const fecha = document.getElementById("fecha").value;
    const seccion = document.getElementById("seccion").value;
    
    try {
        mostrarLoading();
        const asistencia = await apiFetch(`alumnos/asistenciaTotal?fecha=${fecha}&seccion=${seccion}`)

        if (seccion !== "") {
            renderTabla(asistencia);
            document.getElementById("lbAsistenciaSeccion").innerHTML = seccion;
        }

        calcularDetalles(asistencia);

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

function renderTabla(data) {

    const tabla = $('#tabla');

    // 🔥 1. Si existe DataTable → destruirlo
    if ($.fn.DataTable.isDataTable('#tabla')) {
        tabla.DataTable().clear().destroy();
    }

    // 🔥 2. Limpiar tbody
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = "";

    // 🔥 3. Construir HTML
    let html = "";

    data.forEach(a => {
        html += `
            <tr>
                <td>${a.nie}</td>
                <td>${a.apellido}</td>
                <td>${a.nombre}</td>
                
                <td>
                <div class="d-flex flex-wrap gap-1">
                    ${crearBadge(formatearHora(a.matutina_Entrada), "badge-green")}
                    ${crearBadge(formatearHora(a.matutina_Salida), "badge-red")}
                    ${crearBadge(formatearHora(a.vespertina_Entrada), "badge-blue")}
                    ${crearBadge(formatearHora(a.vespertina_Salida), "badge-yellow")}
                </div>
            </td>
            </tr>
        `;
    });

    // 🔥 4. Insertar datos nuevos
    tbody.innerHTML = html;

    // 🔥 5. Volver a activar DataTable
    activarDataTable();
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

function formatearHora(hora) {
    if (!hora) return "";

    // Si viene con segundos
    if (hora.length >= 5) {
        return hora.substring(0, 5);
    }

    return hora;
}

function calcularDetalles(data) {

    const entradaM = data.filter(e => e.matutina_Entrada != null).length;
    const salidaM = data.filter(e => e.matutina_Salida != null).length;
    const entradaV = data.filter(e => e.vespertina_Entrada != null).length;
    const salidaV = data.filter(e => e.vespertina_Salida != null).length;

    // Pintar en pantalla
    document.getElementById("em").innerText = entradaM;
    document.getElementById("sm").innerText = salidaM;
    document.getElementById("ev").innerText = entradaV;
    document.getElementById("sv").innerText = salidaV;

    // Cálculos
    const total = new Set(
    data
        .filter(e => e.matutina_Entrada != null || e.vespertina_Entrada != null)
        .map(e => e.nie)
    ).size;
    
    const presentes = total;
    const totalAlumnos = data.length;
    const ausentes = totalAlumnos - presentes;

    document.getElementById("total").innerText = presentes;
    document.getElementById("diferencia").innerText = ausentes;
    document.getElementById("totalAlumnos").innerText = totalAlumnos;

    renderGrafico(presentes, ausentes);
}

let chart;

function renderGrafico(presentes, ausentes) {

    const ctx = document.getElementById('graficoAsistencia').getContext('2d');

    if (chart) {
        chart.destroy();
    }

    const sinDatos = presentes === 0 && ausentes === 0;

    const total = presentes + ausentes;

    const porcentajeAusentes = total === 0
        ? 0
        : Math.round((ausentes / total) * 100);

    // pintar porcentaje abajo
    const labelAusentes = document.getElementById("porcentajeAusentes");
    if (labelAusentes) {
        labelAusentes.innerText = porcentajeAusentes + "%";
    }

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sinDatos ? ['Sin datos'] : ['Presentes', 'Ausentes'],
            datasets: [{
                data: sinDatos ? [1] : [presentes, ausentes],
                backgroundColor: sinDatos
                    ? ['#dee2e6']
                    : ['#28a745', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: {
                    display: !sinDatos,
                    position: 'bottom'
                }
            }
        },
        plugins: [centerTextPlugin] // 👈 aquí lo activas
    });
}

const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
        const { ctx, chartArea } = chart;

        if (!chartArea) return; // evita error en render inicial

        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        const data = chart.config.data.datasets[0].data;
        const total = data.reduce((a, b) => a + b, 0);

        let texto = "0%";

        if (total > 0 && chart.config.data.labels[0] !== "Sin datos") {
            const porcentaje = Math.round((data[0] / total) * 100);
            texto = porcentaje + "%";
        }

        ctx.save();
        ctx.font = "bold 30px sans-serif";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(texto, centerX, centerY);

        ctx.restore();
    }
};

// Top alumnos
const modalElement = document.getElementById('modalTopAlumnos');
const modalTop = new bootstrap.Modal(modalElement);

const filtroAnio = document.getElementById("filtroAnio");
const filtroMes = document.getElementById("filtroMes");
const contenedorMes = document.getElementById("contenedorMes");
const contenedorTabla = document.getElementById("contenedorTabla");

filtroAnio.addEventListener("change", () => {
    contenedorMes.classList.add("d-none");
});

filtroMes.addEventListener("change", () => {
    contenedorMes.classList.remove("d-none");
});

async function verTopAlumnos() {

    const seccion = document.getElementById("seccionModal").value;
    let mesActual = document.getElementById("selectMes").value;
    const añoActual = new Date().getFullYear();

    if (filtroAnio.checked) {
        mesActual = "";
    }

    // Mostrar tabla
    contenedorTabla.classList.remove("d-none");

    try {
        mostrarLoading();
        const data = await apiFetch(`alumnos/topAsistencia?seccion=${seccion}&year=${añoActual}&mes=${mesActual}`);

        const tbody = document.getElementById("tbodyTop");
        tbody.innerHTML = "";

        data.forEach((a, index) => {
            tbody.innerHTML += `
            <tr>
                <td>${a.nieID}</td>
                <td>${a.apellido}</td>
                <td>${a.nombre}</td>
                <td>${a.seccion}</td>
                <td>${a.total}</td>
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

function formatearFecha(fecha) {
    const [year, month, day] = fecha.split(/[-\/]/);
    return `${day}/${month}/${year}`;
}

function exportarExcel() {

    if (!confirm("¿Exportar los datos a Excel?")) return;

    const tabla = document.getElementById("tabla");

    // Clonar la tabla para no afectar la original
    const tablaClon = tabla.cloneNode(true);

    const filas = tablaClon.querySelectorAll("tbody tr");

    if (filas.length === 0){
        alert("¡No hay datos para exportar!");
        return;
    }

    // 🔹 Convertir badges a texto
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll("td");
        const detalles = celdas[celdas.length - 1];
        const badges = detalles.querySelectorAll("span");

        let texto = [];
        badges.forEach(b => {
            texto.push(b.textContent.trim());
        });

        detalles.innerHTML = texto.join("   ");
    });

    // Obtener datos
    const seccion = document.getElementById("lbAsistenciaSeccion").innerText;
    const fecha = document.getElementById("fecha").value;
    const presentes = document.getElementById("total").innerText;
    const ausentes = document.getElementById("diferencia").innerText;
    const total = document.getElementById("totalAlumnos").innerText;
    
    // 🔹 Agregar título
    const titulo = `Reporte de asistencia ${seccion} Presentes ${presentes} Ausentes ${ausentes} Total ${total}`;

    const thead = tablaClon.querySelector("thead");
    const filaTitulo = document.createElement("tr");
    const thTitulo = document.createElement("th");

    const totalCols = thead.querySelectorAll("th").length;
    thTitulo.colSpan = totalCols;
    thTitulo.textContent = titulo;
    thTitulo.style.textAlign = "center";
    thTitulo.style.fontWeight = "bold";

    filaTitulo.appendChild(thTitulo);
    thead.insertBefore(filaTitulo, thead.firstChild);

    // 🔹 Crear workbook
    const wb = XLSX.utils.table_to_book(tablaClon, { sheet: "Asistencia" });

    // 🔹 Obtener worksheet
    const ws = wb.Sheets["Asistencia"];

    // 🔥 AUTO AJUSTE DE COLUMNAS
    const colWidths = [];

    const todasFilas = tablaClon.querySelectorAll("tr");

    todasFilas.forEach(tr => {

        const esTitulo = tr.querySelector("th")?.colSpan > 1;
        if (esTitulo) return;

        tr.querySelectorAll("th, td").forEach((celda, i) => {
            const texto = celda.innerText || "";
            const largo = texto.length;

            colWidths[i] = Math.max(colWidths[i] || 10, largo + 2);
        });
    });

    ws["!cols"] = colWidths.map(w => ({ wch: w }));

    // 📥 Exportar
    XLSX.writeFile(wb, "SEAD_Reporte_asistencia.xlsx");
}

async function exportarPDF() {

    if (!confirm("¿Exportar los datos a PDF?")) return;

    const filas = document.querySelectorAll("#tabla tbody tr");

        if (filas.length === 0) {
            alert("¡No hay datos para exportar!");
            return;
        }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Obtener datos
    const seccion = document.getElementById("lbAsistenciaSeccion").innerText;
    const fecha = document.getElementById("fecha").value;
    const presentes = document.getElementById("total").innerText;
    const ausentes = document.getElementById("diferencia").innerText;
    const total = document.getElementById("totalAlumnos").innerText;

    doc.text(`Reporte de asistencia ${seccion}\nPresentes ${presentes} Ausentes ${ausentes} Total ${total} Fecha ${formatearFecha(fecha)}`, 14, 15);

    doc.autoTable({
        html: "#tabla",
        startY: 25,
        styles: { fontSize: 8 }
    });

    doc.save("SEAD_Reporte_asistencia.pdf");
}

function cerrarSesion() {
    if (!confirm("¿Cerrar sesión?")) return;

    localStorage.removeItem("token");
    window.location.href = "../index.html";
}

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
    cargarTotalInstitucion();
    cargarSecciones();
    renderGrafico(0, 0);
});

