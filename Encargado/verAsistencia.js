// Obtener el token
const token = localStorage.getItem("token");

if (token == null){
    alert("Por favor, inicia sesión.");
    window.location.href = "../index.html";
}

const alumno = JSON.parse(localStorage.getItem("alumnoSeleccionado"));

// Mostrar datos del alumno seleccionado
document.getElementById("infoAlumno").innerHTML = `
    <strong>${alumno.nombre} ${alumno.apellido}</strong><br>
    NIE: ${alumno.nieID}<br>
    Sección: ${alumno.seccion}
`;

// Buscar asistencia
async function buscarAsistencia() {

    const inicio = document.getElementById("fechaInicio").value;
    const fin = document.getElementById("fechaFin").value;

    if (!inicio || !fin) {
        alert("Seleccione ambas fechas");
        return;
    }

    // Validar rango máximo 31 días
    const fecha1 = new Date(inicio);
    const fecha2 = new Date(fin);

    const diff = (fecha2 - fecha1) / (1000 * 60 * 60 * 24);

    if (diff > 31) {
        alert("El rango no puede ser mayor a 31 días");
        return;
    }

    try {
        mostrarLoading();
        const data = await apiFetch(`encargado/verAsistencia/${alumno.nieID}?inicio=${inicio}&fin=${fin}`)
        
        if (!data || data.length === 0) {
            alert("No se encontraron asistencias en el rango de fecha seleccionado")
        }

        const tabla = document.getElementById("tablaAsistencia");
        tabla.innerHTML = "";

        const agrupado = {};

        data.forEach(item => {
            if (!agrupado[item.fecha]) {
                agrupado[item.fecha] = [];
            }
            agrupado[item.fecha].push(item);
        });

        for (const fecha in agrupado) {
            const registros = agrupado[fecha];

            const horas = registros.map(r =>
                `<span class="badge ${r.tipoMarcacion === 'Entrada' ? 'bg-success' : 'bg-primary'} me-1">
            ${formatearHora(r.hora)} ${r.tipoMarcacion}
        </span>`
            ).join("");

            const fila = `
        <tr>
        <td>${formatearFecha(fecha)}</td>
        <td colspan="3">${horas}</td>
        </tr>
        `;

            tabla.innerHTML += fila;
        }

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

// Volver
function volver() {
    window.location.href = "encargado.html";
}

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
    const hoy = new Date();

    const fecha = hoy.getFullYear() + "-" +
        String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
        String(hoy.getDate()).padStart(2, "0");

    document.getElementById("fechaInicio").value = fecha;
    document.getElementById("fechaFin").value = fecha;
});