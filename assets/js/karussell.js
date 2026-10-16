/* ILS Dispo – Bildschirmfotos zum Blättern.
   Ohne JavaScript lassen sich die Bilder trotzdem wischen bzw. seitlich scrollen;
   dieses Skript ergänzt Vor/Zurück, Punkte, Bildunterschrift, Tastatur und die beiden Seitenmonitore. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  var root = document.querySelector("[data-carousel]");
  if (!root) return;

  var track = root.querySelector(".slides");
  var slides = Array.prototype.slice.call(track.children);
  var n = slides.length;
  var title = root.querySelector(".car-text b");
  var text = root.querySelector(".car-text span");
  var dots = Array.prototype.slice.call(root.querySelectorAll(".car-dots button"));
  var peekPrev = root.querySelector(".peek-prev img");
  var peekNext = root.querySelector(".peek-next img");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = 0;
  var timer = null;

  function peekSrc(i) {
    var img = slides[i].querySelector("img");
    return img.getAttribute("data-peek") || img.currentSrc || img.src;
  }

  function show(i) {
    current = i;
    var s = slides[i];
    title.textContent = s.getAttribute("data-title");
    text.textContent = s.getAttribute("data-text");
    dots.forEach(function (d, k) { d.setAttribute("aria-current", k === i ? "true" : "false"); });
    slides.forEach(function (sl, k) { sl.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    if (peekPrev) peekPrev.src = peekSrc((i - 1 + n) % n);
    if (peekNext) peekNext.src = peekSrc((i + 1) % n);
  }

  function go(i) {
    i = (i + n) % n;
    track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
    show(i);
  }

  /* Nach dem Wischen: das Bild übernehmen, auf dem die Ansicht stehen geblieben ist */
  track.addEventListener("scroll", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var i = Math.round(track.scrollLeft / track.clientWidth);
      if (i >= 0 && i < n && i !== current) show(i);
    }, 90);
  }, { passive: true });

  root.querySelectorAll("[data-dir]").forEach(function (el) {
    el.addEventListener("click", function () { go(current + Number(el.getAttribute("data-dir"))); });
  });
  dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); }); });

  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
  });

  /* Die Vorschaubilder im Ablauf springen zum passenden Bildschirmfoto */
  document.querySelectorAll("[data-slide]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      go(Number(a.getAttribute("data-slide")));
      root.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  });

  window.addEventListener("resize", function () { track.scrollLeft = current * track.clientWidth; });

  show(0);
})();
