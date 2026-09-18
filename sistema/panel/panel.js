/* LUBPOINT · Panel de administración
   Todo pasa por la API del sistema (/api/...). Sin librerías: carga rápido y es fácil de tocar. */

const $ = s => document.querySelector(s);
const vista = $("#vista");
let usuario = null;
let esDueno = false;

const plata = n => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hoyISO = () => new Date().toISOString().slice(0, 10);
const mesISO = () => new Date().toISOString().slice(0, 7);
const fechaCorta = f => f ? new Date(f.replace(" ", "T") + "Z").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "";
const horaCorta = f => f ? new Date(f.replace(" ", "T") + "Z").toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "";

function aviso(texto, esError) {
  const el = $("#mensaje");
  el.textContent = texto;
  el.classList.toggle("error", !!esError);
  el.hidden = false;
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => { el.hidden = true; }, 3000);
}

async function api(ruta, opciones = {}) {
  const res = await fetch("/api" + ruta, {
    credentials: "same-origin",
    headers: opciones.body ? { "content-type": "application/json" } : {},
    ...opciones
  });
  if (res.status === 401) { mostrarAcceso(); throw new Error("Sesión vencida"); }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) { aviso(datos.error || "No se pudo completar", true); throw new Error(datos.error || res.status); }
  return datos;
}

// ---------------------------------------------------------------- Acceso
function mostrarAcceso() {
  $("#acceso").hidden = false;
  $("#app").hidden = true;
}

$("#form-login").addEventListener("submit", async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ usuario: f.get("usuario"), clave: f.get("clave") })
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    $("#login-error").textContent = datos.error || "No pudimos entrar";
    $("#login-error").hidden = false;
    return;
  }
  arrancar();
});

$("#salir").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  location.reload();
});

// ---------------------------------------------------------------- Navegación
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => abrir(t.dataset.vista)));

const vistas = {};
let vistaActual = "hoy";

async function abrir(nombre) {
  vistaActual = nombre;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("activa", t.dataset.vista === nombre));
  vista.innerHTML = '<p class="vacio-msg">Cargando…</p>';
  try { await vistas[nombre](); } catch (e) { vista.innerHTML = `<p class="aviso">${esc(e.message)}</p>`; }
}

// ---------------------------------------------------------------- Hoy
vistas.hoy = async () => {
  const r = await api("/resumen");
  const pedidos = await api("/pedidos?estado=nuevo");
  $("#globo-pedidos").hidden = !r.pedidosAbiertos;
  $("#globo-pedidos").textContent = r.pedidosAbiertos;

  vista.innerHTML = `
    <h1>Hoy</h1>
    <div class="tarjetas">
      <div class="tarjeta"><small>Ventas de hoy</small><strong>${plata(r.ventasHoy)}</strong>${r.pedidosHoy} venta(s)</div>
      <div class="tarjeta ${r.pedidosAbiertos ? "alerta" : ""}"><small>Pedidos a resolver</small><strong>${r.pedidosAbiertos}</strong>nuevos y reservados</div>
      <div class="tarjeta"><small>Turnos de hoy</small><strong>${r.turnosHoy}</strong>servicios agendados</div>
      <div class="tarjeta ${r.sinPrecio ? "alerta" : ""}"><small>Sin precio cargado</small><strong>${r.sinPrecio}</strong>productos</div>
    </div>

    <div class="bloque">
      <div class="bloque__titulo"><h2>Pedidos nuevos</h2><button class="btn btn--borde btn--chico" data-ir="pedidos">Ver todos</button></div>
      <div id="pedidos-hoy"></div>
    </div>

    <div class="bloque">
      <h2>Stock bajo</h2>
      ${r.stockBajo.length ? `<div class="tabla-scroll"><table>
        <tr><th>Código</th><th>Producto</th><th>Quedan</th><th>Mínimo</th></tr>
        ${r.stockBajo.map(p => `<tr><td>${esc(p.codigo)}</td><td>${esc(p.nombre)}</td>
          <td><span class="pill pill--bajo">${p.stock}</span></td><td>${p.stock_minimo}</td></tr>`).join("")}
      </table></div>` : '<p class="vacio-msg">Ningún producto por debajo del mínimo.</p>'}
    </div>`;

  $("[data-ir]").addEventListener("click", () => abrir("pedidos"));
  pintarPedidos($("#pedidos-hoy"), pedidos.pedidos);
};

// ---------------------------------------------------------------- Productos
vistas.productos = async () => {
  const guardado = vistas.productos.filtro || { buscar: "", categoria: "" };
  const r = await api(`/productos?buscar=${encodeURIComponent(guardado.buscar)}&categoria=${encodeURIComponent(guardado.categoria)}`);

  vista.innerHTML = `
    <h1>Productos <small style="color:var(--gris);font-size:1rem">(${r.productos.length})</small></h1>
    <div class="filtros">
      <input id="buscar" placeholder="Buscar por nombre, código o SKU" value="${esc(guardado.buscar)}" />
      <select id="categoria">
        <option value="">Todas las categorías</option>
        ${r.categorias.map(c => `<option ${c === guardado.categoria ? "selected" : ""}>${esc(c)}</option>`).join("")}
      </select>
      ${esDueno ? '<button class="btn btn--verde" id="nuevo">+ Nuevo producto</button>' : ""}
    </div>

    <div class="bloque tabla-scroll">
      <table>
        <tr><th>Cód.</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Reservado</th><th>Mínimo</th><th>Sin stock</th><th>En la web</th><th></th></tr>
        ${r.productos.map(p => `
          <tr data-id="${p.id}">
            <td>${esc(p.codigo)}</td>
            <td>${esc(p.nombre)}${p.presentacion ? `<br><small style="color:var(--gris)">${esc(p.presentacion)}</small>` : ""}</td>
            <td>${esc(p.categoria)}</td>
            <td style="min-width:7rem"><input type="number" min="0" step="1" value="${p.precio}" data-campo="precio" ${esDueno ? "" : "disabled"} /></td>
            <td><strong>${p.stock}</strong>${p.agotado ? '<br><span class="pill pill--bajo">agotado</span>' : ""}</td>
            <td>${p.reservado || 0}</td>
            <td style="min-width:5rem"><input type="number" min="0" step="1" value="${p.stock_minimo}" data-campo="stock_minimo" ${esDueno ? "" : "disabled"} /></td>
            <td><input type="checkbox" data-campo="agotado" ${p.agotado ? "checked" : ""} ${esDueno ? "" : "disabled"} style="width:auto" title="Marcar sin stock en la web" /></td>
            <td><input type="checkbox" data-campo="visible" ${p.visible ? "checked" : ""} ${esDueno ? "" : "disabled"} style="width:auto" /></td>
            <td>${esDueno ? '<button class="btn btn--chico" data-stock>Stock</button>' : ""}</td>
          </tr>`).join("")}
      </table>
      ${r.productos.length ? "" : '<p class="vacio-msg">No hay productos con ese filtro.</p>'}
    </div>`;

  const recargar = () => {
    vistas.productos.filtro = { buscar: $("#buscar").value, categoria: $("#categoria").value };
    abrir("productos");
  };
  let t;
  $("#buscar").addEventListener("input", () => { clearTimeout(t); t = setTimeout(recargar, 400); });
  $("#categoria").addEventListener("change", recargar);
  if (esDueno) $("#nuevo").addEventListener("click", () => nuevoProducto(r.categorias));

  vista.querySelectorAll("tr[data-id]").forEach(fila => {
    const id = fila.dataset.id;
    fila.querySelectorAll("[data-campo]").forEach(input => {
      input.addEventListener("change", async () => {
        const campo = input.dataset.campo;
        const valor = input.type === "checkbox" ? (input.checked ? 1 : 0) : Number(input.value);
        await api(`/productos/${id}`, { method: "PATCH", body: JSON.stringify({ [campo]: valor }) });
        aviso("Guardado");
      });
    });
    const btn = fila.querySelector("[data-stock]");
    if (btn) btn.addEventListener("click", () => moverStock(id, fila.children[1].textContent.trim()));
  });
};

async function moverStock(id, nombre) {
  const cantidad = prompt(`Stock de: ${nombre}\n\nPoné cuántas unidades ENTRAN (ej: 12)\no cuántas salen con signo menos (ej: -3):`);
  if (cantidad === null || cantidad.trim() === "") return;
  const n = Number(cantidad);
  if (!n) return aviso("Cantidad inválida", true);
  const motivo = prompt("Motivo (compra, rotura, ajuste de inventario…):", n > 0 ? "Ingreso de mercadería" : "Ajuste") || "";
  await api(`/productos/${id}/stock`, {
    method: "POST",
    body: JSON.stringify({ tipo: n > 0 ? "ingreso" : "ajuste", cantidad: n, motivo })
  });
  aviso("Stock actualizado");
  abrir("productos");
}

async function nuevoProducto(categorias) {
  const nombre = prompt("Nombre del producto:");
  if (!nombre) return;
  const categoria = prompt(`Categoría (existentes: ${categorias.join(", ")}):`, categorias[0] || "Aceites");
  if (!categoria) return;
  const precio = Number(prompt("Precio (0 si todavía no lo sabés):", "0")) || 0;
  const stock = Number(prompt("Stock inicial:", "0")) || 0;
  await api("/productos", { method: "POST", body: JSON.stringify({ nombre, categoria, precio, stock }) });
  aviso("Producto creado");
  abrir("productos");
}

// ---------------------------------------------------------------- Pedidos
vistas.pedidos = async () => {
  const estado = vistas.pedidos.estado || "todos";
  const r = await api(`/pedidos?estado=${estado}`);
  vista.innerHTML = `
    <h1>Pedidos</h1>
    <div class="filtros">
      ${["todos", "nuevo", "reservado", "pagado", "cancelado"].map(e =>
        `<button class="btn ${e === estado ? "btn--verde" : "btn--borde"} btn--chico" data-estado="${e}">${e === "todos" ? "Todos" : e}</button>`).join("")}
    </div>
    ${esDueno ? `<div class="mostrador-cta">
      <div>
        <h2>¿Vendiste algo en el local?</h2>
        <p>Cargá la venta de mostrador: buscás los productos, ves el total y el stock se descuenta al instante.</p>
      </div>
      <button class="btn btn--verde btn--grande" id="venta-mostrador">+ Nueva venta de mostrador</button>
    </div>` : ""}
    <div id="lista-pedidos"></div>`;

  vista.querySelectorAll("[data-estado]").forEach(b => b.addEventListener("click", () => {
    vistas.pedidos.estado = b.dataset.estado;
    abrir("pedidos");
  }));
  if (esDueno) $("#venta-mostrador").addEventListener("click", ventaMostrador);
  pintarPedidos($("#lista-pedidos"), r.pedidos);
};

function pintarPedidos(caja, pedidos) {
  if (!pedidos.length) { caja.innerHTML = '<p class="vacio-msg">No hay pedidos.</p>'; return; }
  caja.innerHTML = pedidos.map(p => {
    const restante = p.reserva_hasta ? Math.max(0, Math.round((new Date(p.reserva_hasta.replace(" ", "T") + "Z") - Date.now()) / 60000)) : 0;
    return `
    <div class="pedido" data-pedido="${p.id}">
      <div class="pedido__cab">
        <div>
          <strong>${esc(p.cliente)}</strong> <span class="pill pill--${p.estado}">${p.estado}</span>
          <br><small style="color:var(--gris)">${esc(p.numero)} · ${fechaCorta(p.creado)} ${horaCorta(p.creado)} ·
          ${esc(p.entrega || "")} ${p.telefono ? "· " + esc(p.telefono) : ""}</small>
          ${p.estado === "reservado" ? `<br><span class="reloj">Reservado · quedan ${restante} min</span>` : ""}
        </div>
        <div class="pedido__total" data-total>${plata(p.total)}</div>
      </div>

      <table>
        ${p.items.map(i => `<tr>
          <td>${esc(i.nombre)}</td>
          <td style="width:5.5rem">${esDueno
            ? `<input type="number" min="0" value="${i.cantidad}" data-item="${i.id}" data-precio="${i.precio}" data-original="${i.cantidad}" />`
            : i.cantidad}</td>
          <td style="width:7rem;text-align:right" data-subtotal>${plata(i.precio * i.cantidad)}</td>
        </tr>`).join("")}
      </table>

      ${esDueno ? `<div class="pedido__acciones">
        <button class="btn btn--verde" data-accion="pagado">Pago recibido</button>
        <button class="btn btn--amarillo" data-accion="reservado">Pendiente de pago (reserva 2 h)</button>
        <button class="btn btn--rojo" data-accion="cancelado">Compra cancelada</button>
        ${p.estado === "reservado" ? '<button class="btn btn--borde" data-accion="renovar">Renovar 2 h</button>' : ""}
        <button class="btn btn--borde" data-accion="guardar" data-guardar>Guardar cantidades</button>
      </div>` : ""}
    </div>`;
  }).join("");

  caja.querySelectorAll("[data-pedido]").forEach(caja2 => {
    const id = caja2.dataset.pedido;
    const inputs = [...caja2.querySelectorAll("[data-item]")];
    const botonGuardar = caja2.querySelector("[data-guardar]");
    const hayCambios = () => inputs.some(i => Number(i.value) !== Number(i.dataset.original));

    // El total se recalcula mientras se escribe; "Guardar" se prende si hay cambios sin guardar
    const recalcular = () => {
      let total = 0;
      inputs.forEach(i => {
        const sub = Math.max(0, Number(i.value) || 0) * Number(i.dataset.precio);
        total += sub;
        const celda = i.closest("tr").querySelector("[data-subtotal]");
        if (celda) celda.textContent = plata(sub);
      });
      caja2.querySelector("[data-total]").textContent = plata(total);
      if (botonGuardar) {
        const pendiente = hayCambios();
        botonGuardar.classList.toggle("btn--verde", pendiente);
        botonGuardar.classList.toggle("btn--borde", !pendiente);
        botonGuardar.textContent = pendiente ? "Guardar cambios" : "Guardar cantidades";
      }
    };
    inputs.forEach(i => i.addEventListener("input", recalcular));

    caja2.querySelectorAll("[data-accion]").forEach(b => b.addEventListener("click", async () => {
      const accion = b.dataset.accion;
      const items = inputs.map(i => ({ id: Number(i.dataset.item), cantidad: Math.max(0, Number(i.value) || 0) }));
      let body;
      if (accion === "renovar") body = { renovarReserva: true };
      else if (accion === "guardar") body = { items };
      else body = { estado: accion };
      // Si cambiaron cantidades y no se guardaron, van junto con el cambio de estado
      if (accion !== "guardar" && hayCambios()) body.items = items;
      await api(`/pedidos/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      aviso(accion === "guardar" ? "Cantidades guardadas" : "Pedido actualizado");
      abrir(vistaActual);
    }));
  });
}

// Venta de mostrador: formulario grande (buscar, sumar productos, total y registrar)
async function ventaMostrador() {
  const { productos } = await api("/productos");
  const lineas = [];   // { p, cantidad }

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal__fondo" data-cerrar></div>
    <div class="modal__caja" role="dialog" aria-modal="true" aria-labelledby="mostrador-titulo">
      <div class="modal__cab">
        <div>
          <p class="modal__sub">Pedidos</p>
          <h2 id="mostrador-titulo">Nueva venta de mostrador</h2>
        </div>
        <button class="btn btn--borde" data-cerrar aria-label="Cerrar">✕</button>
      </div>

      <label class="modal__buscar">Buscá el producto (nombre o código)
        <input id="buscar-prod" placeholder="Ej: Helix, 10W40, 001…" autocomplete="off" />
      </label>
      <div class="resultados" id="resultados"></div>

      <div class="lineas" id="lineas"></div>

      <div class="modal__pie">
        <label>Cliente (opcional)
          <input id="cliente-most" placeholder="Mostrador" />
        </label>
        <label class="check"><input type="checkbox" id="pagado-most" checked /> Pago recibido (descuenta el stock ya)</label>
        <div class="modal__total"><small>Total</small><strong id="total-most">$ 0</strong></div>
        <div class="modal__acciones">
          <button class="btn btn--borde" data-cerrar>Cancelar</button>
          <button class="btn btn--verde btn--grande" id="registrar" disabled>Registrar venta</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const q = s => modal.querySelector(s);
  const cerrar = () => modal.remove();
  modal.querySelectorAll("[data-cerrar]").forEach(b => b.addEventListener("click", cerrar));
  modal.addEventListener("keydown", e => { if (e.key === "Escape") cerrar(); });

  function pintarResultados() {
    const texto = q("#buscar-prod").value.trim().toLowerCase();
    if (!texto) { q("#resultados").innerHTML = ""; return; }
    const encontrados = productos.filter(p =>
      p.nombre.toLowerCase().includes(texto) || p.codigo.includes(texto) || (p.sku || "").toLowerCase().includes(texto)).slice(0, 8);
    q("#resultados").innerHTML = encontrados.length ? encontrados.map(p => `
      <button class="resultado" data-id="${p.id}">
        <span><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}</span>
        <span class="resultado__dato">${plata(p.precio)} · stock ${p.stock - (p.reservado || 0)}</span>
      </button>`).join("") : '<p class="vacio-msg">No encontré productos con ese nombre o código.</p>';
    q("#resultados").querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
      const p = productos.find(x => String(x.id) === b.dataset.id);
      const ya = lineas.find(l => l.p.id === p.id);
      if (ya) ya.cantidad++; else lineas.push({ p, cantidad: 1 });
      q("#buscar-prod").value = "";
      pintarResultados();
      pintarLineas();
      q("#buscar-prod").focus();
    }));
  }

  function pintarLineas() {
    const total = lineas.reduce((t, l) => t + l.p.precio * l.cantidad, 0);
    q("#total-most").textContent = plata(total);
    q("#registrar").disabled = !lineas.length;
    if (!lineas.length) { q("#lineas").innerHTML = '<p class="vacio-msg">Todavía no agregaste productos.</p>'; return; }
    q("#lineas").innerHTML = `<table>
      <tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th style="text-align:right">Subtotal</th><th></th></tr>
      ${lineas.map((l, i) => {
        const disponible = l.p.stock - (l.p.reservado || 0);
        return `<tr>
          <td>${esc(l.p.nombre)}${l.cantidad > disponible ? `<br><small class="aviso">Hay ${disponible} en stock</small>` : ""}</td>
          <td>${plata(l.p.precio)}</td>
          <td><div class="paso">
            <button class="btn btn--borde btn--chico" data-menos="${i}" aria-label="Uno menos">−</button>
            <input type="number" min="1" value="${l.cantidad}" data-cant="${i}" />
            <button class="btn btn--borde btn--chico" data-mas="${i}" aria-label="Uno más">+</button>
          </div></td>
          <td style="text-align:right"><b>${plata(l.p.precio * l.cantidad)}</b></td>
          <td><button class="btn btn--rojo btn--chico" data-quitar="${i}">Quitar</button></td>
        </tr>`;
      }).join("")}
    </table>`;
    q("#lineas").querySelectorAll("[data-menos]").forEach(b => b.addEventListener("click", () => { const l = lineas[b.dataset.menos]; l.cantidad = Math.max(1, l.cantidad - 1); pintarLineas(); }));
    q("#lineas").querySelectorAll("[data-mas]").forEach(b => b.addEventListener("click", () => { lineas[b.dataset.mas].cantidad++; pintarLineas(); }));
    q("#lineas").querySelectorAll("[data-quitar]").forEach(b => b.addEventListener("click", () => { lineas.splice(Number(b.dataset.quitar), 1); pintarLineas(); }));
    q("#lineas").querySelectorAll("[data-cant]").forEach(inp => inp.addEventListener("change", () => { lineas[inp.dataset.cant].cantidad = Math.max(1, Number(inp.value) || 1); pintarLineas(); }));
  }

  q("#buscar-prod").addEventListener("input", pintarResultados);
  q("#registrar").addEventListener("click", async () => {
    q("#registrar").disabled = true;
    await api("/pedidos", {
      method: "POST",
      body: JSON.stringify({
        cliente: q("#cliente-most").value.trim() || "Mostrador",
        items: lineas.map(l => ({ id: l.p.id, cantidad: l.cantidad })),
        pagado: q("#pagado-most").checked
      })
    });
    cerrar();
    aviso(q("#pagado-most").checked ? "Venta registrada y stock descontado" : "Venta registrada como pendiente");
    abrir(vistaActual);
  });

  pintarLineas();
  q("#buscar-prod").focus();
}

// ---------------------------------------------------------------- Turnos
vistas.turnos = async () => {
  const mes = vistas.turnos.mes || mesISO();
  const [a, m] = mes.split("-").map(Number);
  const desde = `${mes}-01`;
  const hasta = new Date(a, m, 0).toISOString().slice(0, 10);
  const r = await api(`/turnos?desde=${desde}&hasta=${hasta}`);

  const porDia = {};
  r.turnos.forEach(t => (porDia[t.fecha] = porDia[t.fecha] || []).push(t));

  vista.innerHTML = `
    <h1>Turnos de servicio</h1>
    <div class="filtros">
      <input type="month" id="mes" value="${mes}" />
      ${esDueno ? '<button class="btn btn--verde" id="nuevo-turno">+ Cargar turno</button>' : ""}
    </div>
    <div class="bloque">
      ${calendarioHTML(a, m, dia => {
        const lista = porDia[dia] || [];
        return lista.map(t => `<div class="turno">${t.hora} · ${esc(t.cliente.split(" ")[0])}</div>`).join("");
      })}
    </div>
    <div class="bloque">
      <h2>Detalle del mes</h2>
      ${r.turnos.length ? `<div class="tabla-scroll"><table>
        <tr><th>Día</th><th>Hora</th><th>Servicio</th><th>Cliente</th><th>Teléfono</th><th>Estado</th></tr>
        ${r.turnos.map(t => `<tr>
          <td>${t.fecha.slice(8)}/${t.fecha.slice(5, 7)}</td><td>${esc(t.hora)}</td>
          <td>${esc(t.servicio)}</td><td>${esc(t.cliente)}</td><td>${esc(t.telefono || "")}</td>
          <td>${esDueno ? `<select data-turno="${t.id}">
              ${["pendiente", "confirmado", "hecho", "cancelado"].map(e => `<option ${e === t.estado ? "selected" : ""}>${e}</option>`).join("")}
            </select>` : t.estado}</td>
        </tr>`).join("")}
      </table></div>` : '<p class="vacio-msg">No hay turnos este mes.</p>'}
    </div>`;

  $("#mes").addEventListener("change", e => { vistas.turnos.mes = e.target.value; abrir("turnos"); });
  if (esDueno) {
    $("#nuevo-turno").addEventListener("click", async () => {
      const fecha = prompt("Fecha (AAAA-MM-DD):", hoyISO());
      if (!fecha) return;
      const hora = prompt("Hora (HH:MM):", "09:00");
      if (!hora) return;
      const cliente = prompt("Cliente:") || "";
      const servicio = prompt("Servicio:", "Cambio de aceite y filtro") || "Consulta";
      const telefono = prompt("Teléfono (opcional):") || "";
      await api("/turnos", { method: "POST", body: JSON.stringify({ fecha, hora, cliente, servicio, telefono }) });
      aviso("Turno cargado");
      abrir("turnos");
    });
    vista.querySelectorAll("[data-turno]").forEach(s => s.addEventListener("change", async () => {
      await api(`/turnos/${s.dataset.turno}`, { method: "PATCH", body: JSON.stringify({ estado: s.value }) });
      aviso("Turno actualizado");
    }));
  }
};

function calendarioHTML(anio, mes, contenidoDia) {
  const primero = new Date(anio, mes - 1, 1);
  const offset = (primero.getDay() + 6) % 7;   // la semana arranca el lunes
  const dias = new Date(anio, mes, 0).getDate();
  let html = '<div class="dias-cab">' + ["L", "M", "M", "J", "V", "S", "D"].map(d => `<span>${d}</span>`).join("") + "</div>";
  html += '<div class="dias">';
  for (let i = 0; i < offset; i++) html += '<div class="dia vacio"></div>';
  for (let d = 1; d <= dias; d++) {
    const iso = `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    html += `<div class="dia"><b>${d}</b>${contenidoDia(iso) || ""}</div>`;
  }
  return html + "</div>";
}

// ---------------------------------------------------------------- Ventas: el contador del dueño
const MESES_NOMBRE = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreDelMes = mes => MESES_NOMBRE[Number(mes.slice(5, 7)) - 1];
const compacto = n => {
  const v = Math.abs(n || 0);
  if (v >= 1e6) return "$ " + (n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " M";
  if (v >= 1e3) return "$ " + Math.round(n / 1e3).toLocaleString("es-AR") + " mil";
  return plata(n);
};
const porcentaje = x => (x * 100).toLocaleString("es-AR", { maximumFractionDigits: 0 }) + "%";

// Diferencia contra un período: flecha + signo + color (nunca solo color)
function delta(actual, previo, etiqueta) {
  if (!previo) return `<span class="delta delta--neutro">Sin datos de ${esc(etiqueta)}</span>`;
  const d = (actual - previo) / previo;
  const clase = d > 0.005 ? "sube" : d < -0.005 ? "baja" : "neutro";
  const flecha = clase === "sube" ? "▲" : clase === "baja" ? "▼" : "●";
  return `<span class="delta delta--${clase}"><span aria-hidden="true">${flecha}</span> ${d > 0 ? "+" : ""}${porcentaje(d)} vs ${esc(etiqueta)}</span>`;
}

const topeLindo = max => {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
};

/* Gráfico de columnas de una sola serie (verde de marca), SVG escalable.
   datos: [{ etiqueta, valor, tooltip }]  ·  opciones: { promedio, etiquetaCada, alto } */
function graficoColumnas(datos, { promedio = null, etiquetaCada = 1, alto = 240, lienzo = 720 } = {}) {
  const W = lienzo, H = alto, izq = 64, der = 12, arriba = 22, abajo = 28;
  const ancho = W - izq - der, altoUtil = H - arriba - abajo;
  const tope = topeLindo(Math.max(...datos.map(d => d.valor), promedio || 0));
  const y = v => arriba + altoUtil - (v / tope) * altoUtil;
  const slot = ancho / datos.length;
  const barra = Math.min(24, slot - 2);
  const maxIdx = datos.reduce((m, d, i) => (d.valor > datos[m].valor ? i : m), 0);

  let s = `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img">`;
  for (let i = 0; i <= 4; i++) {   // grilla: 5 líneas finas y sólidas, valores redondos
    const v = (tope / 4) * i, yy = y(v);
    s += `<line x1="${izq}" x2="${W - der}" y1="${yy}" y2="${yy}" class="grafico__grilla"/>`;
    s += `<text x="${izq - 8}" y="${yy + 4}" text-anchor="end" class="grafico__eje">${compacto(v)}</text>`;
  }
  datos.forEach((d, i) => {
    const x = izq + slot * i + (slot - barra) / 2;
    const yy = y(d.valor), h = arriba + altoUtil - yy;
    if (d.valor > 0) {
      const r = Math.min(4, h);   // punta redondeada de 4 px, base recta
      s += `<path class="grafico__barra" d="M${x},${arriba + altoUtil} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + barra - r} Q${x + barra},${yy} ${x + barra},${yy + r} V${arriba + altoUtil} Z"/>`;
    }
    if (i % etiquetaCada === 0) s += `<text x="${x + barra / 2}" y="${H - 8}" text-anchor="middle" class="grafico__eje">${esc(d.etiqueta)}</text>`;
    // zona de hover más grande que la barra (todo el alto del gráfico)
    s += `<rect x="${izq + slot * i}" y="${arriba}" width="${slot}" height="${altoUtil}" class="grafico__zona" tabindex="0" data-tip="${esc(d.tooltip)}"/>`;
  });
  if (datos[maxIdx] && datos[maxIdx].valor > 0) {   // una sola etiqueta: el pico
    const x = izq + slot * maxIdx + slot / 2;
    s += `<text x="${x}" y="${y(datos[maxIdx].valor) - 7}" text-anchor="middle" class="grafico__valor">${compacto(datos[maxIdx].valor)}</text>`;
  }
  if (promedio) {
    const yy = y(promedio);
    s += `<line x1="${izq}" x2="${W - der}" y1="${yy}" y2="${yy}" class="grafico__promedio"/>`;
    s += `<text x="${W - der}" y="${yy - 6}" text-anchor="end" class="grafico__eje grafico__eje--fuerte">Promedio ${compacto(promedio)}</text>`;
  }
  return s + "</svg>";
}

/* Barras horizontales de una sola serie, en HTML (el texto nunca se corta). */
function graficoBarras(datos, total) {
  const max = Math.max(...datos.map(d => d.valor), 1);
  return `<div class="barras">${datos.map(d => `
    <div class="barras__fila" tabindex="0" data-tip="${esc(d.etiqueta)}: ${esc(plata(d.valor))}${total ? " · " + porcentaje(d.valor / total) : ""}">
      <span class="barras__etiqueta">${esc(d.etiqueta)}</span>
      <span class="barras__pista"><span class="barras__barra" style="width:${Math.max(1, (d.valor / max) * 100)}%"></span></span>
      <span class="barras__valor">${compacto(d.valor)}${total ? ` <small>${porcentaje(d.valor / total)}</small>` : ""}</span>
    </div>`).join("")}</div>`;
}

// Tooltip único para todos los gráficos (hover y teclado)
function activarTooltips(raiz) {
  let tip = document.querySelector(".tooltip");
  if (!tip) { tip = document.createElement("div"); tip.className = "tooltip"; tip.hidden = true; document.body.appendChild(tip); }
  const mostrar = (el, x, y) => { tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = x + "px"; tip.style.top = y + "px"; };
  raiz.querySelectorAll("[data-tip]").forEach(el => {
    el.addEventListener("mousemove", e => mostrar(el, e.clientX, e.clientY));
    el.addEventListener("mouseleave", () => { tip.hidden = true; });
    el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); mostrar(el, r.left + r.width / 2, r.top); });
    el.addEventListener("blur", () => { tip.hidden = true; });
  });
}

vistas.ventas = async () => {
  const mes = vistas.ventas.mes || mesISO();
  const [a, m] = mes.split("-").map(Number);
  const r = await api(`/ventas?mes=${mes}`);
  const nombre = nombreDelMes(mes);
  const nombreAnt = nombreDelMes(r.anterior);
  const porDia = Object.fromEntries(r.dias.map(d => [d.dia, d]));
  const web = r.porOrigen.web, most = r.porOrigen.mostrador;
  const cuotaWeb = r.total ? web.total / r.total : 0;
  const mejorSemana = r.porDiaSemana.reduce((x, y) => (y.promedio > x.promedio ? y : x), r.porDiaSemana[0]);
  const cat1 = r.porCategoria[0];
  const diasHasta = r.esActual ? r.diasTranscurridos : r.diasDelMes;
  const datosDia = r.dias.slice(0, r.esActual ? r.diasTranscurridos : r.diasDelMes).map(d => ({
    etiqueta: String(Number(d.dia.slice(8))),
    valor: d.total,
    tooltip: `${d.dia.slice(8)}/${d.dia.slice(5, 7)} · ${plata(d.total)} · ${d.pedidos} venta(s)`
  }));

  // Lo que diría un contador, en criollo
  const frases = [];
  if (r.mismoPeriodoAnterior.total) {
    const dif = r.total - r.mismoPeriodoAnterior.total;
    frases.push(dif >= 0
      ? `Vas <b>${plata(dif)}</b> arriba de ${esc(nombreAnt)} a la misma fecha (${porcentaje(dif / r.mismoPeriodoAnterior.total)} más).`
      : `Vas <b>${plata(-dif)}</b> abajo de ${esc(nombreAnt)} a la misma fecha (${porcentaje(-dif / r.mismoPeriodoAnterior.total)} menos).`);
  }
  if (r.esActual && r.diasTranscurridos) frases.push(`Si seguís a este ritmo, cerrás ${esc(nombre)} en <b>${plata(r.proyeccion)}</b>.`);
  if (mejorSemana && mejorSemana.promedio) frases.push(`Tu mejor día de la semana es el <b>${esc(mejorSemana.nombre.toLowerCase())}</b>: vendés en promedio ${plata(mejorSemana.promedio)}.`);
  if (cat1 && r.total) frases.push(`La categoría que más factura es <b>${esc(cat1.categoria)}</b>: ${porcentaje(cat1.total / r.total)} de lo vendido.`);
  if (r.ventas) frases.push(`Cada cliente gasta en promedio <b>${plata(r.ticket)}</b>${r.mesAnterior.ticket ? ` (en ${esc(nombreAnt)} eran ${plata(r.mesAnterior.ticket)})` : ""}.`);

  vista.innerHTML = `
    <div class="bloque__titulo" style="margin-bottom:1rem">
      <h1 style="margin:0">Ventas de ${esc(nombre)} ${a}</h1>
      <div class="filtros" style="margin:0">
        <input type="month" id="mes" value="${mes}" style="min-width:10rem" />
        <a class="btn btn--verde" href="/api/export?tipo=ventas&mes=${mes}">Descargar ventas (Excel)</a>
        <a class="btn btn--borde" href="/api/export?tipo=movimientos&mes=${mes}">Movimientos de stock (Excel)</a>
      </div>
    </div>

    <div class="hero">
      <div>
        <small>Total vendido en ${esc(nombre)}${r.esActual ? ` · al día ${r.diasTranscurridos}` : ""}</small>
        <p class="hero__valor">${plata(r.total)}</p>
        ${delta(r.total, r.mismoPeriodoAnterior.total, `${nombreAnt} a la misma fecha`)}
      </div>
      <div class="contador">
        <p class="contador__titulo">Tu contador te dice</p>
        ${frases.length ? `<ul>${frases.map(f => `<li>${f}</li>`).join("")}</ul>` : '<p class="vacio-msg">Todavía no hay ventas este mes.</p>'}
      </div>
    </div>

    <div class="tarjetas">
      <div class="tarjeta"><small>Ventas</small><strong>${r.ventas}</strong>${delta(r.ventas, r.mismoPeriodoAnterior.ventas, nombreAnt)}</div>
      <div class="tarjeta"><small>Ticket promedio</small><strong>${plata(r.ticket)}</strong>${delta(r.ticket, r.mesAnterior.ticket, nombreAnt)}</div>
      <div class="tarjeta"><small>Promedio por día</small><strong>${plata(r.promedioPorDia)}</strong><span class="delta delta--neutro">${plata(r.promedioDiaConVenta)} en días con venta</span></div>
      <div class="tarjeta"><small>${r.esActual ? "Proyección de cierre" : "Cierre del mes"}</small><strong>${plata(r.proyeccion)}</strong><span class="delta delta--neutro">${esc(nombreAnt)} cerró en ${plata(r.mesAnterior.total)}</span></div>
      <div class="tarjeta"><small>Unidades vendidas</small><strong>${r.unidades.toLocaleString("es-AR")}</strong><span class="delta delta--neutro">${r.ventas ? (r.unidades / r.ventas).toLocaleString("es-AR", { maximumFractionDigits: 1 }) : 0} por venta</span></div>
    </div>

    <div class="bloque">
      <h2>Ventas por día</h2>
      <p class="grafico__nota">Pasá el mouse por cada día para ver el detalle.</p>
      <div class="grafico-caja">${datosDia.length ? graficoColumnas(datosDia, { promedio: r.promedioPorDia, etiquetaCada: datosDia.length > 16 ? 2 : 1 }) : '<p class="vacio-msg">Sin días transcurridos en este mes.</p>'}</div>
      <details class="tabla-oculta"><summary>Ver como tabla</summary>
        <div class="tabla-scroll"><table>
          <tr><th>Día</th><th>Ventas</th><th>Unidades</th><th>Total</th></tr>
          ${r.dias.slice(0, diasHasta).map(d => `<tr><td>${d.dia.slice(8)}/${d.dia.slice(5, 7)}</td><td>${d.pedidos}</td><td>${d.unidades}</td><td>${plata(d.total)}</td></tr>`).join("")}
          <tr class="fila-total"><td>Total</td><td>${r.ventas}</td><td>${r.unidades}</td><td>${plata(r.total)}</td></tr>
        </table></div>
      </details>
    </div>

    <div class="dos-columnas">
      <div class="bloque">
        <h2>Promedio por día de la semana</h2>
        <p class="grafico__nota">Cuánto vendés, en promedio, cada día.</p>
        <div class="grafico-caja">${graficoColumnas(r.porDiaSemana.map(d => ({
          etiqueta: d.nombre.slice(0, 3), valor: d.promedio,
          tooltip: `${d.nombre}: ${plata(d.promedio)} en promedio (${d.dias} día/s)`
        })), { alto: 250, lienzo: 440 })}</div>
      </div>
      <div class="bloque">
        <h2>Facturación por categoría</h2>
        <p class="grafico__nota">Qué parte de la venta aporta cada rubro.</p>
        ${r.porCategoria.length ? graficoBarras(r.porCategoria.map(c => ({ etiqueta: c.categoria, valor: c.total })), r.total) : '<p class="vacio-msg">Sin ventas.</p>'}
      </div>
    </div>

    <div class="bloque">
      <h2>De dónde vienen las ventas</h2>
      <div class="cuota" tabindex="0" data-tip="Web: ${esc(plata(web.total))} · Mostrador: ${esc(plata(most.total))}">
        <span class="cuota__web" style="width:${Math.max(0, Math.min(100, cuotaWeb * 100))}%"></span>
      </div>
      <div class="cuota__leyenda">
        <span><i class="muestra muestra--web"></i> Web · <b>${porcentaje(cuotaWeb)}</b> · ${plata(web.total)} (${web.ventas} ventas)</span>
        <span><i class="muestra muestra--mostrador"></i> Mostrador · <b>${porcentaje(r.total ? most.total / r.total : 0)}</b> · ${plata(most.total)} (${most.ventas} ventas)</span>
      </div>
    </div>

    <div class="bloque">
        <h2>Calendario del mes</h2>
        ${calendarioHTML(a, m, iso => porDia[iso] && porDia[iso].pedidos ? `<span class="monto">${compacto(porDia[iso].total)}</span><br><small>${porDia[iso].pedidos} venta(s)</small>` : "")}
    </div>
    <div class="bloque">
        <h2>Lo que más se vendió</h2>
        ${r.top.length ? `<div class="tabla-scroll"><table>
          <tr><th>Producto</th><th>Unidades</th><th>Total</th></tr>
          ${r.top.map(t => `<tr><td>${esc(t.nombre)}</td><td>${t.unidades}</td><td>${plata(t.total)}</td></tr>`).join("")}
        </table></div>` : '<p class="vacio-msg">Todavía no hay ventas este mes.</p>'}
    </div>`;

  $("#mes").addEventListener("change", e => { vistas.ventas.mes = e.target.value; abrir("ventas"); });
  activarTooltips(vista);
};

// ---------------------------------------------------------------- Ajustes
vistas.ajustes = async () => {
  const cfg = await api("/config");
  const usuarios = esDueno ? await api("/usuarios") : { usuarios: [] };

  vista.innerHTML = `
    <h1>Ajustes</h1>
    <div class="bloque">
      <h2>Datos del negocio</h2>
      <div class="grilla-form">
        <label>WhatsApp (sin + ni espacios)<input id="cfg-whatsapp" value="${esc(cfg.whatsapp || "")}" ${esDueno ? "" : "disabled"} /></label>
        <label>Horas que dura una reserva<input id="cfg-reserva" type="number" min="1" max="48" value="${esc(cfg.reserva_horas || 2)}" ${esDueno ? "" : "disabled"} /></label>
        <label>Turnos desde<input id="cfg-desde" value="${esc(cfg.turnos_desde || "07:00")}" ${esDueno ? "" : "disabled"} /></label>
        <label>Turnos hasta<input id="cfg-hasta" value="${esc(cfg.turnos_hasta || "19:00")}" ${esDueno ? "" : "disabled"} /></label>
        ${esDueno ? '<button class="btn btn--verde" id="guardar-cfg">Guardar</button>' : ""}
      </div>
    </div>

    ${esDueno ? `<div class="bloque">
      <div class="bloque__titulo"><h2>Usuarios</h2><button class="btn btn--verde btn--chico" id="nuevo-usuario">+ Nuevo usuario</button></div>
      <div class="tabla-scroll"><table>
        <tr><th>Usuario</th><th>Nombre</th><th>Rol</th></tr>
        ${usuarios.usuarios.map(u => `<tr><td>${esc(u.usuario)}</td><td>${esc(u.nombre)}</td>
          <td>${u.rol === "dueno" ? "Dueño (todo)" : "Soporte (solo lectura)"}</td></tr>`).join("")}
      </table></div>
    </div>` : ""}`;

  if (esDueno) {
    $("#guardar-cfg").addEventListener("click", async () => {
      await api("/config", {
        method: "PATCH",
        body: JSON.stringify({
          whatsapp: $("#cfg-whatsapp").value.trim(),
          reserva_horas: $("#cfg-reserva").value,
          turnos_desde: $("#cfg-desde").value,
          turnos_hasta: $("#cfg-hasta").value
        })
      });
      aviso("Guardado");
    });
    $("#nuevo-usuario").addEventListener("click", async () => {
      const u = prompt("Usuario (sin espacios):");
      if (!u) return;
      const nombre = prompt("Nombre:", u);
      const rol = confirm("¿Acceso completo (dueño)?\n\nAceptar = dueño · Cancelar = solo lectura") ? "dueno" : "soporte";
      const clave = prompt("Contraseña:");
      if (!clave) return;
      await api("/usuarios", { method: "POST", body: JSON.stringify({ usuario: u, nombre, rol, clave }) });
      aviso("Usuario creado");
      abrir("ajustes");
    });
  }
};

// ---------------------------------------------------------------- Arranque
async function arrancar() {
  try {
    const r = await api("/yo");
    usuario = r.usuario;
    esDueno = usuario.rol === "dueno";
    $("#acceso").hidden = true;
    $("#app").hidden = false;
    $("#quien").textContent = `${usuario.nombre}${esDueno ? "" : " · solo lectura"}`;
    // Se puede entrar directo a una sección con ?v=productos (sirve para guardar accesos directos)
    const pedida = new URLSearchParams(location.search).get("v");
    abrir(vistas[pedida] ? pedida : "hoy");
    setInterval(() => { if (vistaActual === "hoy" || vistaActual === "pedidos") abrir(vistaActual); }, 60000);
  } catch (e) {
    mostrarAcceso();
  }
}

arrancar();
