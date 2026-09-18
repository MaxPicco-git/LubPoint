/* LUBPOINT · Isotipo manómetro
   Reemplaza al módulo del casco de la plantilla (secuencia de 180 frames) y conserva su
   coreografía de scroll con GSAP + ScrollTrigger (Lenis sigue manejando el smooth scroll):
   · entra con escala (back.out) cuando la sección cruza el centro de la pantalla,
   · crece de 1 a 1.1 con scrub mientras se atraviesa la sección,
   · reacciona a la velocidad del scroll.
   Por manual de marca el logo nunca se rota ni se deforma: la única pieza que se anima por
   separado es la aguja, que entra desde –90° con leve rebote y oscila con la velocidad, como un
   manómetro. El flotado y el seguimiento del mouse siguen a cargo del módulo 63181. */
(function () {
  "use strict";

  const cfg = {
    src: "assets/Lubpoint_iso_color.png",
    alt: "Isotipo de LUBPOINT",
    sectionSelector: "[data-helmet-section]",
    layerSelector: "[data-helmet-layer]",
    stageSelector: "[data-helmet-stage]",
    scaleTriggerStart: "top center",
    scaleInDuration: 0.8,
    scaleInEase: "back.out(1.4)",
    scaleOutDuration: 0.4,
    scaleOutEase: "power2.in",
    needleRest: -90,
    needleInDuration: 0.6,
    needleInDelay: 0.2,
    needleInEase: "back.out(2)",
    growFrom: 1,
    growTo: 1.1,
    growStart: "top bottom",
    growEnd: "bottom top",
    velocityGain: 0.02, // grados por px/s de scroll
    maxUp: 55,          // deflexión máxima bajando (horario, "sube la presión")
    maxDown: -30,       // deflexión máxima subiendo
    velocitySmoothing: 0.12,
    needleFollow: 0.5,
    respectReducedMotion: true
  };

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector(cfg.sectionSelector);
  const stage = section && section.querySelector(cfg.stageSelector);
  if (!stage || stage.querySelector("[data-lp-gauge]")) return;
  const layer = section.querySelector(cfg.layerSelector);
  if (layer) layer.style.pointerEvents = "none";

  const gauge = document.createElement("div");
  gauge.className = "lp-gauge";
  gauge.setAttribute("data-lp-gauge", "");
  gauge.innerHTML =
    '<img class="lp-gauge__layer lp-gauge__body" src="' + cfg.src + '" alt="' + cfg.alt + '" draggable="false">' +
    '<div class="lp-gauge__layer lp-gauge__pivot">' +
    '<img class="lp-gauge__layer lp-gauge__needle" src="' + cfg.src + '" alt="" aria-hidden="true" draggable="false">' +
    "</div>";
  stage.appendChild(gauge);
  const pivot = gauge.querySelector(".lp-gauge__pivot");
  const needle = gauge.querySelector(".lp-gauge__needle");

  if (cfg.respectReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(stage, { scale: 1, transformOrigin: "50% 50%" });
    return;
  }

  // Entrada / salida: misma coreografía que tenía el casco, más el barrido de la aguja.
  gsap.set(stage, { scale: 0, transformOrigin: "50% 50%" });
  gsap.set(pivot, { rotation: cfg.needleRest });
  ScrollTrigger.create({
    trigger: section,
    start: cfg.scaleTriggerStart,
    onEnter: function () {
      gsap.to(stage, { scale: 1, duration: cfg.scaleInDuration, ease: cfg.scaleInEase, overwrite: "auto" });
      gsap.to(pivot, { rotation: 0, duration: cfg.needleInDuration, delay: cfg.needleInDelay, ease: cfg.needleInEase, overwrite: "auto" });
    },
    onLeaveBack: function () {
      gsap.to(stage, { scale: 0, duration: cfg.scaleOutDuration, ease: cfg.scaleOutEase, overwrite: "auto" });
      gsap.to(pivot, { rotation: cfg.needleRest, duration: cfg.scaleOutDuration, ease: cfg.scaleOutEase, overwrite: "auto" });
    }
  });

  // Aguja según la velocidad del scroll (misma medición por frame que usaba el casco).
  const follow = gsap.quickTo(needle, "rotation", { duration: cfg.needleFollow, ease: "power3.out" });
  let lastY = 0, velocity = 0, running = false;

  function tick(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (dt <= 0) return;
    const y = window.scrollY;
    const raw = (y - lastY) / dt;
    lastY = y;
    velocity += (raw - velocity) * (1 - Math.exp(-dt / cfg.velocitySmoothing));
    follow(gsap.utils.clamp(cfg.maxDown, cfg.maxUp, velocity * cfg.velocityGain));
  }
  function start() {
    if (running) return;
    running = true;
    lastY = window.scrollY;
    velocity = 0;
    gsap.ticker.add(tick);
  }
  function stop() {
    if (!running) return;
    running = false;
    gsap.ticker.remove(tick);
    follow(0);
  }

  // Crecimiento con scrub mientras se atraviesa la sección.
  gsap.fromTo(gauge, { scale: cfg.growFrom, transformOrigin: "50% 50%" }, {
    scale: cfg.growTo,
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: cfg.growStart,
      end: cfg.growEnd,
      scrub: true,
      onToggle: function (self) { self.isActive ? start() : stop(); }
    }
  });
})();
