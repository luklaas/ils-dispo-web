/* ILS Dispo – Großansicht für Bildschirmfotos (Startseite und Funktionen).
   Öffnet ein Foto groß über der Seite. Schließen: ×-Knopf oben rechts, Esc oder Klick auf den dunklen Bereich neben dem
   Foto. Solange sie offen ist, bleibt der Fokus darin (modales <dialog>) und die Seite scrollt nicht; danach springt der
   Fokus zurück auf das Foto, das geöffnet wurde. Ohne JavaScript öffnen die Links der Funktionsseite die Bilddatei. */
(function () {
  "use strict";
  if (typeof HTMLDialogElement !== "function") return;   // sehr alte Browser: Links öffnen weiter die Bilddatei

  var dialog = null, zu, bild, titel, text, quelle, opener = null;

  function bauen() {
    dialog = document.createElement("dialog");
    dialog.className = "grossansicht";
    dialog.setAttribute("aria-label", "Großansicht des Bildschirmfotos");
    dialog.innerHTML =
      '<button type="button" class="grossansicht-zu" aria-label="Großansicht schließen">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<figure class="grossansicht-bild"><img alt="" decoding="async"><figcaption><b></b><span></span><small></small></figcaption></figure>';
    document.body.appendChild(dialog);
    zu = dialog.querySelector(".grossansicht-zu");
    bild = dialog.querySelector("img");
    titel = dialog.querySelector("figcaption b");
    text = dialog.querySelector("figcaption span");
    quelle = dialog.querySelector("figcaption small");
    zu.addEventListener("click", schliessen);
    // Der dunkle Bereich gehört zum Dialog selbst bzw. zum Rand um das Foto
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog || e.target.classList.contains("grossansicht-bild")) schliessen();
    });
    // Esc schließt ein modales <dialog> von selbst; aufgeräumt wird in jedem Fall beim Schließen
    dialog.addEventListener("close", aufraeumen);
  }

  function oeffnen(o) {
    if (!dialog) bauen();
    if (dialog.open) return;
    opener = o.von || document.activeElement;
    bild.removeAttribute("srcset");
    bild.removeAttribute("sizes");
    // Maße vorab: Der dunkle Platz für das Foto steht schon, während es noch lädt
    if (o.breite && o.hoehe) { bild.setAttribute("width", o.breite); bild.setAttribute("height", o.hoehe); }
    else { bild.removeAttribute("width"); bild.removeAttribute("height"); }
    bild.style.width = "";
    if (o.srcset) { bild.setAttribute("sizes", "96vw"); bild.setAttribute("srcset", o.srcset); }
    bild.src = o.src;
    bild.alt = o.alt || "";
    titel.textContent = o.titel || "";
    text.textContent = o.text || "";
    quelle.textContent = "";
    if (o.quelle) quelle.appendChild(o.quelle.cloneNode(true));   // Quellenangabe, etwa zum Luftbild (mit Links)
    document.documentElement.classList.add("grossansicht-offen");
    dialog.showModal();
    einpassen();
    zu.focus();
  }

  /* Breite des Fotos aus seinen Maßen: so groß, wie es in das Fenster passt (Rand oben für den ×-Knopf, unten für die
     Unterschrift), höchstens in Originalgröße. Steht schon, bevor das Foto geladen ist. */
  function einpassen() {
    if (!dialog || !dialog.open) return;
    var bw = Number(bild.getAttribute("width")), bh = Number(bild.getAttribute("height"));
    if (!bw || !bh) { bild.style.width = ""; return; }
    var s = Math.min(1, (dialog.clientWidth - 24) / bw, (window.innerHeight - 170) / bh);
    bild.style.width = Math.max(1, Math.floor(bw * s)) + "px";
  }
  window.addEventListener("resize", einpassen);

  function schliessen() {
    if (dialog && dialog.open) dialog.close();
  }

  function aufraeumen() {
    document.documentElement.classList.remove("grossansicht-offen");
    var ziel = opener;
    opener = null;
    if (ziel && document.contains(ziel) && typeof ziel.focus === "function") ziel.focus({ preventScroll: true });
  }

  /* Größte Datei aus einem srcset (für die Großansicht) */
  function groesste(srcset, ersatz) {
    if (!srcset) return ersatz;
    var beste = ersatz, breite = 0;
    srcset.split(",").forEach(function (teil) {
      var t = teil.trim().split(/\s+/), w = parseInt(t[1], 10) || 0;
      if (t[0] && w >= breite) { breite = w; beste = t[0]; }
    });
    return beste;
  }

  window.ILSGrossansicht = { oeffnen: oeffnen, schliessen: schliessen, groesste: groesste };

  /* Funktionsseite: die Fotos (auch die Programmfenster im Monitorrahmen) sind Links auf die große Datei */
  document.querySelectorAll("a.shot-link, a.mon-link").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // neuer Tab bleibt möglich
      e.preventDefault();
      var img = a.querySelector("img");
      var figur = a.closest("figure");
      var unterschrift = figur ? figur.querySelector("figcaption") : null;
      // Unterschrift mit Titel (b) und Text (span) wie im Karussell, sonst die ganze Unterschrift als Titel
      var b = unterschrift ? unterschrift.querySelector("b") : null, s = unterschrift ? unterschrift.querySelector("span") : null;
      var q = figur ? figur.querySelector("figcaption small") : null;
      var quelle = null;
      if (q) { quelle = document.createDocumentFragment(); [].forEach.call(q.childNodes, function (n) { quelle.appendChild(n.cloneNode(true)); }); }
      oeffnen({ src: a.getAttribute("href"), srcset: img ? img.getAttribute("srcset") : "", alt: img ? img.alt : "",
        breite: img ? img.getAttribute("width") : null, hoehe: img ? img.getAttribute("height") : null,
        titel: b ? b.textContent.trim() : (unterschrift ? unterschrift.textContent.trim() : ""), text: s ? s.textContent.trim() : "",
        quelle: quelle, von: a });
    });
  });
})();
