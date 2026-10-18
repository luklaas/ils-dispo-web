/* ILS Dispo – Bildschirmfotos als Reihe zum Durchblättern.
   Ohne JavaScript bleiben die Fotos ein seitlich scrollbarer Streifen in einem Monitor. Dieses Skript baut daraus eine
   Reihe: vorn das aktuelle Foto im Monitorrahmen, links und rechts die Nachbarn kleiner, nach hinten versetzt und
   abgedunkelt (breit je zwei, sonst je eins), endlos im Kreis.
   Bedienung: mit der Maus ziehen oder mit dem Finger wischen (die Reihe folgt direkt und rastet beim Loslassen ein,
   schnelles Ziehen geht ein Foto weiter), Klick auf ein Seitenfoto holt es nach vorn, Klick auf das vordere öffnet die
   Großansicht (grossansicht.js). Dazu Pfeile, Punkte und Pfeiltasten; die Vorschaubilder in „So läuft ein Einsatz“ öffnen ihr Foto direkt groß.
   Bewegt wird nur über transform; bei „Bewegung reduzieren“ wird überblendet statt geglitten. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  var root = document.querySelector("[data-carousel]");
  if (!root) return;
  var stage = root.querySelector(".stage");
  var liste = root.querySelector(".slides");
  var slides = Array.prototype.slice.call(liste.children);
  var n = slides.length;
  var title = root.querySelector(".car-text b");
  var text = root.querySelector(".car-text span");
  var quelleZeile = root.querySelector(".car-quelle");
  var vorlage = document.getElementById("quelle-luftbild");   // Quellenangabe der Luftbilder (mit Links)
  var dots = Array.prototype.slice.call(root.querySelectorAll(".car-dots button"));
  var ruhig = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  var ZIEHEN_AB = 8;          // Pixel, ab denen eine Bewegung als Ziehen gilt (darunter ist es ein Klick)
  var SCHNELL = 0.45;         // Pixel je Millisekunde: schneller losgelassen heißt ein Foto weiter

  function mod(i) { return ((i % n) + n) % n; }
  /* Kürzester Abstand von Foto i zur Lage pos, im Kreis gerechnet: −n/2 … +n/2 */
  function abstand(i, pos) { var d = mod(i - pos); if (d >= n / 2) d -= n; return d; }

  /* ---- Reihe bauen: jedes Foto wird ein eigener Monitor (Knopf); das Bild wird verschoben, nicht kopiert ---- */
  var reihe = document.createElement("div");
  reihe.className = "cf";
  reihe.setAttribute("role", "group");
  reihe.setAttribute("aria-label", "Bildschirmfotos: Pfeiltasten blättern, Eingabetaste öffnet das vordere Foto groß");
  var karten = slides.map(function (li, i) {
    var img = li.querySelector("img");
    var k = document.createElement("button");
    k.type = "button";
    k.className = "cf-card mon";
    if (li.id) { k.id = li.id; li.removeAttribute("id"); }
    k.setAttribute("data-title", li.getAttribute("data-title") || "");
    k.setAttribute("data-text", li.getAttribute("data-text") || "");
    if (li.hasAttribute("data-quelle")) k.setAttribute("data-quelle", li.getAttribute("data-quelle"));
    k.innerHTML = '<span class="sr-only">Bild ' + (i + 1) + " von " + n + ": </span>" +
      '<span class="bezel"><span class="screen"><span class="cf-dim"></span></span></span><span class="sr-only cf-hint"></span>';
    img.draggable = false;
    // mit <picture> (Handy-Ausschnitt) wandert das ganze Bild-Element mit
    k.querySelector(".screen").insertBefore(img.closest("picture") || img, k.querySelector(".cf-dim"));
    reihe.appendChild(k);
    return k;
  });
  stage.appendChild(reihe);
  root.classList.add("cf-an");

  /* Fotos weit hinten in der Reihe erst laden, wenn sie in die Nähe kommen: Ihre Quellen werden bis dahin geparkt.
     (Alle Monitore liegen übereinander im Bild, „loading=lazy“ allein würde sie alle sofort laden.) */
  var start0 = Math.max(0, karten.findIndex(function (k) { return location.hash && "#" + k.id === location.hash; }));
  karten.forEach(function (k, i) {
    var img = k.querySelector("img"), d = Math.abs(abstand(i, start0));
    if (d <= 1 || img.complete) return;
    img.setAttribute("data-srcset", img.getAttribute("srcset") || "");
    img.setAttribute("data-src", img.getAttribute("src") || "");
    img.removeAttribute("srcset");
    img.removeAttribute("src");
    quellen(img).forEach(function (q) { q.setAttribute("data-srcset", q.getAttribute("srcset") || ""); q.removeAttribute("srcset"); });
  });
  /* <source> des Handy-Ausschnitts zu einem Bild */
  function quellen(img) { var p = img.closest("picture"); return p ? Array.prototype.slice.call(p.querySelectorAll("source")) : []; }
  /* Das vordere Foto und seine Nachbarn bekommen ihre Quellen zurück; sobald jemand blättert, auch die übernächsten */
  var bedient = false;
  function laden(mitte) {
    karten.forEach(function (k, i) {
      var img = k.querySelector("img");
      if (Math.abs(abstand(i, mitte)) > (bedient ? 2 : 1) || !img.hasAttribute("data-src")) return;
      quellen(img).forEach(function (q) { if (q.hasAttribute("data-srcset")) { q.setAttribute("srcset", q.getAttribute("data-srcset")); q.removeAttribute("data-srcset"); } });
      if (img.getAttribute("data-srcset")) img.setAttribute("srcset", img.getAttribute("data-srcset"));
      img.setAttribute("src", img.getAttribute("data-src"));
      img.removeAttribute("data-srcset");
      img.removeAttribute("data-src");
    });
  }

  var pos = 0;        // Lage der Reihe in Fotos (Kommazahl beim Ziehen und Gleiten)
  var aktuell = 0;    // vorderes Foto
  var g = {};         // Maße aus dem CSS
  var breite = 0;     // Breite eines Monitors in Pixeln

  function messen() {
    var cs = getComputedStyle(stage);
    function v(name, ersatz) { var x = parseFloat(cs.getPropertyValue(name)); return isNaN(x) ? ersatz : x; }
    g = { seiten: v("--cf-seiten", 1), x1: v("--cf-x1", 0.64), s1: v("--cf-s1", 0.72), s2: v("--cf-s2", 0.52),
          r: v("--cf-r", 16), d1: v("--cf-d1", 0.42), d2: v("--cf-d2", 0.62) };
    breite = karten[0].offsetWidth || 1;
    var halb = root.clientWidth / 2;
    // „auto“: das erste Seitenfoto rückt so weit nach außen, dass sein Außenrand knapp vor dem Fensterrand liegt
    if (cs.getPropertyValue("--cf-x1").trim() === "auto") g.x1 = Math.max(0.3, (halb - 12) / breite - g.s1 / 2);
    // Das zweite Seitenfoto ebenso
    var x2 = (halb - 12) / breite - g.s2 / 2;
    g.x2 = Math.min(Math.max(x2, g.x1 + 0.3), g.x1 + g.s1 / 2 + g.s2 / 2);
  }

  /* ---- Zeichnen: Lage, Größe, Drehung und Abdunklung jedes Monitors aus seinem Abstand zur Mitte ---- */
  function zeichnen() {
    karten.forEach(function (k, i) {
      var d = abstand(i, pos), a = Math.abs(d), s = d < 0 ? -1 : 1, x, groesse, dunkel;
      if (a <= 1) { x = g.x1 * a; groesse = 1 - (1 - g.s1) * a; dunkel = g.d1 * a; }
      else { x = g.x1 + (g.x2 - g.x1) * (a - 1); groesse = g.s1 - (g.s1 - g.s2) * Math.min(a - 1, 1); dunkel = g.d1 + (g.d2 - g.d1) * Math.min(a - 1, 1); }
      var sicht = a <= g.seiten ? 1 : Math.max(0, 1 - (a - g.seiten) / 0.5);
      // Das vordere Foto in Ruhe ganz ohne Transformation und Deckkraft-Angabe: so zeichnet der Browser es pixelgenau
      // wie ein gewöhnliches Bild (keine eigene Ebene, keine Drehung, keine Skalierung).
      var vornRuhig = d === 0;
      k.style.transform = vornRuhig ? "none" : "translateX(" + (s * x * breite).toFixed(1) + "px) rotateY(" + (-s * Math.min(a, 1) * g.r).toFixed(2) +
        "deg) scale(" + groesse.toFixed(4) + ")";
      k.style.opacity = vornRuhig ? "" : sicht.toFixed(3);
      k.style.visibility = sicht < 0.01 ? "hidden" : "visible";
      k.style.zIndex = String(100 - Math.round(a * 10));
      k.querySelector(".cf-dim").style.opacity = dunkel.toFixed(3);
    });
  }

  /* ---- Zustand für Tastatur, Screenreader und Bildunterschrift (nur wenn das vordere Foto wechselt) ---- */
  function zustand() {
    karten.forEach(function (k, i) {
      var a = Math.abs(abstand(i, aktuell)), vorn = a === 0, sichtbar = a <= g.seiten;
      k.tabIndex = sichtbar ? 0 : -1;
      k.setAttribute("aria-hidden", sichtbar ? "false" : "true");
      k.classList.toggle("ist-vorn", vorn);
      k.querySelector(".cf-hint").textContent = vorn ? " – groß öffnen" : " – nach vorn holen";
    });
    title.textContent = karten[aktuell].getAttribute("data-title");
    text.textContent = karten[aktuell].getAttribute("data-text");
    if (quelleZeile) {
      quelleZeile.textContent = "";
      var q = quelle(karten[aktuell]);
      if (q) quelleZeile.appendChild(q);
    }
    laden(aktuell);
    dots.forEach(function (d, k) { d.setAttribute("aria-current", k === aktuell ? "true" : "false"); });
  }

  /* ---- Bewegen: gleiten (requestAnimationFrame, nur transform) oder bei „Bewegung reduzieren“ überblenden ---- */
  var lauf = 0, blende = 0;
  function halt() { cancelAnimationFrame(lauf); }
  /* Einrasten: ganze Lage, Bewegungs-Ebenen wieder auflösen, damit das vordere Foto scharf steht */
  function ruhe() { pos = mod(Math.round(pos)); reihe.classList.remove("cf-bewegt"); zeichnen(); if (window.ILSRaster) window.ILSRaster(); }   // vorderes Foto aufs Pixelraster (seite.js)
  function gleiten(ziel, dauer) {
    halt();
    if (ruhig.matches) {
      clearTimeout(blende);
      reihe.classList.add("cf-blende");
      blende = setTimeout(function () { pos = ziel; ruhe(); reihe.classList.remove("cf-blende"); }, 160);
      return;
    }
    reihe.classList.add("cf-bewegt");
    var start = pos, t0 = performance.now();
    dauer = dauer || 460;
    function schritt(t) {
      var f = Math.min(1, (t - t0) / dauer), e = 1 - Math.pow(1 - f, 3);
      pos = start + (ziel - start) * e;
      zeichnen();
      if (f < 1) lauf = requestAnimationFrame(schritt); else ruhe();
    }
    lauf = requestAnimationFrame(schritt);
  }
  /* Zu Foto i (beliebige ganze Zahl, wird im Kreis gerechnet) auf dem kürzesten Weg */
  function gehe(i, dauer) {
    bedient = true;
    aktuell = mod(i);
    zustand();
    gleiten(pos + abstand(aktuell, pos), dauer);
  }

  /* ---- Ziehen und Wischen (Pointer-Events: Maus, Finger, Stift) ---- */
  var zug = null, klickSperre = false;
  reihe.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    halt();
    klickSperre = false;
    zug = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: pos, aktiv: false, spur: [{ x: e.clientX, t: e.timeStamp }] };
  });
  reihe.addEventListener("pointermove", function (e) {
    if (!zug || e.pointerId !== zug.id) return;
    var dx = e.clientX - zug.x0;
    if (!zug.aktiv) {
      if (Math.abs(dx) < ZIEHEN_AB) return;
      if (Math.abs(e.clientY - zug.y0) > Math.abs(dx)) { zug = null; return; }   // eher senkrecht: die Seite scrollt
      zug.aktiv = true;
      bedient = true;
      try { reihe.setPointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
      reihe.classList.add("cf-zieht", "cf-bewegt");
    }
    zug.spur.push({ x: e.clientX, t: e.timeStamp });
    if (zug.spur.length > 6) zug.spur.shift();
    // Je Foto mindestens knapp ein halbes Foto Weg, auch wenn die Nachbarn nah an der Mitte liegen (Tablettbreite)
    pos = zug.p0 - dx / (Math.max(g.x1, 0.45) * breite);
    zeichnen();
    var vorn = mod(Math.round(pos));
    if (vorn !== aktuell) { aktuell = vorn; zustand(); }
  });
  function loslassen(e, abgebrochen) {
    if (!zug || e.pointerId !== zug.id) return;
    var z = zug;
    zug = null;
    if (!z.aktiv) return;                       // kurzer Klick: das click-Ereignis übernimmt
    reihe.classList.remove("cf-zieht");
    // Das click-Ereignis, das der Browser direkt nach dem Loslassen schickt, gehört noch zum Ziehen
    klickSperre = true;
    setTimeout(function () { klickSperre = false; }, 0);
    var erst = z.spur[0], letzt = z.spur[z.spur.length - 1];
    var tempo = letzt.t > erst.t ? (letzt.x - erst.x) / (letzt.t - erst.t) : 0;
    var ziel = Math.round(pos), start = Math.round(z.p0);
    if (!abgebrochen && Math.abs(tempo) > SCHNELL && ziel === start) ziel = start + (tempo < 0 ? 1 : -1);
    gehe(ziel, 380);
  }
  reihe.addEventListener("pointerup", function (e) { loslassen(e, false); });
  reihe.addEventListener("pointercancel", function (e) { loslassen(e, true); });
  // Nur wenn die Reihe selbst den Zeiger verliert. Beim Finger hält der Browser ihn zuerst an der berührten Karte fest;
  // wenn die Reihe ihn übernimmt, meldet die Karte den Verlust – das ist kein Abbruch.
  reihe.addEventListener("lostpointercapture", function (e) { if (e.target === reihe && zug && zug.aktiv) loslassen(e, true); });

  /* ---- Klick (auch Eingabe/Leertaste): Seitenfoto nach vorn, vorderes Foto groß öffnen ---- */
  reihe.addEventListener("click", function (e) {
    var k = e.target.closest ? e.target.closest(".cf-card") : null;
    if (!k) return;
    if (klickSperre && e.detail !== 0) { klickSperre = false; e.preventDefault(); return; }   // Tastatur: detail 0
    var i = karten.indexOf(k);
    if (i === aktuell) gross(k); else gehe(i);
  });
  function gross(k, von) {
    var G = window.ILSGrossansicht, img = k.querySelector("img");
    if (!G || !img) return;
    // Auch ein Foto, dessen Quellen noch geparkt sind (noch nicht nachgeladen), lässt sich groß öffnen
    var srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset");
    G.oeffnen({ src: G.groesste(srcset, img.currentSrc || img.src || img.getAttribute("data-src")), srcset: srcset, alt: img.alt,
      titel: k.getAttribute("data-title"), text: k.getAttribute("data-text"), quelle: quelle(k), von: von || k,
      breite: img.getAttribute("width"), hoehe: img.getAttribute("height") });
  }
  /* Quellenangabe eines Fotos als Knoten (nur beim Luftbild), sonst null */
  function quelle(k) {
    return k.getAttribute("data-quelle") === "luftbild" && vorlage ? vorlage.content.cloneNode(true) : null;
  }

  /* ---- Tastatur: Pfeiltasten blättern, der Fokus wandert mit nach vorn ---- */
  reihe.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    gehe(aktuell + (e.key === "ArrowRight" ? 1 : -1));
    karten[aktuell].focus({ preventScroll: true });
  });

  /* ---- Pfeile, Punkte und die Vorschaubilder im Ablauf ---- */
  root.querySelectorAll(".car-btn[data-dir]").forEach(function (b) {
    b.addEventListener("click", function () { gehe(aktuell + Number(b.getAttribute("data-dir"))); });
  });
  dots.forEach(function (d, k) { d.addEventListener("click", function () { gehe(k); }); });
  /* Die Vorschaubilder im Ablauf öffnen ihr Foto direkt in der Großansicht (ohne Skript: die Bilddatei) */
  document.querySelectorAll("[data-gross]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // neuer Tab bleibt möglich
      var k = karten[Number(a.getAttribute("data-gross"))];
      if (!k || !window.ILSGrossansicht) return;
      e.preventDefault();
      gross(k, a);
    });
  });

  /* ---- Handy (auch quer): Die Bildunterschrift ist so hoch wie die längste, damit beim Blättern nichts springt. Gemessen
     an einer unsichtbaren Kopie (die echte Zeile wird vorgelesen und bleibt unberührt). Am Computer und auf dem Tablet gilt
     die feste Höhe aus dem CSS. ---- */
  var schmal = window.matchMedia ? window.matchMedia("(max-width: 760px), (max-height: 500px)") : { matches: false };
  var unterschrift = root.querySelector(".car-text");
  function unterschriftHoehe() {
    if (!unterschrift) return;
    if (!schmal.matches) { if (unterschrift.style.minHeight) unterschrift.style.minHeight = ""; return; }
    var probe = unterschrift.cloneNode(true);
    probe.removeAttribute("aria-live");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;min-height:0;width:" + unterschrift.getBoundingClientRect().width + "px";
    unterschrift.parentNode.appendChild(probe);
    var b = probe.querySelector("b"), s = probe.querySelector("span"), q = probe.querySelector(".car-quelle"), hoechste = 0;
    karten.forEach(function (k) {
      b.textContent = k.getAttribute("data-title");
      s.textContent = k.getAttribute("data-text");
      if (q) { q.textContent = ""; var z = quelle(k); if (z) q.appendChild(z); }
      hoechste = Math.max(hoechste, probe.getBoundingClientRect().height);
    });
    probe.parentNode.removeChild(probe);
    var wert = Math.ceil(hoechste) + "px";
    if (unterschrift.style.minHeight !== wert) unterschrift.style.minHeight = wert;
  }

  /* ---- Start und Größenänderungen ---- */
  var start = karten.findIndex(function (k) { return location.hash && "#" + k.id === location.hash; });
  if (start > 0) { aktuell = start; pos = start; }
  messen();
  zustand();
  zeichnen();
  unterschriftHoehe();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(unterschriftHoehe);   // Schrift ändert die Zeilenumbrüche
  var neu = function () { messen(); zustand(); zeichnen(); unterschriftHoehe(); };
  // Beobachtet wird die Bühne (ihre Breite zählt), nicht der ganze Bereich: Die Höhe der Bildunterschrift ändert die Bühne
  // nicht – so kann sie hier sofort gesetzt werden, ohne Schleife im ResizeObserver und ohne Nachrücken beim Laden.
  if (window.ResizeObserver) new ResizeObserver(neu).observe(stage); else window.addEventListener("resize", neu);
})();
