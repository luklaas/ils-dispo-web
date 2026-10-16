/* ILS Dispo – Vergleich zweier Bildschirmfotos mit Trennlinie (Vorher-nachher-Schieberegler).
   Ohne JavaScript stehen beide Bilder untereinander. Mit diesem Skript liegen sie übereinander: links das erste Bild
   (taktische Zeichen), rechts das zweite (Fahrzeugbilder), dazwischen eine Trennlinie zum Ziehen.
   Bedienung: mit der Maus oder dem Finger irgendwo im Bild ziehen oder tippen; mit der Tastatur über einen echten
   Schieberegler (Pfeiltasten, Bild auf/ab, Pos1/Ende). Senkrechtes Wischen scrollt weiter die Seite. */
(function () {
  "use strict";
  document.querySelectorAll("[data-vergleich]").forEach(function (fig) {
    var flaeche = fig.querySelector(".vergleich-bilder");
    var oben = fig.querySelector(".vergleich-b");
    if (!flaeche || !oben) return;

    var regler = document.createElement("input");
    regler.type = "range";
    regler.min = "0";
    regler.max = "100";
    regler.step = "1";
    regler.value = "50";
    regler.className = "vergleich-regler";
    regler.setAttribute("aria-label", fig.getAttribute("data-regler") || "Trennlinie verschieben");
    var linie = document.createElement("span");
    linie.className = "vergleich-linie";
    linie.setAttribute("aria-hidden", "true");
    linie.innerHTML = '<span class="vergleich-griff"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg></span>';
    flaeche.appendChild(regler);      // vor der Linie: ihr Fokusrahmen hängt am Regler (CSS: Regler ~ Linie)
    flaeche.appendChild(linie);
    fig.classList.add("vergleich-an");

    function setzen(prozent) {
      var p = Math.min(100, Math.max(0, prozent));
      flaeche.style.setProperty("--teil", p + "%");
      regler.value = String(Math.round(p));
      regler.setAttribute("aria-valuetext", Math.round(p) + " % taktische Zeichen, " + (100 - Math.round(p)) + " % Fahrzeugbilder");
    }
    function ausZeiger(e) {
      var r = flaeche.getBoundingClientRect();
      setzen((e.clientX - r.left) / r.width * 100);
    }
    regler.addEventListener("input", function () { setzen(Number(regler.value)); });

    /* Zeiger: Maus sofort beim Drücken; Finger erst, wenn die Bewegung eher waagerecht ist (sonst scrollt die Seite) */
    var zug = null;
    flaeche.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      zug = { id: e.pointerId, x0: e.clientX, y0: e.clientY, aktiv: e.pointerType === "mouse" };
      if (zug.aktiv) {
        e.preventDefault();
        try { flaeche.setPointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
        flaeche.classList.add("vergleich-zieht");
        ausZeiger(e);
      }
    });
    flaeche.addEventListener("pointermove", function (e) {
      if (!zug || e.pointerId !== zug.id) return;
      if (!zug.aktiv) {
        var dx = Math.abs(e.clientX - zug.x0), dy = Math.abs(e.clientY - zug.y0);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { zug = null; return; }
        zug.aktiv = true;
        try { flaeche.setPointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
        flaeche.classList.add("vergleich-zieht");
      }
      ausZeiger(e);
    });
    function ende(e, tippen) {
      if (!zug || e.pointerId !== zug.id) return;
      if (tippen && !zug.aktiv) ausZeiger(e);       // kurz getippt: die Linie springt dorthin
      zug = null;
      flaeche.classList.remove("vergleich-zieht");
    }
    flaeche.addEventListener("pointerup", function (e) { ende(e, true); });
    flaeche.addEventListener("pointercancel", function (e) { ende(e, false); });

    setzen(50);
  });
})();
