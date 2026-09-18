/* LUBPOINT · Sistema (Cloudflare Worker + base de datos D1)
   - /api/publico/*  : lo que usa la web (catálogo, pedidos, turnos). Sin login.
   - /api/*          : panel de administración. Con login.
   - resto           : archivos del panel (carpeta panel/).

   Reglas de stock: una venta descuenta unidades; un pedido "pendiente de pago" las reserva por
   2 horas y, si no se paga, la reserva vence sola y las unidades vuelven a estar disponibles. */

import { libroVentas, libroMovimientos, HORA_AR } from "./reportes.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
const error = (msg, status = 400) => json({ error: msg }, status);

// ---------------------------------------------------------------- CORS (la web vive en otro dominio)
/* Permisos de navegador:
   - /api/publico/* (catálogo, pedidos, turnos): abierto, lo consulta la web. Sin cookies.
   - Panel: solo desde el propio sistema o desde las direcciones de SITIO (y localhost al probar).
     Así, si alguien copia la dirección del sistema en otra página, no puede operar con tu sesión. */
function cors(req, res, env, publico) {
  const origen = req.headers.get("Origin");
  if (!origen) return res;
  const h = new Headers(res.headers);
  if (publico) {
    h.set("Access-Control-Allow-Origin", "*");
  } else {
    const permitidos = String((env && env.SITIO) || "").split(",").map(s => s.trim()).filter(Boolean);
    const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);
    if (!permitidos.includes(origen) && !esLocal) return res;
    h.set("Access-Control-Allow-Origin", origen);
    h.set("Access-Control-Allow-Credentials", "true");
  }
  h.set("Vary", "Origin");
  return new Response(res.body, { status: res.status, headers: h });
}

// ---------------------------------------------------------------- Contraseñas y sesiones
const buf2hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");

async function hashClave(clave, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return buf2hex(bits);
}
const nuevoToken = () => buf2hex(crypto.getRandomValues(new Uint8Array(32)));

async function usuarioDeLaSesion(req, env) {
  const cookie = req.headers.get("Cookie") || "";
  const m = cookie.match(/lp_sesion=([a-f0-9]+)/);
  if (!m) return null;
  const fila = await env.DB.prepare(
    `SELECT u.id, u.usuario, u.nombre, u.rol FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = ? AND s.expira > datetime('now') AND u.activo = 1`).bind(m[1]).first();
  return fila || null;
}

const esDueno = u => u && u.rol === "dueno";

const horasDeReserva = async env =>
  Number((await env.DB.prepare(`SELECT valor FROM config WHERE clave = 'reserva_horas'`).first())?.valor || 2);

// ---------------------------------------------------------------- Reservas vencidas
/* Libera los pedidos "pendiente de pago" cuya reserva ya venció: vuelven a estado nuevo y sus
   unidades dejan de estar reservadas. Se ejecuta antes de cualquier lectura de stock. */
async function liberarReservasVencidas(env) {
  const vencidos = await env.DB.prepare(
    `SELECT id, numero FROM pedidos
     WHERE estado = 'reservado' AND reserva_hasta IS NOT NULL AND reserva_hasta < datetime('now')`).all();
  for (const p of vencidos.results || []) {
    const items = await env.DB.prepare(`SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?`).bind(p.id).all();
    const ops = [];
    for (const it of items.results || []) {
      if (!it.producto_id) continue;
      ops.push(env.DB.prepare(`UPDATE productos SET reservado = MAX(0, reservado - ?) WHERE id = ?`)
        .bind(it.cantidad, it.producto_id));
      ops.push(env.DB.prepare(
        `INSERT INTO movimientos (producto_id, tipo, cantidad, stock_final, motivo, pedido_id)
         VALUES (?, 'liberacion', ?, (SELECT stock FROM productos WHERE id = ?), ?, ?)`)
        .bind(it.producto_id, it.cantidad, it.producto_id, `Venció la reserva del pedido ${p.numero}`, p.id));
    }
    ops.push(env.DB.prepare(
      `UPDATE pedidos SET estado = 'nuevo', reserva_hasta = NULL, actualizado = datetime('now') WHERE id = ?`).bind(p.id));
    if (ops.length) await env.DB.batch(ops);
  }
  return (vencidos.results || []).length;
}

// ---------------------------------------------------------------- Movimientos de stock
async function moverStock(env, { producto_id, tipo, cantidad, motivo, pedido_id, usuario_id }) {
  const p = await env.DB.prepare(`SELECT stock FROM productos WHERE id = ?`).bind(producto_id).first();
  if (!p) throw new Error("El producto no existe");
  const final = p.stock + cantidad;
  await env.DB.batch([
    env.DB.prepare(`UPDATE productos SET stock = ?, actualizado = datetime('now') WHERE id = ?`).bind(final, producto_id),
    env.DB.prepare(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, stock_final, motivo, pedido_id, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(producto_id, tipo, cantidad, final, motivo || null, pedido_id || null, usuario_id || null)
  ]);
  return final;
}

async function itemsDe(env, pedido_id) {
  const r = await env.DB.prepare(`SELECT * FROM pedido_items WHERE pedido_id = ? ORDER BY id`).bind(pedido_id).all();
  return r.results || [];
}
const totalDe = items => items.reduce((t, i) => t + i.precio * i.cantidad, 0);

/* Cambia el estado de un pedido aplicando las reglas de stock. */
async function cambiarEstadoPedido(env, pedido, nuevo, usuario) {
  if (pedido.estado === nuevo) return;
  const items = await itemsDe(env, pedido.id);
  const anterior = pedido.estado;
  const horas = await horasDeReserva(env);
  const ops = [];

  // Suelta lo que estuviera reservado
  if (anterior === "reservado") {
    for (const it of items) {
      if (!it.producto_id) continue;
      ops.push(env.DB.prepare(`UPDATE productos SET reservado = MAX(0, reservado - ?) WHERE id = ?`)
        .bind(it.cantidad, it.producto_id));
    }
  }
  // Si estaba pagado y se anula, las unidades vuelven al stock
  if (anterior === "pagado") {
    for (const it of items) {
      if (!it.producto_id) continue;
      await moverStock(env, {
        producto_id: it.producto_id, tipo: "devolucion", cantidad: it.cantidad,
        motivo: `Se anuló el pedido ${pedido.numero}`, pedido_id: pedido.id, usuario_id: usuario.id
      });
    }
  }

  if (nuevo === "reservado") {
    for (const it of items) {
      if (!it.producto_id) continue;
      ops.push(env.DB.prepare(`UPDATE productos SET reservado = reservado + ? WHERE id = ?`)
        .bind(it.cantidad, it.producto_id));
      ops.push(env.DB.prepare(
        `INSERT INTO movimientos (producto_id, tipo, cantidad, stock_final, motivo, pedido_id, usuario_id)
         VALUES (?, 'reserva', ?, (SELECT stock FROM productos WHERE id = ?), ?, ?, ?)`)
        .bind(it.producto_id, it.cantidad, it.producto_id,
          `Reserva por ${horas} h del pedido ${pedido.numero}`, pedido.id, usuario.id));
    }
    ops.push(env.DB.prepare(
      `UPDATE pedidos SET estado = 'reservado', pagado_en = NULL,
              reserva_hasta = datetime('now', '+' || ? || ' hours'), actualizado = datetime('now')
       WHERE id = ?`).bind(horas, pedido.id));
  } else if (nuevo === "pagado") {
    for (const it of items) {
      if (!it.producto_id) continue;
      await moverStock(env, {
        producto_id: it.producto_id, tipo: "venta", cantidad: -it.cantidad,
        motivo: `Venta del pedido ${pedido.numero}`, pedido_id: pedido.id, usuario_id: usuario.id
      });
    }
    ops.push(env.DB.prepare(
      `UPDATE pedidos SET estado = 'pagado', reserva_hasta = NULL, pagado_en = datetime('now'),
              actualizado = datetime('now') WHERE id = ?`).bind(pedido.id));
  } else {
    ops.push(env.DB.prepare(
      `UPDATE pedidos SET estado = ?, reserva_hasta = NULL, pagado_en = NULL, actualizado = datetime('now')
       WHERE id = ?`).bind(nuevo, pedido.id));
  }
  if (ops.length) await env.DB.batch(ops);
}

// ---------------------------------------------------------------- Rutas públicas (las usa la web)
async function rutasPublicas(req, env, url) {
  const ruta = url.pathname.replace("/api/publico", "");

  if (ruta === "/productos" && req.method === "GET") {
    await liberarReservasVencidas(env);
    const r = await env.DB.prepare(
      `SELECT id, codigo, sku, nombre, categoria, marca, presentacion, precio, agotado,
              CASE WHEN agotado = 1 THEN 0 ELSE MAX(0, stock - reservado) END AS disponible
       FROM productos WHERE activo = 1 AND visible = 1 ORDER BY categoria, nombre`).all();
    return json({ productos: r.results || [] });
  }

  if (ruta === "/config" && req.method === "GET") {
    const r = await env.DB.prepare(`SELECT clave, valor FROM config`).all();
    return json(Object.fromEntries((r.results || []).map(c => [c.clave, c.valor])));
  }

  if (ruta === "/pedidos" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.items) || !body.items.length) return error("El pedido no tiene productos");
    if (!body.cliente || String(body.cliente).trim().split(/\s+/).length < 2) return error("Falta el nombre y apellido");
    const numero = "P-" + String(Date.now()).slice(-8);
    await env.DB.prepare(
      `INSERT INTO pedidos (numero, origen, estado, cliente, telefono, entrega, notas)
       VALUES (?, 'web', 'nuevo', ?, ?, ?, ?)`)
      .bind(numero, String(body.cliente).trim(), body.telefono || null, body.entrega || null, body.notas || null).run();
    const pedido = await env.DB.prepare(`SELECT id FROM pedidos WHERE numero = ?`).bind(numero).first();
    let total = 0;
    for (const it of body.items) {
      const p = await env.DB.prepare(`SELECT id, nombre, precio FROM productos WHERE id = ? AND activo = 1`).bind(it.id).first();
      if (!p) continue;
      const cant = Math.max(1, Math.min(999, Number(it.cantidad) || 1));
      total += p.precio * cant;
      // La web puede mandar la variante elegida (fragancia, modelo de calcomanía, etc.):
      // el stock se descuenta del producto, y el nombre le dice al dueño cuál preparar.
      const variante = it.variante ? String(it.variante).trim().slice(0, 40) : "";
      const nombreItem = variante ? `${p.nombre} · ${variante}` : p.nombre;
      await env.DB.prepare(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?, ?)`)
        .bind(pedido.id, p.id, nombreItem, p.precio, cant).run();
    }
    await env.DB.prepare(`UPDATE pedidos SET total = ? WHERE id = ?`).bind(total, pedido.id).run();
    return json({ numero, total });
  }

  if (ruta === "/turnos" && req.method === "POST") {
    const b = await req.json().catch(() => null);
    if (!b || !b.servicio || !b.fecha || !b.hora) return error("Faltan datos del turno");
    if (!b.cliente || String(b.cliente).trim().split(/\s+/).length < 2) return error("Falta el nombre y apellido");
    await env.DB.prepare(
      `INSERT INTO turnos (servicio, fecha, hora, cliente, telefono, notas) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(b.servicio, b.fecha, b.hora, String(b.cliente).trim(), b.telefono || null, b.notas || null).run();
    return json({ ok: true });
  }

  return error("No encontrado", 404);
}

// ---------------------------------------------------------------- Rutas del panel (con login)
async function rutasPanel(req, env, url, usuario) {
  const ruta = url.pathname.replace("/api", "");
  const metodo = req.method;
  const soloDueno = () => { if (!esDueno(usuario)) throw { status: 403, msg: "Tu usuario es de solo lectura" }; };
  const body = ["POST", "PATCH", "PUT"].includes(metodo) ? await req.json().catch(() => ({})) : {};

  if (ruta === "/yo") return json({ usuario });

  // ------------------------------------------------ Resumen del día
  if (ruta === "/resumen") {
    await liberarReservasVencidas(env);
    const hoy = await env.DB.prepare(
      `SELECT COUNT(*) AS pedidos, IFNULL(SUM(total), 0) AS total FROM pedidos
       WHERE estado = 'pagado' AND date(pagado_en, '${HORA_AR}') = date('now', '${HORA_AR}')`).first();
    const abiertos = await env.DB.prepare(`SELECT COUNT(*) AS n FROM pedidos WHERE estado IN ('nuevo', 'reservado')`).first();
    const turnos = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM turnos WHERE fecha = date('now', '${HORA_AR}') AND estado != 'cancelado'`).first();
    const bajo = await env.DB.prepare(
      `SELECT id, codigo, nombre, stock, stock_minimo FROM productos
       WHERE activo = 1 AND stock_minimo > 0 AND stock <= stock_minimo ORDER BY stock LIMIT 20`).all();
    const sinPrecio = await env.DB.prepare(`SELECT COUNT(*) AS n FROM productos WHERE activo = 1 AND precio = 0`).first();
    return json({
      ventasHoy: hoy?.total || 0, pedidosHoy: hoy?.pedidos || 0,
      pedidosAbiertos: abiertos?.n || 0, turnosHoy: turnos?.n || 0,
      stockBajo: bajo.results || [], sinPrecio: sinPrecio?.n || 0
    });
  }

  // ------------------------------------------------ Productos
  if (ruta === "/productos" && metodo === "GET") {
    await liberarReservasVencidas(env);
    const q = (url.searchParams.get("buscar") || "").trim();
    const cat = url.searchParams.get("categoria") || "";
    let sql = `SELECT * FROM productos WHERE activo = 1`;
    const args = [];
    if (q) {
      sql += ` AND (nombre LIKE ? OR codigo LIKE ? OR sku LIKE ? OR categoria LIKE ?)`;
      args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (cat) { sql += ` AND categoria = ?`; args.push(cat); }
    sql += ` ORDER BY categoria, nombre`;
    const r = await env.DB.prepare(sql).bind(...args).all();
    const cats = await env.DB.prepare(`SELECT DISTINCT categoria FROM productos WHERE activo = 1 ORDER BY categoria`).all();
    return json({ productos: r.results || [], categorias: (cats.results || []).map(c => c.categoria) });
  }

  if (ruta === "/productos" && metodo === "POST") {
    soloDueno();
    if (!body.nombre || !body.categoria) return error("Falta el nombre o la categoría");
    const ultimo = await env.DB.prepare(`SELECT MAX(CAST(codigo AS INTEGER)) AS n FROM productos`).first();
    const codigo = String((ultimo?.n || 0) + 1).padStart(3, "0");
    await env.DB.prepare(
      `INSERT INTO productos (codigo, sku, nombre, categoria, marca, presentacion, precio, stock, stock_minimo, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(codigo, body.sku || `LUB-${codigo}`, body.nombre, body.categoria, body.marca || null,
        body.presentacion || null, Number(body.precio) || 0, Number(body.stock) || 0,
        Number(body.stock_minimo) || 0, body.observaciones || null).run();
    return json({ ok: true, codigo });
  }

  let m = ruta.match(/^\/productos\/(\d+)$/);
  if (m && metodo === "PATCH") {
    soloDueno();
    const campos = ["nombre", "categoria", "marca", "presentacion", "precio", "stock_minimo", "visible", "observaciones", "sku", "agotado"];
    const sets = [], args = [];
    for (const c of campos) if (c in body) { sets.push(`${c} = ?`); args.push(body[c]); }
    if (!sets.length) return error("Nada para cambiar");
    args.push(m[1]);
    await env.DB.prepare(`UPDATE productos SET ${sets.join(", ")}, actualizado = datetime('now') WHERE id = ?`)
      .bind(...args).run();
    return json({ ok: true });
  }

  if (m && metodo === "DELETE") {
    soloDueno();
    await env.DB.prepare(`UPDATE productos SET activo = 0 WHERE id = ?`).bind(m[1]).run();
    return json({ ok: true });
  }

  m = ruta.match(/^\/productos\/(\d+)\/stock$/);
  if (m && metodo === "POST") {
    soloDueno();
    const cant = Number(body.cantidad);
    if (!cant) return error("Poné una cantidad distinta de cero");
    const tipo = ["ingreso", "ajuste", "devolucion"].includes(body.tipo) ? body.tipo : "ajuste";
    const final = await moverStock(env, {
      producto_id: Number(m[1]), tipo,
      cantidad: tipo === "ingreso" ? Math.abs(cant) : cant,
      motivo: body.motivo || null, usuario_id: usuario.id
    });
    if (tipo === "ingreso") await env.DB.prepare(`UPDATE productos SET agotado = 0 WHERE id = ?`).bind(Number(m[1])).run();
    return json({ ok: true, stock: final });
  }

  // ------------------------------------------------ Movimientos
  if (ruta === "/movimientos" && metodo === "GET") {
    const desde = url.searchParams.get("desde") || "1900-01-01";
    const hasta = url.searchParams.get("hasta") || "2999-12-31";
    const r = await env.DB.prepare(
      `SELECT mv.*, p.nombre AS producto, p.codigo, u.nombre AS usuario FROM movimientos mv
       LEFT JOIN productos p ON p.id = mv.producto_id
       LEFT JOIN usuarios u ON u.id = mv.usuario_id
       WHERE date(mv.creado) BETWEEN ? AND ? ORDER BY mv.creado DESC LIMIT 500`).bind(desde, hasta).all();
    return json({ movimientos: r.results || [] });
  }

  // ------------------------------------------------ Pedidos
  if (ruta === "/pedidos" && metodo === "GET") {
    await liberarReservasVencidas(env);
    const estado = url.searchParams.get("estado");
    let sql = `SELECT * FROM pedidos`;
    const args = [];
    if (estado && estado !== "todos") { sql += ` WHERE estado = ?`; args.push(estado); }
    sql += ` ORDER BY CASE estado WHEN 'nuevo' THEN 0 WHEN 'reservado' THEN 1 ELSE 2 END, creado DESC LIMIT 200`;
    const r = await env.DB.prepare(sql).bind(...args).all();
    const pedidos = [];
    for (const p of r.results || []) pedidos.push({ ...p, items: await itemsDe(env, p.id) });
    return json({ pedidos });
  }

  if (ruta === "/pedidos" && metodo === "POST") {   // venta de mostrador
    soloDueno();
    const numero = "M-" + String(Date.now()).slice(-8);
    await env.DB.prepare(
      `INSERT INTO pedidos (numero, origen, estado, cliente, telefono, entrega, notas)
       VALUES (?, 'mostrador', 'nuevo', ?, ?, 'Mostrador', ?)`)
      .bind(numero, body.cliente || "Mostrador", body.telefono || null, body.notas || null).run();
    const ped = await env.DB.prepare(`SELECT * FROM pedidos WHERE numero = ?`).bind(numero).first();
    let total = 0;
    for (const it of body.items || []) {
      const p = await env.DB.prepare(`SELECT id, nombre, precio FROM productos WHERE id = ?`).bind(it.id).first();
      if (!p) continue;
      const cant = Math.max(1, Number(it.cantidad) || 1);
      total += p.precio * cant;
      await env.DB.prepare(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?, ?)`)
        .bind(ped.id, p.id, p.nombre, p.precio, cant).run();
    }
    await env.DB.prepare(`UPDATE pedidos SET total = ? WHERE id = ?`).bind(total, ped.id).run();
    if (body.pagado) await cambiarEstadoPedido(env, ped, "pagado", usuario);
    return json({ ok: true, numero });
  }

  m = ruta.match(/^\/pedidos\/(\d+)$/);
  if (m && metodo === "PATCH") {
    soloDueno();
    const pedido = await env.DB.prepare(`SELECT * FROM pedidos WHERE id = ?`).bind(m[1]).first();
    if (!pedido) return error("No encontré el pedido", 404);

    // El dueño ajusta cantidades: el stock y el total se acomodan solos
    if (Array.isArray(body.items)) {
      const previos = await itemsDe(env, pedido.id);
      for (const it of body.items) {
        const prev = previos.find(p => p.id === it.id);
        if (!prev) continue;
        const cant = Math.max(0, Number(it.cantidad) || 0);
        const delta = cant - prev.cantidad;
        if (delta !== 0 && prev.producto_id) {
          if (pedido.estado === "reservado")
            await env.DB.prepare(`UPDATE productos SET reservado = MAX(0, reservado + ?) WHERE id = ?`)
              .bind(delta, prev.producto_id).run();
          if (pedido.estado === "pagado")
            await moverStock(env, {
              producto_id: prev.producto_id, tipo: delta > 0 ? "venta" : "devolucion", cantidad: -delta,
              motivo: `Ajuste del pedido ${pedido.numero}`, pedido_id: pedido.id, usuario_id: usuario.id
            });
        }
        if (cant === 0) await env.DB.prepare(`DELETE FROM pedido_items WHERE id = ?`).bind(prev.id).run();
        else await env.DB.prepare(`UPDATE pedido_items SET cantidad = ? WHERE id = ?`).bind(cant, prev.id).run();
      }
      const items = await itemsDe(env, pedido.id);
      await env.DB.prepare(`UPDATE pedidos SET total = ?, actualizado = datetime('now') WHERE id = ?`)
        .bind(totalDe(items), pedido.id).run();
    }

    if (body.estado && body.estado !== pedido.estado) await cambiarEstadoPedido(env, pedido, body.estado, usuario);

    if (body.renovarReserva && pedido.estado === "reservado") {
      const horas = await horasDeReserva(env);
      await env.DB.prepare(
        `UPDATE pedidos SET reserva_hasta = datetime('now', '+' || ? || ' hours') WHERE id = ?`).bind(horas, pedido.id).run();
    }

    for (const campo of ["cliente", "telefono", "entrega", "notas"])
      if (campo in body) await env.DB.prepare(`UPDATE pedidos SET ${campo} = ? WHERE id = ?`).bind(body[campo], pedido.id).run();

    const actualizado = await env.DB.prepare(`SELECT * FROM pedidos WHERE id = ?`).bind(pedido.id).first();
    return json({ ok: true, pedido: { ...actualizado, items: await itemsDe(env, pedido.id) } });
  }

  // ------------------------------------------------ Turnos
  if (ruta === "/turnos" && metodo === "GET") {
    const desde = url.searchParams.get("desde") || "1900-01-01";
    const hasta = url.searchParams.get("hasta") || "2999-12-31";
    const r = await env.DB.prepare(`SELECT * FROM turnos WHERE fecha BETWEEN ? AND ? ORDER BY fecha, hora`)
      .bind(desde, hasta).all();
    return json({ turnos: r.results || [] });
  }

  if (ruta === "/turnos" && metodo === "POST") {
    soloDueno();
    if (!body.fecha || !body.hora) return error("Falta la fecha o la hora");
    await env.DB.prepare(
      `INSERT INTO turnos (servicio, fecha, hora, cliente, telefono, notas, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`)
      .bind(body.servicio || "Consulta", body.fecha, body.hora, body.cliente || "", body.telefono || null, body.notas || null).run();
    return json({ ok: true });
  }

  m = ruta.match(/^\/turnos\/(\d+)$/);
  if (m && metodo === "PATCH") {
    soloDueno();
    const sets = [], args = [];
    for (const c of ["servicio", "fecha", "hora", "cliente", "telefono", "estado", "notas"])
      if (c in body) { sets.push(`${c} = ?`); args.push(body[c]); }
    if (!sets.length) return error("Nada para cambiar");
    args.push(m[1]);
    await env.DB.prepare(`UPDATE turnos SET ${sets.join(", ")} WHERE id = ?`).bind(...args).run();
    return json({ ok: true });
  }

  // ------------------------------------------------ Ventas del mes: el "contador" del dueño
  if (ruta === "/ventas" && metodo === "GET") {
    const ahoraAR = new Date(Date.now() - 3 * 3600 * 1000);
    const mesHoy = ahoraAR.toISOString().slice(0, 7);
    const pedido = url.searchParams.get("mes") || "";
    const mes = /^\d{4}-\d{2}$/.test(pedido) ? pedido : mesHoy;
    const [anio, numMes] = mes.split("-").map(Number);
    const anterior = new Date(Date.UTC(anio, numMes - 2, 1)).toISOString().slice(0, 7);
    const diasDelMes = new Date(Date.UTC(anio, numMes, 0)).getUTCDate();
    const esActual = mes === mesHoy;
    const diasTranscurridos = esActual ? ahoraAR.getUTCDate() : (mes < mesHoy ? diasDelMes : 0);

    const pagadosDelMes = async unMes => (await env.DB.prepare(
      `SELECT id, numero, cliente, origen, total, datetime(pagado_en, '${HORA_AR}') AS cuando
       FROM pedidos WHERE estado = 'pagado' AND strftime('%Y-%m', datetime(pagado_en, '${HORA_AR}')) = ?
       ORDER BY pagado_en DESC`).bind(unMes).all()).results || [];
    const itemsDelMes = async unMes => (await env.DB.prepare(
      `SELECT i.nombre, i.cantidad, i.precio, IFNULL(pr.categoria, 'Sin categoría') AS categoria,
              substr(datetime(p.pagado_en, '${HORA_AR}'), 1, 10) AS dia
       FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
       LEFT JOIN productos pr ON pr.id = i.producto_id
       WHERE p.estado = 'pagado' AND strftime('%Y-%m', datetime(p.pagado_en, '${HORA_AR}')) = ?`).bind(unMes).all()).results || [];

    const pedidos = await pagadosDelMes(mes);
    const previos = await pagadosDelMes(anterior);
    const items = await itemsDelMes(mes);

    const suma = (lista, campo = "total") => lista.reduce((t, x) => t + (Number(x[campo]) || 0), 0);
    const total = suma(pedidos);
    const unidades = items.reduce((t, i) => t + i.cantidad, 0);
    const ticket = pedidos.length ? total / pedidos.length : 0;

    // Día por día
    const dias = [];
    for (let d = 1; d <= diasDelMes; d++) {
      const iso = `${mes}-${String(d).padStart(2, "0")}`;
      const delDia = pedidos.filter(p => p.cuando.startsWith(iso));
      dias.push({
        dia: iso, pedidos: delDia.length, total: suma(delDia),
        unidades: items.filter(i => i.dia === iso).reduce((t, i) => t + i.cantidad, 0)
      });
    }

    // Comparación justa: el mes anterior hasta el mismo día
    const hastaDia = Math.min(diasTranscurridos || diasDelMes, 31);
    const previosMismoPeriodo = previos.filter(p => Number(p.cuando.slice(8, 10)) <= hastaDia);
    const totalAnteriorMismoPeriodo = suma(previosMismoPeriodo);

    // Promedio por día de la semana (solo días ya transcurridos)
    const NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const semana = NOMBRES.map((nombre, dow) => ({ dow, nombre, dias: 0, total: 0 }));
    dias.slice(0, diasTranscurridos).forEach(d => {
      const dow = new Date(d.dia + "T12:00:00Z").getUTCDay();
      semana[dow].dias++;
      semana[dow].total += d.total;
    });
    const porDiaSemana = [1, 2, 3, 4, 5, 6, 0].map(i => ({
      nombre: semana[i].nombre, promedio: semana[i].dias ? semana[i].total / semana[i].dias : 0, dias: semana[i].dias
    }));

    // Por categoría y por origen
    const cats = {};
    items.forEach(i => { cats[i.categoria] = (cats[i.categoria] || 0) + i.precio * i.cantidad; });
    const porCategoria = Object.entries(cats).map(([categoria, t]) => ({ categoria, total: t })).sort((a, b) => b.total - a.total);
    const origen = o => { const l = pedidos.filter(p => p.origen === o); return { ventas: l.length, total: suma(l) }; };

    // Lo más vendido
    const prods = {};
    items.forEach(i => {
      const p = prods[i.nombre] || (prods[i.nombre] = { nombre: i.nombre, unidades: 0, total: 0 });
      p.unidades += i.cantidad;
      p.total += i.precio * i.cantidad;
    });
    const top = Object.values(prods).sort((a, b) => b.unidades - a.unidades || b.total - a.total).slice(0, 10);

    const diasConVenta = dias.filter(d => d.pedidos > 0).length;
    return json({
      mes, anterior, diasDelMes, diasTranscurridos, esActual,
      total, ventas: pedidos.length, unidades, ticket,
      promedioPorDia: diasTranscurridos ? total / diasTranscurridos : 0,
      promedioDiaConVenta: diasConVenta ? total / diasConVenta : 0,
      proyeccion: esActual && diasTranscurridos ? (total / diasTranscurridos) * diasDelMes : total,
      mesAnterior: { total: suma(previos), ventas: previos.length, ticket: previos.length ? suma(previos) / previos.length : 0 },
      mismoPeriodoAnterior: { total: totalAnteriorMismoPeriodo, ventas: previosMismoPeriodo.length, hastaDia },
      dias, porDiaSemana, porCategoria,
      porOrigen: { web: origen("web"), mostrador: origen("mostrador") },
      top, pedidos
    });
  }

  // ------------------------------------------------ Descargar reportes del mes (Excel)
  if (ruta === "/export" && metodo === "GET") {
    const mes = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "")
      ? url.searchParams.get("mes")
      : new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 7);
    const esMovimientos = url.searchParams.get("tipo") === "movimientos";
    const archivo = esMovimientos ? await libroMovimientos(env, mes) : await libroVentas(env, mes);
    const nombre = `LUBPOINT-${esMovimientos ? "movimientos-de-stock" : "ventas"}-${mes}.xlsx`;
    return new Response(archivo, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${nombre}"`
      }
    });
  }

  // ------------------------------------------------ Usuarios (solo el dueño)
  if (ruta === "/usuarios" && metodo === "GET") {
    soloDueno();
    const r = await env.DB.prepare(`SELECT id, usuario, nombre, rol, activo, creado FROM usuarios ORDER BY id`).all();
    return json({ usuarios: r.results || [] });
  }

  if (ruta === "/usuarios" && metodo === "POST") {
    soloDueno();
    if (!body.usuario || !body.clave) return error("Falta el usuario o la contraseña");
    const salt = buf2hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashClave(body.clave, salt);
    await env.DB.prepare(`INSERT INTO usuarios (usuario, nombre, rol, hash, salt) VALUES (?, ?, ?, ?, ?)`)
      .bind(String(body.usuario).toLowerCase(), body.nombre || body.usuario,
        body.rol === "dueno" ? "dueno" : "soporte", hash, salt).run();
    return json({ ok: true });
  }

  // ------------------------------------------------ Configuración
  if (ruta === "/config" && metodo === "GET") {
    const r = await env.DB.prepare(`SELECT clave, valor FROM config`).all();
    return json(Object.fromEntries((r.results || []).map(c => [c.clave, c.valor])));
  }

  if (ruta === "/config" && metodo === "PATCH") {
    soloDueno();
    for (const [k, v] of Object.entries(body))
      await env.DB.prepare(
        `INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = ?`)
        .bind(k, String(v), String(v)).run();
    return json({ ok: true });
  }

  return error("No encontrado", 404);
}

// ---------------------------------------------------------------- Entrada
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const esPublica = url.pathname.startsWith("/api/publico/");
    const conCors = res => cors(req, res, env, esPublica);

    if (req.method === "OPTIONS") {
      return conCors(new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "content-type"
        }
      }));
    }

    try {
      if (url.pathname.startsWith("/api/publico/")) return conCors(await rutasPublicas(req, env, url));

      if (url.pathname === "/api/login" && req.method === "POST") {
        const { usuario, clave } = await req.json().catch(() => ({}));
        const u = await env.DB.prepare(`SELECT * FROM usuarios WHERE usuario = ? AND activo = 1`)
          .bind(String(usuario || "").toLowerCase()).first();
        if (!u || (await hashClave(clave || "", u.salt)) !== u.hash)
          return conCors(error("Usuario o contraseña incorrectos", 401));
        const token = nuevoToken();
        await env.DB.prepare(`INSERT INTO sesiones (token, usuario_id, expira) VALUES (?, ?, datetime('now', '+30 days'))`)
          .bind(token, u.id).run();
        // "Secure" solo con HTTPS: en producción siempre, en pruebas locales (http) no, o el navegador la descarta
        const seguro = url.protocol === "https:" ? " Secure;" : "";
        return conCors(json({ ok: true, usuario: { usuario: u.usuario, nombre: u.nombre, rol: u.rol } }, 200,
          { "Set-Cookie": `lp_sesion=${token}; HttpOnly;${seguro} SameSite=Lax; Path=/; Max-Age=2592000` }));
      }

      if (url.pathname === "/api/logout" && req.method === "POST") {
        const c = (req.headers.get("Cookie") || "").match(/lp_sesion=([a-f0-9]+)/);
        if (c) await env.DB.prepare(`DELETE FROM sesiones WHERE token = ?`).bind(c[1]).run();
        return conCors(json({ ok: true }, 200,
          { "Set-Cookie": `lp_sesion=; HttpOnly;${url.protocol === "https:" ? " Secure;" : ""} SameSite=Lax; Path=/; Max-Age=0` }));
      }

      if (url.pathname.startsWith("/api/")) {
        const usuario = await usuarioDeLaSesion(req, env);
        if (!usuario) return conCors(error("Entrá con tu usuario", 401));
        return conCors(await rutasPanel(req, env, url, usuario));
      }

      return env.ASSETS.fetch(req);   // el panel (carpeta panel/)
    } catch (e) {
      if (e && e.status) return conCors(error(e.msg, e.status));
      return conCors(error("Error del servidor: " + (e?.message || e), 500));
    }
  },

  // Limpieza programada: libera reservas vencidas aunque nadie entre al panel
  async scheduled(_evento, env) { await liberarReservasVencidas(env); }
};
