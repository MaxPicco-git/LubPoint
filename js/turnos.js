/* LUBPOINT · Agendar consulta
   Modal con servicio, calendario y horario (07:00 a 19:00). Al confirmar abre WhatsApp con el
   pedido ya escrito. Se abre desde cualquier elemento con [data-lp-book]; si el atributo tiene un
   valor (ej: data-lp-book="Cambio de aceite y filtro"), ese servicio queda preseleccionado. */
(function () {
  "use strict";

  const cfg = {
    whatsapp: (window.LUBPOINT && window.LUBPOINT.whatsapp) || "5493420000000",
    openHour: 7,          // primer turno 07:00
    closeHour: 19,        // cierre 19:00 (último turno 18:30)
    slotMinutes: 30,
    workDays: [1, 2, 3, 4, 5, 6], // 0 = domingo ... 6 = sábado. Lunes a sábado.
    daysAhead: 60         // cuántos días hacia adelante se pueden elegir
  };

  const triggers = document.querySelectorAll("[data-lp-book]");
  if (!triggers.length) return;

  const services = [...new Set([...document.querySelectorAll("[data-lp-book]")]
    .map(el => el.getAttribute("data-lp-book")).filter(Boolean))];
  services.push("Otra consulta");

  const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
  const fmtMonth = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
  const fmtLong = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const pad = n => String(n).padStart(2, "0");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const state = { service: services[0], date: null, time: null, view: startOfDay(new Date()) };
  state.view.setDate(1);

  const modal = document.createElement("div");
  modal.className = "lp-book";
  modal.hidden = true;
  modal.setAttribute("data-lenis-prevent", "");
  modal.innerHTML = `
    <div class="lp-book__backdrop" data-lp-close></div>
    <div class="lp-book__panel" role="dialog" aria-modal="true" aria-labelledby="lp-book-title">
      <button type="button" class="lp-book__close" data-lp-close aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <p class="lp-book__eyebrow">Turnos · 07:00 a 19:00</p>
      <h2 class="lp-book__title" id="lp-book-title">Agendá tu consulta</h2>

      <div class="lp-book__step">
        <p class="lp-book__label"><span>1</span> Servicio</p>
        <div class="lp-book__services" role="group" aria-label="Servicio"></div>
      </div>

      <div class="lp-book__step">
        <p class="lp-book__label"><span>2</span> Día</p>
        <div class="lp-book__cal">
          <div class="lp-book__cal-head">
            <button type="button" class="lp-book__nav" data-lp-month="-1" aria-label="Mes anterior">‹</button>
            <p class="lp-book__month" aria-live="polite"></p>
            <button type="button" class="lp-book__nav" data-lp-month="1" aria-label="Mes siguiente">›</button>
          </div>
          <div class="lp-book__weekdays">${DAYS.map(d => `<span>${d}</span>`).join("")}</div>
          <div class="lp-book__days"></div>
        </div>
      </div>

      <div class="lp-book__step">
        <p class="lp-book__label"><span>3</span> Horario</p>
        <div class="lp-book__times"><p class="lp-book__hint">Elegí primero un día.</p></div>
      </div>

      <label class="lp-book__step lp-book__name">
        <span class="lp-book__label"><span>4</span> Nombre y apellido</span>
        <input type="text" maxlength="60" placeholder="Ej: Juan Pérez" data-lp-name autocomplete="name" required>
      </label>

      <div class="lp-book__footer">
        <p class="lp-book__summary" aria-live="polite"></p>
        <button type="button" class="lp-book__confirm" data-lp-confirm disabled>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>
          Confirmar por WhatsApp
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const $ = s => modal.querySelector(s);
  const panel = $(".lp-book__panel"), backdrop = $(".lp-book__backdrop");
  const today = () => startOfDay(new Date());
  const lastDay = () => { const d = today(); d.setDate(d.getDate() + cfg.daysAhead); return d; };

  function slotsFor(date) {
    const out = [], now = new Date();
    for (let m = cfg.openHour * 60; m < cfg.closeHour * 60; m += cfg.slotMinutes) {
      const t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(m / 60), m % 60);
      out.push({ label: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, disabled: t <= now });
    }
    return out;
  }
  const dayAvailable = d => d >= today() && d <= lastDay() && cfg.workDays.includes(d.getDay()) && slotsFor(d).some(s => !s.disabled);

  function renderServices() {
    $(".lp-book__services").innerHTML = services.map(s =>
      `<button type="button" class="lp-chip" data-lp-service="${esc(s)}" aria-pressed="${s === state.service}">${esc(s)}</button>`).join("");
  }

  function renderCalendar() {
    const v = state.view, y = v.getFullYear(), m = v.getMonth();
    const month = fmtMonth.format(v);
    $(".lp-book__month").textContent = month.charAt(0).toUpperCase() + month.slice(1);
    const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7; // semana empieza lunes
    const total = new Date(y, m + 1, 0).getDate();
    let html = "";
    for (let i = 0; i < offset; i++) html += "<span></span>";
    for (let d = 1; d <= total; d++) {
      const date = new Date(y, m, d), ok = dayAvailable(date);
      const sel = state.date && +state.date === +date, isToday = +date === +today();
      html += `<button type="button" class="lp-book__day${isToday ? " is-today" : ""}" data-lp-day="${d}" ${ok ? "" : "disabled"} aria-pressed="${!!sel}" aria-label="${fmtLong.format(date)}">${d}</button>`;
    }
    $(".lp-book__days").innerHTML = html;
    const minView = new Date(today().getFullYear(), today().getMonth(), 1);
    const maxView = new Date(lastDay().getFullYear(), lastDay().getMonth(), 1);
    $('[data-lp-month="-1"]').disabled = +v <= +minView;
    $('[data-lp-month="1"]').disabled = +v >= +maxView;
  }

  function renderTimes() {
    const box = $(".lp-book__times");
    if (!state.date) { box.innerHTML = '<p class="lp-book__hint">Elegí primero un día.</p>'; return; }
    box.innerHTML = slotsFor(state.date).map(s =>
      `<button type="button" class="lp-book__time" data-lp-time="${s.label}" ${s.disabled ? "disabled" : ""} aria-pressed="${s.label === state.time}">${s.label}</button>`).join("");
  }

  const nombreOk = () => $("[data-lp-name]").value.trim().split(" ").filter(Boolean).length >= 2;

  function renderSummary() {
    const ready = state.service && state.date && state.time && nombreOk();
    $("[data-lp-confirm]").disabled = !ready;
    $(".lp-book__summary").innerHTML = ready
      ? `<strong>${esc(state.service)}</strong><br>${esc(fmtLong.format(state.date))} · ${state.time} hs`
      : (state.service && state.date && state.time ? "Escribí tu nombre y apellido." : "Elegí servicio, día y horario.");
  }

  function renderAll() { renderServices(); renderCalendar(); renderTimes(); renderSummary(); }

  let lastFocus = null;
  function open(service) {
    if (service && services.includes(service)) state.service = service;
    lastFocus = document.activeElement;
    renderAll();
    modal.hidden = false;
    document.documentElement.classList.add("lp-book-open");
    if (window.scrollLock) window.scrollLock.lock("turnos");
    if (typeof gsap !== "undefined") {
      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
      gsap.fromTo(panel, { autoAlpha: 0, y: 40, filter: "blur(10px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "expo.out", clearProps: "filter" });
    }
    setTimeout(() => $(".lp-book__close").focus(), 50);
  }
  function close() {
    const done = () => {
      modal.hidden = true;
      document.documentElement.classList.remove("lp-book-open");
      if (window.scrollLock) window.scrollLock.unlock("turnos");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    if (typeof gsap !== "undefined") {
      gsap.to(panel, { autoAlpha: 0, y: 30, duration: 0.3, ease: "power2.in" });
      gsap.to(backdrop, { autoAlpha: 0, duration: 0.3, ease: "power2.in", onComplete: done });
    } else done();
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-lp-book]");
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute("data-lp-book"));
  });
  document.addEventListener("keydown", e => {
    if (modal.hidden) {
      const t = e.target.closest && e.target.closest("[data-lp-book]");
      if (t && (e.key === "Enter" || e.key === " ") && t.tagName !== "A" && t.tagName !== "BUTTON") { e.preventDefault(); open(t.getAttribute("data-lp-book")); }
      return;
    }
    if (e.key === "Escape") close();
  });

  modal.addEventListener("input", e => { if (e.target.matches("[data-lp-name]")) renderSummary(); });
  modal.addEventListener("click", async e => {
    if (e.target.closest("[data-lp-close]")) return close();
    const svc = e.target.closest("[data-lp-service]");
    if (svc) { state.service = svc.getAttribute("data-lp-service"); renderServices(); renderSummary(); return; }
    const nav = e.target.closest("[data-lp-month]");
    if (nav && !nav.disabled) { state.view.setMonth(state.view.getMonth() + Number(nav.dataset.lpMonth)); renderCalendar(); return; }
    const day = e.target.closest("[data-lp-day]");
    if (day && !day.disabled) {
      state.date = new Date(state.view.getFullYear(), state.view.getMonth(), Number(day.dataset.lpDay));
      if (state.time && slotsFor(state.date).find(s => s.label === state.time && s.disabled)) state.time = null;
      renderCalendar(); renderTimes(); renderSummary(); return;
    }
    const time = e.target.closest("[data-lp-time]");
    if (time && !time.disabled) { state.time = time.dataset.lpTime; renderTimes(); renderSummary(); return; }
    if (e.target.closest("[data-lp-confirm]") && state.date && state.time && nombreOk()) {
      const name = $("[data-lp-name]").value.trim();
      const API = ((window.LUBPOINT && window.LUBPOINT.api) || "").replace(/[/]$/, "");
      if (API) {   // el turno queda en la agenda del sistema
        const f = state.date;
        const fecha = f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
        try {
          await fetch(API + "/api/publico/turnos", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ servicio: state.service, fecha, hora: state.time, cliente: name })
          });
        } catch (err) { /* si el sistema no responde, igual se manda por WhatsApp */ }
      }
      const msg = [
        "Hola LUBPOINT, quiero agendar una consulta.",
        `Servicio: ${state.service}`,
        `Día: ${fmtLong.format(state.date)}`,
        `Hora: ${state.time} hs`,
        `Nombre: ${name}`
      ].filter(Boolean).join("\n");
      window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    }
  });
})();
