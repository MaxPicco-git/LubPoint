/* LUBPOINT · ajustes de página sobre la plantilla */
(function () {
  "use strict";

  // Hero: durante la carga, el isotipo grafito cubre la pantalla (fondo del loader). Cuando termina
  // el zoom de salida, se desvanece y queda el isotipo verde (versión positiva principal).
  function revealHeroIsotipo() {
    const cover = document.querySelector('[data-loader-bg="white"]');
    if (!cover) return;
    if (typeof gsap === "undefined") {
      cover.style.opacity = "0";
      return;
    }
    gsap.to(cover, { autoAlpha: 0, duration: 0.6, ease: "power2.out" });
  }
  if (window.loaderNumbersReady) revealHeroIsotipo();
  else window.addEventListener("loader:numbers-ready", revealHeroIsotipo, { once: true });

  // Contacto: la plantilla enviaba el formulario a la cuenta de Webflow del sitio original.
  // Queda cortado hasta conectar el envío propio de LUBPOINT; se muestra el mensaje de error del form.
  document.addEventListener("submit", function (e) {
    const form = e.target;
    if (!form.matches || !form.matches("[data-lp-form]")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const block = form.closest(".w-form");
    const fail = block && block.querySelector(".w-form-fail");
    if (fail) fail.style.display = "block";
  }, true);
})();
