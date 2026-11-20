// GeoGuess class edition – browser
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLORS = ["#ff4d5e", "#3d8bff", "#2ecc71", "#ff7ad9", "#ff9f1c", "#ffe14d", "#9aa3b5", "#f2f2f2", "#9b5de5", "#c98a4b", "#2ee6e6", "#b8ff3d"];
  const DEV = location.search.includes("dev");

  let ticket = (location.hash.match(/t=([^&]+)/) || [])[1];
  if (ticket) { ticket = decodeURIComponent(ticket); try { sessionStorage.setItem("geo_t", ticket); } catch {} history.replaceState(null, "", location.pathname); }
  else { try { ticket = sessionStorage.getItem("geo_t"); } catch {} }
  const fatal = (t) => { $("#fatalTxt").textContent = t; $("#fatal").classList.remove("hidden"); };
  if (!ticket) return fatal("Open GeoGuess from the Smartschool Reveal extension (Games → 🌍 GeoGuess).");

  const sock = io("/geo", { auth: { t: ticket }, transports: ["websocket", "polling"] });
  sock.on("fatal", fatal);
  let toastT; const toast = (t) => { const el = $("#toast"); el.textContent = t; el.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add("hidden"), 2500); };
  sock.on("connect_error", () => toast("Connecting…"));

  let S = null, prevKey = "";
  const tiles = () => L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" });
  const pinIcon = (c) => L.divIcon({ className: "", html: `<div class="gpin" style="background:${c}"></div>`, iconSize: [22, 22], iconAnchor: [11, 22] });
  const flagIcon = L.divIcon({ className: "", html: `<div class="flag">🚩</div>`, iconSize: [30, 30], iconAnchor: [6, 28] });

  sock.on("s", (s) => {
    S = s;
    const key = s.ph + ":" + s.round;
    const changed = key !== prevKey; prevKey = key;
    for (const v of ["vLobby", "vLoad", "vGuess", "vResult", "vFinal"]) $("#" + v).classList.add("hidden");
    const me = s.pl.find((p) => p.u === s.me);
    $("#hdr").textContent = s.ph === "lobby" ? `Class ${s.cls} · lobby` : s.ph === "final" ? `Class ${s.cls} · game over` : `Class ${s.cls} · round ${s.round}/${s.set.rounds} · ${me ? me.total : 0} pts`;
    const tm = $("#timer"); tm.classList.toggle("hidden", !(s.ph === "guess" && s.set.time < 600)); tm.textContent = s.waiting ? "⏳" : fmt(s.left); tm.classList.toggle("low", !s.waiting && s.left <= 10);
    if (s.ph === "lobby") lobbyView(s);
    else if (s.ph === "loading") $("#vLoad").classList.remove("hidden");
    else if (s.ph === "guess") guessView(s, changed, me);
    else if (s.ph === "result") resultView(s, changed);
    else if (s.ph === "final") finalView(s, changed);
  });
  const fmt = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

  /* ---------- lobby ---------- */
  const SETS = [
    ["region", "Map", [["world", "🌍 World"], ["europe", "🇪🇺 Europe"], ["belgium", "🇧🇪 Belgium"]]],
    ["rounds", "Rounds", [[3, "3"], [5, "5"], [7, "7"], [10, "10"]]],
    ["time", "Time per round", [[30, "30s"], [60, "1 min"], [90, "1:30"], [120, "2 min"], [180, "3 min"], [600, "No limit"]]],
    ["move", "Moving", [[true, "Allowed"], [false, "No move"]]],
  ];
  function lobbyView(s) {
    $("#vLobby").classList.remove("hidden");
    $("#lCls").textContent = s.cls;
    $("#lPlayers").innerHTML = s.pl.map((p) => `<span class="pl ${p.on ? "" : "off"}" style="--c:${COLORS[p.c]}"><i></i>${esc(p.n)}${p.h ? " 👑" : ""}${p.u === s.me ? " (you)" : ""}</span>`).join("");
    const sig = JSON.stringify([s.set, s.host]);
    if ($("#lSet").dataset.sig !== sig) {
      $("#lSet").dataset.sig = sig;
      $("#lSet").innerHTML = SETS.map(([k, label, opts]) => `<div class="srow"><span>${label}</span><span class="seg">${opts.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${String(s.set[k]) === String(v) ? "on" : ""}" ${s.host ? "" : "disabled"}>${t}</button>`).join("")}</span></div>`).join("");
    }
    $("#bStart").classList.toggle("hidden", !s.host);
    $("#lTop").innerHTML = s.top && s.top.length ? `<b>🏆 Class records</b>` + s.top.slice(0, 5).map((t, i) => `<div>${i + 1}. ${esc(t.n)} — best ${t.b} pts <small class="muted">(${t.w} wins, ${t.g} games)</small></div>`).join("") : "";
    $("#lHint").textContent = s.host ? "You are the host. Pick the settings and press start (you can also play alone)." : "Waiting for the host to start…";
    chat(s);
  }
  $("#lSet").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (!b || b.disabled) return; const v = b.dataset.v; sock.emit("settings", { [b.dataset.k]: v === "true" ? true : v === "false" ? false : isNaN(+v) ? v : +v }); });
  $("#bStart").addEventListener("click", () => sock.emit("start"));
  function chat(s) {
    const box = $("#chatList"), sig = s.chat.map((c) => c.id).join(); if (box.dataset.sig === sig) return; box.dataset.sig = sig;
    box.innerHTML = s.chat.map((c) => c.n ? `<div style="--c:${COLORS[c.c]}"><b>${esc(c.n)}:</b> ${esc(c.b)}</div>` : `<div class="sys">${esc(c.b)}</div>`).join("");
    box.scrollTop = box.scrollHeight;
  }
  $("#chatForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#chatIn").value.trim(); if (v) sock.emit("chat", v); $("#chatIn").value = ""; });

  /* ---------- loading cover + "I can see the photo" ---------- */
  let readyRound = 0, slowT = 0, flat = false;
  const GL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch { return false; } })();
  function cover(on) { $("#vcover").classList.toggle("hidden", !on); }
  function ready() { if (!S || S.ph !== "guess" || readyRound === S.round) return; readyRound = S.round; clearTimeout(slowT); cover(false); sock.emit("ready", S.round); }
  // flat copy of the 360° photo (no WebGL, or the viewer stays black)
  function showFlat(s, why) {
    if (!s.loc.thumb) { ready(); return toast(why || "This photo could not be loaded"); }
    flat = true;
    for (const id of ["#sphere", "#mly", "#walk", "#pano"]) $(id).classList.add("hidden");
    $("#photo").classList.remove("hidden"); $("#thumbs").innerHTML = "";
    $(".vhint").textContent = "Drag to look around · scroll to zoom";
    const im = $("#photo"); im.onload = () => { fit(); ready(); }; im.onerror = () => ready(); im.src = `/geo/thumb/${s.room}/${s.round}`;
    if (why) toast(why);
  }

  /* ---------- guessing ---------- */
  let gMap = null, gPin = null, myGuess = null, cur = 0, zoom = 1, pan = { x: 0, y: 0 }, pano = null;
  function guessView(s, changed, me) {
    $("#vGuess").classList.remove("hidden");
    if (changed) {
      myGuess = null; cur = 0;
      if (!gMap) {
        gMap = L.map("gMap", { worldCopyJump: true, zoomControl: true }).setView([30, 10], 1); tiles().addTo(gMap);
        gMap.on("click", (e) => { if (S.ph !== "guess" || done()) return; myGuess = e.latlng; if (gPin) gPin.setLatLng(e.latlng); else gPin = L.marker(e.latlng, { icon: pinIcon(COLORS[(S.pl.find((p) => p.u === S.me) || {}).c || 0]) }).addTo(gMap); $("#bGuess").disabled = false; $("#bGuess").textContent = "GUESS!"; });
      }
      if (gPin) { gPin.remove(); gPin = null; }
      const start = { world: [[30, 10], 1], europe: [[52, 12], 3], belgium: [[50.6, 4.6], 7] }[s.set.region] || [[30, 10], 1];
      gMap.setView(start[0], start[1]);
      setTimeout(() => gMap.invalidateSize(), 50);
      $("#bGuess").disabled = true; $("#bGuess").textContent = "PLACE YOUR PIN";
      $("#mly").classList.add("hidden");
      cover(true); flat = false; readyRound = 0; clearTimeout(slowT);
      slowT = setTimeout(() => { if (readyRound !== S.round && S.ph === "guess" && S.loc?.kind === "mly") showFlat(S, "The 360° viewer is slow on this computer, showing a photo instead."); }, 9000);
      if (s.loc.kind === "mly") showMly(s); else if (s.loc.kind === "sv") showPano(s); else if (s.loc.kind === "pano") showSphere(s); else showPhotos(s);
    }
    const d = done();
    if (d) { $("#bGuess").disabled = true; $("#bGuess").textContent = "✓ Waiting for the others…"; }
    $("#doneBar").innerHTML = s.pl.filter((p) => p.g).map((p) => `<span class="${p.done ? "ok" : ""}" style="--c:${COLORS[p.c]}">${esc(p.n)}</span>`).join("");
  }
  const done = () => !!(S && S.pl.find((p) => p.u === S.me)?.done);
  $("#bGuess").addEventListener("click", () => { if (myGuess) sock.emit("guess", { lat: myGuess.lat, lon: myGuess.lng }); });
  $("#bPin").addEventListener("click", () => { $("#mapBox").classList.toggle("big"); setTimeout(() => gMap && gMap.invalidateSize(), 300); });
  $("#mapBox").addEventListener("transitionend", () => gMap && gMap.invalidateSize());

  // 360° viewer (Panoramax), you can look around and walk a few steps along the street
  let sphere = null, step = 0;
  function showSphere(s) {
    $("#photo").classList.add("hidden"); $("#pano").classList.add("hidden"); $("#thumbs").innerHTML = ""; $("#sphere").classList.remove("hidden");
    $(".vhint").textContent = "Drag to look around · double-click to walk · ◀ ▶";
    step = s.loc.start; loadStep(s, "hd");
    $("#walk").classList.toggle("hidden", !(s.set.move && s.loc.n > 1));
  }
  function loadStep(s, q) {
    const url = `/geo/pano/${s.room}/${s.round}/${step}/${q}`;
    const keep = sphere ? { yaw: sphere.getYaw(), pitch: sphere.getPitch(), hfov: sphere.getHfov() } : { yaw: 0, pitch: 0, hfov: 100 };
    if (sphere) { try { sphere.destroy(); } catch {} }
    sphere = pannellum.viewer("sphere", { type: "equirectangular", panorama: url, autoLoad: true, showControls: true, showFullscreenCtrl: false, compass: false, hfov: keep.hfov, yaw: keep.yaw, pitch: keep.pitch, minHfov: 40, maxHfov: 120 });
    sphere.on("error", () => { if (q === "hd") loadStep(s, "sd"); else ready(); });
    sphere.on("load", ready);
    $("#wPos").textContent = `${step - s.loc.start >= 0 ? "+" : ""}${step - s.loc.start} steps`;
    $("#wBack").disabled = step <= 0; $("#wFwd").disabled = step >= s.loc.n - 1;
  }
  // double-click in the 360° photo: walk forwards (or back if you click behind you)
  $("#sphere").addEventListener("dblclick", (e) => {
    if (S?.loc?.kind !== "pano" || !S.set.move || !sphere) return;
    let yaw = 0; try { yaw = sphere.mouseEventToCoords(e)[1]; } catch {}
    const fwd = Math.abs(((yaw % 360) + 540) % 360 - 180) < 90;
    if (fwd && step < S.loc.n - 1) step++; else if (!fwd && step > 0) step--; else return toast("You can't go further this way");
    loadStep(S, "hd");
  });
  $("#wBack").addEventListener("click", () => { if (S?.loc?.kind === "pano" && step > 0) { step--; loadStep(S, "hd"); } });
  $("#wFwd").addEventListener("click", () => { if (S?.loc?.kind === "pano" && step < S.loc.n - 1) { step++; loadStep(S, "hd"); } });
  $("#wHome").addEventListener("click", () => { if (S?.loc?.kind === "pano") { step = S.loc.start; loadStep(S, "hd"); } });
  // Mapillary viewer: walk anywhere with the arrows, like Street View
  let mly = null;
  function showMly(s) {
    if (!GL) return showFlat(s, "Your computer can't show 360° photos, showing a flat photo instead.");
    for (const id of ["#photo", "#pano", "#sphere", "#walk"]) $(id).classList.add("hidden");
    $("#thumbs").innerHTML = ""; $("#mly").classList.remove("hidden");
    $(".vhint").textContent = s.set.move ? "Drag to look around · double-click where you want to go" : "Drag to look around · scroll to zoom";
    if (!mly) {
      // no sequence player (that one walks by itself); arrows + double-click like Street View
      mly = new mapillary.Viewer({ accessToken: s.loc.token, container: "mly", imageId: s.loc.id, component: { cover: false, bearing: false, zoom: true, sequence: false, direction: s.set.move, spatial: false, image: true, keyboard: { keyPlay: false, keySequenceNavigation: false } } });
      mly.on("dblclick", (e) => { if (S?.loc?.kind === "mly" && S.set.move) mlyWalk(e); });
      mly.on("image", (e) => { if (S?.loc?.kind === "mly" && e.image && e.image.id === S.loc.id) setTimeout(ready, 250); });
    } else {
      mly.moveTo(s.loc.id).then(() => setTimeout(ready, 250)).catch(() => showFlat(S, "This 360° photo could not be loaded, showing a flat photo instead."));
      s.set.move ? mly.activateComponent("direction") : mly.deactivateComponent("direction");
    }
    setTimeout(() => mly && mly.resize(), 100);
  }
  // double-click: walk to the nearest photo in the spot you clicked
  let walking = false;
  async function mlyWalk(e) {
    if (walking) return; walking = true;
    try {
      const [pos, bear, fov] = await Promise.all([mly.getPosition(), mly.getBearing(), mly.getFieldOfView()]);
      const cur = (await mly.getImage())?.id;
      const w = $("#mly").clientWidth || 1, px = e.pixelPoint ? e.pixelPoint[0] : w / 2;
      const dir = ((bear + (px / w - 0.5) * fov) * Math.PI) / 180;
      let dist = 18;
      if (e.lngLat) { const dx = (e.lngLat.lng - pos.lng) * 111320 * Math.cos((pos.lat * Math.PI) / 180), dy = (e.lngLat.lat - pos.lat) * 110540; dist = Math.max(6, Math.min(60, Math.hypot(dx, dy))); }
      const tl = { lat: pos.lat + (Math.cos(dir) * dist) / 110540, lng: pos.lng + (Math.sin(dir) * dist) / (111320 * Math.cos((pos.lat * Math.PI) / 180)) };
      flash(e.pixelPoint);
      for (const r of [0.00025, 0.0006]) {
        const bbox = [tl.lng - r, tl.lat - r, tl.lng + r, tl.lat + r].map((v) => v.toFixed(6)).join(",");
        const j = await (await fetch(`https://graph.mapillary.com/images?access_token=${encodeURIComponent(S.loc.token)}&fields=id,computed_geometry,geometry,is_pano&limit=60&bbox=${bbox}`)).json();
        const m = (j.data || []).filter((x) => x.id !== cur).map((x) => { const c = (x.computed_geometry || x.geometry).coordinates; return { id: x.id, d: Math.hypot((c[0] - tl.lng) * Math.cos((tl.lat * Math.PI) / 180), c[1] - tl.lat) * 111000 + (x.is_pano ? 0 : 25) }; }).sort((a, b) => a.d - b.d)[0];
        if (m) { await mly.moveTo(m.id).catch(() => {}); return; }
      }
      toast("No photos there, try another spot");
    } catch { } finally { walking = false; }
  }
  function flash(pt) {
    if (!pt) return; const d = document.createElement("div"); d.className = "walkdot"; d.style.left = pt[0] + "px"; d.style.top = pt[1] + "px";
    $("#mly").appendChild(d); setTimeout(() => d.remove(), 700);
  }
  function showPhotos(s) {
    $("#sphere").classList.add("hidden"); $("#mly").classList.add("hidden"); $("#walk").classList.add("hidden"); $(".vhint").textContent = "Scroll or pinch to zoom · drag to look around";
    $("#pano").classList.add("hidden"); $("#photo").classList.remove("hidden");
    const src = (i) => `/geo/img/${s.room}/${s.round}/${i}`;
    $("#thumbs").innerHTML = s.loc.n > 1 ? Array.from({ length: s.loc.n }, (_, i) => `<button data-i="${i}" class="${i === 0 ? "on" : ""}" style="background-image:url(${src(i)})"></button>`).join("") : "";
    loadPhoto(src(0));
  }
  $("#thumbs").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (!b) return; cur = +b.dataset.i; document.querySelectorAll("#thumbs button").forEach((x) => x.classList.toggle("on", x === b)); loadPhoto(`/geo/img/${S.room}/${S.round}/${cur}`); });
  function loadPhoto(url) {
    const im = $("#photo"); im.onload = () => { fit(); ready(); }; im.onerror = ready; im.src = url;
  }
  function fit() { const im = $("#photo"), v = $("#viewer"); zoom = Math.min(v.clientWidth / im.naturalWidth, v.clientHeight / im.naturalHeight); pan = { x: 0, y: 0 }; apply(); }
  function apply() { const im = $("#photo"); im.style.transform = `translate(${pan.x - (im.naturalWidth * zoom) / 2}px,${pan.y - (im.naturalHeight * zoom) / 2}px) scale(${zoom})`; }
  const isFlat = () => S?.loc?.kind === "photo" || flat;
  addEventListener("resize", () => { if (S?.ph === "guess" && isFlat()) fit(); });
  const viewer = $("#viewer"); let drag = null;
  viewer.addEventListener("wheel", (e) => { if (!isFlat()) return; e.preventDefault(); const k = e.deltaY < 0 ? 1.15 : 1 / 1.15; zoom = Math.min(6, Math.max(0.1, zoom * k)); pan.x *= k; pan.y *= k; apply(); }, { passive: false });
  viewer.addEventListener("pointerdown", (e) => { if (e.target.closest(".thumbs") || !isFlat()) return; drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; viewer.setPointerCapture(e.pointerId); });
  viewer.addEventListener("pointermove", (e) => { if (!drag) return; pan.x = drag.px + e.clientX - drag.x; pan.y = drag.py + e.clientY - drag.y; apply(); });
  viewer.addEventListener("pointerup", () => (drag = null));
  viewer.addEventListener("dblclick", () => { if (!isFlat()) return; zoom *= 1.8; pan.x *= 1.8; pan.y *= 1.8; apply(); });

  // optional: Google Street View (only when the server has a Google key)
  let gLoaded = null;
  function showPano(s) {
    $("#photo").classList.add("hidden"); $("#sphere").classList.add("hidden"); $("#walk").classList.add("hidden"); $("#thumbs").innerHTML = ""; $("#pano").classList.remove("hidden");
    if (!gLoaded) gLoaded = new Promise((res) => { window.__gcb = res; const sc = document.createElement("script"); sc.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(s.gkey)}&callback=__gcb`; document.head.appendChild(sc); });
    gLoaded.then(() => {
      const opt = { pano: s.loc.pano, addressControl: false, showRoadLabels: false, linksControl: !!S.set.move, clickToGo: !!S.set.move, fullscreenControl: false, motionTracking: false };
      if (!pano) pano = new google.maps.StreetViewPanorama($("#pano"), opt); else { pano.setPano(s.loc.pano); pano.setOptions(opt); } setTimeout(ready, 800);
    });
  }

  /* ---------- results ---------- */
  let rMap = null, rLayer = null, fMap = null, fLayer = null;
  function drawResult(map, layer, loc, res) {
    layer.clearLayers();
    const pts = [[loc.lat, loc.lon]];
    L.marker([loc.lat, loc.lon], { icon: flagIcon }).addTo(layer);
    for (const r of res) if (r.g) {
      L.marker([r.g.lat, r.g.lon], { icon: pinIcon(COLORS[r.c]) }).bindTooltip(esc(r.n)).addTo(layer);
      L.polyline([[r.g.lat, r.g.lon], [loc.lat, loc.lon]], { color: COLORS[r.c], weight: 3, dashArray: "6 6" }).addTo(layer);
      pts.push([r.g.lat, r.g.lon]);
    }
    map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 13 });
  }
  function resultView(s, changed) {
    $("#vResult").classList.remove("hidden");
    if (changed) {
      if (!rMap) { rMap = L.map("rMap", { worldCopyJump: true }); tiles().addTo(rMap); rLayer = L.layerGroup().addTo(rMap); }
      setTimeout(() => { rMap.invalidateSize(); drawResult(rMap, rLayer, s.last, s.last.res); }, 60);
      const mine = s.last.res.find((r) => r.u === s.me);
      $("#rTitle").textContent = mine && mine.km != null ? `${kmTxt(mine.km)} away · +${mine.pts} pts` : "No guess this round";
      $("#rList").innerHTML = s.last.res.map((r, i) => `<div class="rr" style="--c:${COLORS[r.c]}"><b>${i + 1}</b><div>${esc(r.n)}<div class="bar" style="width:${(r.pts / 50).toFixed(0)}%"></div></div><span class="km">${r.km == null ? "—" : kmTxt(r.km)}</span><span class="pts">+${r.pts}</span></div>`).join("");
      $("#rCredit").textContent = s.last.credit ? (/mapillary/.test(s.last.credit) ? "📷 360° photo: Mapillary" : /panoramax/.test(s.last.credit) ? "📷 360° photo: Panoramax (open data)" : "📷 Photo: Wikimedia Commons") : ""; if (s.last.credit) $("#rCredit").href = s.last.credit;
    }
    $("#bNext").classList.toggle("hidden", !s.host);
    $("#rNext").textContent = `Next round in ${s.left}s`;
  }
  const kmTxt = (k) => (k < 1 ? `${Math.round(k * 1000)} m` : k < 100 ? `${k.toFixed(1)} km` : `${Math.round(k).toLocaleString("en")} km`);
  $("#bNext").addEventListener("click", () => sock.emit("next"));

  function finalView(s, changed) {
    $("#vFinal").classList.remove("hidden");
    if (changed) {
      if (!fMap) { fMap = L.map("fMap", { worldCopyJump: true }); tiles().addTo(fMap); fLayer = L.layerGroup().addTo(fMap); }
      setTimeout(() => {
        fMap.invalidateSize(); fLayer.clearLayers();
        const pts = s.history.map((h) => [h.lat, h.lon]);
        pts.forEach((p, i) => L.marker(p, { icon: L.divIcon({ className: "", html: `<div class="flag">🚩</div>`, iconSize: [30, 30], iconAnchor: [6, 28] }) }).bindTooltip("Round " + (i + 1)).addTo(fLayer));
        if (pts.length) fMap.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 9 });
      }, 60);
      const ranked = s.pl.filter((p) => p.g).sort((a, b) => b.total - a.total);
      const pod = [ranked[1], ranked[0], ranked[2]];
      $("#podium").innerHTML = pod.map((p, i) => p ? `<div style="--c:${COLORS[p.c]};height:${[90, 130, 70][i]}px;animation-delay:${[0.3, 0.6, 0][i]}s">${["🥈", "🥇", "🥉"][i]}<br>${esc(p.n)}<br>${p.total}</div>` : "").join("");
      $("#fList").innerHTML = ranked.map((p, i) => `<div class="rr" style="--c:${COLORS[p.c]}"><b>${i + 1}</b><div>${esc(p.n)}</div><span></span><span class="pts">${p.total}</span></div>`).join("");
    }
    $("#bAgain").classList.toggle("hidden", !s.host); $("#bLobby").classList.toggle("hidden", !s.host);
  }
  $("#bAgain").addEventListener("click", () => sock.emit("start"));
  $("#bLobby").addEventListener("click", () => sock.emit("lobby"));
  if (DEV) window.__geo = { get S() { return S; }, guess: (lat, lon) => sock.emit("guess", { lat, lon }) };
})();
