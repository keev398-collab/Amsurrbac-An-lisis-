import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, Shield, CircleDot, Users, LayoutGrid, X, BarChart3, Printer, Pencil, Play, Pause, Save, FolderOpen, PenTool, MousePointer2, ArrowRight, Minus as MinusIcon, Square, Undo2, Redo2, Download, Type, Lock, LogIn, LogOut, Eye } from "lucide-react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');`;

// Acceso de edición. OJO: esto es un candado de interfaz, no seguridad real —
// el código (y esta clave) son visibles para cualquiera que abra el archivo
// fuente o la consola del navegador. No sirve para proteger datos sensibles.
const CREDENCIALES_EDITOR = { usuario: "keev966", clave: "Talleres1913" };
const SESION_STORAGE_KEY = "clubDashboardSesion";

const COLORS = {
  pitchDark: "#0F2818",
  pitch: "#173B26",
  grass: "#3E8E5C",
  chalk: "#F5F3EA",
  line: "#D9D4C4",
  ink: "#132018",
  inkSoft: "#4A5A50",
  amber: "#E3A83B",
  redCard: "#B8432E",
  yellowCard: "#E3A83B",
};

// Paleta específica para la tarjeta de Alineación, a tono con la referencia (navy + celeste)
const NAVY = "#131A2C";
const CELESTE = "#3E7BFA";
const CESPED = "#2F6B45";
const CESPED_OSCURO = "#2A6140";

const emptyPartido = () => ({
  id: crypto.randomUUID(),
  fecha: new Date().toISOString().slice(0, 10),
  hora: "",
  rival: "",
  gf: 0,
  gc: 0,
  condicion: "Local",
  competicion: "Torneo Apertura",
  jornada: "",
  estadio: "",
  arbitro: "",
  asistentes: "",
  videoUrl: "",
  estado: "Jugado",
  convocados: [],
  goleadores: [],
  golesContraDetalle: [],
  amarillas: [],
  rojas: [],
  titulares: {},
  suplentes: [],
  formacion: "4-3-3 Clásico",
  minutosJugados: {},
  sustituciones: [],
});

const ESTADOS_PARTIDO = ["Jugado", "Programado"];

// ---------- Pizarra táctica ----------
const MATERIALES_PIZARRA = [
  { tipo: "balon", emoji: "⚽", label: "Balón" },
  { tipo: "balon2", emoji: "🏐", label: "Balón alt." },
  { tipo: "cono", emoji: "🔺", label: "Cono", color: "#E3A83B" },
  { tipo: "discoAzul", emoji: "⬤", label: "Disco Azul", color: "#3E7BFA" },
  { tipo: "discoRojo", emoji: "⬤", label: "Disco Rojo", color: "#B8432E" },
  { tipo: "discoAmarillo", emoji: "⬤", label: "Disco Amarillo", color: "#E3A83B" },
  { tipo: "miniporteria", emoji: "🥅", label: "Mini portería" },
  { tipo: "porteria", emoji: "🥅", label: "Portería" },
  { tipo: "valla", emoji: "▬", label: "Valla", color: "#8A5A2B" },
  { tipo: "escalera", emoji: "🪜", label: "Escalera" },
  { tipo: "maniqui", emoji: "🧍", label: "Maniquí" },
  { tipo: "aroRojo", emoji: "⭕", label: "Aro Rojo", color: "#B8432E" },
  { tipo: "aroVerde", emoji: "⭕", label: "Aro Verde", color: "#3E8E5C" },
  { tipo: "banco", emoji: "▭", label: "Banco" },
];

const COLORES_DIBUJO = ["#FFFFFF", "#E3A83B", "#3E7BFA", "#B8432E", "#132018"];

const CAMISETAS = [
  { color: "#3E7BFA", nombre: "Azul" },
  { color: "#3E8E5C", nombre: "Verde" },
  { color: "#132018", nombre: "Negro" },
  { color: "#B8432E", nombre: "Rojo" },
  { color: "#E3A83B", nombre: "Amarillo" },
  { color: "#7C5CFC", nombre: "Violeta" },
  { color: "#F5F3EA", nombre: "Blanco" },
  { color: "#EC4899", nombre: "Rosa" },
];

function esClaroFondo(hex) {
  if (!hex) return false;
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

function nuevoFotograma() {
  return { elementos: [], dibujos: [] };
}

function nuevaPizarra(nombre, tipo) {
  return {
    id: crypto.randomUUID(),
    nombre: nombre || "Pizarra sin nombre",
    tipo,
    colorPropio: CAMISETAS[0].color,
    colorRival: CAMISETAS[3].color,
    plantilla: {
      titulares: Array.from({ length: 11 }, (_, i) => `Jugador ${i + 1}`),
      suplentes: Array.from({ length: 7 }, (_, i) => `Suplente ${i + 1}`),
      rivales: Array.from({ length: 11 }, (_, i) => `Rival ${i + 1}`),
    },
    fotogramas: [nuevoFotograma()],
  };
}
function esProgramado(p) {
  return p.estado === "Programado";
}

const COMPETICIONES = ["Torneo Apertura", "Torneo Clausura"];
const TIPOS_ACCION = ["Jugada", "Pelota parada", "Transición", "Penal"];
const TIPOS_ACCION_CONTRA = ["Pelota parada", "Transición", "Jugada creativa"];

// Catálogo de sistemas tácticos: cada uno define sus líneas de jugadores de campo
// (sin arquero), ordenadas de defensa a ataque. El arquero se agrega aparte siempre.
const FORMACIONES_CATEGORIAS = [
  {
    grupo: "Línea de 4 defensores",
    sistemas: {
      "4-4-2 Tradicional": [4, 4, 2],
      "4-4-2 en Línea": [4, 4, 2],
      "4-4-2 en Rombo (o 4-3-1-2)": [4, 3, 1, 2],
      "4-4-2 con Doble Pivote": [4, 4, 2],
      "4-3-3 Clásico": [4, 3, 3],
      '4-3-3 con "Falso 9"': [4, 3, 3],
      "4-3-3 con Doble Pivote (o 4-2-3-1)": [4, 2, 3, 1],
      "4-3-3 con Pivote Único": [4, 3, 3],
      "4-1-4-1": [4, 1, 4, 1],
      "4-5-1": [4, 5, 1],
      "4-2-4": [4, 2, 4],
    },
  },
  {
    grupo: "Línea de 3 defensores",
    sistemas: {
      "3-5-2 Clásico": [3, 5, 2],
      "3-5-1-1": [3, 5, 1, 1],
      "3-4-3 Plano": [3, 4, 3],
      "3-4-3 en Rombo": [3, 4, 3],
      "3-4-2-1": [3, 4, 2, 1],
      "3-4-1-2": [3, 4, 1, 2],
      "3-6-1": [3, 6, 1],
      "3-3-3-1 (Bielsista)": [3, 3, 3, 1],
    },
  },
  {
    grupo: "Línea de 5 defensores",
    sistemas: {
      "5-3-2": [5, 3, 2],
      "5-4-1": [5, 4, 1],
      "5-2-3": [5, 2, 3],
      "5-2-1-2": [5, 2, 1, 2],
      "5-1-3-1": [5, 1, 3, 1],
    },
  },
  {
    grupo: "Históricas y primitivas",
    sistemas: {
      "1-2-7 (El origen)": [1, 2, 7],
      "2-2-6": [2, 2, 6],
      "2-3-5 (La Pirámide)": [2, 3, 5],
      "3-2-2-3 (La WM)": [3, 2, 2, 3],
      "3-2-5 (La MM)": [3, 2, 5],
    },
  },
];

const FORMACIONES = Object.fromEntries(
  FORMACIONES_CATEGORIAS.flatMap((cat) => Object.entries(cat.sistemas))
);

const LETRAS_POR_CANTIDAD_LINEAS = {
  1: ["A"],
  2: ["D", "A"],
  3: ["D", "M", "A"],
  4: ["D", "M", "MO", "A"],
};

function generarFormacion(lineas) {
  const letras = LETRAS_POR_CANTIDAD_LINEAS[lineas.length] || lineas.map((_, i) => `L${i + 1}`);
  const slots = [{ slot: "POR", top: 92, left: 50 }];
  const L = lineas.length;
  lineas.forEach((cantidad, i) => {
    const top = L > 1 ? 78 - i * ((78 - 12) / (L - 1)) : 45;
    const letra = letras[i];
    for (let j = 0; j < cantidad; j++) {
      const left = ((j + 1) * 100) / (cantidad + 1);
      const slot = cantidad > 1 ? `${letra}${j + 1}` : letra;
      slots.push({ slot, top, left });
    }
  });
  return slots;
}

// Igual que generarFormacion pero para una cancha apaisada (horizontal): el eje
// arco→ataque corre en "left" (izquierda a derecha) y el reparto lateral en "top".
function generarFormacionHorizontal(lineas) {
  const letras = LETRAS_POR_CANTIDAD_LINEAS[lineas.length] || lineas.map((_, i) => `L${i + 1}`);
  const slots = [{ slot: "POR", left: 8, top: 50 }];
  const L = lineas.length;
  lineas.forEach((cantidad, i) => {
    const left = L > 1 ? 22 + i * ((88 - 22) / (L - 1)) : 55;
    const letra = letras[i];
    for (let j = 0; j < cantidad; j++) {
      const top = ((j + 1) * 100) / (cantidad + 1);
      const slot = cantidad > 1 ? `${letra}${j + 1}` : letra;
      slots.push({ slot, left, top });
    }
  });
  return slots;
}

// Etiqueta visual simplificada para cada línea (coincide con lo que ve el cuerpo técnico)
const ROL_POR_LETRA = { POR: "POR", D: "DEF", M: "MED", MO: "MED", A: "DEL" };

function shortCode(nombreFormacion) {
  const match = nombreFormacion.match(/^\d(-\d)+/);
  return match ? match[0] : nombreFormacion;
}

const emptyJugador = () => ({
  id: crypto.randomUUID(),
  foto: "",
  nombre: "",
  apellido: "",
  dorsal: "",
  posicion: "MC",
  posicionSecundaria: "",
  fechaNacimiento: "",
  pieDominante: "Derecho",
  origen: "",
  altura: "",
  peso: "",
  partidosJugados: 0,
  minutos: 0,
  goles: 0,
  asistencias: 0,
  amarillas: 0,
  rojas: 0,
});

const emptyClub = () => ({
  nombre: "Mi Club",
  logo: "",
  temporada: new Date().getFullYear().toString(),
});

const POSICIONES = ["POR", "DEF", "MC", "DEL"];
const PIES = ["Derecho", "Izquierdo", "Ambos"];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resultadoDe(p) {
  if (p.gf > p.gc) return "V";
  if (p.gf < p.gc) return "E" === "E" && p.gf === p.gc ? "E" : "D";
  return "D";
}
function resultadoLetra(p) {
  if (p.gf > p.gc) return "V";
  if (p.gf === p.gc) return "E";
  return "D";
}

// ---------- Exportación a PDF (impresión del navegador) ----------

function calcularResumenTemporada(partidos) {
  const pj = partidos.length;
  let vic = 0, emp = 0, der = 0, gf = 0, gc = 0;
  const golesPorTipo = {};
  TIPOS_ACCION.forEach((t) => (golesPorTipo[t] = 0));
  const golesContraPorTipo = {};
  TIPOS_ACCION_CONTRA.forEach((t) => (golesContraPorTipo[t] = 0));
  partidos.forEach((p) => {
    gf += Number(p.gf);
    gc += Number(p.gc);
    const r = resultadoLetra(p);
    if (r === "V") vic++;
    else if (r === "E") emp++;
    else der++;
    (p.goleadores || []).forEach((g) => {
      golesPorTipo[g.tipoAccion] = (golesPorTipo[g.tipoAccion] || 0) + Number(g.cantidad);
    });
    (p.golesContraDetalle || []).forEach((g) => {
      golesContraPorTipo[g.tipoAccion] = (golesContraPorTipo[g.tipoAccion] || 0) + Number(g.cantidad);
    });
  });
  return { pj, vic, emp, der, gf, gc, dif: gf - gc, pct: pj ? Math.round((vic / pj) * 100) : 0, golesPorTipo, golesContraPorTipo };
}

function calcularStatsJugadoresPDF(jugadores, partidos) {
  return jugadores.map((j) => {
    let goles = 0, asistencias = 0, amarillas = 0, rojas = 0, convocado = 0, minutos = 0;
    partidos.forEach((p) => {
      if ((p.convocados || []).includes(j.id)) convocado++;
      minutos += Number((p.minutosJugados || {})[j.id] || 0);
      (p.goleadores || []).forEach((g) => {
        if (g.jugadorId === j.id) goles += Number(g.cantidad);
        if (g.asistidoPor === j.id) asistencias += Number(g.cantidad);
      });
      (p.amarillas || []).forEach((a) => {
        if (a.jugadorId === j.id) amarillas += Number(a.cantidad);
      });
      (p.rojas || []).forEach((r) => {
        if (r.jugadorId === j.id) rojas += Number(r.cantidad);
      });
    });
    if (minutos === 0) minutos = Number(j.minutos) || 0;
    return { ...j, partidosConvocados: convocado, minutos, goles, asistencias, amarillas, rojas };
  });
}

function encabezadoPDF(club, subtitulo) {
  return `
    <div style="display:flex; align-items:center; gap:12px; border-bottom:2px solid #173B26; padding-bottom:12px; margin-bottom:18px;">
      ${club.logo ? `<img src="${club.logo}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;" />` : ""}
      <div>
        <div style="font-size:20px; font-weight:700;">${club.nombre}</div>
        <div style="font-size:11px; color:#4A5A50;">Temporada ${club.temporada} · ${subtitulo} · Generado el ${new Date().toLocaleDateString()}</div>
      </div>
    </div>
  `;
}

function tablaHTML(headers, rows) {
  const th = headers.map((h) => `<th style="text-align:left; padding:6px 8px; background:#173B26; color:#fff; font-size:11px;">${h}</th>`).join("");
  const trs = rows
    .map((row) => `<tr>${row.map((c) => `<td style="padding:6px 8px; border-bottom:1px solid #D9D4C4; font-size:12px;">${c}</td>`).join("")}</tr>`)
    .join("");
  return `<table style="width:100%; border-collapse:collapse; margin-bottom:18px;"><thead><tr>${th}</tr></thead><tbody>${trs || `<tr><td style="padding:10px; color:#4A5A50;">Sin datos</td></tr>`}</tbody></table>`;
}

function bloqueMarcador(resumen) {
  const item = (label, value) =>
    `<div style="text-align:center;"><div style="font-size:20px; font-weight:700;">${value}</div><div style="font-size:10px; color:#4A5A50;">${label}</div></div>`;
  return `<div style="display:flex; gap:18px; margin-bottom:20px; flex-wrap:wrap;">
    ${item("PJ", resumen.pj)}${item("VIC", resumen.vic)}${item("EMP", resumen.emp)}${item("DER", resumen.der)}
    ${item("GF", resumen.gf)}${item("GC", resumen.gc)}${item("DIF", resumen.dif > 0 ? "+" + resumen.dif : resumen.dif)}
    ${resumen.pct !== undefined ? item("% VICTORIAS", resumen.pct + "%") : ""}
  </div>`;
}

function generarResumenHTML(seccion, club, jugadores, partidos, filtroTorneo) {
  let partidosJugadosPDF = partidos.filter((p) => !esProgramado(p));
  if (seccion === "analisis" && filtroTorneo && filtroTorneo !== "Todos") {
    partidosJugadosPDF = partidosJugadosPDF.filter((p) => p.competicion === filtroTorneo);
  }
  const resumen = calcularResumenTemporada(partidosJugadosPDF);
  const statsJugadores = calcularStatsJugadoresPDF(jugadores, partidosJugadosPDF);

  if (seccion === "panel") {
    const ultimos = partidosJugadosPDF.slice(0, 8).map((p) => [p.fecha, `${p.condicion} vs ${p.rival}`, `${p.gf} - ${p.gc}`, resultadoLetra(p)]);
    const goleadores = [...statsJugadores].filter((j) => j.goles > 0).sort((a, b) => b.goles - a.goles).slice(0, 5)
      .map((j) => [`${j.nombre} ${j.apellido}`, j.goles]);
    const hoy = new Date().toISOString().slice(0, 10);
    const proximo = [...partidos]
      .filter((p) => esProgramado(p) && p.fecha >= hoy)
      .sort((a, b) => new Date(a.fecha + "T" + (a.hora || "00:00")) - new Date(b.fecha + "T" + (b.hora || "00:00")))[0];
    const proximoTxt = proximo
      ? `${proximo.condicion === "Local" ? "vs" : "@"} ${proximo.rival} — ${proximo.fecha}${proximo.hora ? " " + proximo.hora : ""} · ${proximo.competicion}${proximo.estadio ? " · " + proximo.estadio : ""}`
      : "No hay partidos programados";
    return (
      encabezadoPDF(club, "Panel del equipo") +
      `<p style="font-size:12px; margin-bottom:16px;"><strong>Próximo partido:</strong> ${proximoTxt}</p>` +
      bloqueMarcador(resumen) +
      `<h3 style="font-size:14px; margin:0 0 8px 0;">Últimos partidos</h3>` +
      tablaHTML(["Fecha", "Partido", "Resultado", "R"], ultimos) +
      `<h3 style="font-size:14px; margin:0 0 8px 0;">Goleadores</h3>` +
      tablaHTML(["Jugador", "Goles"], goleadores)
    );
  }

  if (seccion === "competicion") {
    const filas = partidos.map((p) => [
      p.fecha + (p.hora ? " " + p.hora : ""),
      p.rival,
      p.competicion + (p.jornada ? " · J" + p.jornada : ""),
      p.condicion,
      esProgramado(p) ? "Programado" : `${p.gf} - ${p.gc} (${resultadoLetra(p)})`,
      p.estadio || "-",
    ]);
    return (
      encabezadoPDF(club, "Competición") +
      bloqueMarcador(resumen) +
      `<h3 style="font-size:14px; margin:0 0 8px 0;">Partidos</h3>` +
      tablaHTML(["Fecha", "Rival", "Competición", "Cond.", "Resultado", "Estadio"], filas)
    );
  }

  if (seccion === "analisis") {
    const maximosAnotadores = [...statsJugadores].filter((j) => j.goles > 0).sort((a, b) => b.goles - a.goles).slice(0, 5)
      .map((j, i) => [i + 1, `${j.nombre} ${j.apellido}`, j.goles]);
    const maximosAsistentes = [...statsJugadores].filter((j) => j.asistencias > 0).sort((a, b) => b.asistencias - a.asistencias).slice(0, 5)
      .map((j, i) => [i + 1, `${j.nombre} ${j.apellido}`, j.asistencias]);
    const conMinutos = statsJugadores.filter((j) => j.minutos > 0);
    const masMinutos = conMinutos.length ? conMinutos.reduce((max, j) => (j.minutos > max.minutos ? j : max), conMinutos[0]) : null;

    const combos = {};
    partidos.forEach((p) => {
      (p.goleadores || []).forEach((g) => {
        if (!g.asistidoPor) return;
        const key = `${g.asistidoPor}__${g.jugadorId}`;
        combos[key] = (combos[key] || 0) + Number(g.cantidad);
      });
    });
    let mejorCombo = null;
    Object.entries(combos).forEach(([key, cant]) => {
      if (!mejorCombo || cant > mejorCombo.cant) {
        const [a, b] = key.split("__");
        const nombre = (id) => {
          const j = jugadores.find((x) => x.id === id);
          return j ? `${j.nombre} ${j.apellido}` : "—";
        };
        mejorCombo = { asistente: nombre(a), goleador: nombre(b), cant };
      }
    });

    const tablaGoles = TIPOS_ACCION.map((t) => [t, resumen.golesPorTipo[t] || 0]);
    const tablaGolesContra = TIPOS_ACCION_CONTRA.map((t) => [t, resumen.golesContraPorTipo[t] || 0]);
    const tablaJugadores = statsJugadores.map((j) => [`${j.nombre} ${j.apellido}`, j.partidosConvocados, j.minutos, j.goles, j.asistencias, j.amarillas, j.rojas]);

    return (
      encabezadoPDF(club, `Análisis de temporada${filtroTorneo && filtroTorneo !== "Todos" ? " · " + filtroTorneo : ""}`) +
      bloqueMarcador(resumen) +
      `<div style="display:flex; gap:24px; margin-bottom:18px; flex-wrap:wrap;">
        <div style="flex:1; min-width:200px;">
          <h3 style="font-size:14px; margin:0 0 8px 0;">Goles a favor por tipo de acción</h3>
          ${tablaHTML(["Tipo", "Goles"], tablaGoles)}
        </div>
        <div style="flex:1; min-width:200px;">
          <h3 style="font-size:14px; margin:0 0 8px 0;">Goles en contra por tipo de acción</h3>
          ${tablaHTML(["Tipo", "Goles"], tablaGolesContra)}
        </div>
      </div>` +
      `<p style="font-size:12px;"><strong>Mejor combinación:</strong> ${mejorCombo ? `${mejorCombo.asistente} → ${mejorCombo.goleador} (${mejorCombo.cant} goles)` : "Sin asistencias registradas"}</p>` +
      `<p style="font-size:12px; margin-bottom:16px;"><strong>Jugador con más minutos:</strong> ${masMinutos ? `${masMinutos.nombre} ${masMinutos.apellido} (${masMinutos.minutos}')` : "Sin minutos cargados"}</p>` +
      `<h3 style="font-size:14px; margin:0 0 8px 0;">Máximos anotadores</h3>` +
      tablaHTML(["#", "Jugador", "Goles"], maximosAnotadores) +
      `<h3 style="font-size:14px; margin:0 0 8px 0;">Máximos asistentes</h3>` +
      tablaHTML(["#", "Jugador", "Asist."], maximosAsistentes) +
      `<h3 style="font-size:14px; margin:0 0 8px 0;">Estadísticas por jugador</h3>` +
      tablaHTML(["Jugador", "Convoc.", "Min.", "Goles", "Asist.", "TA", "TR"], tablaJugadores)
    );
  }

  if (seccion === "miclub") {
    const filas = jugadores.map((j) => [
      j.dorsal || "-",
      `${j.nombre} ${j.apellido}`,
      j.posicion + (j.posicionSecundaria ? " / " + j.posicionSecundaria : ""),
      j.fechaNacimiento || "-",
      j.pieDominante,
      j.origen || "-",
      j.altura ? j.altura + " cm" : "-",
      j.peso ? j.peso + " kg" : "-",
    ]);
    return (
      encabezadoPDF(club, "Mi Club - Plantel") +
      `<h3 style="font-size:14px; margin:0 0 8px 0;">Plantel (${jugadores.length} jugadores)</h3>` +
      tablaHTML(["#", "Nombre", "Posición", "Nac.", "Pie", "Origen", "Altura", "Peso"], filas)
    );
  }

  return encabezadoPDF(club, "Resumen");
}

export default function ClubDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [partidos, setPartidos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [club, setClub] = useState(emptyClub());
  const [loaded, setLoaded] = useState(false);
  const [showPartidoForm, setShowPartidoForm] = useState(false);
  const [showJugadorForm, setShowJugadorForm] = useState(false);
  const [nuevoPartido, setNuevoPartido] = useState(emptyPartido());
  const [nuevoJugador, setNuevoJugador] = useState(emptyJugador());
  const [error, setError] = useState("");
  const [printHtml, setPrintHtml] = useState("");
  const [esEditor, setEsEditor] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginClave, setLoginClave] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESION_STORAGE_KEY) === "1") setEsEditor(true);
    } catch (e) {
      // almacenamiento no disponible; se queda en modo público
    }
  }, []);

  function iniciarSesion(e) {
    e.preventDefault();
    if (loginUsuario === CREDENCIALES_EDITOR.usuario && loginClave === CREDENCIALES_EDITOR.clave) {
      setEsEditor(true);
      setMostrarLogin(false);
      setLoginUsuario("");
      setLoginClave("");
      setLoginError("");
      try {
        window.sessionStorage.setItem(SESION_STORAGE_KEY, "1");
      } catch (e2) {}
    } else {
      setLoginError("Usuario o contraseña incorrectos.");
    }
  }

  function cerrarSesion() {
    setEsEditor(false);
    try {
      window.sessionStorage.removeItem(SESION_STORAGE_KEY);
    } catch (e) {}
  }


  function exportarPDF(seccion, filtroTorneo) {
    const html = generarResumenHTML(seccion, club, jugadores, partidos, filtroTorneo);
    setPrintHtml(html);
    setTimeout(() => window.print(), 100);
  }

  useEffect(() => {
    (async () => {
      try {
        const [pRes, jRes, cRes] = await Promise.allSettled([
          window.storage.get("partidos", false),
          window.storage.get("jugadores", false),
          window.storage.get("club", false),
        ]);
        if (pRes.status === "fulfilled" && pRes.value) {
          setPartidos(JSON.parse(pRes.value.value));
        }
        if (jRes.status === "fulfilled" && jRes.value) {
          setJugadores(JSON.parse(jRes.value.value));
        }
        if (cRes.status === "fulfilled" && cRes.value) {
          setClub(JSON.parse(cRes.value.value));
        }
      } catch (e) {
        // no existing data yet, fine
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function persistClub(next) {
    setClub(next);
    try {
      await window.storage.set("club", JSON.stringify(next), false);
    } catch (e) {
      setError("No se pudo guardar la configuración del club.");
    }
  }

  async function persistPartidos(next) {
    setPartidos(next);
    try {
      await window.storage.set("partidos", JSON.stringify(next), false);
    } catch (e) {
      setError("No se pudo guardar el partido. Probá de nuevo.");
    }
  }

  async function persistJugadores(next) {
    setJugadores(next);
    try {
      await window.storage.set("jugadores", JSON.stringify(next), false);
    } catch (e) {
      setError("No se pudo guardar el jugador. Probá de nuevo.");
    }
  }

  function addPartido() {
    if (!nuevoPartido.rival.trim()) {
      setError("Ingresá el rival del partido.");
      return;
    }
    const datos = { ...nuevoPartido, gf: Number(nuevoPartido.gf), gc: Number(nuevoPartido.gc) };
    const existe = partidos.some((p) => p.id === datos.id);
    const next = (existe ? partidos.map((p) => (p.id === datos.id ? datos : p)) : [...partidos, datos]).sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );
    persistPartidos(next);
    setNuevoPartido(emptyPartido());
    setShowPartidoForm(false);
    setError("");
  }

  function deletePartido(id) {
    persistPartidos(partidos.filter((p) => p.id !== id));
  }

  function addJugador() {
    if (!nuevoJugador.nombre.trim()) {
      setError("Ingresá el nombre del jugador.");
      return;
    }
    const next = [...jugadores, { ...nuevoJugador }];
    persistJugadores(next);
    setNuevoJugador(emptyJugador());
    setShowJugadorForm(false);
    setError("");
  }

  function deleteJugador(id) {
    persistJugadores(jugadores.filter((j) => j.id !== id));
  }

  function updateJugadorStat(id, field, value) {
    const next = jugadores.map((j) => (j.id === id ? { ...j, [field]: value } : j));
    persistJugadores(next);
  }

  const partidosJugados = useMemo(() => partidos.filter((p) => !esProgramado(p)), [partidos]);

  const stats = useMemo(() => {
    const pj = partidosJugados.length;
    let vic = 0,
      emp = 0,
      der = 0,
      gf = 0,
      gc = 0;
    partidosJugados.forEach((p) => {
      gf += Number(p.gf);
      gc += Number(p.gc);
      const r = resultadoLetra(p);
      if (r === "V") vic++;
      else if (r === "E") emp++;
      else der++;
    });
    const dif = gf - gc;
    const pct = pj ? Math.round((vic / pj) * 100) : 0;
    return { pj, vic, emp, der, gf, gc, dif, pct };
  }, [partidosJugados]);

  const racha = useMemo(() => {
    return [...partidosJugados]
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-5)
      .reverse()
      .map((p) => resultadoLetra(p));
  }, [partidosJugados]);

  const proximoPartido = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return [...partidos]
      .filter((p) => esProgramado(p) && p.fecha >= hoy)
      .sort((a, b) => new Date(a.fecha + "T" + (a.hora || "00:00")) - new Date(b.fecha + "T" + (b.hora || "00:00")))[0] || null;
  }, [partidos]);

  const goleadores = useMemo(() => {
    return [...jugadores].sort((a, b) => Number(b.goles) - Number(a.goles)).slice(0, 5);
  }, [jugadores]);

  return (
    <>
    <div
      className="no-print"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: COLORS.chalk,
        color: COLORS.ink,
        minHeight: "600px",
        display: "flex",
      }}
    >
      <style>{`
        ${FONT_IMPORT}
        .display-font { font-family: 'Oswald', sans-serif; }
        .nav-btn { transition: background 0.15s ease, color 0.15s ease; }
        .row-hover:hover { background: rgba(15,40,24,0.04); }
        input, select { font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #c8c2ae; border-radius: 4px; }
        .export-btn { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid ${COLORS.line}; border-radius:6px; padding:7px 12px; font-size:12px; font-weight:600; color:${COLORS.ink}; cursor:pointer; }
        .export-btn:hover { background:${COLORS.chalk}; }
        .pizarra-btn { width:100%; border:none; border-radius:6px; padding:9px 8px; font-size:11px; font-weight:600; cursor:pointer; text-align:center; }
        .pizarra-btn:hover { filter:brightness(0.95); }
        .material-btn { display:flex; flex-direction:column; align-items:center; border:1px solid ${COLORS.line}; border-radius:8px; padding:8px 2px; background:#fff; cursor:pointer; transition:box-shadow 0.15s ease, transform 0.15s ease; }
        .material-btn:hover { box-shadow:0 2px 6px rgba(0,0,0,0.15); transform:translateY(-1px); }
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div
        style={{
          width: "220px",
          minWidth: "220px",
          background: COLORS.pitchDark,
          color: COLORS.chalk,
          display: "flex",
          flexDirection: "column",
          padding: "24px 0",
        }}
      >
        <div style={{ padding: "0 20px 24px 20px", borderBottom: `1px solid rgba(245,243,234,0.12)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {club.logo ? (
              <img src={club.logo} alt="Logo" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "cover" }} />
            ) : (
              <Shield size={22} color={COLORS.amber} strokeWidth={2} />
            )}
            <span className="display-font" style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "0.02em" }}>
              {club.nombre}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "rgba(245,243,234,0.55)", marginTop: "4px", letterSpacing: "0.04em" }}>
            TEMPORADA {club.temporada}
          </div>

          <div style={{ marginTop: "12px" }}>
            {esEditor ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: COLORS.grass, fontWeight: 600 }}>
                  <Lock size={12} /> Editor: {CREDENCIALES_EDITOR.usuario}
                </span>
                <button
                  onClick={cerrarSesion}
                  title="Cerrar sesión y volver a modo público"
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", color: "rgba(245,243,234,0.65)", fontSize: "10px", cursor: "pointer", padding: 0 }}
                >
                  <LogOut size={11} /> Salir
                </button>
              </div>
            ) : mostrarLogin ? (
              <form onSubmit={iniciarSesion} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <input
                  value={loginUsuario}
                  onChange={(e) => setLoginUsuario(e.target.value)}
                  placeholder="Usuario"
                  autoFocus
                  style={{ fontSize: "11px", padding: "5px 7px", borderRadius: "4px", border: "1px solid rgba(245,243,234,0.25)", background: "rgba(255,255,255,0.08)", color: COLORS.chalk }}
                />
                <input
                  type="password"
                  value={loginClave}
                  onChange={(e) => setLoginClave(e.target.value)}
                  placeholder="Contraseña"
                  style={{ fontSize: "11px", padding: "5px 7px", borderRadius: "4px", border: "1px solid rgba(245,243,234,0.25)", background: "rgba(255,255,255,0.08)", color: COLORS.chalk }}
                />
                {loginError && <span style={{ fontSize: "10px", color: "#F28B82" }}>{loginError}</span>}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button type="submit" style={{ flex: 1, fontSize: "11px", fontWeight: 600, background: COLORS.grass, color: "#fff", border: "none", borderRadius: "4px", padding: "5px 0", cursor: "pointer" }}>
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMostrarLogin(false); setLoginError(""); }}
                    style={{ fontSize: "11px", background: "transparent", border: "none", color: "rgba(245,243,234,0.6)", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setMostrarLogin(true)}
                title="Iniciar sesión para editar"
                style={{ display: "flex", alignItems: "center", gap: "5px", background: "transparent", border: "none", color: "rgba(245,243,234,0.6)", fontSize: "11px", cursor: "pointer", padding: 0 }}
              >
                <LogIn size={12} /> Iniciar sesión para editar
              </button>
            )}
          </div>
        </div>

        <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {[
            { key: "dashboard", label: "Panel", icon: LayoutGrid },
            { key: "competicion", label: "Competición", icon: CircleDot },
            { key: "pizarra", label: "Pizarra", icon: PenTool },
            { key: "analisis", label: "Análisis", icon: BarChart3 },
            { key: "miclub", label: "Mi Club", icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className="nav-btn"
              onClick={() => setTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background: tab === key ? COLORS.grass : "transparent",
                color: tab === key ? COLORS.chalk : "rgba(245,243,234,0.7)",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
        {!esEditor && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "#EAF1FF", border: `1px solid ${CELESTE}`, color: "#1F4FA8",
              padding: "8px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px",
            }}
          >
            <Eye size={14} /> Estás viendo en modo público (solo lectura). Iniciá sesión desde el menú lateral para editar.
          </div>
        )}
        {error && (
          <div
            style={{
              background: "#FBEAE5",
              border: `1px solid ${COLORS.redCard}`,
              color: COLORS.redCard,
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {error}
            <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.redCard }}>
              <X size={14} />
            </button>
          </div>
        )}

        {tab === "dashboard" && (
          <DashboardView stats={stats} racha={racha} goleadores={goleadores} partidos={partidosJugados} proximoPartido={proximoPartido} onExportPDF={exportarPDF} />
        )}

        {tab === "competicion" && (
          <CompeticionView
            partidos={partidos}
            jugadores={jugadores}
            showForm={showPartidoForm}
            setShowForm={setShowPartidoForm}
            nuevo={nuevoPartido}
            setNuevo={setNuevoPartido}
            onAdd={addPartido}
            onDelete={deletePartido}
            onExportPDF={exportarPDF}
            esEditor={esEditor}
          />
        )}

        {tab === "pizarra" && <PizarraView jugadores={jugadores} esEditor={esEditor} />}

        {tab === "analisis" && <AnalisisView partidos={partidos} jugadores={jugadores} onExportPDF={exportarPDF} />}

        {tab === "miclub" && (
          <MiClubView
            club={club}
            onSaveClub={persistClub}
            jugadores={jugadores}
            showForm={showJugadorForm}
            setShowForm={setShowJugadorForm}
            nuevo={nuevoJugador}
            setNuevo={setNuevoJugador}
            onAdd={addJugador}
            onDelete={deleteJugador}
            onUpdateStat={updateJugadorStat}
            onExportPDF={exportarPDF}
            esEditor={esEditor}
          />
        )}
      </div>
    </div>
    <div className="print-only" dangerouslySetInnerHTML={{ __html: printHtml }} />
    </>
  );
}

function ScoreDigit({ label, value, accent }) {
  return (
    <div
      style={{
        background: COLORS.pitchDark,
        borderRadius: "6px",
        padding: "12px 18px",
        minWidth: "76px",
        textAlign: "center",
      }}
    >
      <div
        className="display-font"
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: accent || COLORS.chalk,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "10px", letterSpacing: "0.08em", color: "rgba(245,243,234,0.6)", marginTop: "4px" }}>
        {label}
      </div>
    </div>
  );
}

function DashboardView({ stats, racha, goleadores, partidos, proximoPartido, onExportPDF }) {
  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="display-font" style={{ fontSize: "26px", fontWeight: 600, margin: 0 }}>
            Panel del equipo
          </h1>
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "4px 0 0 0" }}>
            Resumen general de la temporada
          </p>
        </div>
        <button className="export-btn" onClick={() => onExportPDF("panel")}>
          <Printer size={14} /> Exportar PDF
        </button>
      </div>

      <div style={{ background: NAVY, borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <CircleDot size={14} color={CELESTE} />
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: CELESTE }}>PRÓXIMO PARTIDO</span>
          </div>
          {!proximoPartido ? (
            <p style={{ fontSize: "13px", color: "rgba(245,243,234,0.7)", margin: 0 }}>
              No hay partidos programados. Cargalos en Competición con estado "Programado".
            </p>
          ) : (
            <>
              <div className="display-font" style={{ fontSize: "18px", fontWeight: 600, color: COLORS.chalk }}>
                {proximoPartido.condicion === "Local" ? "vs" : "@"} {proximoPartido.rival}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(245,243,234,0.75)", marginTop: "2px" }}>
                {proximoPartido.fecha}{proximoPartido.hora ? ` · ${proximoPartido.hora}` : ""} · {proximoPartido.competicion}
                {proximoPartido.jornada ? ` (J${proximoPartido.jornada})` : ""}
                {proximoPartido.estadio ? ` · ${proximoPartido.estadio}` : ""}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          background: COLORS.pitch,
          borderRadius: "10px",
          padding: "18px 20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <ScoreDigit label="PJ" value={stats.pj} />
        <ScoreDigit label="VIC" value={stats.vic} accent={COLORS.grass} />
        <ScoreDigit label="EMP" value={stats.emp} accent={COLORS.amber} />
        <ScoreDigit label="DER" value={stats.der} accent={COLORS.redCard} />
        <ScoreDigit label="GF" value={stats.gf} />
        <ScoreDigit label="GC" value={stats.gc} />
        <ScoreDigit label="DIF" value={stats.dif > 0 ? `+${stats.dif}` : stats.dif} />
        <ScoreDigit label="% VICTORIAS" value={`${stats.pct}%`} accent={COLORS.amber} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0", letterSpacing: "0.02em" }}>
            Racha (últimos 5)
          </h3>
          {racha.length === 0 ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin partidos jugados</p>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              {racha.map((r, i) => (
                <div
                  key={i}
                  className="display-font"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#fff",
                    background: r === "V" ? COLORS.grass : r === "E" ? COLORS.amber : COLORS.redCard,
                  }}
                >
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0", letterSpacing: "0.02em" }}>
            Goleadores
          </h3>
          {goleadores.length === 0 || goleadores.every((j) => Number(j.goles) === 0) ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin goles registrados</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {goleadores
                .filter((j) => Number(j.goles) > 0)
                .map((j) => (
                  <div key={j.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span>{j.nombre} {j.apellido}</span>
                    <span className="display-font" style={{ fontWeight: 600 }}>
                      {j.goles}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px", marginTop: "20px" }}>
        <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0", letterSpacing: "0.02em" }}>
          Últimos partidos
        </h3>
        {partidos.length === 0 ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>No hay partidos registrados todavía</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {partidos.slice(0, 5).map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                <span>{p.fecha} · {p.condicion} vs {p.rival}</span>
                <span className="display-font" style={{ fontWeight: 600 }}>{p.gf} - {p.gc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompeticionView({ partidos, jugadores, showForm, setShowForm, nuevo, setNuevo, onAdd, onDelete, onExportPDF, esEditor }) {
  const editando = partidos.some((p) => p.id === nuevo.id);

  const formacionActual = useMemo(() => {
    const lineas = FORMACIONES[nuevo.formacion] || FORMACIONES["4-3-3 Clásico"];
    return generarFormacion(lineas);
  }, [nuevo.formacion]);

  function nombreJugador(id) {
    const j = jugadores.find((x) => x.id === id);
    return j ? `${j.dorsal ? "#" + j.dorsal + " " : ""}${j.nombre} ${j.apellido}` : "—";
  }

  function toggleConvocado(id) {
    const yaEsta = nuevo.convocados.includes(id);
    let convocados = yaEsta ? nuevo.convocados.filter((x) => x !== id) : [...nuevo.convocados, id];
    let titulares = nuevo.titulares;
    let suplentes = nuevo.suplentes;
    if (yaEsta) {
      // si se desconvoca, sacarlo también de titulares/suplentes
      titulares = Object.fromEntries(Object.entries(titulares).filter(([, v]) => v !== id));
      suplentes = suplentes.filter((x) => x !== id);
    }
    setNuevo({ ...nuevo, convocados, titulares, suplentes });
  }

  function setTitular(slot, jugadorId) {
    const titulares = { ...nuevo.titulares };
    if (jugadorId === "") {
      delete titulares[slot];
    } else {
      titulares[slot] = jugadorId;
    }
    // sacarlo de suplentes si estaba ahí
    const suplentes = nuevo.suplentes.filter((x) => x !== jugadorId);
    setNuevo({ ...nuevo, titulares, suplentes });
  }

  function toggleSuplente(id) {
    const yaEsta = nuevo.suplentes.includes(id);
    if (!yaEsta && nuevo.suplentes.length >= 7) return;
    const suplentes = yaEsta ? nuevo.suplentes.filter((x) => x !== id) : [...nuevo.suplentes, id];
    setNuevo({ ...nuevo, suplentes });
  }

  function addFila(campo) {
    if (nuevo.convocados.length === 0) return;
    const base = { jugadorId: nuevo.convocados[0], cantidad: 1 };
    if (campo === "goleadores") {
      base.tipoAccion = "Jugada";
      base.asistidoPor = "";
    }
    setNuevo({ ...nuevo, [campo]: [...nuevo[campo], base] });
  }
  function updateFila(campo, idx, key, value) {
    const arr = nuevo[campo].map((f, i) => (i === idx ? { ...f, [key]: value } : f));
    setNuevo({ ...nuevo, [campo]: arr });
  }
  function removeFila(campo, idx) {
    setNuevo({ ...nuevo, [campo]: nuevo[campo].filter((_, i) => i !== idx) });
  }

  function addContraFila() {
    setNuevo({ ...nuevo, golesContraDetalle: [...nuevo.golesContraDetalle, { tipoAccion: TIPOS_ACCION_CONTRA[0], cantidad: 1 }] });
  }
  function updateContraFila(idx, key, value) {
    const arr = nuevo.golesContraDetalle.map((f, i) => (i === idx ? { ...f, [key]: value } : f));
    setNuevo({ ...nuevo, golesContraDetalle: arr });
  }
  function removeContraFila(idx) {
    setNuevo({ ...nuevo, golesContraDetalle: nuevo.golesContraDetalle.filter((_, i) => i !== idx) });
  }

  function updateMinutos(jugadorId, valor) {
    setNuevo({ ...nuevo, minutosJugados: { ...nuevo.minutosJugados, [jugadorId]: valor } });
  }

  function addSustitucion() {
    if (nuevo.convocados.length < 2) return;
    setNuevo({
      ...nuevo,
      sustituciones: [...nuevo.sustituciones, { sale: nuevo.convocados[0], entra: nuevo.convocados[1], minuto: 46 }],
    });
  }
  function updateSustitucion(idx, key, value) {
    const arr = nuevo.sustituciones.map((f, i) => (i === idx ? { ...f, [key]: value } : f));
    setNuevo({ ...nuevo, sustituciones: arr });
  }
  function removeSustitucion(idx) {
    setNuevo({ ...nuevo, sustituciones: nuevo.sustituciones.filter((_, i) => i !== idx) });
  }

  const titularesIds = Object.values(nuevo.titulares);
  const disponiblesParaSlot = (slotActual) => {
    return nuevo.convocados.filter((id) => !titularesIds.includes(id) || nuevo.titulares[slotActual] === id);
  };
  const disponiblesParaSuplente = nuevo.convocados.filter((id) => !titularesIds.includes(id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 className="display-font" style={{ fontSize: "26px", fontWeight: 600, margin: 0 }}>
            Competición
          </h1>
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "4px 0 0 0" }}>
            Partidos, convocatoria y alineación
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="export-btn" onClick={() => onExportPDF("competicion")}>
            <Printer size={14} /> Exportar PDF
          </button>
          {esEditor && (
            <button
              onClick={() => {
                if (!showForm) setNuevo(emptyPartido());
                setShowForm(!showForm);
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: COLORS.grass, color: "#fff", border: "none", borderRadius: "6px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              <Plus size={15} /> Nuevo partido
            </button>
          )}
        </div>
      </div>

      {esEditor && showForm && (
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px", marginBottom: "20px", background: "#fff" }}>
          {/* Datos generales */}
          <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 10px 0" }}>
            {editando ? "Editar partido" : "Datos del partido"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 0.6fr 0.7fr 0.7fr", gap: "10px", marginBottom: "10px" }}>
            <Field label="Rival">
              <input value={nuevo.rival} onChange={(e) => setNuevo({ ...nuevo, rival: e.target.value })} placeholder="Nombre del rival" style={inputStyle} />
            </Field>
            <Field label="Competición">
              <select value={nuevo.competicion} onChange={(e) => setNuevo({ ...nuevo, competicion: e.target.value })} style={inputStyle}>
                {COMPETICIONES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Jornada">
              <input type="number" min="1" value={nuevo.jornada} onChange={(e) => setNuevo({ ...nuevo, jornada: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Condición">
              <select value={nuevo.condicion} onChange={(e) => setNuevo({ ...nuevo, condicion: e.target.value })} style={inputStyle}>
                <option>Local</option>
                <option>Visitante</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={nuevo.estado} onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })} style={inputStyle}>
                {ESTADOS_PARTIDO.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 0.6fr 1.2fr 0.6fr 0.6fr", gap: "10px", marginBottom: "10px" }}>
            <Field label="Fecha">
              <input type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Hora">
              <input type="time" value={nuevo.hora} onChange={(e) => setNuevo({ ...nuevo, hora: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Estadio">
              <input value={nuevo.estadio} onChange={(e) => setNuevo({ ...nuevo, estadio: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="GF">
              <input type="number" min="0" value={nuevo.gf} onChange={(e) => setNuevo({ ...nuevo, gf: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="GC">
              <input type="number" min="0" value={nuevo.gc} onChange={(e) => setNuevo({ ...nuevo, gc: e.target.value })} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: "10px", marginBottom: "16px" }}>
            <Field label="Árbitro">
              <input value={nuevo.arbitro} onChange={(e) => setNuevo({ ...nuevo, arbitro: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Asistentes">
              <input value={nuevo.asistentes} onChange={(e) => setNuevo({ ...nuevo, asistentes: e.target.value })} placeholder="Separados por coma" style={inputStyle} />
            </Field>
            <Field label="Link del video">
              <input value={nuevo.videoUrl} onChange={(e) => setNuevo({ ...nuevo, videoUrl: e.target.value })} placeholder="https://" style={inputStyle} />
            </Field>
          </div>

          {/* Convocatoria */}
          <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 10px 0" }}>
            Convocatoria ({nuevo.convocados.length})
          </h3>
          {jugadores.length === 0 ? (
            <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "0 0 16px 0" }}>Cargá jugadores en Mi Club para poder convocarlos.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
              {jugadores.map((j) => {
                const activo = nuevo.convocados.includes(j.id);
                return (
                  <button
                    key={j.id}
                    onClick={() => toggleConvocado(j.id)}
                    style={{
                      fontSize: "12px",
                      padding: "6px 10px",
                      borderRadius: "14px",
                      border: `1px solid ${activo ? COLORS.grass : COLORS.line}`,
                      background: activo ? COLORS.grass : "#fff",
                      color: activo ? "#fff" : COLORS.ink,
                      cursor: "pointer",
                    }}
                  >
                    #{j.dorsal || "-"} {j.nombre} {j.apellido}
                  </button>
                );
              })}
            </div>
          )}

          {/* Goleadores */}
          <GoleadoresList
            nuevo={nuevo}
            addFila={addFila}
            updateFila={updateFila}
            removeFila={removeFila}
            nombreJugador={nombreJugador}
          />
          <DynamicStatList
            title="Tarjetas amarillas"
            campo="amarillas"
            nuevo={nuevo}
            addFila={addFila}
            updateFila={updateFila}
            removeFila={removeFila}
            opciones={nuevo.convocados}
            nombreJugador={nombreJugador}
          />
          <DynamicStatList
            title="Tarjetas rojas"
            campo="rojas"
            nuevo={nuevo}
            addFila={addFila}
            updateFila={updateFila}
            removeFila={removeFila}
            opciones={nuevo.convocados}
            nombreJugador={nombreJugador}
          />

          {/* Goles en contra por tipo de acción */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>
                Goles en contra recibidos (por tipo de acción)
              </h3>
              <button
                onClick={addContraFila}
                style={{ fontSize: "11px", background: "none", border: `1px solid ${COLORS.line}`, borderRadius: "5px", padding: "4px 8px", cursor: "pointer", color: COLORS.inkSoft }}
              >
                + agregar
              </button>
            </div>
            {nuevo.golesContraDetalle.length === 0 ? (
              <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>Sin registros.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {nuevo.golesContraDetalle.map((fila, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select value={fila.tipoAccion} onChange={(e) => updateContraFila(idx, "tipoAccion", e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                      {TIPOS_ACCION_CONTRA.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={fila.cantidad}
                      onChange={(e) => updateContraFila(idx, "cantidad", Number(e.target.value))}
                      style={{ ...inputStyle, width: "56px" }}
                    />
                    <button onClick={() => removeContraFila(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alineación */}
          <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: "18px 0 10px 0" }}>
            Alineación (11 titulares)
          </h3>
          <Field label="Sistema táctico">
            <select
              value={nuevo.formacion}
              onChange={(e) => setNuevo({ ...nuevo, formacion: e.target.value, titulares: {} })}
              style={{ ...inputStyle, maxWidth: "320px", marginBottom: "12px" }}
            >
              {FORMACIONES_CATEGORIAS.map((cat) => (
                <optgroup key={cat.grupo} label={cat.grupo}>
                  {Object.keys(cat.sistemas).map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <div style={{ background: NAVY, borderRadius: "10px", overflow: "hidden", maxWidth: "380px", margin: "0 auto 18px auto" }}>
            {/* Header con badge de formación */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", color: COLORS.chalk, fontSize: "13px", fontWeight: 600 }}>
                <CircleDot size={15} color={CELESTE} /> Alineación
              </span>
              <span
                className="display-font"
                style={{ background: CELESTE, color: "#fff", fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px" }}
              >
                {shortCode(nuevo.formacion)}
              </span>
            </div>

            {nuevo.convocados.length === 0 ? (
              <p style={{ fontSize: "12px", color: "rgba(245,243,234,0.65)", padding: "0 14px 16px 14px", margin: 0 }}>
                Convocá jugadores primero para armar la alineación.
              </p>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "2 / 3",
                  background: `repeating-linear-gradient(${CESPED}, ${CESPED} 12%, ${CESPED_OSCURO} 12%, ${CESPED_OSCURO} 24%)`,
                }}
              >
                {/* Líneas de cancha */}
                <div style={{ position: "absolute", inset: "6px", border: "1.5px solid rgba(255,255,255,0.45)", borderRadius: "3px" }} />
                <div style={{ position: "absolute", top: "50%", left: "6px", right: "6px", borderTop: "1.5px solid rgba(255,255,255,0.45)" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", width: "64px", height: "64px", marginLeft: "-32px", marginTop: "-32px", border: "1.5px solid rgba(255,255,255,0.45)", borderRadius: "50%" }} />
                {/* Área rival (arriba) */}
                <div style={{ position: "absolute", top: "6px", left: "28%", width: "44%", height: "11%", borderLeft: "1.5px solid rgba(255,255,255,0.45)", borderRight: "1.5px solid rgba(255,255,255,0.45)", borderBottom: "1.5px solid rgba(255,255,255,0.45)" }} />
                {/* Área propia (abajo, con área chica) */}
                <div style={{ position: "absolute", bottom: "6px", left: "16%", width: "68%", height: "20%", borderLeft: "1.5px solid rgba(255,255,255,0.45)", borderRight: "1.5px solid rgba(255,255,255,0.45)", borderTop: "1.5px solid rgba(255,255,255,0.45)" }} />
                <div style={{ position: "absolute", bottom: "6px", left: "34%", width: "32%", height: "10%", borderLeft: "1.5px solid rgba(255,255,255,0.45)", borderRight: "1.5px solid rgba(255,255,255,0.45)", borderTop: "1.5px solid rgba(255,255,255,0.45)" }} />

                {formacionActual.map((f, i) => {
                  const key = `${f.slot}-${i}`;
                  const jugadorId = nuevo.titulares[key] || "";
                  const jugador = jugadores.find((j) => j.id === jugadorId);
                  const letra = f.slot.replace(/\d+$/, "");
                  const rol = ROL_POR_LETRA[letra] || letra;
                  return (
                    <div key={key} style={{ position: "absolute", top: `${f.top}%`, left: `${f.left}%`, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", width: "50px" }}>
                      <div style={{ position: "relative", width: "40px", height: "40px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            border: jugador ? "2px solid rgba(255,255,255,0.9)" : "2px dashed rgba(255,255,255,0.55)",
                            background: "rgba(0,0,0,0.28)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                          }}
                        >
                          {jugador ? (
                            <span className="display-font" style={{ fontSize: "12px", fontWeight: 700 }}>
                              {jugador.dorsal || jugador.nombre?.[0] || "?"}
                            </span>
                          ) : (
                            <Plus size={16} color="rgba(255,255,255,0.85)" />
                          )}
                        </div>
                        <select
                          value={jugadorId}
                          onChange={(e) => setTitular(key, e.target.value)}
                          title={jugador ? `${jugador.nombre} ${jugador.apellido}` : "Seleccionar jugador"}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: nuevo.convocados.length ? "pointer" : "not-allowed", border: "none" }}
                        >
                          <option value="">{rol}</option>
                          {disponiblesParaSlot(key).map((id) => (
                            <option key={id} value={id}>
                              {nombreJugador(id)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.85)", marginTop: "4px", letterSpacing: "0.03em" }}>{rol}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra de suplentes */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <Users size={14} color={CELESTE} style={{ marginTop: "2px", flexShrink: 0 }} />
              <div style={{ fontSize: "12px", color: "rgba(245,243,234,0.9)" }}>
                <span style={{ fontWeight: 600 }}>Suplentes ({nuevo.suplentes.length}/7): </span>
                {nuevo.convocados.length === 0 ? (
                  <span style={{ color: "rgba(245,243,234,0.6)" }}>Selecciona convocados primero</span>
                ) : disponiblesParaSuplente.length === 0 ? (
                  <span style={{ color: "rgba(245,243,234,0.6)" }}>No hay convocados disponibles</span>
                ) : (
                  <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {disponiblesParaSuplente.map((id) => {
                      const activo = nuevo.suplentes.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleSuplente(id)}
                          style={{
                            fontSize: "11px",
                            padding: "4px 9px",
                            borderRadius: "12px",
                            border: `1px solid ${activo ? CELESTE : "rgba(245,243,234,0.3)"}`,
                            background: activo ? CELESTE : "transparent",
                            color: activo ? "#fff" : "rgba(245,243,234,0.9)",
                            cursor: "pointer",
                          }}
                        >
                          {nombreJugador(id)}
                        </button>
                      );
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Minutos jugados */}
          <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 10px 0" }}>
            Minutos jugados
          </h3>
          {nuevo.convocados.length === 0 ? (
            <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "0 0 16px 0" }}>Convocá jugadores primero para cargar sus minutos.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: "18px" }}>
              {nuevo.convocados.map((id) => (
                <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px" }}>{nombreJugador(id)}</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={nuevo.minutosJugados[id] ?? ""}
                    onChange={(e) => updateMinutos(id, Number(e.target.value))}
                    placeholder="0"
                    style={{ ...inputStyle, width: "64px" }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Sustituciones */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>
                Sustituciones
              </h3>
              <button
                onClick={addSustitucion}
                disabled={nuevo.convocados.length < 2}
                style={{ fontSize: "11px", background: "none", border: `1px solid ${COLORS.line}`, borderRadius: "5px", padding: "4px 8px", cursor: nuevo.convocados.length < 2 ? "not-allowed" : "pointer", color: COLORS.inkSoft }}
              >
                + agregar
              </button>
            </div>
            {nuevo.sustituciones.length === 0 ? (
              <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>Sin cambios registrados.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {nuevo.sustituciones.map((s, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 0.3fr 1fr 0.5fr 0.3fr", gap: "6px", alignItems: "center" }}>
                    <select value={s.sale} onChange={(e) => updateSustitucion(idx, "sale", e.target.value)} style={inputStyle}>
                      {nuevo.convocados.map((id) => (
                        <option key={id} value={id}>
                          Sale: {nombreJugador(id)}
                        </option>
                      ))}
                    </select>
                    <span style={{ textAlign: "center", fontSize: "12px", color: COLORS.inkSoft }}>→</span>
                    <select value={s.entra} onChange={(e) => updateSustitucion(idx, "entra", e.target.value)} style={inputStyle}>
                      {nuevo.convocados.map((id) => (
                        <option key={id} value={id}>
                          Entra: {nombreJugador(id)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={s.minuto}
                      onChange={(e) => updateSustitucion(idx, "minuto", Number(e.target.value))}
                      style={inputStyle}
                      title="Minuto del cambio"
                    />
                    <button onClick={() => removeSustitucion(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onAdd}
              style={{ background: COLORS.pitchDark, color: "#fff", border: "none", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              {editando ? "Guardar cambios" : "Guardar partido"}
            </button>
            {editando && (
              <button
                onClick={() => {
                  setNuevo(emptyPartido());
                  setShowForm(false);
                }}
                style={{ background: "#fff", color: COLORS.inkSoft, border: `1px solid ${COLORS.line}`, borderRadius: "6px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.3fr 1fr 0.7fr 0.9fr 0.6fr", padding: "10px 16px", background: COLORS.pitch, color: COLORS.chalk, fontSize: "11px", letterSpacing: "0.06em" }}>
          <span>FECHA</span>
          <span>RIVAL</span>
          <span>COMPETICIÓN</span>
          <span>COND.</span>
          <span>RESULTADO</span>
          <span></span>
        </div>
        {partidos.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>
            No hay partidos registrados. Agregá el primero arriba.
          </div>
        ) : (
          partidos.map((p) => {
            const programado = esProgramado(p);
            const r = programado ? null : resultadoLetra(p);
            return (
              <div
                key={p.id}
                className="row-hover"
                style={{ display: "grid", gridTemplateColumns: "0.9fr 1.3fr 1fr 0.7fr 0.9fr 0.6fr", padding: "10px 16px", fontSize: "13px", alignItems: "center", borderTop: `1px solid ${COLORS.line}` }}
              >
                <span>{p.fecha}{p.hora ? ` · ${p.hora}` : ""}</span>
                <span>{p.rival}{p.jornada ? ` (J${p.jornada})` : ""}</span>
                <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>{p.competicion}</span>
                <span>{p.condicion}</span>
                {programado ? (
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", color: "#fff", background: CELESTE, width: "fit-content" }}>
                    PROGRAMADO
                  </span>
                ) : (
                  <span className="display-font" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    {p.gf} - {p.gc}
                    <span style={{ fontSize: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", color: "#fff", background: r === "V" ? COLORS.grass : r === "E" ? COLORS.amber : COLORS.redCard }}>
                      {r}
                    </span>
                  </span>
                )}
                <span style={{ display: "flex", gap: "10px", justifySelf: "end" }}>
                  {esEditor && (
                    <>
                      <button
                        onClick={() => {
                          setNuevo({ ...emptyPartido(), ...p });
                          setShowForm(true);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}
                        title="Editar partido"
                      >
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }} title="Eliminar partido">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DynamicStatList({ title, campo, nuevo, addFila, updateFila, removeFila, opciones, nombreJugador }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>
          {title}
        </h3>
        <button
          onClick={() => addFila(campo)}
          disabled={opciones.length === 0}
          style={{ fontSize: "11px", background: "none", border: `1px solid ${COLORS.line}`, borderRadius: "5px", padding: "4px 8px", cursor: opciones.length === 0 ? "not-allowed" : "pointer", color: COLORS.inkSoft }}
        >
          + agregar
        </button>
      </div>
      {nuevo[campo].length === 0 ? (
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>Sin registros.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {nuevo[campo].map((fila, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select value={fila.jugadorId} onChange={(e) => updateFila(campo, idx, "jugadorId", e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                {opciones.map((id) => (
                  <option key={id} value={id}>
                    {nombreJugador(id)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={fila.cantidad}
                onChange={(e) => updateFila(campo, idx, "cantidad", Number(e.target.value))}
                style={{ ...inputStyle, width: "56px" }}
              />
              <button onClick={() => removeFila(campo, idx)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function MiClubView({ club, onSaveClub, jugadores, showForm, setShowForm, nuevo, setNuevo, onAdd, onDelete, onUpdateStat, onExportPDF, esEditor }) {
  const [clubDraft, setClubDraft] = useState(club);
  const [statsOpenId, setStatsOpenId] = useState(null);

  useEffect(() => setClubDraft(club), [club]);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setClubDraft({ ...clubDraft, logo: dataUrl });
  }

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setNuevo({ ...nuevo, foto: dataUrl });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 className="display-font" style={{ fontSize: "26px", fontWeight: 600, margin: "0 0 4px 0" }}>
            Mi Club
          </h1>
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>
            Datos del club y plantel de jugadores
          </p>
        </div>
        <button className="export-btn" onClick={() => onExportPDF("miclub")}>
          <Printer size={14} /> Exportar PDF
        </button>
      </div>

      {/* Config del club */}
      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px", marginBottom: "24px", background: "#fff" }}>
        <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 14px 0" }}>
          Datos del club
        </h3>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: COLORS.inkSoft }}>Escudo</label>
            {esEditor ? (
              <label style={{ cursor: "pointer" }}>
                {clubDraft.logo ? (
                  <img src={clubDraft.logo} alt="Logo" style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover", border: `1px solid ${COLORS.line}` }} />
                ) : (
                  <div style={{ width: "48px", height: "48px", borderRadius: "6px", border: `1px dashed ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Shield size={18} color={COLORS.inkSoft} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              </label>
            ) : club.logo ? (
              <img src={club.logo} alt="Logo" style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover", border: `1px solid ${COLORS.line}` }} />
            ) : (
              <div style={{ width: "48px", height: "48px", borderRadius: "6px", border: `1px dashed ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={18} color={COLORS.inkSoft} />
              </div>
            )}
          </div>
          {esEditor ? (
            <>
              <Field label="Nombre del club">
                <input value={clubDraft.nombre} onChange={(e) => setClubDraft({ ...clubDraft, nombre: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Temporada">
                <input value={clubDraft.temporada} onChange={(e) => setClubDraft({ ...clubDraft, temporada: e.target.value })} style={{ ...inputStyle, width: "90px" }} />
              </Field>
              <button
                onClick={() => onSaveClub(clubDraft)}
                style={{ background: COLORS.pitchDark, color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Guardar
              </button>
            </>
          ) : (
            <div>
              <div style={{ fontSize: "15px", fontWeight: 600 }}>{club.nombre}</div>
              <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>Temporada {club.temporada}</div>
            </div>
          )}
        </div>
      </div>

      {/* Plantel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
          Plantel
        </h3>
        {esEditor && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: COLORS.grass, color: "#fff", border: "none", borderRadius: "6px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} /> Nuevo jugador
          </button>
        )}
      </div>

      {esEditor && showForm && (
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "16px", marginBottom: "20px", background: "#fff" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
            <label style={{ cursor: "pointer" }}>
              {nuevo.foto ? (
                <img src={nuevo.foto} alt="" style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${COLORS.line}` }} />
              ) : (
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: `1px dashed ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: COLORS.inkSoft, textAlign: "center" }}>
                  Foto
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFotoUpload} style={{ display: "none" }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", flex: 1 }}>
              <Field label="Nombre">
                <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Apellido">
                <input value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} style={inputStyle} />
              </Field>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.6fr 0.8fr 0.8fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <Field label="Dorsal">
              <input type="number" min="1" value={nuevo.dorsal} onChange={(e) => setNuevo({ ...nuevo, dorsal: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Posición">
              <select value={nuevo.posicion} onChange={(e) => setNuevo({ ...nuevo, posicion: e.target.value })} style={inputStyle}>
                {POSICIONES.map((pos) => (
                  <option key={pos}>{pos}</option>
                ))}
              </select>
            </Field>
            <Field label="Posición secundaria">
              <select value={nuevo.posicionSecundaria} onChange={(e) => setNuevo({ ...nuevo, posicionSecundaria: e.target.value })} style={inputStyle}>
                <option value="">—</option>
                {POSICIONES.map((pos) => (
                  <option key={pos}>{pos}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de nacimiento">
              <input type="date" value={nuevo.fechaNacimiento} onChange={(e) => setNuevo({ ...nuevo, fechaNacimiento: e.target.value })} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 0.7fr 0.7fr", gap: "10px" }}>
            <Field label="Pie dominante">
              <select value={nuevo.pieDominante} onChange={(e) => setNuevo({ ...nuevo, pieDominante: e.target.value })} style={inputStyle}>
                {PIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Origen">
              <input value={nuevo.origen} onChange={(e) => setNuevo({ ...nuevo, origen: e.target.value })} placeholder="Ciudad / país" style={inputStyle} />
            </Field>
            <Field label="Altura (cm)">
              <input type="number" min="0" value={nuevo.altura} onChange={(e) => setNuevo({ ...nuevo, altura: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Peso (kg)">
              <input type="number" min="0" value={nuevo.peso} onChange={(e) => setNuevo({ ...nuevo, peso: e.target.value })} style={inputStyle} />
            </Field>
          </div>

          <button
            onClick={onAdd}
            style={{ marginTop: "14px", background: COLORS.pitchDark, color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            Guardar jugador
          </button>
        </div>
      )}

      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.5fr 0.4fr 1.3fr 0.6fr 0.6fr 0.5fr", padding: "10px 16px", background: COLORS.pitch, color: COLORS.chalk, fontSize: "11px", letterSpacing: "0.06em" }}>
          <span>#</span>
          <span></span>
          <span>NOMBRE</span>
          <span>POS.</span>
          <span>NAC.</span>
          <span></span>
        </div>
        {jugadores.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>
            No hay jugadores cargados. Agregá el primero arriba.
          </div>
        ) : (
          jugadores.map((j) => (
            <React.Fragment key={j.id}>
              <div
                className="row-hover"
                onClick={() => setStatsOpenId(statsOpenId === j.id ? null : j.id)}
                style={{ display: "grid", gridTemplateColumns: "0.5fr 0.4fr 1.3fr 0.6fr 0.6fr 0.5fr", padding: "8px 16px", fontSize: "13px", alignItems: "center", borderTop: `1px solid ${COLORS.line}`, cursor: "pointer" }}
              >
                <span className="display-font" style={{ fontWeight: 600 }}>{j.dorsal || "-"}</span>
                <span>
                  {j.foto ? (
                    <img src={j.foto} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: COLORS.line }} />
                  )}
                </span>
                <span>{j.nombre} {j.apellido}</span>
                <span>{j.posicion}{j.posicionSecundaria ? ` / ${j.posicionSecundaria}` : ""}</span>
                <span>{j.fechaNacimiento || "-"}</span>
                {esEditor && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(j.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft, justifySelf: "end" }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {statsOpenId === j.id && (
                <div style={{ padding: "14px 16px 18px 16px", background: "#FAF9F4", borderTop: `1px solid ${COLORS.line}` }}>
                  <div style={{ display: "flex", gap: "24px", fontSize: "12px", color: COLORS.inkSoft, marginBottom: "12px", flexWrap: "wrap" }}>
                    <span>Pie: <strong style={{ color: COLORS.ink }}>{j.pieDominante}</strong></span>
                    <span>Origen: <strong style={{ color: COLORS.ink }}>{j.origen || "-"}</strong></span>
                    <span>Altura: <strong style={{ color: COLORS.ink }}>{j.altura ? `${j.altura} cm` : "-"}</strong></span>
                    <span>Peso: <strong style={{ color: COLORS.ink }}>{j.peso ? `${j.peso} kg` : "-"}</strong></span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, auto)", gap: "18px", alignItems: "center" }}>
                    <StatField label="PJ" value={j.partidosJugados} onChange={(v) => onUpdateStat(j.id, "partidosJugados", v)} disabled={!esEditor} />
                    <StatField label="Min." value={j.minutos} onChange={(v) => onUpdateStat(j.id, "minutos", v)} disabled={!esEditor} />
                    <StatField label="Goles" value={j.goles} onChange={(v) => onUpdateStat(j.id, "goles", v)} disabled={!esEditor} />
                    <StatField label="Asist." value={j.asistencias} onChange={(v) => onUpdateStat(j.id, "asistencias", v)} disabled={!esEditor} />
                    <StatField label="TA" value={j.amarillas} onChange={(v) => onUpdateStat(j.id, "amarillas", v)} disabled={!esEditor} />
                    <StatField label="TR" value={j.rojas} onChange={(v) => onUpdateStat(j.id, "rojas", v)} disabled={!esEditor} />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

function StatField({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
      <span style={{ fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "0.04em" }}>{label}</span>
      <StatCell value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function StatCell({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      min="0"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ...inputStyle, padding: "4px 6px", width: "48px", background: disabled ? COLORS.chalk : "#fff", color: disabled ? COLORS.inkSoft : COLORS.ink }}
    />
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "11px", color: COLORS.inkSoft, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  border: `1px solid ${COLORS.line}`,
  borderRadius: "5px",
  padding: "8px 10px",
  fontSize: "13px",
  color: COLORS.ink,
  outline: "none",
  background: "#fff",
};

function GoleadoresList({ nuevo, addFila, updateFila, removeFila, nombreJugador }) {
  const opciones = nuevo.convocados;
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 className="display-font" style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>
          Goleadores
        </h3>
        <button
          onClick={() => addFila("goleadores")}
          disabled={opciones.length === 0}
          style={{ fontSize: "11px", background: "none", border: `1px solid ${COLORS.line}`, borderRadius: "5px", padding: "4px 8px", cursor: opciones.length === 0 ? "not-allowed" : "pointer", color: COLORS.inkSoft }}
        >
          + agregar
        </button>
      </div>
      {nuevo.goleadores.length === 0 ? (
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>Sin goles registrados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {nuevo.goleadores.map((fila, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.5fr 1fr 1.1fr 0.3fr", gap: "6px", alignItems: "center" }}>
              <select value={fila.jugadorId} onChange={(e) => updateFila("goleadores", idx, "jugadorId", e.target.value)} style={inputStyle}>
                {opciones.map((id) => (
                  <option key={id} value={id}>
                    {nombreJugador(id)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={fila.cantidad}
                onChange={(e) => updateFila("goleadores", idx, "cantidad", Number(e.target.value))}
                style={inputStyle}
              />
              <select value={fila.tipoAccion} onChange={(e) => updateFila("goleadores", idx, "tipoAccion", e.target.value)} style={inputStyle}>
                {TIPOS_ACCION.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select value={fila.asistidoPor} onChange={(e) => updateFila("goleadores", idx, "asistidoPor", e.target.value)} style={inputStyle}>
                <option value="">Sin asistencia</option>
                {opciones.filter((id) => id !== fila.jugadorId).map((id) => (
                  <option key={id} value={id}>
                    Asiste: {nombreJugador(id)}
                  </option>
                ))}
              </select>
              <button onClick={() => removeFila("goleadores", idx)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalisisView({ partidos, jugadores, onExportPDF }) {
  const [filtroTorneo, setFiltroTorneo] = useState("Todos");

  const partidosFiltrados = useMemo(() => {
    return partidos.filter((p) => {
      if (esProgramado(p)) return false;
      if (filtroTorneo !== "Todos" && p.competicion !== filtroTorneo) return false;
      return true;
    });
  }, [partidos, filtroTorneo]);

  const resumen = useMemo(() => {
    const pj = partidosFiltrados.length;
    let vic = 0, emp = 0, der = 0, gf = 0, gc = 0;
    const golesPorTipo = {};
    TIPOS_ACCION.forEach((t) => (golesPorTipo[t] = 0));
    const golesContraPorTipo = {};
    TIPOS_ACCION_CONTRA.forEach((t) => (golesContraPorTipo[t] = 0));
    partidosFiltrados.forEach((p) => {
      gf += Number(p.gf);
      gc += Number(p.gc);
      const r = resultadoLetra(p);
      if (r === "V") vic++;
      else if (r === "E") emp++;
      else der++;
      (p.goleadores || []).forEach((g) => {
        golesPorTipo[g.tipoAccion] = (golesPorTipo[g.tipoAccion] || 0) + Number(g.cantidad);
      });
      (p.golesContraDetalle || []).forEach((g) => {
        golesContraPorTipo[g.tipoAccion] = (golesContraPorTipo[g.tipoAccion] || 0) + Number(g.cantidad);
      });
    });
    return { pj, vic, emp, der, gf, gc, dif: gf - gc, golesPorTipo, golesContraPorTipo };
  }, [partidosFiltrados]);

  const statsJugadores = useMemo(() => {
    return jugadores.map((j) => {
      let goles = 0, asistencias = 0, amarillas = 0, rojas = 0;
      let convocado = 0;
      let minutos = 0;
      partidosFiltrados.forEach((p) => {
        if ((p.convocados || []).includes(j.id)) convocado++;
        minutos += Number((p.minutosJugados || {})[j.id] || 0);
        (p.goleadores || []).forEach((g) => {
          if (g.jugadorId === j.id) goles += Number(g.cantidad);
          if (g.asistidoPor === j.id) asistencias += Number(g.cantidad);
        });
        (p.amarillas || []).forEach((a) => {
          if (a.jugadorId === j.id) amarillas += Number(a.cantidad);
        });
        (p.rojas || []).forEach((r) => {
          if (r.jugadorId === j.id) rojas += Number(r.cantidad);
        });
      });
      if (minutos === 0) minutos = Number(j.minutos) || 0;
      return {
        ...j,
        partidosConvocados: convocado,
        minutos,
        goles,
        asistencias,
        amarillas,
        rojas,
      };
    });
  }, [jugadores, partidosFiltrados]);

  const maximosAnotadores = useMemo(
    () => [...statsJugadores].filter((j) => j.goles > 0).sort((a, b) => b.goles - a.goles).slice(0, 5),
    [statsJugadores]
  );

  const maximosAsistentes = useMemo(
    () => [...statsJugadores].filter((j) => j.asistencias > 0).sort((a, b) => b.asistencias - a.asistencias).slice(0, 5),
    [statsJugadores]
  );

  const jugadorMasMinutos = useMemo(() => {
    const conMinutos = statsJugadores.filter((j) => j.minutos > 0);
    if (conMinutos.length === 0) return null;
    return conMinutos.reduce((max, j) => (j.minutos > max.minutos ? j : max), conMinutos[0]);
  }, [statsJugadores]);

  const mejorCombinacion = useMemo(() => {
    const combos = {};
    partidosFiltrados.forEach((p) => {
      (p.goleadores || []).forEach((g) => {
        if (!g.asistidoPor) return;
        const key = `${g.asistidoPor}__${g.jugadorId}`;
        combos[key] = (combos[key] || 0) + Number(g.cantidad);
      });
    });
    let best = null;
    Object.entries(combos).forEach(([key, cant]) => {
      if (!best || cant > best.cant) {
        const [asistente, goleador] = key.split("__");
        best = { asistente, goleador, cant };
      }
    });
    if (!best) return null;
    const nombre = (id) => {
      const j = jugadores.find((x) => x.id === id);
      return j ? `${j.nombre} ${j.apellido}` : "—";
    };
    return { asistente: nombre(best.asistente), goleador: nombre(best.goleador), cant: best.cant };
  }, [partidosFiltrados, jugadores]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 className="display-font" style={{ fontSize: "26px", fontWeight: 600, margin: "0 0 4px 0" }}>
            Análisis
          </h1>
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>
            Estadísticas agregadas de la temporada
          </p>
        </div>
        <button className="export-btn" onClick={() => onExportPDF("analisis", filtroTorneo)}>
          <Printer size={14} /> Exportar PDF
        </button>
      </div>

      <Field label="Torneo">
        <select value={filtroTorneo} onChange={(e) => setFiltroTorneo(e.target.value)} style={{ ...inputStyle, maxWidth: "260px", marginBottom: "18px" }}>
          <option value="Todos">Todos los torneos</option>
          {COMPETICIONES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ background: COLORS.pitch, borderRadius: "10px", padding: "18px 20px", display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        <ScoreDigit label="PJ" value={resumen.pj} />
        <ScoreDigit label="VIC" value={resumen.vic} accent={COLORS.grass} />
        <ScoreDigit label="EMP" value={resumen.emp} accent={COLORS.amber} />
        <ScoreDigit label="DER" value={resumen.der} accent={COLORS.redCard} />
        <ScoreDigit label="GF" value={resumen.gf} />
        <ScoreDigit label="GC" value={resumen.gc} accent={COLORS.redCard} />
        <ScoreDigit label="DIF" value={resumen.dif > 0 ? `+${resumen.dif}` : resumen.dif} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0" }}>
            Goles a favor por tipo de acción
          </h3>
          {resumen.gf === 0 ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin goles registrados</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {TIPOS_ACCION.map((t) => (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span>{t}</span>
                  <span className="display-font" style={{ fontWeight: 600 }}>{resumen.golesPorTipo[t] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0" }}>
            Goles en contra recibidos ({resumen.gc})
          </h3>
          {resumen.gc === 0 ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin goles en contra registrados</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {TIPOS_ACCION_CONTRA.map((t) => (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span>{t}</span>
                  <span className="display-font" style={{ fontWeight: 600, color: COLORS.redCard }}>{resumen.golesContraPorTipo[t] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0" }}>
            Mejor combinación asistente + goleador
          </h3>
          {!mejorCombinacion ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin asistencias registradas</p>
          ) : (
            <div style={{ fontSize: "13px" }}>
              <div style={{ marginBottom: "4px" }}>
                <strong>{mejorCombinacion.asistente}</strong> → <strong>{mejorCombinacion.goleador}</strong>
              </div>
              <div className="display-font" style={{ fontSize: "20px", fontWeight: 600, color: COLORS.grass }}>
                {mejorCombinacion.cant} gol{mejorCombinacion.cant !== 1 ? "es" : ""}
              </div>
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0" }}>
            Jugador con más minutos
          </h3>
          {!jugadorMasMinutos ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin minutos cargados</p>
          ) : (
            <div style={{ fontSize: "13px" }}>
              <div style={{ marginBottom: "4px" }}>
                <strong>{jugadorMasMinutos.nombre} {jugadorMasMinutos.apellido}</strong>
              </div>
              <div className="display-font" style={{ fontSize: "20px", fontWeight: 600, color: COLORS.grass }}>
                {jugadorMasMinutos.minutos}'
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0" }}>
            Máximos anotadores
          </h3>
          {maximosAnotadores.length === 0 ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin goles registrados</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {maximosAnotadores.map((j, i) => (
                <div key={j.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span>{i + 1}. {j.nombre} {j.apellido}</span>
                  <span className="display-font" style={{ fontWeight: 600 }}>{j.goles}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "18px" }}>
          <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0" }}>
            Máximos asistentes
          </h3>
          {maximosAsistentes.length === 0 ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Sin asistencias registradas</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {maximosAsistentes.map((j, i) => (
                <div key={j.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span>{i + 1}. {j.nombre} {j.apellido}</span>
                  <span className="display-font" style={{ fontWeight: 600 }}>{j.asistencias}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.6fr 0.5fr 0.6fr 0.4fr 0.4fr", padding: "10px 16px", background: COLORS.pitch, color: COLORS.chalk, fontSize: "11px", letterSpacing: "0.06em" }}>
          <span>JUGADOR</span>
          <span>CONVOC.</span>
          <span>MIN.</span>
          <span>GOLES</span>
          <span>ASIST.</span>
          <span>TA</span>
          <span>TR</span>
        </div>
        {statsJugadores.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>
            No hay jugadores cargados.
          </div>
        ) : (
          statsJugadores.map((j) => (
            <div key={j.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.6fr 0.5fr 0.6fr 0.4fr 0.4fr", padding: "8px 16px", fontSize: "13px", alignItems: "center", borderTop: `1px solid ${COLORS.line}` }}>
              <span>{j.nombre} {j.apellido}</span>
              <span>{j.partidosConvocados}</span>
              <span>{j.minutos}</span>
              <span>{j.goles}</span>
              <span>{j.asistencias}</span>
              <span>{j.amarillas}</span>
              <span>{j.rojas}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
function PizarraView({ jugadores, esEditor }) {
  const [pizarras, setPizarras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pizarraActual, setPizarraActual] = useState(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [panel, setPanel] = useState("jugadores");
  const [formacionElegida, setFormacionElegida] = useState("4-3-3 Clásico");
  const [formacionRivalElegida, setFormacionRivalElegida] = useState("4-4-2 Tradicional");
  const [herramienta, setHerramienta] = useState("mover"); // mover | linea | flecha
  const [colorDibujo, setColorDibujo] = useState(COLORES_DIBUJO[0]);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [error, setError] = useState("");

  const [rellenoRayado, setRellenoRayado] = useState(true);

  const pitchRef = useRef(null);
  const arrastreRef = useRef(null); // { id, movido }
  const dibujandoRef = useRef(null); // { puntos: [] }
  const pizarraRef = useRef(null); // espejo de pizarraActual para el historial
  const frameIndexRef = useRef(0);
  const historialRef = useRef([]); // pilas de deshacer / rehacer
  const rehacerRef = useRef([]);
  pizarraRef.current = pizarraActual;
  frameIndexRef.current = frameIndex;

  function guardarHistorial() {
    if (!pizarraRef.current) return;
    historialRef.current = [...historialRef.current.slice(-49), { pizarra: pizarraRef.current, frameIndex: frameIndexRef.current }];
    rehacerRef.current = [];
  }

  function reiniciarHistorial() {
    historialRef.current = [];
    rehacerRef.current = [];
  }

  function deshacer() {
    const h = historialRef.current;
    if (h.length === 0) return;
    const ultimo = h[h.length - 1];
    historialRef.current = h.slice(0, -1);
    rehacerRef.current = [...rehacerRef.current, { pizarra: pizarraRef.current, frameIndex: frameIndexRef.current }];
    setReproduciendo(false);
    setPizarraActual(ultimo.pizarra);
    setFrameIndex(Math.min(ultimo.frameIndex, ultimo.pizarra.fotogramas.length - 1));
  }

  function rehacer() {
    const r = rehacerRef.current;
    if (r.length === 0) return;
    const siguiente = r[r.length - 1];
    rehacerRef.current = r.slice(0, -1);
    historialRef.current = [...historialRef.current, { pizarra: pizarraRef.current, frameIndex: frameIndexRef.current }];
    setReproduciendo(false);
    setPizarraActual(siguiente.pizarra);
    setFrameIndex(Math.min(siguiente.frameIndex, siguiente.pizarra.fotogramas.length - 1));
  }

  function cambiarEscala(delta) {
    guardarHistorial();
    setPizarraActual((prev) => {
      const actual = prev.escalaJugadores ?? 1;
      const nueva = Math.min(2.2, Math.max(0.6, Math.round((actual + delta) * 100) / 100));
      return { ...prev, escalaJugadores: nueva };
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("pizarras", false);
        if (res) setPizarras(JSON.parse(res.value));
      } catch (e) {
        // sin pizarras guardadas todavía
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function persistPizarras(next) {
    setPizarras(next);
    try {
      await window.storage.set("pizarras", JSON.stringify(next), false);
    } catch (e) {
      setError("No se pudo guardar la pizarra.");
    }
  }

  function crear(tipo) {
    const p = nuevaPizarra(nombreNueva.trim() || "Pizarra sin nombre", tipo);
    reiniciarHistorial();
    setPizarraActual(p);
    setFrameIndex(0);
    setNombreNueva("");
  }

  function guardar() {
    if (!pizarraActual) return;
    const existe = pizarras.some((p) => p.id === pizarraActual.id);
    const next = existe ? pizarras.map((p) => (p.id === pizarraActual.id ? pizarraActual : p)) : [...pizarras, pizarraActual];
    persistPizarras(next);
  }

  function cargar(p) {
    reiniciarHistorial();
    setPizarraActual(p);
    setFrameIndex(0);
    setMostrarLista(false);
  }

  function eliminarGuardada(id) {
    persistPizarras(pizarras.filter((p) => p.id !== id));
  }

  function actualizarFrame(mutador) {
    setPizarraActual((prev) => {
      const fotogramas = prev.fotogramas.map((f, i) => (i === frameIndex ? mutador(f) : f));
      return { ...prev, fotogramas };
    });
  }

  function agregarElemento(tipo, extra) {
    const el = { id: crypto.randomUUID(), tipo, x: 50, y: 50, ...extra };
    guardarHistorial();
    actualizarFrame((f) => ({ ...f, elementos: [...f.elementos, el] }));
  }

  function agregarJugadorPropio(jugadorId) {
    const j = jugadores.find((x) => x.id === jugadorId);
    agregarElemento("jugadorPropio", { dorsal: j?.dorsal || "?", nombre: j ? `${j.nombre} ${j.apellido}` : "Jugador" });
  }

  function agregarJugadorRival() {
    const frame = pizarraActual.fotogramas[frameIndex];
    const n = frame.elementos.filter((e) => e.tipo === "jugadorRival").length + 1;
    agregarElemento("jugadorRival", { dorsal: n, nombre: `Rival ${n}` });
  }

  function eliminarElemento(id) {
    guardarHistorial();
    actualizarFrame((f) => ({ ...f, elementos: f.elementos.filter((e) => e.id !== id) }));
  }

  function moverElemento(id, x, y) {
    actualizarFrame((f) => ({ ...f, elementos: f.elementos.map((e) => (e.id === id ? { ...e, x, y } : e)) }));
  }

  function limpiarDibujos() {
    guardarHistorial();
    actualizarFrame((f) => ({ ...f, dibujos: [] }));
  }

  function limpiarJugadores(tipoAEliminar) {
    actualizarFrame((f) => ({ ...f, elementos: f.elementos.filter((e) => e.tipo !== tipoAEliminar) }));
  }

  function colocarAlineacion(nombreFormacion, esRival) {
    const lineas = FORMACIONES[nombreFormacion];
    if (!lineas) return;
    const posiciones = generarFormacionHorizontal(lineas); // {slot, left, top}: left=8 (arco) a left=88 (ataque)
    const tipo = esRival ? "jugadorRival" : "jugadorPropio";
    const nombres = esRival ? pizarraActual.plantilla.rivales : pizarraActual.plantilla.titulares;
    const nuevos = posiciones.map((pos, i) => {
      const x = esRival ? 100 - pos.left : pos.left; // el rival ataca desde el lado opuesto
      return {
        id: crypto.randomUUID(),
        tipo,
        x,
        y: pos.top,
        dorsal: i + 1,
        nombre: nombres[i] || `${esRival ? "Rival" : "Jugador"} ${i + 1}`,
      };
    });
    guardarHistorial();
    actualizarFrame((f) => ({ ...f, elementos: [...f.elementos.filter((e) => e.tipo !== tipo), ...nuevos] }));
  }

  function colocarSuplentes() {
    const nombres = pizarraActual.plantilla.suplentes;
    const nuevos = nombres.map((nombre, i) => ({
      id: crypto.randomUUID(),
      tipo: "jugadorPropio",
      suplente: true,
      x: 8 + i * 11.5,
      y: 97,
      dorsal: 12 + i,
      nombre: nombre || `Suplente ${i + 1}`,
    }));
    guardarHistorial();
    actualizarFrame((f) => ({ ...f, elementos: [...f.elementos.filter((e) => !e.suplente), ...nuevos] }));
  }

  function updateNombrePlantilla(grupo, idx, valor) {
    setPizarraActual((prev) => ({
      ...prev,
      plantilla: { ...prev.plantilla, [grupo]: prev.plantilla[grupo].map((n, i) => (i === idx ? valor : n)) },
    }));
  }

  function setColorCamiseta(cual, color) {
    guardarHistorial();
    setPizarraActual((prev) => ({ ...prev, [cual]: color }));
  }

  // ---- Arrastre de elementos ----
  function coordsDesdeEvento(e) {
    const rect = pitchRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function onTokenMouseDown(e, id) {
    if (herramienta !== "mover") return;
    e.stopPropagation();
    arrastreRef.current = { id, movido: false };
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
  }
  function onWindowMouseMove(e) {
    if (!arrastreRef.current) return;
    if (!arrastreRef.current.movido) {
      guardarHistorial();
      arrastreRef.current.movido = true;
    }
    const { x, y } = coordsDesdeEvento(e);
    moverElemento(arrastreRef.current.id, x, y);
  }
  function onWindowMouseUp() {
    arrastreRef.current = null;
    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);
  }

  // ---- Dibujo libre / flecha ----
  function onPitchMouseDown(e) {
    if (herramienta === "mover") return;
    const { x, y } = coordsDesdeEvento(e);
    if (herramienta === "texto") {
      const texto = window.prompt("Texto a agregar:", "");
      if (texto && texto.trim()) {
        guardarHistorial();
        actualizarFrame((f) => ({ ...f, elementos: [...f.elementos, { id: crypto.randomUUID(), tipo: "texto", texto: texto.trim(), color: colorDibujo, x, y }] }));
      }
      return;
    }
    dibujandoRef.current = { puntos: [{ x, y }] };
    window.addEventListener("mousemove", onDibujoMouseMove);
    window.addEventListener("mouseup", onDibujoMouseUp);
  }
  function onDibujoMouseMove(e) {
    if (!dibujandoRef.current) return;
    const { x, y } = coordsDesdeEvento(e);
    if (herramienta === "flecha" || herramienta === "flechaDiscontinua" || herramienta === "recuadro") {
      dibujandoRef.current.puntos = [dibujandoRef.current.puntos[0], { x, y }];
    } else {
      dibujandoRef.current.puntos = [...dibujandoRef.current.puntos, { x, y }];
    }
    // forzar re-render mostrando el trazo en progreso
    setPizarraActual((prev) => ({ ...prev }));
  }
  function onDibujoMouseUp() {
    if (dibujandoRef.current && dibujandoRef.current.puntos.length > 1) {
      const dibujo = { id: crypto.randomUUID(), tipo: herramienta, color: colorDibujo, puntos: dibujandoRef.current.puntos };
      if (herramienta === "recuadro") dibujo.rayado = rellenoRayado;
      guardarHistorial();
      actualizarFrame((f) => ({ ...f, dibujos: [...f.dibujos, dibujo] }));
    }
    dibujandoRef.current = null;
    window.removeEventListener("mousemove", onDibujoMouseMove);
    window.removeEventListener("mouseup", onDibujoMouseUp);
  }

  // ---- Exportar a JPG (dibuja el fotograma actual en un canvas) ----
  function exportarJPG() {
    const frameActual = pizarraRef.current.fotogramas[frameIndexRef.current];
    const pizarra = pizarraRef.current;
    const W = 1600;
    const H = 1067;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const anchoPantalla = pitchRef.current ? pitchRef.current.getBoundingClientRect().width : 800;
    const k = W / (anchoPantalla || 800);
    const px = (x) => (x / 100) * W;
    const py = (y) => (y / 100) * H;
    const escala = pizarra.escalaJugadores ?? 1;

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // Césped con franjas
    const franja = W * 0.08;
    for (let i = 0; i * franja < W; i++) {
      ctx.fillStyle = i % 2 === 0 ? CESPED : CESPED_OSCURO;
      ctx.fillRect(i * franja, 0, franja + 1, H);
    }

    // Líneas de cancha
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2 * k;
    const m = 10 * k;
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
    ctx.beginPath();
    ctx.moveTo(W / 2, m);
    ctx.lineTo(W / 2, H - m);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 45 * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(m, H * 0.18, W * 0.12, H * 0.64);
    ctx.strokeRect(W - m - W * 0.12, H * 0.18, W * 0.12, H * 0.64);

    // Dibujos
    frameActual.dibujos.forEach((d) => {
      const pts = d.puntos.map((p) => ({ x: px(p.x), y: py(p.y) }));
      if (pts.length < 2) return;
      ctx.save();
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (d.tipo === "recuadro") {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[0].x - pts[1].x);
        const h = Math.abs(pts[0].y - pts[1].y);
        if (d.rayado) {
          ctx.globalAlpha = 0.18;
          ctx.fillRect(x, y, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 0.009 * W;
          ctx.lineCap = "butt";
          const paso = 0.022 * W * Math.SQRT2;
          for (let s = -h; s < w + h; s += paso) {
            ctx.beginPath();
            ctx.moveTo(x + s, y + h);
            ctx.lineTo(x + s + h, y);
            ctx.stroke();
          }
          ctx.restore();
        } else {
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x, y, w, h);
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.004 * W;
        ctx.strokeRect(x, y, w, h);
      } else if (d.tipo === "flecha" || d.tipo === "flechaDiscontinua") {
        const a = pts[0];
        const b = pts[1];
        ctx.lineWidth = 0.006 * W;
        if (d.tipo === "flechaDiscontinua") ctx.setLineDash([0.02 * W, 0.014 * W]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const largo = 0.024 * W;
        const medio = 0.012 * W;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - largo * Math.cos(ang) + medio * Math.sin(ang), b.y - largo * Math.sin(ang) - medio * Math.cos(ang));
        ctx.lineTo(b.x - largo * Math.cos(ang) - medio * Math.sin(ang), b.y - largo * Math.sin(ang) + medio * Math.cos(ang));
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.lineWidth = 0.005 * W;
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
      ctx.restore();
    });

    // Elementos: jugadores, material y textos
    frameActual.elementos.forEach((el) => {
      const cx = px(el.x);
      const cy = py(el.y);
      const esJugador = el.tipo === "jugadorPropio" || el.tipo === "jugadorRival";

      if (esJugador) {
        const color = el.tipo === "jugadorPropio" ? pizarra.colorPropio : pizarra.colorRival;
        const base = el.suplente ? 24 : 30;
        const diam = (base * escala + 4) * k;
        const fuente = 8.5 * escala * k;
        const padX = 4 * escala * k;
        const padY = 1 * escala * k;
        const maxW = 76 * escala * k;
        let etiqueta = el.nombre || "";
        ctx.font = `600 ${fuente}px Inter, Arial, sans-serif`;
        if (etiqueta) {
          while (etiqueta.length > 1 && ctx.measureText(etiqueta).width > maxW) etiqueta = etiqueta.slice(0, -1);
          if (etiqueta !== el.nombre) etiqueta = etiqueta.slice(0, -1) + "…";
        }
        const altoEtiqueta = etiqueta ? fuente * 1.15 + 2 * padY : 0;
        const total = diam + (etiqueta ? 2 * k + altoEtiqueta : 0);
        const top = cy - total / 2;
        const ccy = top + diam / 2;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 3 * k;
        ctx.shadowOffsetY = k;
        ctx.beginPath();
        ctx.arc(cx, ccy, diam / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 2 * k;
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx, ccy, diam / 2 - k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = esClaroFondo(color) ? COLORS.ink : "#fff";
        ctx.font = `700 ${(el.suplente ? 10 : 12) * escala * k}px Oswald, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(el.dorsal ?? ""), cx, ccy + 0.5 * k);

        if (etiqueta) {
          ctx.font = `600 ${fuente}px Inter, Arial, sans-serif`;
          const ancho = ctx.measureText(etiqueta).width + 2 * padX;
          const xEt = cx - ancho / 2;
          const yEt = top + diam + 2 * k;
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 2 * k;
          ctx.shadowOffsetY = k;
          ctx.fillStyle = "#fff";
          rr(xEt, yEt, ancho, altoEtiqueta, 3 * k);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = "#111";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(etiqueta, cx, yEt + altoEtiqueta / 2 + 0.3 * k);
        }
      } else if (el.tipo === "texto") {
        ctx.font = `700 ${12 * k}px Oswald, Arial, sans-serif`;
        const ancho = ctx.measureText(el.texto || "").width + 12 * k;
        const alto = 12 * 1.4 * k + 4 * k;
        ctx.fillStyle = "rgba(19,32,24,0.55)";
        rr(cx - ancho / 2, cy - alto / 2, ancho, alto, 4 * k);
        ctx.fill();
        ctx.fillStyle = el.color || "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.texto || "", cx, cy + 0.5 * k);
      } else {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 2 * k;
        ctx.shadowOffsetY = k;
        ctx.font = `${22 * k}px sans-serif`;
        ctx.fillStyle = el.color || COLORS.ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.emoji || "", cx, cy);
        ctx.restore();
      }
    });

    const url = canvas.toDataURL("image/jpeg", 0.92);
    const sufijo = pizarra.tipo === "animado" ? `-fotograma-${frameIndexRef.current + 1}` : "";
    const nombreArchivo = `${(pizarra.nombre || "pizarra").replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]/g, "").trim() || "pizarra"}${sufijo}.jpg`;
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ---- Fotogramas (animación) ----
  function agregarFotograma() {
    guardarHistorial();
    setPizarraActual((prev) => {
      const actual = prev.fotogramas[frameIndex];
      const copia = { elementos: actual.elementos.map((e) => ({ ...e })), dibujos: [] };
      return { ...prev, fotogramas: [...prev.fotogramas, copia] };
    });
    setFrameIndex((i) => i + 1);
  }
  function eliminarFotograma(idx) {
    if (pizarraActual.fotogramas.length <= 1) return;
    guardarHistorial();
    setPizarraActual((prev) => ({ ...prev, fotogramas: prev.fotogramas.filter((_, i) => i !== idx) }));
    setFrameIndex((i) => Math.max(0, Math.min(i, pizarraActual.fotogramas.length - 2)));
  }

  useEffect(() => {
    if (!reproduciendo || !pizarraActual) return;
    const total = pizarraActual.fotogramas.length;
    if (total <= 1) {
      setReproduciendo(false);
      return;
    }
    const id = setInterval(() => {
      setFrameIndex((i) => {
        if (i + 1 >= total) {
          setReproduciendo(false);
          return i;
        }
        return i + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [reproduciendo, pizarraActual]);

  // ---------- Pantalla inicial: elegir tipo de ejercicio ----------
  if (!pizarraActual) {
    return (
      <div>
        <h1 className="display-font" style={{ fontSize: "26px", fontWeight: 600, margin: "0 0 4px 0" }}>
          Pizarra táctica
        </h1>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 20px 0" }}>
          Diseñá ejercicios y jugadas, en estático o animados por fotogramas
        </p>

        {esEditor && (
          <div style={{ background: NAVY, borderRadius: "10px", padding: "32px 20px", textAlign: "center", marginBottom: "20px" }}>
            <p className="display-font" style={{ color: COLORS.chalk, fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" }}>
              ¿Qué tipo de ejercicio querés crear?
            </p>
            <input
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
              placeholder="Nombre del ejercicio (opcional)"
              style={{ ...inputStyle, maxWidth: "280px", margin: "0 auto 18px auto", display: "block" }}
            />
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => crear("estatico")}
                style={{ background: CELESTE, color: "#fff", border: "none", borderRadius: "8px", padding: "18px 26px", fontSize: "14px", fontWeight: 600, cursor: "pointer", minWidth: "180px" }}
              >
                🖼️ Ejercicio estático
              </button>
              <button
                onClick={() => crear("animado")}
                style={{ background: "#7C5CFC", color: "#fff", border: "none", borderRadius: "8px", padding: "18px 26px", fontSize: "14px", fontWeight: 600, cursor: "pointer", minWidth: "180px" }}
              >
                🎬 Ejercicio animado
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "rgba(245,243,234,0.55)", marginTop: "14px" }}>Podés cambiar de modo más adelante</p>
          </div>
        )}

        <h3 className="display-font" style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 10px 0" }}>
          {esEditor ? "Mis pizarras guardadas" : "Pizarras disponibles"}
        </h3>
        {cargando ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft }}>Cargando...</p>
        ) : pizarras.length === 0 ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft }}>Todavía no hay pizarras guardadas.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {pizarras.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${COLORS.line}`, borderRadius: "6px", padding: "10px 14px" }}>
                <button onClick={() => cargar(p)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "13px", color: COLORS.ink, flex: 1 }}>
                  <strong>{p.nombre}</strong> <span style={{ color: COLORS.inkSoft, fontSize: "11px" }}>({p.tipo === "animado" ? `animado · ${p.fotogramas.length} fotogramas` : "estático"})</span>
                </button>
                {esEditor && (
                  <button onClick={() => eliminarGuardada(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const frame = pizarraActual.fotogramas[frameIndex];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          {esEditor ? (
            <input
              value={pizarraActual.nombre}
              onChange={(e) => setPizarraActual({ ...pizarraActual, nombre: e.target.value })}
              className="display-font"
              style={{ fontSize: "22px", fontWeight: 600, border: "none", outline: "none", background: "transparent", padding: 0 }}
            />
          ) : (
            <div className="display-font" style={{ fontSize: "22px", fontWeight: 600 }}>{pizarraActual.nombre}</div>
          )}
          <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>
            {pizarraActual.tipo === "animado" ? `Ejercicio animado · ${pizarraActual.fotogramas.length} fotograma(s)` : "Ejercicio estático"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="export-btn" onClick={() => setMostrarLista(!mostrarLista)}>
            <FolderOpen size={14} /> {esEditor ? "Mis pizarras" : "Pizarras"}
          </button>
          {esEditor && (
            <>
              <button className="export-btn" onClick={() => setPizarraActual(null)}>
                <Plus size={14} /> Nueva
              </button>
              <button className="export-btn" onClick={guardar}>
                <Save size={14} /> Guardar
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p style={{ fontSize: "12px", color: COLORS.redCard, marginBottom: "10px" }}>{error}</p>}

      {mostrarLista && (
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: "8px", padding: "12px", marginBottom: "16px", background: "#fff" }}>
          {pizarras.length === 0 ? (
            <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>No hay pizarras guardadas.</p>
          ) : (
            pizarras.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                <button onClick={() => cargar(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: COLORS.ink, textAlign: "left" }}>
                  {p.nombre}
                </button>
                <button onClick={() => eliminarGuardada(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Panel lateral de herramientas */}
        <div style={{ width: "260px", flexShrink: 0, borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
          <div style={{ background: NAVY, padding: "12px 14px" }}>
            <div style={{ color: COLORS.chalk, fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "10px" }}>HERRAMIENTAS</div>
            <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", padding: "3px" }}>
              {[
                { key: "jugadores", label: "Jugadores" },
                { key: "material", label: "Material" },
                { key: "dibujo", label: "Dibujo" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPanel(t.key)}
                  style={{
                    flex: 1,
                    padding: "7px 4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "999px",
                    cursor: "pointer",
                    background: panel === t.key ? CELESTE : "transparent",
                    color: panel === t.key ? "#fff" : "rgba(245,243,234,0.75)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setHerramienta("mover")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%",
              background: herramienta === "mover" ? COLORS.grass : "#fff", color: herramienta === "mover" ? "#fff" : COLORS.ink,
              border: "none", borderBottom: `1px solid ${COLORS.line}`, padding: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}
          >
            <MousePointer2 size={14} /> Mover / seleccionar
          </button>

          <div style={{ padding: "14px", background: "#fff", maxHeight: "560px", overflowY: "auto" }}>
            {panel === "jugadores" && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px 0" }}>Sistema táctico propio</p>
                <select value={formacionElegida} onChange={(e) => setFormacionElegida(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "6px", fontSize: "11px" }}>
                  {FORMACIONES_CATEGORIAS.map((cat) => (
                    <optgroup key={cat.grupo} label={cat.grupo}>
                      {Object.keys(cat.sistemas).map((nombre) => (
                        <option key={nombre} value={nombre}>
                          {nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                  <button onClick={() => colocarAlineacion(formacionElegida, false)} className="pizarra-btn" style={{ background: pizarraActual.colorPropio, color: esClaroFondo(pizarraActual.colorPropio) ? COLORS.ink : "#fff" }}>
                    Colocar 11 titulares propios
                  </button>
                  <button onClick={colocarSuplentes} className="pizarra-btn" style={{ background: "#fff", color: COLORS.ink, border: `1px solid ${COLORS.line}` }}>
                    Colocar 7 suplentes (banco)
                  </button>
                </div>

                <p style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px 0" }}>Sistema táctico rival</p>
                <select value={formacionRivalElegida} onChange={(e) => setFormacionRivalElegida(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "6px", fontSize: "11px" }}>
                  {FORMACIONES_CATEGORIAS.map((cat) => (
                    <optgroup key={cat.grupo} label={cat.grupo}>
                      {Object.keys(cat.sistemas).map((nombre) => (
                        <option key={"r-" + nombre} value={nombre}>
                          {nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                  <button onClick={() => colocarAlineacion(formacionRivalElegida, true)} className="pizarra-btn" style={{ background: pizarraActual.colorRival, color: esClaroFondo(pizarraActual.colorRival) ? COLORS.ink : "#fff" }}>
                    Colocar 11 rivales
                  </button>
                </div>

                <p style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px 0" }}>Camisetas</p>
                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: COLORS.inkSoft, marginBottom: "3px" }}>Propia</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "108px" }}>
                      {CAMISETAS.map((c) => (
                        <button key={c.color} title={c.nombre} onClick={() => setColorCamiseta("colorPropio", c.color)} style={{ width: "16px", height: "16px", borderRadius: "50%", background: c.color, border: pizarraActual.colorPropio === c.color ? `2px solid ${COLORS.ink}` : "1px solid rgba(0,0,0,0.2)", cursor: "pointer" }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: COLORS.inkSoft, marginBottom: "3px" }}>Rival</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "108px" }}>
                      {CAMISETAS.map((c) => (
                        <button key={c.color} title={c.nombre} onClick={() => setColorCamiseta("colorRival", c.color)} style={{ width: "16px", height: "16px", borderRadius: "50%", background: c.color, border: pizarraActual.colorRival === c.color ? `2px solid ${COLORS.ink}` : "1px solid rgba(0,0,0,0.2)", cursor: "pointer" }} />
                      ))}
                    </div>
                  </div>
                </div>

                <details style={{ marginBottom: "10px" }}>
                  <summary style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, cursor: "pointer" }}>Nombres · Titulares (11)</summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                    {pizarraActual.plantilla.titulares.map((n, i) => (
                      <input key={i} value={n} onChange={(e) => updateNombrePlantilla("titulares", i, e.target.value)} style={{ ...inputStyle, fontSize: "11px", padding: "5px 7px" }} />
                    ))}
                  </div>
                </details>
                <details style={{ marginBottom: "10px" }}>
                  <summary style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, cursor: "pointer" }}>Nombres · Suplentes (7)</summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                    {pizarraActual.plantilla.suplentes.map((n, i) => (
                      <input key={i} value={n} onChange={(e) => updateNombrePlantilla("suplentes", i, e.target.value)} style={{ ...inputStyle, fontSize: "11px", padding: "5px 7px" }} />
                    ))}
                  </div>
                </details>
                <details style={{ marginBottom: "14px" }}>
                  <summary style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, cursor: "pointer" }}>Nombres · Rivales (11)</summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                    {pizarraActual.plantilla.rivales.map((n, i) => (
                      <input key={i} value={n} onChange={(e) => updateNombrePlantilla("rivales", i, e.target.value)} style={{ ...inputStyle, fontSize: "11px", padding: "5px 7px" }} />
                    ))}
                  </div>
                </details>
                <p style={{ fontSize: "10px", color: COLORS.inkSoft, margin: "0 0 10px 0" }}>Tip: doble clic sobre un jugador en la cancha para renombrarlo.</p>

                <p style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px 0" }}>Agregar del plantel real</p>
                {jugadores.length === 0 ? (
                  <p style={{ fontSize: "11px", color: COLORS.inkSoft }}>Cargá jugadores en Mi Club.</p>
                ) : (
                  <select
                    onChange={(e) => {
                      if (e.target.value) agregarJugadorPropio(e.target.value);
                      e.target.value = "";
                    }}
                    style={{ ...inputStyle, width: "100%", fontSize: "11px" }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      + Agregar jugador...
                    </option>
                    {jugadores.map((j) => (
                      <option key={j.id} value={j.id}>
                        #{j.dorsal || "-"} {j.nombre} {j.apellido}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {panel === "material" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {MATERIALES_PIZARRA.map((m) => (
                  <button key={m.tipo} onClick={() => agregarElemento("material", { materialTipo: m.tipo, emoji: m.emoji, color: m.color, label: m.label })} title={m.label} className="material-btn">
                    <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: COLORS.chalk, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: m.color || "inherit" }}>{m.emoji}</span>
                    <span style={{ fontSize: "8px", color: COLORS.inkSoft, textAlign: "center", marginTop: "3px" }}>{m.label}</span>
                  </button>
                ))}
              </div>
            )}

            {panel === "dibujo" && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px 0" }}>Herramienta</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                  {[
                    { key: "linea", label: "Trazo", icon: PenTool },
                    { key: "flecha", label: "Flecha (pase)", icon: ArrowRight },
                    { key: "flechaDiscontinua", label: "Flecha discont. (desmarque)", icon: ArrowRight },
                    { key: "recuadro", label: "Recuadro relleno (sector)", icon: Square },
                    { key: "texto", label: "Texto", icon: Type },
                  ].map((h) => (
                    <button
                      key={h.key}
                      onClick={() => setHerramienta(h.key)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", background: herramienta === h.key ? COLORS.pitch : "#fff", color: herramienta === h.key ? "#fff" : COLORS.ink, border: `1px solid ${COLORS.line}`, borderRadius: "6px", padding: "7px 4px", fontSize: "10px", cursor: "pointer" }}
                    >
                      <h.icon size={11} /> {h.label}
                    </button>
                  ))}
                </div>
                {herramienta === "recuadro" && (
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: COLORS.ink, marginBottom: "10px", cursor: "pointer" }}>
                    <input type="checkbox" checked={rellenoRayado} onChange={(e) => setRellenoRayado(e.target.checked)} />
                    Relleno rayado
                  </label>
                )}
                <p style={{ fontSize: "11px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px 0" }}>Color</p>
                <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                  {COLORES_DIBUJO.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColorDibujo(c)}
                      style={{ width: "22px", height: "22px", borderRadius: "50%", background: c, border: colorDibujo === c ? `2px solid ${COLORS.grass}` : "1px solid rgba(0,0,0,0.2)", cursor: "pointer" }}
                    />
                  ))}
                </div>
                <button
                  onClick={limpiarDibujos}
                  style={{ width: "100%", background: "#fff", color: COLORS.redCard, border: `1px solid ${COLORS.redCard}`, borderRadius: "6px", padding: "7px", fontSize: "12px", cursor: "pointer" }}
                >
                  Borrar trazos de este fotograma
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cancha */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
            <button className="export-btn" onClick={deshacer} disabled={historialRef.current.length === 0} style={{ opacity: historialRef.current.length === 0 ? 0.45 : 1 }} title="Deshacer la última acción">
              <Undo2 size={14} /> Deshacer
            </button>
            <button className="export-btn" onClick={rehacer} disabled={rehacerRef.current.length === 0} style={{ opacity: rehacerRef.current.length === 0 ? 0.45 : 1 }} title="Rehacer">
              <Redo2 size={14} /> Rehacer
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: "6px", padding: "4px 8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: COLORS.ink }}>Tamaño jugadores</span>
              <button onClick={() => cambiarEscala(-0.1)} title="Achicar todos los jugadores" style={{ width: "24px", height: "24px", borderRadius: "5px", border: `1px solid ${COLORS.line}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MinusIcon size={13} />
              </button>
              <span style={{ fontSize: "12px", minWidth: "38px", textAlign: "center", fontWeight: 600 }}>{Math.round((pizarraActual.escalaJugadores ?? 1) * 100)}%</span>
              <button onClick={() => cambiarEscala(0.1)} title="Agrandar todos los jugadores" style={{ width: "24px", height: "24px", borderRadius: "5px", border: `1px solid ${COLORS.line}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={13} />
              </button>
            </div>
            <button className="export-btn" onClick={exportarJPG} style={{ marginLeft: "auto" }} title={pizarraActual.tipo === "animado" ? "Exporta el fotograma actual" : "Exportar como imagen"}>
              <Download size={14} /> Exportar JPG
            </button>
          </div>
          <div
            ref={pitchRef}
            onMouseDown={onPitchMouseDown}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "3 / 2",
              background: `repeating-linear-gradient(90deg, ${CESPED}, ${CESPED} 8%, ${CESPED_OSCURO} 8%, ${CESPED_OSCURO} 16%)`,
              borderRadius: "8px",
              overflow: "hidden",
              cursor: herramienta === "mover" ? "default" : "crosshair",
              userSelect: "none",
            }}
          >
            {/* Líneas de cancha */}
            <div style={{ position: "absolute", inset: "10px", border: "2px solid rgba(255,255,255,0.55)" }} />
            <div style={{ position: "absolute", top: "10px", bottom: "10px", left: "50%", borderLeft: "2px solid rgba(255,255,255,0.55)" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", width: "90px", height: "90px", marginLeft: "-45px", marginTop: "-45px", border: "2px solid rgba(255,255,255,0.55)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: "18%", bottom: "18%", left: "10px", width: "12%", borderTop: "2px solid rgba(255,255,255,0.55)", borderRight: "2px solid rgba(255,255,255,0.55)", borderBottom: "2px solid rgba(255,255,255,0.55)" }} />
            <div style={{ position: "absolute", top: "18%", bottom: "18%", right: "10px", width: "12%", borderTop: "2px solid rgba(255,255,255,0.55)", borderLeft: "2px solid rgba(255,255,255,0.55)", borderBottom: "2px solid rgba(255,255,255,0.55)" }} />

            {/* Dibujos (SVG overlay) */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 100 66.6" preserveAspectRatio="none">
              <defs>
                <marker id="flecha-punta" markerWidth="6" markerHeight="6" refX="4" refY="2" orient="auto">
                  <path d="M0,0 L4,2 L0,4 Z" fill="context-stroke" />
                </marker>
                {COLORES_DIBUJO.map((c, i) => (
                  <pattern key={c} id={`rayas-${i}`} patternUnits="userSpaceOnUse" width="2.2" height="2.2" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="2.2" stroke={c} strokeWidth="0.9" strokeOpacity="0.55" />
                  </pattern>
                ))}
              </defs>
              {frame.dibujos.map((d) => {
                const pts = d.puntos.map((p) => `${p.x},${p.y * 0.666}`).join(" ");
                if (d.tipo === "recuadro") {
                  const [a, b] = d.puntos;
                  if (!a || !b) return null;
                  const rx = Math.min(a.x, b.x);
                  const ry = Math.min(a.y, b.y) * 0.666;
                  const rw = Math.abs(a.x - b.x);
                  const rh = Math.abs(a.y - b.y) * 0.666;
                  const idxColor = Math.max(0, COLORES_DIBUJO.indexOf(d.color));
                  return (
                    <g key={d.id}>
                      <rect x={rx} y={ry} width={rw} height={rh} fill={d.color} fillOpacity={d.rayado ? 0.18 : 0.3} stroke={d.color} strokeWidth="0.4" />
                      {d.rayado && <rect x={rx} y={ry} width={rw} height={rh} fill={`url(#rayas-${idxColor})`} />}
                    </g>
                  );
                }
                if (d.tipo === "flecha" || d.tipo === "flechaDiscontinua") {
                  const [a, b] = d.puntos;
                  if (!a || !b) return null;
                  return (
                    <line
                      key={d.id}
                      x1={a.x} y1={a.y * 0.666} x2={b.x} y2={b.y * 0.666}
                      stroke={d.color} strokeWidth="0.6" markerEnd="url(#flecha-punta)"
                      strokeDasharray={d.tipo === "flechaDiscontinua" ? "2,1.4" : undefined}
                    />
                  );
                }
                return <polyline key={d.id} points={pts} fill="none" stroke={d.color} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />;
              })}
              {dibujandoRef.current && (
                dibujandoRef.current.puntos.length > 1 &&
                (herramienta === "recuadro" ? (
                  <rect
                    x={Math.min(dibujandoRef.current.puntos[0].x, dibujandoRef.current.puntos[dibujandoRef.current.puntos.length - 1].x)}
                    y={Math.min(dibujandoRef.current.puntos[0].y, dibujandoRef.current.puntos[dibujandoRef.current.puntos.length - 1].y) * 0.666}
                    width={Math.abs(dibujandoRef.current.puntos[0].x - dibujandoRef.current.puntos[dibujandoRef.current.puntos.length - 1].x)}
                    height={Math.abs(dibujandoRef.current.puntos[0].y - dibujandoRef.current.puntos[dibujandoRef.current.puntos.length - 1].y) * 0.666}
                    fill={colorDibujo}
                    fillOpacity="0.3"
                    stroke={colorDibujo}
                    strokeWidth="0.4"
                  />
                ) : herramienta === "flecha" || herramienta === "flechaDiscontinua" ? (
                  <line
                    x1={dibujandoRef.current.puntos[0].x}
                    y1={dibujandoRef.current.puntos[0].y * 0.666}
                    x2={dibujandoRef.current.puntos[dibujandoRef.current.puntos.length - 1].x}
                    y2={dibujandoRef.current.puntos[dibujandoRef.current.puntos.length - 1].y * 0.666}
                    stroke={colorDibujo}
                    strokeWidth="0.6"
                    strokeDasharray={herramienta === "flechaDiscontinua" ? "2,1.4" : undefined}
                  />
                ) : (
                  <polyline
                    points={dibujandoRef.current.puntos.map((p) => `${p.x},${p.y * 0.666}`).join(" ")}
                    fill="none"
                    stroke={colorDibujo}
                    strokeWidth="0.5"
                  />
                ))
              )}
            </svg>

            {/* Elementos (jugadores y material) */}
            {frame.elementos.map((el) => {
              const esJugador = el.tipo === "jugadorPropio" || el.tipo === "jugadorRival";
              const escala = pizarraActual.escalaJugadores ?? 1;
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => onTokenMouseDown(e, el.id)}
                  title={el.nombre || el.label || el.texto || ""}
                  onDoubleClick={() => {
                    if (herramienta !== "mover") return;
                    if (el.tipo !== "jugadorPropio" && el.tipo !== "jugadorRival" && el.tipo !== "texto") return;
                    const actual = el.tipo === "texto" ? el.texto : el.nombre;
                    const valor = window.prompt("Nuevo texto:", actual || "");
                    if (valor !== null) {
                      const campo = el.tipo === "texto" ? "texto" : "nombre";
                      guardarHistorial();
                      actualizarFrame((f) => ({ ...f, elementos: f.elementos.map((e) => (e.id === el.id ? { ...e, [campo]: valor } : e)) }));
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    transform: "translate(-50%, -50%)",
                    transition: reproduciendo ? "left 0.85s linear, top 0.85s linear" : "none",
                    cursor: herramienta === "mover" ? "grab" : "default",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    {esJugador ? (
                      <div
                        className="display-font"
                        style={{
                          width: `${(el.suplente ? 24 : 30) * escala}px`,
                          height: `${(el.suplente ? 24 : 30) * escala}px`,
                          borderRadius: "50%",
                          background: el.tipo === "jugadorPropio" ? pizarraActual.colorPropio : pizarraActual.colorRival,
                          border: "2px solid #fff",
                          color: esClaroFondo(el.tipo === "jugadorPropio" ? pizarraActual.colorPropio : pizarraActual.colorRival) ? COLORS.ink : "#fff",
                          fontSize: `${(el.suplente ? 10 : 12) * escala}px`,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                        }}
                      >
                        {el.dorsal}
                      </div>
                    ) : el.tipo === "texto" ? (
                      <span className="display-font" style={{ fontSize: "12px", fontWeight: 700, color: el.color || "#fff", background: "rgba(19,32,24,0.55)", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                        {el.texto}
                      </span>
                    ) : (
                      <span style={{ fontSize: "22px", color: el.color || "inherit", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>{el.emoji}</span>
                    )}
                    {herramienta === "mover" && (
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => eliminarElemento(el.id)}
                        style={{
                          position: "absolute", top: "-6px", right: "-6px", width: "14px", height: "14px", borderRadius: "50%",
                          background: COLORS.redCard, color: "#fff", border: "none", fontSize: "9px", lineHeight: "14px", cursor: "pointer", padding: 0,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {esJugador && el.nombre && (
                    <span
                      style={{
                        marginTop: "2px",
                        background: "#fff",
                        color: "#111",
                        fontSize: `${8.5 * escala}px`,
                        fontWeight: 600,
                        lineHeight: 1.15,
                        padding: `${1 * escala}px ${4 * escala}px`,
                        borderRadius: "3px",
                        whiteSpace: "nowrap",
                        maxWidth: `${76 * escala}px`,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }}
                    >
                      {el.nombre}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Fotogramas (animación) */}
          {pizarraActual.tipo === "animado" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => setReproduciendo(!reproduciendo)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: reproduciendo ? COLORS.redCard : COLORS.grass, color: "#fff", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {reproduciendo ? <Pause size={13} /> : <Play size={13} />} {reproduciendo ? "Pausar" : "Reproducir"}
              </button>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {pizarraActual.fotogramas.map((_, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <button
                      onClick={() => {
                        setReproduciendo(false);
                        setFrameIndex(i);
                      }}
                      style={{
                        width: "30px", height: "30px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                        background: i === frameIndex ? COLORS.pitch : "#fff", color: i === frameIndex ? "#fff" : COLORS.ink,
                        border: `1px solid ${COLORS.line}`, cursor: "pointer",
                      }}
                    >
                      {i + 1}
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={agregarFotograma}
                style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: "6px", padding: "8px 12px", fontSize: "12px", cursor: "pointer" }}
              >
                <Plus size={13} /> Fotograma
              </button>
              {pizarraActual.fotogramas.length > 1 && (
                <button
                  onClick={() => eliminarFotograma(frameIndex)}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: "6px", padding: "8px 12px", fontSize: "12px", cursor: "pointer", color: COLORS.redCard }}
                >
                  <Trash2 size={13} /> Borrar fotograma actual
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
