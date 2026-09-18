/* LUBPOINT · Títulos principales ([data-lp-title])
   Entran deslizando hacia arriba desde abajo, con desenfoque que se va aclarando, línea por línea.
   Usa GSAP + ScrollTrigger + SplitText (los mismos de la plantilla) y se sincroniza con Lenis. */
(function () {
  "use strict";
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" || typeof SplitText === "undefined") return;
  const titles = gsap.utils.toArray("[data-lp-title]");
  if (!titles.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  gsap.set(titles, { autoAlpha: 0 });

  // Esperar a Morganite para que el corte de líneas sea el definitivo.
  document.fonts.ready.then(function () {
    titles.forEach(function (el) {
      const split = SplitText.create(el, { type: "lines", linesClass: "lp-title-line" });
      gsap.set(el, { autoAlpha: 1 });
      gsap.set(split.lines, { yPercent: 90, autoAlpha: 0, filter: "blur(14px)" });
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: function () {
          gsap.to(split.lines, {
            yPercent: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 1.3,
            ease: "expo.out",
            stagger: 0.12,
            onComplete: function () { split.revert(); }
          });
        }
      });
    });
    ScrollTrigger.refresh();
  });
})();
