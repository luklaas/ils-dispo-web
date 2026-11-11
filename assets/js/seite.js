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

  /* ---- Häufige Fragen: Suchfeld und Themen über den aufklappbaren Fragen. Beides entsteht erst hier – ohne Skript stehen nur die Fragen da. ---- */
  document.querySelectorAll("[data-fragen]").forEach(function (f) {
    var fragen = [].slice.call(f.querySelectorAll(".frage"));
    if (!fragen.length) return;
    var themen = [];
    fragen.forEach(function (d) { var t = d.getAttribute("data-thema"); if (t && themen.indexOf(t) < 0) themen.push(t); });
    var leiste = document.createElement("div");
    leiste.className = "such-leiste";
    leiste.innerHTML = '<label class="such-feld"><span class="sr-only">Fragen durchsuchen</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>' +
      '<input type="search" placeholder="Fragen durchsuchen" autocomplete="off" spellcheck="false"></label>' +
      '<div class="fragen-themen" role="group" aria-label="Thema"></div><p class="such-zahl" role="status"></p>';
    var feld = leiste.querySelector("input"), gruppe = leiste.querySelector(".fragen-themen"), zahl = leiste.querySelector(".such-zahl");
    var leer = document.createElement("p");
    leer.className = "such-leer";
    leer.hidden = true;
    leer.innerHTML = '<span>Keine Frage passt dazu.</span><button type="button">Alle Fragen zeigen</button>';
    var thema = "", vonSelbstOffen = [];
    function knopf(name, wert) {
      var k = document.createElement("button");
      k.type = "button";
      k.textContent = name;
      k.setAttribute("aria-pressed", wert === thema ? "true" : "false");
      k.addEventListener("click", function () {
        thema = wert;
        [].forEach.call(gruppe.children, function (b) { b.setAttribute("aria-pressed", b === k ? "true" : "false"); });
        filtern();
      });
      gruppe.appendChild(k);
    }
    knopf("Alle", "");
    themen.forEach(function (t) { knopf(t, t); });
    function schlicht(s) { return s.toLowerCase().replace(/\s+/g, " ").trim(); }
    function filtern() {
      var wort = schlicht(feld.value), treffer = [];
      fragen.forEach(function (d) {
        var passt = (!thema || d.getAttribute("data-thema") === thema) && (!wort || schlicht(d.textContent).indexOf(wort) >= 0);
        d.hidden = !passt;
        if (passt) treffer.push(d);
      });
      // Bei wenigen Treffern einer Suche klappen die Antworten auf (das Wort steht oft erst dort); ohne Suche klappen sie wieder zu
      vonSelbstOffen.forEach(function (d) { d.open = false; });
      vonSelbstOffen = [];
      if (wort && treffer.length <= 3) treffer.forEach(function (d) { if (!d.open) { d.open = true; vonSelbstOffen.push(d); } });
      zahl.textContent = treffer.length === fragen.length ? fragen.length + " Fragen" : treffer.length + " von " + fragen.length + " Fragen";
      leer.hidden = treffer.length > 0;
    }
    feld.addEventListener("input", filtern);
    leer.querySelector("button").addEventListener("click", function () { feld.value = ""; gruppe.firstChild.click(); feld.focus(); });
    f.insertBefore(leiste, f.firstChild);
    f.appendChild(leer);
    filtern();
  });

  /* ---- Gebiet und Wachen: Karte zum Anfassen. Die Namen stehen an den Punkten (data-wache, werkzeuge/standortkarte.py). Ein Tipp
     wählt den nächsten sichtbaren Punkt im Umkreis; dieselbe Auswahl gibt es als Liste (für Tastatur und Vorleser). Die Legende
     wird zum Filter. ---- */
  document.querySelectorAll("[data-standortkarte]").forEach(function (k) {
    var svg = k.querySelector("svg"), legende = k.querySelector(".legend");
    var punkte = [].slice.call(svg.querySelectorAll("circle[data-wache]"));
    if (!punkte.length || !legende) return;
    var arten = {}, aus = {}, gewaehlt = null;
    [].forEach.call(legende.querySelectorAll("li[data-art]"), function (li) {
      var art = li.getAttribute("data-art"), knopf = document.createElement("button");
      arten[art] = { name: li.querySelector("span").textContent, farbe: li.querySelector("i").style.backgroundColor };
      knopf.type = "button";
      knopf.setAttribute("aria-pressed", "true");
      while (li.firstChild) knopf.appendChild(li.firstChild);
      li.appendChild(knopf);
      knopf.addEventListener("click", function () { setze(art, !!aus[art]); });
      arten[art].knopf = knopf;
    });
    legende.removeAttribute("aria-hidden");
    legende.setAttribute("role", "group");
    legende.setAttribute("aria-label", "Standorte zeigen");
    var ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("class", "wache-ring");
    ring.setAttribute("r", "10");
    ring.style.display = "none";
    svg.appendChild(ring);
    var feld = document.createElement("div");
    feld.className = "wache-feld";
    feld.innerHTML = '<p class="wache-info" role="status"></p><label class="wache-wahl"><span class="sr-only">Wache wählen</span><select><option value="">Wache wählen …</option></select></label>';
    var info = feld.querySelector(".wache-info"), wahl = feld.querySelector("select");
    Object.keys(arten).forEach(function (art) {
      var gruppe = document.createElement("optgroup");
      gruppe.label = arten[art].name;
      punkte.map(function (p, i) { return { i: i, name: p.getAttribute("data-wache"), art: p.getAttribute("data-art") }; })
        .filter(function (w) { return w.art === art; })
        .sort(function (a, b) { return a.name.localeCompare(b.name, "de"); })
        .forEach(function (w) { var o = document.createElement("option"); o.value = w.i; o.textContent = w.name; gruppe.appendChild(o); });
      wahl.appendChild(gruppe);
    });
    function zeige(p) {
      gewaehlt = p;
      info.textContent = "";
      if (!p) {
        ring.style.display = "none";
        info.textContent = "Tippe auf einen Punkt der Karte oder wähle eine Wache.";
        wahl.value = "";
        return;
      }
      var art = arten[p.getAttribute("data-art")], name = document.createElement("b"), zeile = document.createElement("span"), punkt = document.createElement("i");
      name.textContent = p.getAttribute("data-wache");
      punkt.style.backgroundColor = art.farbe;
      zeile.appendChild(punkt);
      zeile.appendChild(document.createTextNode(art.name));
      info.appendChild(name);
      info.appendChild(zeile);
      ring.setAttribute("cx", p.getAttribute("cx"));
      ring.setAttribute("cy", p.getAttribute("cy"));
      ring.style.display = "";
      wahl.value = String(punkte.indexOf(p));
    }
    function setze(art, an) {
      aus[art] = !an;
      svg.classList.toggle("ohne-" + art, !an);
      arten[art].knopf.setAttribute("aria-pressed", an ? "true" : "false");
      if (!an && gewaehlt && gewaehlt.getAttribute("data-art") === art) zeige(null);
    }
    svg.addEventListener("click", function (e) {
      // Die Karte ist gestreckt (preserveAspectRatio none): Lage der Punkte aus dem Rahmen und der viewBox
      var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, beste = null, weit = e.pointerType === "mouse" ? 14 : 26;
      punkte.forEach(function (p) {
        if (aus[p.getAttribute("data-art")]) return;
        var x = r.left + (p.cx.baseVal.value - vb.x) * r.width / vb.width, y = r.top + (p.cy.baseVal.value - vb.y) * r.height / vb.height;
        var d = Math.hypot(x - e.clientX, y - e.clientY);
        if (d <= weit && (!beste || d < beste.d)) beste = { d: d, p: p };
      });
      if (beste) zeige(beste.p);
    });
    wahl.addEventListener("change", function () {
      var p = wahl.value === "" ? null : punkte[Number(wahl.value)];
      if (p && aus[p.getAttribute("data-art")]) setze(p.getAttribute("data-art"), true);
      zeige(p);
    });
    legende.parentNode.insertBefore(feld, legende);   // neben der Karte (PC) bzw. gleich darunter (Handy), vor der Legende
    k.classList.add("karte-an");
    zeige(null);
  });

  /* ---- Fahrzeugkatalog: Suchfeld über alle Typen. Gruppen mit Treffern klappen auf, Gruppen ohne Treffer verschwinden. ---- */
  document.querySelectorAll("[data-katalogsuche]").forEach(function (kat) {
    var gruppen = [].slice.call(kat.querySelectorAll(".fz-gruppe")), karten = [].slice.call(kat.querySelectorAll(".fz"));
    if (!karten.length) return;
    function schlicht(s) { return s.toLowerCase().replace(/\u00ad/g, "").replace(/\s+/g, " ").trim(); }
    var texte = karten.map(function (li) { var n = li.querySelector(".fz-name"); return schlicht((n.querySelector("b") || n).textContent + " " + (n.querySelector("span") ? n.querySelector("span").textContent : "")); });
    var leiste = document.createElement("div");
    leiste.className = "such-leiste";
    leiste.innerHTML = '<label class="such-feld"><span class="sr-only">Fahrzeugtyp suchen</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>' +
      '<input type="search" placeholder="Fahrzeugtyp suchen, etwa HLF oder Drehleiter" autocomplete="off" spellcheck="false"></label><p class="such-zahl" role="status"></p>';
    var feld = leiste.querySelector("input"), zahl = leiste.querySelector(".such-zahl");
    var leer = document.createElement("p");
    leer.className = "such-leer";
    leer.hidden = true;
    leer.innerHTML = '<span>Kein Fahrzeugtyp passt dazu.</span><button type="button">Alle Fahrzeugtypen zeigen</button>';
    var vonSelbstOffen = [];
    function filtern() {
      var wort = schlicht(feld.value), treffer = 0;
      karten.forEach(function (li, i) { var passt = !wort || texte[i].indexOf(wort) >= 0; li.hidden = !passt; if (passt) treffer++; });
      vonSelbstOffen.forEach(function (g) { g.open = false; });
      vonSelbstOffen = [];
      gruppen.forEach(function (g) {
        var hat = [].some.call(g.querySelectorAll(".fz"), function (li) { return !li.hidden; });
        g.hidden = !hat;
        if (wort && hat && !g.open) { g.open = true; vonSelbstOffen.push(g); }
      });
      zahl.textContent = treffer === karten.length ? karten.length + " Fahrzeugtypen" : treffer + " von " + karten.length + " Fahrzeugtypen";
      leer.hidden = treffer > 0;
    }
    feld.addEventListener("input", filtern);
    leer.querySelector("button").addEventListener("click", function () { feld.value = ""; filtern(); feld.focus(); });
    kat.insertBefore(leiste, kat.firstChild);
    kat.appendChild(leer);
    filtern();
  });

  /* ---- Funktionen: Themen der Seite. Markiert das Thema, das gerade oben im Fenster steht; die Leiste am Rand (ab 1100 px, CSS)
     ist nur zu sehen, solange die Themen im Fenster sind. ---- */
  document.querySelectorAll("[data-themen]").forEach(function (nav) {
    var links = [].slice.call(nav.querySelectorAll("a")), dran = false;
    var ziele = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var bereich = nav.parentNode.querySelector(".features") || nav.parentNode;
    if (ziele.indexOf(null) >= 0) return;
    function stand() {
      dran = false;
      var grenze = window.innerHeight * 0.35, aktuell = -1, oben = null;
      ziele.forEach(function (z, i) {
        var t = z.getBoundingClientRect().top;
        if (t <= grenze && (aktuell < 0 || t > oben + 1)) { aktuell = i; oben = t; }   // zwei Themen nebeneinander: das linke gilt
      });
      links.forEach(function (a, i) { if (i === aktuell) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      var r = bereich.getBoundingClientRect();
      nav.classList.toggle("sichtbar", r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4);
    }
    function bald() { if (!dran) { dran = true; requestAnimationFrame(stand); } }
    window.addEventListener("scroll", bald, { passive: true });
    window.addEventListener("resize", bald);
    stand();
  });

  /* ---- Taktische Zeichen: ein Zeichen zum Ausprobieren. Die vier Erklärungen stehen im HTML; hier werden sie zu einer Auswahl,
     und am Zeichen sitzen vier Punkte zum Antippen. ---- */
  document.querySelectorAll("[data-zeichenprobe]").forEach(function (probe) {
    var rahmen = probe.querySelector(".tzp-rahmen"), svg = rahmen && rahmen.querySelector("svg"), teile = [].slice.call(probe.querySelectorAll(".tzp-teile > div"));
    if (!svg || teile.length !== 4) return;
    // Teile des Zeichens: Grundform (Fläche und Räder), Schrift, Statuspunkt mit Ziffer
    var kinder = [].slice.call(svg.children), nachStatus = false;
    kinder.forEach(function (e) {
      var istStatus = e.tagName === "circle" && parseFloat(e.getAttribute("r")) > 6;
      if (istStatus) nachStatus = true;
      e.setAttribute("data-t", nachStatus ? "status" : (e.tagName === "text" ? "kuerzel" : "form"));
    });
    // Die Bühne ist 420 × 320 Einheiten groß, das Zeichen (64 × 56) steht darin bei 15 % von links und 30 Einheiten von oben in 70 % Breite. Je Teil: wo der
    // Punkt neben dem Zeichen sitzt und wohin seine Linie zeigt (in Einheiten des Zeichens: Rad, Ende der Schrift, Fläche, Statuspunkt)
    var B = 420, H = 320, X0 = 0.15 * B, Y0 = 30, M = 0.7 * B / 64;
    var ORTE = { form: { punkt: [32, 284], ziel: [14, 48] }, kuerzel: { punkt: [388, 178], ziel: [45, 27] }, farbe: { punkt: [32, 150], ziel: [11, 33] }, status: { punkt: [388, 40], ziel: [61.5, 6] } };
    var NS = "http://www.w3.org/2000/svg", linien = document.createElementNS(NS, "svg");
    linien.setAttribute("class", "tzp-linien");
    linien.setAttribute("viewBox", "0 0 " + B + " " + H);
    linien.setAttribute("aria-hidden", "true");
    rahmen.appendChild(linien);
    var knoepfe = [], punkte = [];
    var hinweis = document.createElement("p");
    hinweis.className = "tzp-hinweis";
    hinweis.textContent = "Tippe auf einen Teil des Zeichens.";
    probe.insertBefore(hinweis, probe.querySelector(".tzp-flaeche"));
    function zeige(i) {
      rahmen.setAttribute("data-zeigt", teile[i].getAttribute("data-teil"));
      teile.forEach(function (t, k) {
        t.querySelector("dd").hidden = k !== i;
        knoepfe[k].setAttribute("aria-expanded", k === i ? "true" : "false");
        punkte[k].setAttribute("aria-pressed", k === i ? "true" : "false");
        linien.children[k].setAttribute("class", k === i ? "gewaehlt" : "");
      });
    }
    teile.forEach(function (t, i) {
      var dt = t.querySelector("dt"), dd = t.querySelector("dd"), name = dt.textContent, knopf = document.createElement("button"), nr = document.createElement("span");
      dd.id = dd.id || "tzp-teil-" + (i + 1);
      knopf.type = "button";
      knopf.setAttribute("aria-controls", dd.id);
      nr.className = "tzp-nr";
      nr.setAttribute("aria-hidden", "true");
      nr.textContent = i + 1;
      knopf.appendChild(nr);
      knopf.appendChild(document.createTextNode(name));
      dt.textContent = "";
      dt.appendChild(knopf);
      knopf.addEventListener("click", function () { zeige(i); });
      knoepfe.push(knopf);
      var punkt = document.createElement("button"), ort = ORTE[t.getAttribute("data-teil")];
      var zx = X0 + ort.ziel[0] * M, zy = Y0 + ort.ziel[1] * M, weg = Math.hypot(zx - ort.punkt[0], zy - ort.punkt[1]);
      var gruppe = document.createElementNS(NS, "g"), linie = document.createElementNS(NS, "line"), ende = document.createElementNS(NS, "circle");
      // die Linie beginnt am Rand des Punkts (Halbmesser 15 Einheiten) und endet mit einem kleinen Kreis am Teil des Zeichens
      linie.setAttribute("x1", ort.punkt[0] + (zx - ort.punkt[0]) * 15 / weg);
      linie.setAttribute("y1", ort.punkt[1] + (zy - ort.punkt[1]) * 15 / weg);
      linie.setAttribute("x2", zx);
      linie.setAttribute("y2", zy);
      ende.setAttribute("cx", zx);
      ende.setAttribute("cy", zy);
      ende.setAttribute("r", "3.2");
      gruppe.appendChild(linie);
      gruppe.appendChild(ende);
      linien.appendChild(gruppe);
      punkt.type = "button";
      punkt.className = "tzp-punkt";
      punkt.setAttribute("aria-label", name);
      punkt.textContent = i + 1;
      punkt.style.left = (ort.punkt[0] / B * 100) + "%";
      punkt.style.top = (ort.punkt[1] / H * 100) + "%";
      punkt.addEventListener("click", function () { zeige(i); });
      rahmen.appendChild(punkt);
      punkte.push(punkt);
    });
    probe.classList.add("tzp-an");
    zeige(0);
  });

  if (ruhig || !("IntersectionObserver" in window)) return;

  /* ---- Entwicklung: Die Linie der Zeitleiste füllt sich beim Scrollen bis zur Fenstermitte; erreichte Einträge leuchten auf ---- */
  document.querySelectorAll("[data-zeitleiste]").forEach(function (z) {
    var punkte = [].slice.call(z.children), dran = false;
    z.classList.add("an");
    function fuellen() {
      dran = false;
      var r = z.getBoundingClientRect(), stand = Math.max(0, Math.min(r.height - 20, window.innerHeight * 0.6 - r.top - 10));
      // am Seitenende ist die Linie voll, auch wenn die Liste kürzer ist als das Fenster
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) stand = r.height - 20;
      z.style.setProperty("--fuell", stand + "px");
      punkte.forEach(function (li) { li.classList.toggle("erreicht", li.getBoundingClientRect().top - r.top + 21 <= stand + 10); });
    }
    function bald() { if (!dran) { dran = true; requestAnimationFrame(fuellen); } }
    window.addEventListener("scroll", bald, { passive: true });
    window.addEventListener("resize", bald);
    fuellen();
  });


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
  document.querySelectorAll(".section-head, .kachel, .kacheln + .weiter-link, .band > .wrap, .ablauf, .phase, .area, .lineup-scroll, .fleet-note, .cta-text, .weiter h2, .feature, .weiter-karte, .designs, .vergleich, .karte-gebiet, .area-grid, .fz-gruppe, .table-scroll, .two > *, .schluss, .eintrag, .tz-beispiele, .tz-status, .such-leiste, .frage, .stand-leiste, .plan-kacheln li, .sys-note, .zeitleiste > li").forEach(function (z) {
    // Scroll-Geschichte: als Ganzes; ohne sie jeder Schritt für sich
    if (z.classList.contains("phase") ? !!z.closest(".ablauf.an") : (z.classList.contains("ablauf") && !z.classList.contains("an"))) return;
    if (z.classList.contains("eintrag") && z.closest(".zeitleiste")) return;   // Zeitleiste: der ganze Listenpunkt blendet ein (mit Datum und Punkt)
    if (z.getBoundingClientRect().top < window.innerHeight) return;
    if (z.classList.contains("lineup-scroll")) {
      [].forEach.call(z.querySelectorAll("figure"), function (f, i) { f.style.setProperty("--i", i); });
      z.classList.add("einfahren");
    } else {
      // Karten und Kacheln einer Reihe kommen nacheinander: Verzögerung nach der Spalte, in der sie beginnen
      if (z.classList.contains("weiter-karte")) z.style.setProperty("--i", [].indexOf.call(z.parentNode.children, z));
      if (z.classList.contains("kachel")) z.style.setProperty("--i", Math.round((z.offsetLeft / z.parentNode.clientWidth) * 3));
      if (z.classList.contains("frage") || z.parentNode.classList.contains("plan-kacheln")) z.style.setProperty("--i", [].indexOf.call(z.parentNode.children, z) % 6);
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
