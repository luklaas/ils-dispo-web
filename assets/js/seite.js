/* ILS Dispo – auf jeder Seite: das Menü (schwebende Kapsel, „Mehr“, Menüknopf auf dem Handy), Einblenden beim Scrollen, Zahlen zählen einmal hoch;
   auf der Startseite dazu „So läuft ein Einsatz“ als Scroll-Geschichte, die einfahrende Fahrzeugreihe und der Lichtkegel auf den Karten.
   Ohne JavaScript bleibt alles sichtbar und erreichbar (alle Einträge des Menüs stehen offen im Seitenkopf).
   Bei „Bewegung reduzieren“ wird nichts eingeblendet, nichts gezählt und nichts bewegt; im Menü gleitet keine Fläche,
   das Bild der Scroll-Geschichte wechselt ohne Überblenden. */
(function () {
  "use strict";
  var ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Kopf: schwebende Kapsel. Ohne dieses Skript stehen alle Einträge offen da (CSS). Hier: „Mehr“ klappt auf, bei engen Breiten wandern Einträge
     dorthin, eine helle Fläche gleitet zum Eintrag unter dem Zeiger, auf dem Handy öffnet der Menüknopf die Fläche mit allen Seiten. ---- */
  var kopf = document.querySelector(".site-head"), kapsel = kopf && kopf.querySelector(".kapsel");
  if (kapsel) {
    var nav = kopf.querySelector(".nav"), liste = kopf.querySelector(".nav-liste"), menue = kopf.querySelector(".menue-knopf");
    var mehr = kopf.querySelector(".nav-mehr"), mehrKnopf = kopf.querySelector(".mehr-knopf"), mehrListe = kopf.querySelector(".mehr-liste");
    var schmal = window.matchMedia("(max-width: 760px)");
    var wandernde = [].slice.call(liste.querySelectorAll("li[data-wandert]"));                  // in der Reihenfolge der Seite
    var zuerst = wandernde.slice().sort(function (x, y) { return x.getAttribute("data-wandert") - y.getAttribute("data-wandert"); });   // wer zuerst unter „Mehr“ wandert

    /* Die helle Fläche: steht auf der aktuellen Seite und gleitet zum Eintrag unter dem Zeiger oder im Fokus. Bei „Bewegung reduzieren“ gibt es sie nicht;
       dann markiert das CSS die aktuelle Seite am Eintrag selbst. */
    var flaeche = null;
    if (!ruhig) {
      flaeche = document.createElement("li");
      flaeche.className = "nav-flaeche";
      flaeche.setAttribute("aria-hidden", "true");
      liste.insertBefore(flaeche, liste.firstChild);
      liste.classList.add("mit-flaeche");
    }
    function oben(e) { return e && e.closest ? e.closest(".nav-liste > li > a, .mehr-knopf") : null; }
    function aktuell() { return liste.querySelector(':scope > li > a[aria-current="page"]') || (mehrKnopf.classList.contains("aktuell") ? mehrKnopf : null); }
    function flaecheAuf(ziel, sofort) {
      if (!flaeche) return;
      ziel = ziel || aktuell();
      if (!ziel || schmal.matches) { flaeche.style.opacity = "0"; return; }
      var r = ziel.getBoundingClientRect(), l = liste.getBoundingClientRect();
      if (sofort) flaeche.style.transition = "none";
      flaeche.style.width = r.width + "px";
      flaeche.style.transform = "translateX(" + (r.left - l.left) + "px)";
      flaeche.style.opacity = "1";
      if (sofort) { void flaeche.offsetWidth; flaeche.style.transition = ""; }
    }
    liste.addEventListener("pointerover", function (e) { var z = oben(e.target); if (z) flaecheAuf(z); });
    liste.addEventListener("pointerleave", function () { flaecheAuf(); });
    liste.addEventListener("focusin", function (e) { var z = oben(e.target); if (z) flaecheAuf(z); });
    liste.addEventListener("focusout", function () { flaecheAuf(); });

    /* „Mehr“: Knopf mit aria-expanded; Esc, ein Klick daneben oder Weitertabben schließt */
    function mehrSetzen(offen) {
      mehr.classList.toggle("offen", offen);
      mehrKnopf.setAttribute("aria-expanded", offen ? "true" : "false");
    }
    mehrKnopf.addEventListener("click", function () { mehrSetzen(!mehr.classList.contains("offen")); });
    mehr.addEventListener("focusout", function (e) { if (e.relatedTarget && !mehr.contains(e.relatedTarget)) mehrSetzen(false); });

    /* Passt die Zeile nicht, fällt erst der Untertitel der Wortmarke weg, dann wandern „Häufige Fragen“ und „System“ unter „Mehr“ */
    function ordnen() {
      wandernde.forEach(function (li) { liste.insertBefore(li, mehr); });
      kapsel.classList.remove("eng");
      if (!schmal.matches) {
        var passt = function () { return nav.scrollWidth <= nav.clientWidth + 1; };
        if (!passt()) kapsel.classList.add("eng");
        for (var i = 0; i < zuerst.length && !passt(); i++) mehrListe.insertBefore(zuerst[i], mehrListe.firstChild);
      }
      mehrKnopf.classList.toggle("aktuell", !!mehrListe.querySelector('[aria-current="page"]'));
      flaecheAuf(null, true);
    }

    /* Handy: Der Menüknopf öffnet die Fläche. Solange sie offen ist, bleibt der Fokus darin, der Rest der Seite ist stillgelegt (inert); Esc schließt und gibt den Fokus dem Knopf zurück. */
    function menueSetzen(offen) {
      kopf.classList.toggle("offen", offen);
      menue.setAttribute("aria-expanded", offen ? "true" : "false");
      [].forEach.call(document.body.children, function (k) {
        if (k === kopf || k.tagName === "SCRIPT" || k.tagName === "DIALOG") return;
        if (offen) k.setAttribute("inert", ""); else k.removeAttribute("inert");
      });
    }
    menue.addEventListener("click", function () { menueSetzen(!kopf.classList.contains("offen")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) { menueSetzen(false); mehrSetzen(false); } });
    // Tab im offenen Menü: Der Fokus läuft hier von Hand reihum durch Knopf und Einträge. Safari springt mit Tab sonst nicht auf Links,
    // und der Rest der Seite ist stillgelegt.
    kopf.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !kopf.classList.contains("offen")) return;
      var ziele = [].slice.call(kopf.querySelectorAll("a[href], button")).filter(function (x) { return x.getClientRects().length > 0; });
      var i = ziele.indexOf(document.activeElement);
      e.preventDefault();
      ziele[(i + (e.shiftKey ? -1 : 1) + ziele.length) % ziele.length].focus();
    });
    // „Mehr“ mit den Pfeiltasten: nach unten in die Liste und darin weiter, nach oben zurück
    mehr.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (!mehr.classList.contains("offen")) { if (e.key === "ArrowDown") mehrSetzen(true); else return; }
      var ziele = [mehrKnopf].concat([].slice.call(mehrListe.querySelectorAll("a")));
      var i = ziele.indexOf(document.activeElement);
      e.preventDefault();
      ziele[(i + (e.key === "ArrowDown" ? 1 : -1) + ziele.length) % ziele.length].focus();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (mehr.classList.contains("offen")) { mehrSetzen(false); mehrKnopf.focus(); }
      else if (kopf.classList.contains("offen")) { menueSetzen(false); menue.focus(); }
    });
    document.addEventListener("pointerdown", function (e) {
      if (!mehr.contains(e.target)) mehrSetzen(false);
      if (kopf.classList.contains("offen") && !kapsel.contains(e.target)) menueSetzen(false);
    });
    function gescrollt() { kopf.classList.toggle("gescrollt", window.scrollY > 8); }
    window.addEventListener("scroll", gescrollt, { passive: true });
    window.addEventListener("resize", function () { if (!schmal.matches && kopf.classList.contains("offen")) menueSetzen(false); ordnen(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ordnen);
    gescrollt();
    ordnen();
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
  // Ein nachgeladenes Bild kann alles darunter um einen Bruchteil verschieben (die Monitore der Kacheln stehen in der Höhe ihrer Datei)
  document.addEventListener("load", function (e) { if (e.target && e.target.tagName === "IMG") rasterBald(); }, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rasterBald);
  rasterBald();

  /* ---- Hörprobe: schlichter Knopf statt des Abspielers. Geladen wird erst beim ersten Klick, von selbst spielt nichts. ---- */
  document.querySelectorAll("[data-hoerprobe]").forEach(function (h) {
    var ton = h.querySelector("audio"), knopf = h.querySelector("button"), wort = knopf.querySelector("[data-wort]"), zeit = knopf.querySelector("[data-zeit]");
    var ICON = { spielen: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>', pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>' };
    var svg = knopf.querySelector("svg"), gesamt = zeit.textContent, beschriftung = knopf.getAttribute("aria-label");
    function uhr(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
    function zeigen(spielt) {
      svg.innerHTML = spielt ? ICON.pause : ICON.spielen;
      wort.textContent = spielt ? "Anhalten" : "Notruf anhören";
      knopf.setAttribute("aria-label", spielt ? "Notruf anhalten" : beschriftung);   // die Beschriftung überdeckt den sichtbaren Text, auch für Screenreader muss der Knopf wechseln
    }
    knopf.hidden = false;
    ton.removeAttribute("controls");
    h.classList.add("mit-knopf");
    knopf.addEventListener("click", function () { if (ton.paused) ton.play(); else ton.pause(); });
    ton.addEventListener("play", function () { zeigen(true); });
    ton.addEventListener("pause", function () { zeigen(false); });
    ton.addEventListener("timeupdate", function () { if (!ton.ended && ton.currentTime > 0) zeit.textContent = uhr(ton.currentTime) + " / " + gesamt; });
    ton.addEventListener("ended", function () { ton.currentTime = 0; zeit.textContent = gesamt; zeigen(false); });
  });

  /* ---- Demo-Video: großer Knopf auf dem Vorschaubild. Geladen wird erst beim Klick, von selbst spielt nichts; danach die Bedienleiste des Browsers.
     Untertitel-Knopf unter dem Video, weil Chrome die Untertitel sonst nur im Menü der Bedienleiste anbietet. ---- */
  document.querySelectorAll("[data-film]").forEach(function (f) {
    var film = f.querySelector("video"), knopf = f.querySelector(".film-start"), ut = f.querySelector(".film-ut"), spur = film.textTracks[0];
    knopf.hidden = false;
    // Am Abspielen hängt sonst nichts: Pause, Weiterspielen und Vollbild bleiben ganz beim Player. Scheitert es, zeigt das seine Leiste
    knopf.addEventListener("click", function () { var los = film.play(); if (los) los.catch(function () {}); film.focus({ preventScroll: true }); });
    film.addEventListener("play", function () { knopf.hidden = true; });
    ut.hidden = false;
    ut.addEventListener("click", function () { spur.mode = spur.mode === "hidden" || spur.mode === "disabled" ? "showing" : "hidden"; });
    film.textTracks.addEventListener("change", function () { ut.textContent = spur.mode === "showing" ? "Untertitel an" : "Untertitel aus"; });
  });

  /* ---- „So läuft ein Einsatz“ als Scroll-Geschichte (ab 1100 px): links bleibt ein Fenster stehen, sein Bild wechselt mit dem Schritt
     in der Bildschirmmitte. Schmaler, ohne Skript oder ohne IntersectionObserver steht bei jedem Schritt sein eigenes Foto. ---- */
  document.querySelectorAll("[data-ablauf]").forEach(function (a) {
    if (!("IntersectionObserver" in window)) return;
    var buehne = a.querySelector(".buehne"), link = a.querySelector(".fenster-bilder"), bilder = [].slice.call(link.querySelectorAll("img"));
    var schritte = [].slice.call(a.querySelectorAll(".phase")), titel = a.querySelector("[data-titel]"), balken = a.querySelector("[data-balken]");
    var weit = window.matchMedia("(min-width: 1100px)"), aktiv = 0;
    function zeige(i) {
      aktiv = i;
      schritte.forEach(function (s, k) { s.classList.toggle("aktiv", k === i); });
      // Vorleser hören nur das Foto des aktuellen Schritts, die anderen liegen unsichtbar darunter
      bilder.forEach(function (b, k) { b.classList.toggle("aktiv", k === i); if (k === i) b.removeAttribute("aria-hidden"); else b.setAttribute("aria-hidden", "true"); });
      titel.textContent = schritte[i].querySelector("h3").textContent;
      balken.style.width = ((i + 1) / schritte.length * 100) + "%";
      if (window.ILSGrossansicht) link.setAttribute("href", window.ILSGrossansicht.groesste(bilder[i].getAttribute("srcset"), link.getAttribute("href")));
    }
    /* Lage des stehenden Fensters: unter der kompakten Kopfzeile. Bei 125 und 150 % Skalierung so, dass das Foto auf ganzen Bildschirmpixeln
       liegt – solange es steht (Abstand zum Fensterrand) und davor (Lage in der Seite); sonst zeichnet Chrome es weich (wie raster() oben). */
    function lage() {
      link.style.translate = "";
      buehne.style.top = "";
      if (!a.classList.contains("an")) return;
      var oben = Math.round(84 + window.innerHeight * 0.03);     // unter der schwebenden Kapsel
      var d = window.devicePixelRatio || 1, teiler = 0;
      for (var q = 1; q <= 4; q++) if (Math.abs(d * q - Math.round(d * q)) < 0.001) { teiler = q; break; }
      if (teiler < 2) { buehne.style.top = oben + "px"; return; }
      var rb = buehne.getBoundingClientRect(), rl = link.getBoundingClientRect(), ra = a.getBoundingClientRect();
      var versatz = rl.top - rb.top;
      var x = Math.round(rl.left + window.scrollX), y = Math.round(ra.top + window.scrollY + versatz);
      var dx = (teiler - (x % teiler)) % teiler, dy = (teiler - (y % teiler)) % teiler;
      if (dx || dy) link.style.translate = dx + "px " + dy + "px";
      buehne.style.top = (Math.ceil((oben + versatz + dy) / teiler) * teiler - versatz - dy) + "px";
    }
    function modus() { a.classList.toggle("an", weit.matches); lage(); rasterBald(); }
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) zeige(schritte.indexOf(e.target)); });
    }, { rootMargin: "-48% 0px -48% 0px", threshold: 0 });
    schritte.forEach(function (s) { io.observe(s); });
    // Klick oder Enter auf das Fenster: das Foto des aktuellen Schritts groß (grossansicht.js); ohne die Großansicht öffnet der Link die Datei
    link.addEventListener("click", function (e) {
      if (!window.ILSGrossansicht || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      var b = bilder[aktiv];
      window.ILSGrossansicht.oeffnen({ src: link.getAttribute("href"), srcset: b.getAttribute("srcset"), alt: b.alt, breite: b.getAttribute("width"), hoehe: b.getAttribute("height"), titel: titel.textContent, von: link });
    });
    /* Lange Protokolle (mehr als sechs Zeilen) zeigen in der Scroll-Geschichte zuerst drei Zeilen, damit der Schritt ins Fenster passt;
       ein Knopf zeigt alle. Ohne Skript und in der schmalen Darstellung stehen immer alle Zeilen da (CSS). */
    schritte.forEach(function (s, nr) {
      var liste = s.querySelector(".protokoll-zeilen"), anzahl = liste ? liste.children.length : 0;
      if (anzahl <= 6) return;
      liste.id = liste.id || "protokoll-schritt-" + (nr + 1);
      var knopf = document.createElement("button");
      knopf.type = "button";
      knopf.className = "protokoll-mehr";
      knopf.setAttribute("aria-controls", liste.id);
      function setze(offen) {
        liste.classList.toggle("gekuerzt", !offen);
        knopf.setAttribute("aria-expanded", offen ? "true" : "false");
        knopf.textContent = offen ? "Weniger Zeilen zeigen" : "Alle " + anzahl + " Zeilen zeigen";
      }
      knopf.addEventListener("click", function () { setze(liste.classList.contains("gekuerzt")); });
      s.appendChild(knopf);
      setze(false);
    });
    if (weit.addEventListener) weit.addEventListener("change", modus);
    window.addEventListener("resize", lage);
    window.addEventListener("load", lage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lage);
    zeige(0);
    modus();
  });

  if (ruhig || !("IntersectionObserver" in window)) return;

  /* ---- Lichtkegel auf den Karten: folgt dem Zeiger (--mx, --my; gezeichnet wird er im CSS) ---- */
  document.querySelectorAll(".weiter-karte, .kachel").forEach(function (k) {
    k.addEventListener("pointermove", function (e) {
      var r = k.getBoundingClientRect();
      k.style.setProperty("--mx", (e.clientX - r.left) + "px");
      k.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---- Einblenden beim Scrollen: nur, was beim Laden noch unterhalb des Fensters liegt. Geprüft wird beim Scrollen
     (nicht über IntersectionObserver), damit auch nach einem Sprung – Ende-Taste, Sprungmarke – nichts unsichtbar bleibt.
     Die Fahrzeugreihe fährt von links ein (.einfahren), die Karten am Seitenende kommen nacheinander (--i). ---- */
  var offen = [];
  document.querySelectorAll(".section-head, .kachel, .kacheln + .weiter-link, .band > .wrap, .ablauf, .phase, .area, .lineup-scroll, .fleet-note, .cta-text, .weiter h2, .feature, .weiter-karte, .designs, .vergleich, .karte-gebiet, .area-grid, .fz-gruppe, .table-scroll, .two > *, .schluss, .eintrag, .tz-beispiele, .tz-status").forEach(function (z) {
    // Scroll-Geschichte: als Ganzes; ohne sie jeder Schritt für sich
    if (z.classList.contains("phase") ? !!z.closest(".ablauf.an") : (z.classList.contains("ablauf") && !z.classList.contains("an"))) return;
    if (z.getBoundingClientRect().top < window.innerHeight) return;
    if (z.classList.contains("lineup-scroll")) {
      [].forEach.call(z.querySelectorAll("figure"), function (f, i) { f.style.setProperty("--i", i); });
      z.classList.add("einfahren");
    } else {
      // Karten und Kacheln einer Reihe kommen nacheinander: Verzögerung nach der Spalte, in der sie beginnen
      if (z.classList.contains("weiter-karte")) z.style.setProperty("--i", [].indexOf.call(z.parentNode.children, z));
      if (z.classList.contains("kachel")) z.style.setProperty("--i", Math.round((z.offsetLeft / z.parentNode.clientWidth) * 3));
      z.classList.add("einblenden");
    }
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
      // Danach aufräumen: Die Klassen tragen Verzögerungen, die sonst auch beim Überfahren mit dem Zeiger gälten
      setTimeout(function () { z.classList.remove("einblenden", "einfahren", "ist-da"); }, 2600);
      return false;
    });
    if (!offen.length) window.removeEventListener("scroll", anstossen);
  }
  function anstossen() { if (!geplant) { geplant = true; requestAnimationFrame(einblenden); } }
  if (offen.length) { window.addEventListener("scroll", anstossen, { passive: true }); window.addEventListener("resize", anstossen); }

  /* ---- Zahlen im Gebiet und in der Gebiets-Kachel zählen einmal hoch (der Endwert steht im HTML) ---- */
  var zahlen = document.querySelectorAll(".stats b, .zahlenpaar b");
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
