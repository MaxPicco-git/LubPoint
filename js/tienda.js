/* LUBPOINT · Tienda
   Catálogo con búsqueda, filtros, orden y carrito de compras.

   Si en index.html está configurada la dirección del sistema (window.LUBPOINT.api), la tienda
   trabaja con los productos, precios y stock REALES: pide el catálogo al sistema y, al finalizar,
   registra el pedido (queda en el panel del dueño) antes de abrir WhatsApp.
   Si no hay sistema configurado, muestra los productos de ejemplo de más abajo. */
(function () {
  "use strict";

  const CFG = window.LUBPOINT || {};
  const API = (CFG.api || "").replace(/\/$/, "");
  const WHATSAPP = CFG.whatsapp || "5493420000000";
  const CART_KEY = "lubpoint-carrito";

  const VEHICULOS = [
    { id: "todos", label: "Todos" },
    { id: "auto", label: "Auto" },
    { id: "camioneta", label: "Camioneta / SUV" },
    { id: "moto", label: "Moto" }
  ];
  const ORDEN = [
    { id: "top", label: "Más elegidos" },
    { id: "precio-asc", label: "Precio: menor a mayor" },
    { id: "precio-desc", label: "Precio: mayor a menor" },
    { id: "nombre", label: "Nombre (A–Z)" }
  ];
  const ENTREGAS = ["Retiro en el local", "Colocación en el local"];

  // Ícono para cada categoría (los de assets/icons). Si aparece una categoría nueva, usa el genérico.
  const ICONOS = {
    aceites: "lubricantes", lubricantes: "lubricantes", filtros: "filtros",
    "fluidos-y-aditivos": "servicio", "liquidos-y-refrigerantes": "servicio",
    "limpieza-y-cuidado": "servicio", "repuestos-de-motor": "servicio",
    baterias: "bateria", accesorios: "herramientas", "accesorios-moto": "herramientas",
    rodamientos: "herramientas", "neumaticos-y-camaras": "kilometraje"
  };

  // Productos de ejemplo: solo se usan si todavía no está conectado el sistema.
  const EJEMPLO = [
    { nombre: "Aceite sintético 5W-30", detalle: "4 litros", categoria: "Aceites", viscosidad: "5W-30", vehiculos: ["auto", "camioneta"], precio: 48500, top: 1 },
    { nombre: "Aceite semisintético 10W-40", detalle: "4 litros", categoria: "Aceites", viscosidad: "10W-40", vehiculos: ["auto", "camioneta"], precio: 36900, top: 2 },
    { nombre: "Filtro de aceite", detalle: "Original · según modelo", categoria: "Filtros", vehiculos: ["auto", "camioneta"], precio: 9800, top: 3 },
    { nombre: "Filtro de aire", detalle: "Original · según modelo", categoria: "Filtros", vehiculos: ["auto", "camioneta"], precio: 12400, top: 4 },
    { nombre: "Aceite sintético 5W-40 diésel", detalle: "4 litros", categoria: "Aceites", viscosidad: "5W-40", vehiculos: ["camioneta"], precio: 54200, top: 5 },
    { nombre: "Líquido refrigerante", detalle: "1 litro · listo para usar", categoria: "Fluidos y aditivos", vehiculos: ["auto", "camioneta", "moto"], precio: 7600, top: 6 },
    { nombre: "Filtro de habitáculo", detalle: "Original · según modelo", categoria: "Filtros", vehiculos: ["auto", "camioneta"], precio: 11200, top: 7 },
    { nombre: "Aceite 4T 10W-40", detalle: "1 litro · moto", categoria: "Aceites", viscosidad: "10W-40", vehiculos: ["moto"], precio: 12900, top: 8 },
    { nombre: "Batería 12V 65Ah", detalle: "Libre de mantenimiento", categoria: "Baterías", vehiculos: ["auto", "camioneta"], precio: 132000, top: 9 },
    { nombre: "Líquido de frenos DOT 4", detalle: "500 ml", categoria: "Fluidos y aditivos", vehiculos: ["auto", "camioneta", "moto"], precio: 6900, top: 10 },
    { nombre: "Aceite mineral 15W-40", detalle: "4 litros", categoria: "Aceites", viscosidad: "15W-40", vehiculos: ["auto", "camioneta"], precio: 29800, top: null },
    { nombre: "Filtro de combustible", detalle: "Original · según modelo", categoria: "Filtros", vehiculos: ["auto", "camioneta"], precio: 10500, top: null },
    { nombre: "Aditivo limpia inyectores", detalle: "300 ml · nafta o diésel", categoria: "Fluidos y aditivos", vehiculos: ["auto", "camioneta"], precio: 8400, top: null },
    { nombre: "Batería moto 12V 7Ah", detalle: "Gel · sin mantenimiento", categoria: "Baterías", vehiculos: ["moto"], precio: 41500, top: null },
    { nombre: "Escobillas limpiaparabrisas", detalle: "Par · según medida", categoria: "Accesorios", vehiculos: ["auto", "camioneta"], precio: 15800, top: null },
    { nombre: "Lámparas H4 halógenas", detalle: "Par · 12V 60/55W", categoria: "Accesorios", vehiculos: ["auto", "camioneta"], precio: 9900, top: null }
  ];

  const root = document.querySelector("[data-lp-shop]");
  if (!root) return;

  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const precio = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anim = typeof gsap !== "undefined" && !reducido;

  const ICON_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.4-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/></svg>';

  let PRODUCTOS = [];
  let CATEGORIAS = [];
  let hayStock = false;          // true cuando los datos vienen del sistema (hay stock real)
  let byId = {};

  const state = { categoria: "todos", vehiculo: "todos", viscosidad: "todas", orden: "top", busqueda: "" };

  // ------------------------------------------------------------------ Datos
  function preparar(lista) {
    PRODUCTOS = lista.map(p => ({
      ...p,
      id: p.id != null ? String(p.id) : slug(`${p.nombre} ${p.detalle || ""}`),
      cat: slug(p.categoria),
      vehiculos: p.vehiculos || [],
      disponible: p.disponible == null ? null : Number(p.disponible)
    }));
    byId = Object.fromEntries(PRODUCTOS.map(p => [p.id, p]));
    CATEGORIAS = [{ id: "todos", label: "Todos" }].concat(
      [...new Set(PRODUCTOS.map(p => p.categoria))].sort((a, b) => a.localeCompare(b, "es"))
        .map(c => ({ id: slug(c), label: c })));
  }

  async function cargar() {
    const catalogo = window.LUBPOINT_CATALOGO || [];

    // Precio y stock reales (si el sistema está conectado)
    let delSistema = null;
    if (API) {
      try {
        const r = await fetch(`${API}/api/publico/productos`, { mode: "cors" });
        const datos = await r.json();
        if (Array.isArray(datos.productos) && datos.productos.length) delSistema = datos.productos;
      } catch (e) { /* si el sistema no responde, la tienda igual muestra el catálogo */ }
    }

    if (catalogo.length) {
      hayStock = !!delSistema;
      const porCodigo = {};
      (delSistema || []).forEach(p => { porCodigo[p.codigo] = p; });

      // Una tarjeta por foto: el nombre que ve el cliente puede incluir la variante,
      // pero el pedido siempre viaja con el producto del sistema (codigo/productoId).
      const lista = catalogo.map(c => {
        const p = porCodigo[c.codigo];
        return {
          id: c.codigo + (c.variante ? "-" + slug(c.variante) : ""),
          productoId: p ? p.id : null,
          codigo: c.codigo,
          fotos: c.fotos && c.fotos.length ? c.fotos : (c.foto ? [c.foto] : []),
          variante: c.variante,
          nombre: c.variante ? `${c.nombre} · ${c.variante}` : c.nombre,
          detalle: [p && p.marca, c.presentacion].filter(Boolean).join(" · ") || c.categoria,
          categoria: c.categoria,
          precio: p ? p.precio : 0,
          disponible: p ? p.disponible : null,
          imagen: c.foto,
          top: null
        };
      });

      // Productos del sistema que todavía no tienen foto: se muestran igual, con ícono
      if (delSistema) {
        const conFoto = new Set(catalogo.map(c => c.codigo));
        delSistema.filter(p => !conFoto.has(p.codigo)).forEach(p => lista.push({
          id: p.codigo, productoId: p.id, codigo: p.codigo, fotos: [], variante: null, nombre: p.nombre,
          detalle: [p.marca, p.presentacion].filter(Boolean).join(" · ") || p.categoria,
          categoria: p.categoria, precio: p.precio, disponible: p.disponible, top: null
        }));
      }
      preparar(lista);
      return;
    }
    preparar(EJEMPLO);
  }

  // ------------------------------------------------------------------ Carrito
  const cart = (() => {
    let items = {};
    try { items = JSON.parse(localStorage.getItem(CART_KEY) || "{}") || {}; } catch (e) { items = {}; }
    let entrega = ENTREGAS[0];
    const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* sin almacenamiento */ } };
    return {
      limpiarInexistentes() { Object.keys(items).forEach(id => { if (!byId[id] || !(items[id] > 0)) delete items[id]; }); save(); },
      qty: id => items[id] || 0,
      set(id, q) {
        const tope = byId[id] && byId[id].disponible != null ? byId[id].disponible : 99;
        if (q > 0) items[id] = Math.min(q, Math.max(1, tope));
        else delete items[id];
        save();
      },
      add(id) { this.set(id, this.qty(id) + 1); },
      clear() { items = {}; save(); },
      lines: () => Object.keys(items).filter(id => byId[id]).map(id => ({ p: byId[id], q: items[id] })),
      count: () => Object.values(items).reduce((a, b) => a + b, 0),
      total() { return this.lines().reduce((t, l) => t + l.p.precio * l.q, 0); },
      get entrega() { return entrega; },
      set entrega(v) { entrega = v; }
    };
  })();

  // ------------------------------------------------------------------ Catálogo
  const chips = (group, items, active) => items.map(it =>
    `<button type="button" class="lp-chip" data-group="${group}" data-value="${it.id}" aria-pressed="${it.id === active}">${esc(it.label)}</button>`).join("");

  function armarInterfaz() {
    root.innerHTML = `
    <div class="lp-shop__toolbar">
      <label class="lp-shop__search">
        <span class="lp-sr">Buscar productos</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Buscá: 5W-30, filtro de aire, batería…" data-lp-search autocomplete="off">
      </label>
      <label class="lp-shop__sort">
        <span class="lp-shop__label">Ordenar</span>
        <select data-lp-sort>${ORDEN.map(o => `<option value="${o.id}">${esc(o.label)}</option>`).join("")}</select>
      </label>
      <button type="button" class="lp-shop__cart" data-lp-cart-open>${ICON_CART}<span>Carrito</span><span class="lp-cart-count" data-lp-cart-count>0</span></button>
    </div>
    <div class="lp-shop__filters">
      <div class="lp-shop__group"><span class="lp-shop__label">Categoría</span>
        <div class="lp-chips" role="group" aria-label="Categoría">${chips("categoria", CATEGORIAS, state.categoria)}</div></div>
      <div class="lp-shop__group" data-lp-veh ${(window.LUBPOINT_CATALOGO || []).length ? "hidden" : ""}><span class="lp-shop__label">Vehículo</span>
        <div class="lp-chips" role="group" aria-label="Vehículo">${chips("vehiculo", VEHICULOS, state.vehiculo)}</div></div>
      <div class="lp-shop__group" data-lp-visc hidden><span class="lp-shop__label">Viscosidad</span>
        <div class="lp-chips" role="group" aria-label="Viscosidad"></div></div>
    </div>
    <div class="lp-shop__status">
      <p aria-live="polite" data-lp-count></p>
      <button type="button" class="lp-shop__clear" data-lp-clear hidden>Limpiar filtros</button>
    </div>
    <div class="lp-shop__grid" data-lp-grid></div>
    <div class="lp-shop__empty" data-lp-empty hidden>
      <p class="lp-shop__empty-title">No encontramos productos con esos filtros</p>
      <p>Probá con otra búsqueda o escribinos: lo conseguimos.</p>
      <button type="button" class="lp-shop__clear is-button" data-lp-clear>Limpiar filtros</button>
    </div>`;
  }

  const $ = s => root.querySelector(s);
  let grid, contador, vacio, viscGroup;

  function renderViscosidades() {
    const mostrar = !hayStock && state.categoria === "aceites";
    viscGroup.hidden = !mostrar;
    if (!mostrar) { state.viscosidad = "todas"; return; }
    const vals = [...new Set(PRODUCTOS.filter(p => p.viscosidad).map(p => p.viscosidad))].sort();
    viscGroup.querySelector(".lp-chips").innerHTML =
      chips("viscosidad", [{ id: "todas", label: "Todas" }, ...vals.map(v => ({ id: v, label: v }))], state.viscosidad);
  }

  function filtrados() {
    const q = norm(state.busqueda.trim());
    const lista = PRODUCTOS.filter(p =>
      (state.categoria === "todos" || p.cat === state.categoria) &&
      (state.vehiculo === "todos" || (p.vehiculos || []).includes(state.vehiculo)) &&
      (state.viscosidad === "todas" || p.viscosidad === state.viscosidad) &&
      (!q || norm([p.nombre, p.detalle, p.viscosidad || "", p.categoria].join(" ")).includes(q)));
    const porTop = (a, b) => (a.top || 99) - (b.top || 99) || a.nombre.localeCompare(b.nombre, "es");
    const orden = {
      top: porTop,
      "precio-asc": (a, b) => a.precio - b.precio,
      "precio-desc": (a, b) => b.precio - a.precio,
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es")
    };
    return lista.sort(orden[state.orden]);
  }

  const iconoDe = p => ICONOS[p.cat] || "lubricantes";
  const media = (p, cls) => p.imagen
    ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" class="${cls}__img" loading="lazy">`
    : `<img src="assets/icons/${iconoDe(p)}.svg" alt="" class="${cls}__icon" loading="lazy">`;

  const sinStock = p => p.disponible != null && p.disponible <= 0;
  const textoCta = p => sinStock(p) ? "Sin stock" : (cart.qty(p.id) ? `En el carrito · ${cart.qty(p.id)}` : "Agregar");

  function tarjeta(p) {
    const pocas = p.disponible != null && p.disponible > 0 && p.disponible <= 5;
    return `<article class="lp-product">
      <div class="lp-product__media">
        ${p.top ? `<span class="lp-product__top">Top ${p.top}</span>` : ""}
        <span class="lp-product__cat">${esc(p.categoria)}</span>
        ${media(p, "lp-product")}
        <button type="button" class="lp-product__ver" data-lp-ver="${esc(p.id)}"
          aria-label="Ver detalles de ${esc(p.nombre)}">
          ${patronHTML()}
          <span class="lp-product__ver-texto">Ver producto</span>
        </button>
      </div>
      <div class="lp-product__body">
        <h3 class="lp-product__name">${esc(p.nombre)}</h3>
        <p class="lp-product__meta">${esc(p.detalle || "")}${pocas ? ` · <strong>quedan ${p.disponible}</strong>` : ""}</p>
        <div class="lp-product__foot">
          <p class="lp-product__price">${p.precio > 0 ? precio.format(p.precio) : "Consultar"}</p>
          <button type="button" class="lp-product__cta${cart.qty(p.id) ? " is-added" : ""}" data-lp-add="${esc(p.id)}"
            ${sinStock(p) ? "disabled" : ""} aria-label="Agregar ${esc(p.nombre)} al carrito">${textoCta(p)}</button>
        </div>
      </div>
    </article>`;
  }

  function render(animar) {
    const lista = filtrados();
    grid.innerHTML = lista.map(tarjeta).join("");
    vacio.hidden = lista.length > 0;
    contador.textContent = lista.length === 1 ? "1 producto" : `${lista.length} productos`;
    const filtrando = state.categoria !== "todos" || state.vehiculo !== "todos" || state.viscosidad !== "todas" || state.busqueda.trim() !== "";
    root.querySelector(".lp-shop__status [data-lp-clear]").hidden = !filtrando;
    if (animar && anim && lista.length) {
      gsap.fromTo(grid.children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out", stagger: 0.035, overwrite: true });
    }
    if (typeof ScrollTrigger !== "undefined") requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  function conectarCatalogo() {
    grid = $("[data-lp-grid]");
    contador = $("[data-lp-count]");
    vacio = $("[data-lp-empty]");
    viscGroup = $("[data-lp-visc]");

    root.addEventListener("click", e => {
      const add = e.target.closest("[data-lp-add]");
      if (add) {
        cart.add(add.dataset.lpAdd);
        add.textContent = textoCta(byId[add.dataset.lpAdd]);
        add.classList.add("is-added");
        actualizarCarrito(true);
        return;
      }
      const ver = e.target.closest("[data-lp-ver]");
      if (ver) { abrirFicha(ver.dataset.lpVer); return; }
      const chip = e.target.closest(".lp-chip");
      if (chip) {
        state[chip.dataset.group] = chip.dataset.value;
        chip.parentElement.querySelectorAll(".lp-chip").forEach(c => c.setAttribute("aria-pressed", String(c === chip)));
        if (chip.dataset.group === "categoria") renderViscosidades();
        render(true);
        return;
      }
      if (e.target.closest("[data-lp-clear]")) {
        Object.assign(state, { categoria: "todos", vehiculo: "todos", viscosidad: "todas", busqueda: "" });
        $("[data-lp-search]").value = "";
        root.querySelectorAll('.lp-chip[data-group="categoria"], .lp-chip[data-group="vehiculo"]')
          .forEach(c => c.setAttribute("aria-pressed", String(c.dataset.value === "todos")));
        renderViscosidades();
        render(true);
      }
    });
    let t;
    $("[data-lp-search]").addEventListener("input", e => {
      clearTimeout(t);
      t = setTimeout(() => { state.busqueda = e.target.value; render(true); }, 180);
    });
    $("[data-lp-sort]").addEventListener("change", e => { state.orden = e.target.value; render(true); });
  }

  // ------------------------------------------------------------------ Carrito (interfaz)
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "lp-cart-fab";
  fab.setAttribute("data-lp-cart-open", "");
  fab.setAttribute("aria-label", "Abrir carrito");
  fab.innerHTML = `${ICON_CART}<span class="lp-cart-count" data-lp-cart-count>0</span>`;
  document.body.appendChild(fab);

  const drawer = document.createElement("div");
  drawer.className = "lp-cart";
  drawer.hidden = true;
  drawer.setAttribute("data-lenis-prevent", "");
  drawer.innerHTML = `
    <div class="lp-cart__backdrop" data-lp-cart-close></div>
    <aside class="lp-cart__panel" role="dialog" aria-modal="true" aria-labelledby="lp-cart-title">
      <header class="lp-cart__head">
        <div>
          <p class="lp-cart__eyebrow">Tienda LUBPOINT</p>
          <h2 class="lp-cart__title" id="lp-cart-title">Tu carrito</h2>
        </div>
        <button type="button" class="lp-cart__close" data-lp-cart-close aria-label="Cerrar carrito">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="lp-cart__body" data-lp-cart-lines></div>
      <footer class="lp-cart__foot" data-lp-cart-foot>
        <div class="lp-cart__delivery">
          <p class="lp-cart__label">Entrega</p>
          <div class="lp-chips" role="group" aria-label="Entrega" data-lp-delivery></div>
        </div>
        <label class="lp-cart__name">
          <span class="lp-cart__label">Nombre y apellido</span>
          <input type="text" maxlength="60" placeholder="Ej: Juan Pérez" data-lp-cart-name autocomplete="name" required>
        </label>
        <div class="lp-cart__total"><span>Total</span><strong data-lp-cart-total></strong></div>
        <p class="lp-cart__note" data-lp-cart-aviso>Te confirmamos stock y precio final por WhatsApp.</p>
        <button type="button" class="lp-cart__checkout" data-lp-cart-checkout>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>
          Finalizar pedido por WhatsApp
        </button>
        <button type="button" class="lp-shop__clear lp-cart__empty-btn" data-lp-cart-clear>Vaciar carrito</button>
      </footer>
    </aside>`;
  document.body.appendChild(drawer);
  const D = s => drawer.querySelector(s);
  const panel = D(".lp-cart__panel"), fondo = D(".lp-cart__backdrop");

  const nombreOk = () => D("[data-lp-cart-name]").value.trim().split(" ").filter(Boolean).length >= 2;

  function syncCheckout() {
    const b = D("[data-lp-cart-checkout]");
    if (b) b.disabled = !(nombreOk() && cart.count() > 0);
    const aviso = D("[data-lp-cart-aviso]");
    if (aviso) aviso.textContent = nombreOk()
      ? "Te confirmamos stock y precio final por WhatsApp."
      : "Escribí tu nombre y apellido para enviar el pedido.";
  }

  function pintarCarrito() {
    const lineas = cart.lines();
    D("[data-lp-cart-lines]").innerHTML = lineas.length ? lineas.map(({ p, q }) => `
      <div class="lp-cart__item">
        <div class="lp-cart__thumb">${media(p, "lp-cart")}</div>
        <div class="lp-cart__info">
          <p class="lp-cart__name-p">${esc(p.nombre)}</p>
          <p class="lp-cart__meta">${esc(p.detalle || "")} · ${precio.format(p.precio)} c/u</p>
          <div class="lp-cart__row">
            <div class="lp-cart__stepper" role="group" aria-label="Cantidad de ${esc(p.nombre)}">
              <button type="button" data-lp-qty="${esc(p.id)}" data-step="-1" aria-label="Quitar uno">−</button>
              <span aria-live="polite">${q}</span>
              <button type="button" data-lp-qty="${esc(p.id)}" data-step="1" aria-label="Agregar uno">+</button>
            </div>
            <strong class="lp-cart__subtotal">${precio.format(p.precio * q)}</strong>
          </div>
        </div>
        <button type="button" class="lp-cart__remove" data-lp-remove="${esc(p.id)}" aria-label="Quitar ${esc(p.nombre)} del carrito">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>`).join("") : `
      <div class="lp-cart__emptystate">
        ${ICON_CART}
        <p class="lp-cart__empty-title">Tu carrito está vacío</p>
        <p>Agregá productos desde la tienda y hacé tu pedido por WhatsApp.</p>
        <button type="button" class="lp-shop__clear is-button" data-lp-cart-close>Seguir comprando</button>
      </div>`;
    D("[data-lp-cart-foot]").hidden = !lineas.length;
    D("[data-lp-cart-total]").textContent = precio.format(cart.total());
    D("[data-lp-delivery]").innerHTML = ENTREGAS.map(x =>
      `<button type="button" class="lp-chip" data-lp-entrega="${esc(x)}" aria-pressed="${x === cart.entrega}">${esc(x)}</button>`).join("");
    syncCheckout();
  }

  function actualizarCarrito(rebote) {
    const n = cart.count();
    document.querySelectorAll("[data-lp-cart-count]").forEach(el => { el.textContent = n; el.hidden = n === 0; });
    fab.classList.toggle("has-items", n > 0);
    if (!drawer.hidden) pintarCarrito();
    if (rebote && anim) gsap.fromTo([fab, root.querySelector(".lp-shop__cart")], { scale: 1 },
      { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
  }

  function sincronizarTarjetas() {
    grid.querySelectorAll("[data-lp-add]").forEach(b => {
      const p = byId[b.dataset.lpAdd];
      if (!p) return;
      b.textContent = textoCta(p);
      b.classList.toggle("is-added", cart.qty(p.id) > 0);
    });
  }

  let ultimoFoco = null;
  function abrirCarrito() {
    ultimoFoco = document.activeElement;
    pintarCarrito();
    drawer.hidden = false;
    if (window.scrollLock) window.scrollLock.lock("carrito");
    if (anim) {
      gsap.fromTo(fondo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
      gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.7, ease: "expo.out" });
    }
    setTimeout(() => D(".lp-cart__close").focus(), 50);
  }
  function cerrarCarrito() {
    const listo = () => {
      drawer.hidden = true;
      if (window.scrollLock) window.scrollLock.unlock("carrito");
      if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    };
    if (anim) {
      gsap.to(panel, { xPercent: 100, duration: 0.45, ease: "power3.in" });
      gsap.to(fondo, { autoAlpha: 0, duration: 0.45, ease: "power2.in", onComplete: listo });
    } else listo();
  }

  document.addEventListener("click", e => { if (e.target.closest("[data-lp-cart-open]")) abrirCarrito(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !drawer.hidden) cerrarCarrito(); });
  drawer.addEventListener("input", e => { if (e.target.matches("[data-lp-cart-name]")) syncCheckout(); });

  drawer.addEventListener("click", async e => {
    if (e.target.closest("[data-lp-cart-close]")) return cerrarCarrito();
    const paso = e.target.closest("[data-lp-qty]");
    if (paso) { cart.set(paso.dataset.lpQty, cart.qty(paso.dataset.lpQty) + Number(paso.dataset.step)); actualizarCarrito(); sincronizarTarjetas(); return; }
    const quitar = e.target.closest("[data-lp-remove]");
    if (quitar) { cart.set(quitar.dataset.lpRemove, 0); actualizarCarrito(); sincronizarTarjetas(); return; }
    const entrega = e.target.closest("[data-lp-entrega]");
    if (entrega) { cart.entrega = entrega.dataset.lpEntrega; pintarCarrito(); return; }
    if (e.target.closest("[data-lp-cart-clear]")) { cart.clear(); actualizarCarrito(); sincronizarTarjetas(); return; }

    if (e.target.closest("[data-lp-cart-checkout]") && cart.count() && nombreOk()) {
      const boton = e.target.closest("[data-lp-cart-checkout]");
      const nombre = D("[data-lp-cart-name]").value.trim();
      let numero = "";
      if (API) {   // el pedido queda registrado en el sistema del local
        boton.disabled = true;
        try {
          const r = await fetch(`${API}/api/publico/pedidos`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              cliente: nombre, entrega: cart.entrega,
              items: cart.lines().filter(l => l.p.productoId).map(l => ({
                id: l.p.productoId, cantidad: l.q, variante: l.p.variante || undefined
              }))
            })
          });
          const datos = await r.json();
          if (datos.numero) numero = datos.numero;
        } catch (err) { /* si el sistema no responde, igual se manda por WhatsApp */ }
        boton.disabled = false;
      }
      const msg = [
        "Hola LUBPOINT, quiero hacer este pedido:",
        ...cart.lines().map(({ p, q }) => `• ${q} x ${p.nombre}${p.detalle ? ` (${p.detalle})` : ""} — ${precio.format(p.precio * q)}`),
        `Total: ${precio.format(cart.total())}`,
        `Entrega: ${cart.entrega}`,
        `Nombre: ${nombre}`,
        numero ? `Pedido: ${numero}` : ""
      ].filter(Boolean).join("\n");
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    }
  });

  // ------------------------------------------------------------------ Ficha del producto
  /* Fondo de patrón en movimiento: dos copias idénticas una al lado de la otra dentro de una
     pista que se desplaza exactamente el ancho de una copia. Cuando termina, la segunda quedó
     justo donde estaba la primera, así que el bucle no tiene corte ni salto. */
  function patronHTML() {
    // sin loading="lazy": estas copias nacen dentro de elementos ocultos y el navegador
    // nunca llegaría a pedirlas (son 66 KB de un único archivo, que además queda en caché)
    const copia = '<img src="assets/fondo-patron.webp" alt="" decoding="async">';
    // 4 copias: la pista siempre es más ancha que la caja, y el bucle avanza exactamente una copia
    return '<span class="lp-patron" aria-hidden="true"><span class="lp-patron__pista">' +
      copia.repeat(4) + "</span></span>";
  }

  const ficha = document.createElement("div");
  ficha.className = "lp-ficha";
  ficha.hidden = true;
  ficha.setAttribute("data-lenis-prevent", "");
  ficha.innerHTML = `
    <div class="lp-ficha__fondo" data-lp-ficha-cerrar></div>
    <article class="lp-ficha__caja" role="dialog" aria-modal="true" aria-labelledby="lp-ficha-titulo">
      <div class="lp-ficha__visor">
        <div class="lp-ficha__pista" data-lp-ficha-pista></div>
        <div class="lp-ficha__flechas" data-lp-ficha-flechas>
          <button type="button" class="lp-ficha__flecha" data-lp-ficha-paso="-1" aria-label="Foto anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          </button>
          <button type="button" class="lp-ficha__flecha" data-lp-ficha-paso="1" aria-label="Foto siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
        <p class="lp-ficha__contador" data-lp-ficha-contador></p>
      </div>

      <div class="lp-ficha__info">
        ${patronHTML()}
        <button type="button" class="lp-ficha__cerrar" data-lp-ficha-cerrar aria-label="Volver atrás">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
        <div class="lp-ficha__contenido">
          <p class="lp-ficha__cat" data-lp-ficha-cat></p>
          <h2 class="lp-ficha__titulo" id="lp-ficha-titulo" data-lp-ficha-nombre></h2>
          <p class="lp-ficha__bajada" data-lp-ficha-bajada></p>

          <div class="lp-ficha__tarjetas">
            <section class="lp-ficha__tarjeta">
              <h3>Cómo es</h3>
              <ul data-lp-ficha-detalles></ul>
            </section>
            <section class="lp-ficha__tarjeta">
              <h3>Va bien con</h3>
              <p data-lp-ficha-con></p>
            </section>
          </div>

          <div class="lp-ficha__compra">
            <div class="lp-ficha__cantidad">
              <span data-lp-ficha-unidades>1 unidad</span>
              <div class="lp-ficha__pasos">
                <button type="button" data-lp-ficha-cant="-1" aria-label="Quitar una unidad">−</button>
                <strong data-lp-ficha-numero>1</strong>
                <button type="button" data-lp-ficha-cant="1" aria-label="Sumar una unidad">+</button>
              </div>
            </div>
            <button type="button" class="lp-ficha__agregar" data-lp-ficha-agregar>
              <span data-lp-ficha-agregar-texto>Agregar</span>
              <span class="lp-ficha__agregar-precio" data-lp-ficha-precio></span>
            </button>
          </div>
          <p class="lp-ficha__stock" data-lp-ficha-stock></p>
        </div>
      </div>
    </article>`;
  document.body.appendChild(ficha);
  const F = s => ficha.querySelector(s);

  let fichaProducto = null;
  let fichaFoco = null;
  let fichaIndice = 0;
  let fichaCantidad = 1;

  function mostrarFoto(indice) {
    const fotos = (fichaProducto && fichaProducto.fotos) || [];
    if (!fotos.length) return;
    fichaIndice = (indice + fotos.length) % fotos.length;   // da la vuelta en los extremos
    F("[data-lp-ficha-pista]").style.transform = `translate3d(-${fichaIndice * 100}%, 0, 0)`;
    F("[data-lp-ficha-contador]").textContent = fotos.length > 1 ? `${fichaIndice + 1} / ${fotos.length}` : "";
  }

  function pintarCantidad() {
    const p = fichaProducto;
    if (!p) return;
    const tope = p.disponible != null ? Math.max(1, p.disponible) : 99;
    fichaCantidad = Math.min(Math.max(1, fichaCantidad), tope);
    F("[data-lp-ficha-numero]").textContent = fichaCantidad;
    F("[data-lp-ficha-unidades]").textContent = fichaCantidad === 1 ? "1 unidad" : `${fichaCantidad} unidades`;
    F("[data-lp-ficha-precio]").textContent = p.precio > 0 ? precio.format(p.precio * fichaCantidad) : "A consultar";
  }

  function pintarFicha(p) {
    const datos = (window.LUBPOINT_FICHAS || {})[p.codigo] || {};
    const fotos = p.fotos && p.fotos.length ? p.fotos : [];

    F("[data-lp-ficha-cat]").textContent = p.categoria;
    F("[data-lp-ficha-nombre]").textContent = p.nombre;
    F("[data-lp-ficha-bajada]").textContent = datos.d || "Pasá por el local y te asesoramos.";
    F("[data-lp-ficha-detalles]").innerHTML = (datos.det || [p.detalle].filter(Boolean))
      .map(x => `<li>${esc(x)}</li>`).join("");
    F("[data-lp-ficha-con]").textContent = datos.con || "Consultanos y te decimos qué le va mejor.";

    // Fotos: una al lado de la otra; las flechas desplazan la pista
    F("[data-lp-ficha-pista]").innerHTML = fotos.length
      ? fotos.map((f, n) => `<div class="lp-ficha__cuadro"><img src="${esc(f)}" alt="${esc(p.nombre)} · vista ${n + 1}"></div>`).join("")
      : `<div class="lp-ficha__cuadro is-sinfoto">
           <img class="lp-ficha__icono" src="assets/icons/${iconoDe(p)}.svg" alt="">
           <span>Foto en camino</span>
         </div>`;
    F("[data-lp-ficha-flechas]").hidden = fotos.length < 2;

    const stock = F("[data-lp-ficha-stock]");
    stock.textContent = p.disponible == null ? ""
      : (p.disponible > 0 ? `${p.disponible} disponibles en el local` : "Sin stock por ahora");

    const boton = F("[data-lp-ficha-agregar]");
    boton.disabled = sinStock(p);
    F("[data-lp-ficha-agregar-texto]").textContent = sinStock(p) ? "Sin stock"
      : (cart.qty(p.id) ? "Sumar al carrito" : "Agregar");
    pintarCantidad();
  }

  function abrirFicha(id) {
    const p = byId[id];
    if (!p) return;
    fichaProducto = p;
    fichaCantidad = 1;
    fichaFoco = document.activeElement;
    pintarFicha(p);
    ficha.hidden = false;
    mostrarFoto(0);
    if (window.scrollLock) window.scrollLock.lock("ficha");
    if (anim) {
      gsap.fromTo(F(".lp-ficha__fondo"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "power2.out" });
      gsap.fromTo(F(".lp-ficha__caja"), { autoAlpha: 0, y: 26, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" });
    }
    setTimeout(() => F(".lp-ficha__cerrar").focus(), 60);
  }

  function cerrarFicha() {
    const listo = () => {
      ficha.hidden = true;
      if (window.scrollLock) window.scrollLock.unlock("ficha");
      if (fichaFoco && fichaFoco.focus) fichaFoco.focus();
      fichaProducto = null;
    };
    if (anim) {
      gsap.to(F(".lp-ficha__caja"), { autoAlpha: 0, y: 18, duration: 0.3, ease: "power2.in" });
      gsap.to(F(".lp-ficha__fondo"), { autoAlpha: 0, duration: 0.3, ease: "power2.in", onComplete: listo });
    } else listo();
  }

  ficha.addEventListener("click", e => {
    if (e.target.closest("[data-lp-ficha-cerrar]")) return cerrarFicha();

    const paso = e.target.closest("[data-lp-ficha-paso]");
    if (paso) { mostrarFoto(fichaIndice + Number(paso.dataset.lpFichaPaso)); return; }

    const cant = e.target.closest("[data-lp-ficha-cant]");
    if (cant) { fichaCantidad += Number(cant.dataset.lpFichaCant); pintarCantidad(); return; }

    if (e.target.closest("[data-lp-ficha-agregar]") && fichaProducto && !sinStock(fichaProducto)) {
      cart.set(fichaProducto.id, cart.qty(fichaProducto.id) + fichaCantidad);
      actualizarCarrito(true);
      sincronizarTarjetas();
      pintarFicha(fichaProducto);
    }
  });

  document.addEventListener("keydown", e => {
    if (ficha.hidden) return;
    if (e.key === "Escape") cerrarFicha();
    if (e.key === "ArrowLeft") mostrarFoto(fichaIndice - 1);
    if (e.key === "ArrowRight") mostrarFoto(fichaIndice + 1);
  });

  // El botón flotante del carrito solo aparece mientras la sección Tienda está en pantalla.
  const seccion = root.closest("section, [class^='section_']") || root;
  function verFab(visible) {
    fab.classList.toggle("is-visible", visible);
    fab.setAttribute("aria-hidden", String(!visible));
    fab.tabIndex = visible ? 0 : -1;
  }
  verFab(false);

  // ------------------------------------------------------------------ Arranque
  (async () => {
    await cargar();
    cart.limpiarInexistentes();
    armarInterfaz();
    conectarCatalogo();
    renderViscosidades();
    render(false);
    actualizarCarrito();

    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({ trigger: seccion, start: "top 60%", end: "bottom 40%", onToggle: self => verFab(self.isActive) });
      if (anim) {
        gsap.set(grid.children, { autoAlpha: 0, y: 24 });
        ScrollTrigger.create({
          trigger: root, start: "top 80%", once: true,
          onEnter: () => gsap.to(grid.children, { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.04 })
        });
      }
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => verFab(en.isIntersecting), { threshold: 0.15 }).observe(seccion);
    }
  })();
})();
