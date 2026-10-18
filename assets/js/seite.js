/* ILS Dispo – auf jeder Seite: kompakte Kopfzeile beim Scrollen, sanftes Einblenden, Zahlen zählen einmal hoch.
   Ohne JavaScript bleibt alles sichtbar und erreichbar (Kopfzeile oben, „Weiter auf der Website“ am Seitenende).
   Bei „Bewegung reduzieren“ wird nichts eingeblendet und nichts gezählt; die Kopfzeile erscheint ohne Gleiten. */
(function () {
  "use strict";
  var ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Kompakte Kopfzeile: eine Kopie der Seitennavigation, sobald der Seitenkopf aus dem Bild ist.
     Breit (ab 1024 px) bleibt sie stehen; schmaler erscheint sie beim Hochscrollen und weicht beim Weiterlesen. ---- */
  var kopf = document.querySelector(".site-head");
  if (kopf) {
    var leiste = document.createElement("div");
    leiste.className = "kopf-kompakt";
    var wrap = kopf.querySelector(".wrap").cloneNode(true);
    var nav = wrap.querySelector(".nav");
    nav.setAttribute("aria-label", "Seiten (Kopfzeile)");
    nav.id = "kopf-kompakt-seiten";
    var knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = "menue";
    knopf.setAttribute("aria-expanded", "false");
    knopf.setAttribute("aria-controls", nav.id);
    knopf.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Seiten';
    wrap.insertBefore(knopf, nav);                         // vor der Liste: Tab führt vom Knopf in die Liste
    leiste.appendChild(wrap);
    document.body.appendChild(leiste);

    var breit = window.matchMedia("(min-width: 1024px)");
    var letzte = window.scrollY, sichtbar = false;
    function menue(offen) {
      leiste.classList.toggle("offen", offen);
      knopf.setAttribute("aria-expanded", offen ? "true" : "false");
    }
    function setzen(zeigen) {
      sichtbar = zeigen;
      leiste.classList.toggle("zeigen", zeigen);
      leiste.toggleAttribute("inert", !zeigen);             // unsichtbar: weder Tab noch Vorleser erreichen sie
      if (!zeigen) menue(false);
    }
    function lage() {
      var y = window.scrollY, grenze = kopf.offsetTop + kopf.offsetHeight + 40, zeigen = sichtbar;
      if (y <= grenze) zeigen = false;
      else if (breit.matches) zeigen = true;
      else if (y < letzte - 2) zeigen = true;                                    // hochscrollen: erscheint
      else if (y > letzte + 2 && !leiste.classList.contains("offen")) zeigen = false;   // weiterlesen: weicht
      if (zeigen !== sichtbar) setzen(zeigen);
      letzte = y;
    }
    knopf.addEventListener("click", function () { menue(!leiste.classList.contains("offen")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) menue(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && leiste.classList.contains("offen")) { menue(false); knopf.focus(); }
    });
    // Wer mit Tab in den Seiteninhalt springt, soll nicht unter der Leiste landen (nur bei Tab, nicht wenn ein Skript
    // den Fokus setzt – etwa die Großansicht beim Schließen)
    var perTab = false;
    document.addEventListener("keydown", function (e) { perTab = e.key === "Tab"; });
    document.addEventListener("focusin", function (e) {
      var tab = perTab; perTab = false;
      if (!tab || !sichtbar || leiste.contains(e.target) || e.target.closest("dialog")) return;
      var r = e.target.getBoundingClientRect(), h = leiste.offsetHeight;
      if (r.top < h + 8 && r.bottom > 0) window.scrollBy(0, r.top - h - 16);
    });
    window.addEventListener("scroll", lage, { passive: true });
    if (breit.addEventListener) breit.addEventListener("change", lage);
    setzen(false);
    lage();
  }

  /* ---- Pixelgenaue Bildschirmfotos bei 125 und 150 % Skalierung: Chrome legt ein Bild auf ganze CSS-Pixel. Bei 125 %
     trifft das nur jedes vierte CSS-Pixel genau ein Bildschirmpixel (bei 150 % jedes zweite), sonst wird das Foto um
     einen Bruchteil verschoben und dabei weichgezeichnet. Deshalb rückt jeder Rahmen mit [data-raster] (und das vordere
     Foto im Karussell) um höchstens 3 px, bis sein Foto auf dem Raster liegt. Bei 100 und 200 % passiert nichts. ---- */
  function raster() {
    var d = window.devicePixelRatio || 1, teiler = 0;
    for (var q = 1; q <= 4; q++) if (Math.abs(d * q - Math.round(d * q)) < 0.001) { teiler = q; break; }
    document.querySelectorAll("[data-raster], .cf-card").forEach(function (rahmen) {
      if (rahmen.style.translate) rahmen.style.translate = "";
      var bild = rahmen.querySelector("img");
      if (teiler < 2 || !bild || (rahmen.classList.contains("cf-card") && !rahmen.classList.contains("ist-vorn"))) return;
      var r = bild.getBoundingClientRect();
      if (!r.width) return;
      var x = Math.round(r.left + window.scrollX), y = Math.round(r.top + window.scrollY);
      var dx = (teiler - (x % teiler)) % teiler, dy = (teiler - (y % teiler)) % teiler;
      if (dx || dy) rahmen.style.translate = dx + "px " + dy + "px";
    });
  }
  var rasterGeplant = 0;
  function rasterBald() { cancelAnimationFrame(rasterGeplant); rasterGeplant = requestAnimationFrame(raster); }
  window.ILSRaster = rasterBald;
  window.addEventListener("load", rasterBald);
  window.addEventListener("resize", rasterBald);
  document.addEventListener("transitionend", function (e) { if (e.propertyName === "transform") rasterBald(); });   // nach dem Einblenden
  document.addEventListener("toggle", rasterBald, true);   // aufgeklappte Fahrzeuggruppe
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rasterBald);
  rasterBald();

  if (ruhig || !("IntersectionObserver" in window)) return;

  /* ---- Sanftes Einblenden: nur, was beim Laden noch unterhalb des Fensters liegt. Geprüft wird beim Scrollen
     (nicht über IntersectionObserver), damit auch nach einem Sprung – Ende-Taste, Sprungmarke – nichts unsichtbar bleibt. ---- */
  var offen = [];
  document.querySelectorAll(".section-head, .benefit, .step, .area, .feature, .weiter-karte, .designs, .vergleich").forEach(function (z) {
    if (z.getBoundingClientRect().top < window.innerHeight) return;
    z.classList.add("einblenden");
    offen.push(z);
  });
  var geplant = false;
  function einblenden() {
    geplant = false;
    // Am Seitenende kommt alles Sichtbare, auch was unterhalb der üblichen Grenze von 92 % der Fensterhöhe liegt
    var ende = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    var grenze = window.innerHeight * (ende ? 1 : 0.92);
    offen = offen.filter(function (z) {
      if (z.getBoundingClientRect().top > grenze) return true;
      z.classList.add("ist-da");
      return false;
    });
    if (!offen.length) window.removeEventListener("scroll", anstossen);
  }
  function anstossen() { if (!geplant) { geplant = true; requestAnimationFrame(einblenden); } }
  if (offen.length) { window.addEventListener("scroll", anstossen, { passive: true }); window.addEventListener("resize", anstossen); }

  /* ---- Zahlen im Gebiet zählen einmal hoch (der Endwert steht im HTML) ---- */
  var zahlen = document.querySelectorAll(".stats b");
  var io2 = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      if (!e.isIntersecting) return;
      io2.unobserve(e.target);
      var el = e.target, ziel = parseInt(el.textContent, 10), t0 = performance.now();
      if (!ziel) return;
      (function schritt(t) {
        var f = Math.min(1, (t - t0) / 1100);
        el.textContent = String(Math.round(ziel * (1 - Math.pow(1 - f, 3))));
        if (f < 1) requestAnimationFrame(schritt);
      })(t0);
    });
  }, { threshold: 0.6 });
  zahlen.forEach(function (z) { if (z.getBoundingClientRect().top >= window.innerHeight) io2.observe(z); });
})();
