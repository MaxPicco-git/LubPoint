/* LUBPOINT · Reportes mensuales en Excel
   - Ventas del mes: Resumen (indicadores + ventas por día con total), Detalle de ventas y Productos más vendidos.
   - Movimientos de stock del mes: resumen por tipo + detalle.
   Todas las fechas y horas en hora de Argentina (UTC-3, sin horario de verano). */

import { crearLibro, E, col } from "./excel.js";

export const HORA_AR = "-3 hours";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const nombreMes = mes => { const [a, m] = mes.split("-").map(Number); return `${MESES[m - 1]} ${a}`; };
const fechaAR = f => f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : "";   // "2026-09-12 ..." -> 12/09/2026
const horaAR = f => f ? f.slice(11, 16) : "";
const plata = n => "$ " + Math.round(n || 0).toLocaleString("es-AR");

function generadoEl() {
  const d = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  return `${fechaAR(d.replace("T", " "))} ${horaAR(d.replace("T", " "))}`;
}

const t = (v, s = E.texto) => ({ v, s });
const n = (v, s = E.entero) => ({ v: Number(v) || 0, s });
const $ = (v, s = E.plata) => ({ v: Number(v) || 0, s });

// ---------------------------------------------------------------- Ventas del mes
export async function libroVentas(env, mes) {
  const r = await env.DB.prepare(
    `SELECT p.id AS pedido_id, p.numero, p.cliente, p.origen, IFNULL(p.entrega, '') AS entrega,
            datetime(p.pagado_en, '${HORA_AR}') AS cuando,
            i.nombre AS producto, i.cantidad, i.precio, (i.cantidad * i.precio) AS subtotal,
            IFNULL(pr.codigo, '') AS codigo, IFNULL(pr.categoria, '') AS categoria
     FROM pedidos p
     JOIN pedido_items i ON i.pedido_id = p.id
     LEFT JOIN productos pr ON pr.id = i.producto_id
     WHERE p.estado = 'pagado' AND strftime('%Y-%m', datetime(p.pagado_en, '${HORA_AR}')) = ?
     ORDER BY p.pagado_en, p.id, i.id`).bind(mes).all();
  const filas = r.results || [];

  // ------------------------------------------------ Cálculos
  const pedidos = new Map();
  for (const f of filas) {
    const p = pedidos.get(f.pedido_id) || { origen: f.origen, dia: f.cuando.slice(0, 10), total: 0, unidades: 0 };
    p.total += f.subtotal;
    p.unidades += f.cantidad;
    pedidos.set(f.pedido_id, p);
  }
  const lista = [...pedidos.values()];
  const totalMes = lista.reduce((a, p) => a + p.total, 0);
  const unidadesMes = lista.reduce((a, p) => a + p.unidades, 0);
  const cantVentas = lista.length;
  const porOrigen = o => lista.filter(p => p.origen === o);
  const web = porOrigen("web"), mostrador = porOrigen("mostrador");

  const [anio, m] = mes.split("-").map(Number);
  const diasDelMes = new Date(anio, m, 0).getDate();
  const porDia = [];
  for (let d = 1; d <= diasDelMes; d++) {
    const iso = `${mes}-${String(d).padStart(2, "0")}`;
    const delDia = lista.filter(p => p.dia === iso);
    porDia.push({
      iso, nombre: DIAS[new Date(anio, m - 1, d).getDay()],
      ventas: delDia.length,
      unidades: delDia.reduce((a, p) => a + p.unidades, 0),
      total: delDia.reduce((a, p) => a + p.total, 0)
    });
  }
  const mejor = porDia.reduce((a, b) => (b.total > a.total ? b : a), porDia[0]);

  const productos = new Map();
  for (const f of filas) {
    const clave = f.codigo || f.producto;
    const p = productos.get(clave) || { codigo: f.codigo, producto: f.producto, categoria: f.categoria, unidades: 0, total: 0 };
    p.unidades += f.cantidad;
    p.total += f.subtotal;
    productos.set(clave, p);
  }
  const ranking = [...productos.values()].sort((a, b) => b.unidades - a.unidades || b.total - a.total);

  const titulo = `LUBPOINT · Ventas de ${nombreMes(mes)}`;
  const subtitulo = `Generado el ${generadoEl()} · Montos en pesos argentinos · Solo ventas con pago recibido`;

  // ------------------------------------------------ Hoja 1: Resumen
  const res = [
    [t(titulo, E.titulo)],
    [t(subtitulo, E.subtitulo)],
    [],
    [t("Resumen del mes", E.seccion)],
    [t("Indicador", E.encabezado), t("Valor", E.encabezado)],
    [t("TOTAL VENDIDO EN EL MES", E.totalEtiqueta), $(totalMes, E.totalPlata)],
    [t("Cantidad de ventas", E.kpiEtiqueta), n(cantVentas, E.kpiEntero)],
    [t("Unidades vendidas", E.kpiEtiqueta), n(unidadesMes, E.kpiEntero)],
    [t("Ticket promedio", E.kpiEtiqueta), $(cantVentas ? totalMes / cantVentas : 0, E.kpiPlata)],
    [t("Mejor día", E.kpiEtiqueta), t(mejor && mejor.total > 0 ? `${mejor.nombre} ${fechaAR(mejor.iso).slice(0, 5)} · ${plata(mejor.total)}` : "Sin ventas", E.kpiTexto)],
    [t("Ventas por la web", E.kpiEtiqueta), t(`${web.length} · ${plata(web.reduce((a, p) => a + p.total, 0))}`, E.kpiTexto)],
    [t("Ventas de mostrador", E.kpiEtiqueta), t(`${mostrador.length} · ${plata(mostrador.reduce((a, p) => a + p.total, 0))}`, E.kpiTexto)],
    [],
    [t("Ventas por día", E.seccion)],
    [t("Fecha", E.encabezado), t("Día", E.encabezado), t("Ventas", E.encabezado), t("Unidades", E.encabezado), t("Total del día", E.encabezado), t("% del mes", E.encabezado)]
  ];
  const primeraDia = res.length + 1;
  for (const d of porDia) {
    res.push([t(fechaAR(d.iso)), t(d.nombre), n(d.ventas), n(d.unidades), $(d.total),
      { v: totalMes ? d.total / totalMes : 0, s: E.porcentaje }]);
  }
  const ultimaDia = res.length;
  res.push([
    t("TOTAL DEL MES", E.totalEtiqueta), t("", E.totalEtiqueta),
    { f: `SUM(C${primeraDia}:C${ultimaDia})`, v: cantVentas, s: E.totalEntero },
    { f: `SUM(D${primeraDia}:D${ultimaDia})`, v: unidadesMes, s: E.totalEntero },
    { f: `SUM(E${primeraDia}:E${ultimaDia})`, v: totalMes, s: E.totalPlata },
    { v: totalMes ? 1 : 0, s: E.totalPorcentaje }
  ]);

  const hojaResumen = {
    nombre: "Resumen",
    anchos: [30, 26, 12, 12, 18, 12],
    filas: res,
    combinar: ["A1:F1", "A2:F2"],
    altos: { 0: 30, 5: 26 }
  };

  // ------------------------------------------------ Hoja 2: Detalle de ventas
  const cab = ["Fecha", "Hora", "N° pedido", "Cliente", "Origen", "Entrega", "Código", "Producto", "Categoría", "Cantidad", "Precio unitario", "Subtotal"];
  const det = [
    [t(titulo + " · Detalle", E.titulo)],
    [t(subtitulo, E.subtitulo)],
    [],
    cab.map(c => t(c, E.encabezado))
  ];
  const primeraFila = det.length + 1;
  for (const f of filas) {
    det.push([
      t(fechaAR(f.cuando)), t(horaAR(f.cuando)), t(f.numero), t(f.cliente),
      t(f.origen === "web" ? "Web" : "Mostrador"), t(f.entrega), t(f.codigo), t(f.producto), t(f.categoria),
      n(f.cantidad), $(f.precio), $(f.subtotal)
    ]);
  }
  const ultimaFila = Math.max(det.length, primeraFila);
  if (!filas.length) det.push([t("No hubo ventas con pago recibido en este mes.", E.texto)]);
  const filaTotal = det.length + 1;
  det.push([
    t(`TOTAL DEL MES · ${cantVentas} venta(s)`, E.totalEtiqueta), ...Array(8).fill(null).map(() => t("", E.totalEtiqueta)),
    { f: `SUM(J${primeraFila}:J${ultimaFila})`, v: unidadesMes, s: E.totalEntero },
    t("", E.totalEtiqueta),
    { f: `SUM(L${primeraFila}:L${ultimaFila})`, v: totalMes, s: E.totalPlata }
  ]);

  const hojaDetalle = {
    nombre: "Detalle de ventas",
    anchos: [12, 8, 13, 24, 11, 20, 9, 36, 22, 10, 16, 16],
    filas: det,
    combinar: ["A1:L1", "A2:L2", `A${filaTotal}:I${filaTotal}`],
    congelarFila: 4,
    filtro: filas.length ? `A4:L${ultimaFila}` : null,
    altos: { 0: 30, 3: 24 }
  };

  // ------------------------------------------------ Hoja 3: Productos más vendidos
  const top = [
    [t(titulo + " · Productos más vendidos", E.titulo)],
    [t(subtitulo, E.subtitulo)],
    [],
    ["Puesto", "Código", "Producto", "Categoría", "Unidades", "Total vendido", "% de la venta"].map(c => t(c, E.encabezado))
  ];
  const primeraTop = top.length + 1;
  ranking.forEach((p, i) => top.push([
    n(i + 1), t(p.codigo), t(p.producto), t(p.categoria), n(p.unidades), $(p.total),
    { v: totalMes ? p.total / totalMes : 0, s: E.porcentaje }
  ]));
  if (!ranking.length) top.push([t("Sin ventas en este mes.", E.texto)]);
  const ultimaTop = Math.max(top.length, primeraTop);
  const filaTotalTop = top.length + 1;
  top.push([
    t("TOTAL", E.totalEtiqueta), t("", E.totalEtiqueta), t("", E.totalEtiqueta), t("", E.totalEtiqueta),
    { f: `SUM(E${primeraTop}:E${ultimaTop})`, v: unidadesMes, s: E.totalEntero },
    { f: `SUM(F${primeraTop}:F${ultimaTop})`, v: totalMes, s: E.totalPlata },
    { v: totalMes ? 1 : 0, s: E.totalPorcentaje }
  ]);

  const hojaTop = {
    nombre: "Más vendidos",
    anchos: [9, 10, 38, 24, 12, 18, 14],
    filas: top,
    combinar: ["A1:G1", "A2:G2", `A${filaTotalTop}:D${filaTotalTop}`],
    congelarFila: 4,
    altos: { 0: 30, 3: 24 }
  };

  return crearLibro([hojaResumen, hojaDetalle, hojaTop], titulo);
}

// ---------------------------------------------------------------- Movimientos de stock del mes
const TIPOS = {
  ingreso: "Ingreso de mercadería",
  venta: "Venta",
  ajuste: "Ajuste de inventario",
  devolucion: "Devolución",
  reserva: "Reserva (pendiente de pago)",
  liberacion: "Reserva liberada"
};

export async function libroMovimientos(env, mes) {
  const r = await env.DB.prepare(
    `SELECT datetime(mv.creado, '${HORA_AR}') AS cuando, IFNULL(p.codigo, '') AS codigo, IFNULL(p.nombre, '') AS producto,
            mv.tipo, mv.cantidad, mv.stock_final, IFNULL(mv.motivo, '') AS motivo, IFNULL(u.nombre, 'Sistema') AS usuario
     FROM movimientos mv
     LEFT JOIN productos p ON p.id = mv.producto_id
     LEFT JOIN usuarios u ON u.id = mv.usuario_id
     WHERE strftime('%Y-%m', datetime(mv.creado, '${HORA_AR}')) = ?
     ORDER BY mv.creado, mv.id`).bind(mes).all();
  const filas = r.results || [];
  const suma = tipo => filas.filter(f => f.tipo === tipo).reduce((a, f) => a + Math.abs(f.cantidad), 0);

  const titulo = `LUBPOINT · Movimientos de stock de ${nombreMes(mes)}`;
  const subtitulo = `Generado el ${generadoEl()} · Las reservas no cambian el stock: solo lo comprometen hasta que se paga o vence`;

  const hoja = [
    [t(titulo, E.titulo)],
    [t(subtitulo, E.subtitulo)],
    [],
    [t("Resumen del mes", E.seccion)],
    [t("Tipo de movimiento", E.encabezado), t("Unidades", E.encabezado)],
    [t("Ingresos de mercadería", E.kpiEtiqueta), n(suma("ingreso"), E.kpiEntero)],
    [t("Vendidas", E.kpiEtiqueta), n(suma("venta"), E.kpiEntero)],
    [t("Devueltas", E.kpiEtiqueta), n(suma("devolucion"), E.kpiEntero)],
    [t("Ajustes de inventario", E.kpiEtiqueta), n(filas.filter(f => f.tipo === "ajuste").reduce((a, f) => a + f.cantidad, 0), E.kpiEntero)],
    [],
    [t("Detalle", E.seccion)],
    ["Fecha", "Hora", "Código", "Producto", "Movimiento", "Cantidad", "¿Cambia el stock?", "Stock después", "Motivo", "Usuario"].map(c => t(c, E.encabezado))
  ];
  const cabecera = hoja.length;
  for (const f of filas) {
    const cambia = !["reserva", "liberacion"].includes(f.tipo);
    hoja.push([
      t(fechaAR(f.cuando)), t(horaAR(f.cuando)), t(f.codigo), t(f.producto), t(TIPOS[f.tipo] || f.tipo),
      n(f.cantidad), t(cambia ? "Sí" : "No"), n(f.stock_final), t(f.motivo), t(f.usuario)
    ]);
  }
  if (!filas.length) hoja.push([t("No hubo movimientos de stock en este mes.", E.texto)]);

  return crearLibro([{
    nombre: "Movimientos",
    anchos: [12, 8, 9, 36, 26, 11, 16, 14, 40, 18],
    filas: hoja,
    combinar: ["A1:J1", "A2:J2"],
    congelarFila: cabecera,
    filtro: filas.length ? `A${cabecera}:J${hoja.length}` : null,
    altos: { 0: 30 }
  }], titulo);
}
