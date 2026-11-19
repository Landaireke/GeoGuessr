// GeoGuess: raad waar een foto genomen is. Eén lobby per klas, inloggen met hetzelfde ticket als Among Us.
// Beelden: gratis geotagde foto's van Wikimedia Commons. Optioneel Google Street View als GMAPS_KEY gezet is.
const express = require("express");
const path = require("path");
const DB = require("./db.js");

const UA = "SmartschoolRevealGeo/1.1 (https://github.com/Landaireke/GeoGuessr; school class game) node-fetch";
const GKEY = process.env.GMAPS_KEY || "";
const MLY = process.env.MAPILLARY_TOKEN || "";

/* ---------- plaatsen per regio (stad, lat, lon) ---------- */
const WORLD = [
  [51.51, -0.13], [48.86, 2.35], [52.52, 13.40], [41.90, 12.50], [40.42, -3.70], [38.72, -9.14], [52.37, 4.90], [50.85, 4.35], [59.33, 18.07], [59.91, 10.75],
  [60.17, 24.94], [55.68, 12.57], [64.15, -21.94], [53.35, -6.26], [55.95, -3.19], [48.21, 16.37], [50.08, 14.44], [47.50, 19.04], [52.23, 21.01], [44.43, 26.10],
  [42.70, 23.32], [37.98, 23.73], [41.01, 28.98], [45.81, 15.98], [43.85, 18.41], [46.95, 7.45], [45.46, 9.19], [43.77, 11.25], [40.85, 14.27], [37.39, -5.98],
  [41.39, 2.17], [43.30, 5.37], [45.76, 4.84], [53.55, 9.99], [48.14, 11.58], [54.69, 25.28], [56.95, 24.11], [59.44, 24.75], [55.76, 37.62], [50.45, 30.52],
  [40.71, -74.01], [34.05, -118.24], [41.88, -87.63], [29.76, -95.37], [25.76, -80.19], [47.61, -122.33], [37.77, -122.42], [39.74, -104.99], [36.17, -115.14], [42.36, -71.06],
  [43.65, -79.38], [45.50, -73.57], [49.28, -123.12], [19.43, -99.13], [20.97, -89.62], [14.63, -90.51], [9.93, -84.08], [23.11, -82.37], [18.47, -69.90], [4.71, -74.07],
  [-12.05, -77.04], [-0.18, -78.47], [-33.45, -70.67], [-34.60, -58.38], [-34.90, -56.16], [-22.91, -43.17], [-23.55, -46.63], [-15.79, -47.88], [-16.50, -68.15], [10.48, -66.90],
  [30.04, 31.24], [33.57, -7.59], [31.63, -8.01], [36.81, 10.18], [6.52, 3.38], [5.60, -0.19], [14.72, -17.47], [-1.29, 36.82], [-6.79, 39.21], [9.03, 38.74],
  [-33.92, 18.42], [-26.20, 28.05], [-18.91, 47.54], [-4.32, 15.31], [35.68, 139.69], [34.69, 135.50], [37.57, 126.98], [35.18, 129.08], [39.90, 116.41], [31.23, 121.47],
  [22.32, 114.17], [25.03, 121.57], [13.76, 100.50], [18.79, 98.98], [21.03, 105.85], [10.82, 106.63], [3.14, 101.69], [1.35, 103.82], [-6.21, 106.85], [-8.65, 115.22],
  [14.60, 120.98], [28.61, 77.21], [19.08, 72.88], [12.97, 77.59], [27.71, 85.32], [6.93, 79.85], [24.86, 67.01], [25.20, 55.27], [24.71, 46.68], [32.09, 34.78],
  [31.95, 35.93], [33.89, 35.50], [41.72, 44.79], [40.18, 44.51], [43.24, 76.95], [41.30, 69.24], [-33.87, 151.21], [-37.81, 144.96], [-27.47, 153.03], [-31.95, 115.86],
  [-36.85, 174.76], [-41.29, 174.78], [-43.53, 172.64], [21.31, -157.86], [61.22, -149.90], [64.84, -147.72], [35.69, 51.39], [33.31, 44.37], [47.92, 106.92], [-17.83, 31.05],
];
const EUROPE = WORLD.filter(([la, lo]) => la > 35 && la < 71 && lo > -25 && lo < 45);
const BELGIUM = [
  [50.85, 4.35], [51.22, 4.40], [51.05, 3.72], [51.21, 3.22], [50.63, 5.57], [50.88, 4.70], [51.03, 4.48], [50.47, 4.87], [50.41, 4.44], [50.45, 3.95],
  [51.32, 4.94], [50.93, 5.33], [51.17, 4.14], [50.83, 3.27], [50.98, 3.53], [50.94, 4.04], [51.19, 2.93], [51.13, 2.75], [50.71, 4.61], [50.60, 3.39],
  [50.24, 5.23], [49.68, 5.81], [50.11, 5.82], [50.49, 5.86], [50.78, 6.04], [50.94, 5.75], [51.15, 5.00], [50.66, 4.57], [51.09, 2.58], [50.85, 2.88],
  [51.03, 4.10], [50.98, 5.05], [50.73, 3.60], [51.27, 4.30], [51.10, 3.99], [50.32, 4.67], [49.91, 5.38], [50.26, 4.91], [51.06, 3.11], [50.83, 4.26],
];
const REGIONS = { world: { list: WORLD, scale: 2000, jitter: 0.25 }, europe: { list: EUROPE, scale: 700, jitter: 0.2 }, belgium: { list: BELGIUM, scale: 35, jitter: 0.06 } };

/* ---------- foto's zoeken ---------- */
const BAD = /\b(map|kaart|karte|carte|logo|flag|vlag|coat of arms|wapen|diagram|plan|chart|screenshot|signature|icon|svg|scan|document|poster|seal|stamp|text)\b/i;
async function commons(params) {
  const u = "https://commons.wikimedia.org/w/api.php?format=json&origin=*&" + new URLSearchParams(params);
  const r = await fetch(u, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
  if (!r.ok) throw new Error("commons " + r.status);
  return r.json();
}
async function photosNear(lat, lon, radius) {
  const j = await commons({ action: "query", generator: "geosearch", ggscoord: `${lat}|${lon}`, ggsradius: String(radius), ggsnamespace: "6", ggslimit: "50",
    prop: "imageinfo|coordinates", iiprop: "url|size|mime", iiurlwidth: "1600" });
  const pages = Object.values(j?.query?.pages || {});
  return pages.filter((p) => {
    const ii = p.imageinfo?.[0], c = p.coordinates?.[0];
    return ii && c && /image\/jpeg/.test(ii.mime) && ii.width >= 900 && ii.height >= 500 && ii.width / ii.height < 2.6 && !BAD.test(p.title);
  }).map((p) => ({ url: p.imageinfo[0].thumburl || p.imageinfo[0].url, lat: p.coordinates[0].lat, lon: p.coordinates[0].lon, page: p.imageinfo[0].descriptionurl }));
}
// Panoramax: free, open 360° street-level imagery (no key). We take a short run of photos from one sequence so you can walk.
const PX = "https://api.panoramax.xyz/api";
async function panoNear(lat, lon, half) {
  const bbox = [lon - half, lat - half, lon + half, lat + half].map((v) => v.toFixed(5)).join(",");
  const r = await fetch(`${PX}/search?limit=100&filter=${encodeURIComponent("field_of_view=360")}&bbox=${bbox}`, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("panoramax " + r.status);
  const feats = ((await r.json()).features || []).filter((f) => f.assets?.hd?.href && f.geometry?.coordinates);
  if (!feats.length) return null;
  const f = feats[Math.floor(Math.random() * feats.length)];
  const rank = (x) => x.properties?.["geovisio:rank_in_collection"] ?? 0;
  const seq = feats.filter((x) => x.collection === f.collection).sort((a, b) => rank(a) - rank(b) || String(a.properties.datetime).localeCompare(String(b.properties.datetime)));
  let i = seq.indexOf(f); const lo = Math.max(0, i - 7), part = seq.slice(lo, lo + 15); i = part.indexOf(f);
  return {
    kind: "pano", lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], start: i,
    steps: part.map((x) => ({ hd: x.assets.hd.href, sd: x.assets.sd?.href || x.assets.hd.href, yaw: x.properties?.["view:azimuth"] || 0 })),
    credit: `https://api.panoramax.xyz/#focus=pic&pic=${f.id}`,
  };
}
// Mapillary: 360° street-level imagery with free, unlimited walking in the viewer (needs a free client token)
// Coverage comes from Mapillary's vector tiles (zoom 14, layer "image"); the graph API is too slow for 360° filters in busy cities.
const { VectorTile } = require("@mapbox/vector-tile");
const Pbf = require("pbf");
function tileOf(lat, lon, z) {
  const n = 2 ** z, x = Math.floor(((lon + 180) / 360) * n);
  const r = (lat * Math.PI) / 180, y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return { x, y, z };
}
async function mlyNear(lat, lon) {
  const t = tileOf(lat, lon, 14);
  const r = await fetch(`https://tiles.mapillary.com/maps/vtp/mly1_public/2/${t.z}/${t.x}/${t.y}?access_token=${encodeURIComponent(MLY)}`);
  if (!r.ok) throw new Error("mapillary tiles " + r.status);
  const vt = new VectorTile(new Pbf(Buffer.from(await r.arrayBuffer())));
  const layer = vt.layers.image; if (!layer) return null;
  const panos = [];
  for (let i = 0; i < layer.length; i++) { const f = layer.feature(i); if (f.properties.is_pano) panos.push(f); }
  if (!panos.length) return null;
  const f = panos[Math.floor(Math.random() * panos.length)], g = f.toGeoJSON(t.x, t.y, t.z).geometry.coordinates;
  return { kind: "mly", id: String(f.properties.id), lat: g[1], lon: g[0], credit: `https://www.mapillary.com/app/?pKey=${f.properties.id}` };
}
async function streetView(lat, lon) {
  const u = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lon}&radius=30000&source=outdoor&key=${GKEY}`;
  const j = await (await fetch(u)).json();
  return j.status === "OK" ? { pano: j.pano_id, lat: j.location.lat, lon: j.location.lng } : null;
}
// small stock of ready locations per map, filled slowly in the background (Wikimedia asks for gentle use)
const pools = { world: [], europe: [], belgium: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let filling = false;
async function fill() {
  if (filling) return; filling = true;
  try {
    for (const reg of Object.keys(pools).sort((a, b) => pools[a].length - pools[b].length)) {
      if (pools[reg].length >= 6) continue;
      const l = await findLocation(reg, 6); if (l) pools[reg].push(l);
      await sleep(4000);
    }
  } finally { filling = false; }
}
setInterval(fill, 20000); setTimeout(fill, 3000);
async function pickLocation(region) {
  const p = pools[region] || pools.world;
  if (p.length) { setTimeout(fill, 1000); return p.shift(); }
  return findLocation(region, 6);
}
async function findLocation(region, maxTries) {
  if (process.env.GEO_MOCK === "pano") return { kind: "pano", lat: 50.85, lon: 4.35, start: 1, steps: [0, 1, 2].map(() => ({ hd: "mockpano", sd: "mockpano", yaw: 0 })), credit: "https://panoramax.xyz" };
  if (process.env.GEO_MOCK) return { kind: "photo", lat: 50.85 + Math.random(), lon: 4.35 + Math.random(), photos: ["mock", "mock"], credit: "https://commons.wikimedia.org" };
  const R = REGIONS[region] || REGIONS.world;
  for (let tries = 0; tries < maxTries; tries++) {
    if (tries) await sleep(1200 * tries);
    const base = R.list[Math.floor(Math.random() * R.list.length)];
    const lat = base[0] + (Math.random() - 0.5) * 2 * R.jitter, lon = base[1] + (Math.random() - 0.5) * 2 * R.jitter;
    try {
      if (GKEY) { const sv = await streetView(lat, lon); if (sv) return { kind: "sv", ...sv }; continue; }
      if (MLY && tries < maxTries - 1) {
        const j = R.jitter > 0.1 ? 0.04 : 0.02;
        const m = await mlyNear(base[0] + (Math.random() - 0.5) * j * 2, base[1] + (Math.random() - 0.5) * j * 2);
        if (m) return m; continue;
      }
      if (tries < maxTries - 1) { // 360° first: search around the town centre, where most street pictures are
        const j = R.jitter > 0.1 ? 0.04 : 0.02;
        const pv = await panoNear(base[0] + (Math.random() - 0.5) * j, base[1] + (Math.random() - 0.5) * j, R.jitter > 0.1 ? 0.08 : 0.04);
        if (pv) return pv; continue;
      }
      const ps = await photosNear(lat, lon, 10000);
      if (!ps.length) continue;
      const main = ps[Math.floor(Math.random() * ps.length)];
      // extra foto's uit dezelfde buurt (binnen 1,5 km) als hint
      const near = ps.filter((p) => p !== main && dist(p, main) < 1.5).sort(() => Math.random() - 0.5).slice(0, 2);
      return { kind: "photo", lat: main.lat, lon: main.lon, photos: [main, ...near].map((p) => p.url), credit: main.page };
    } catch (e) { console.warn("geo pick", e.message); if (/429/.test(e.message)) await sleep(5000); }
  }
  return null;
}
function dist(a, b) { // km
  const r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/* ---------- spel ---------- */
module.exports = function geo(app, io, verify) {
  const pub = path.join(__dirname, "public-geo");
  app.use("/geo/mapillary", express.static(path.join(__dirname, "node_modules/mapillary-js/dist"), { maxAge: "7d" }));
  app.use("/geo/pannellum", express.static(path.join(__dirname, "node_modules/pannellum/build"), { maxAge: "7d" }));
  app.use("/geo/leaflet", express.static(path.join(__dirname, "node_modules/leaflet/dist"), { maxAge: "7d" }));
  app.use("/geo", express.static(pub, { maxAge: "5m" }));
  // foto's lopen via de server, zo staat de bestandsnaam (vaak de plaatsnaam!) niet in de pagina
  const imgCache = new Map();
  app.get("/geo/img/:room/:round/:i", async (q, r) => {
    const L = [...lobbies.values()].find((x) => x.id === q.params.room), loc = L && L.loc;
    if (!loc || loc.kind !== "photo" || String(L.round) !== q.params.round) return r.sendStatus(404);
    const url = loc.photos[+q.params.i]; if (!url) return r.sendStatus(404);
    try {
      if (url === "mock") return r.sendFile("/tmp/aut/mock.jpg");
      let buf = imgCache.get(url);
      if (!buf) { const f = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } }); if (!f.ok) return r.sendStatus(502); buf = Buffer.from(await f.arrayBuffer()); imgCache.set(url, buf); if (imgCache.size > 10) imgCache.delete(imgCache.keys().next().value); }
      r.set("Content-Type", "image/jpeg").set("Cache-Control", "private, max-age=600").send(buf);
    } catch { r.sendStatus(502); }
  });
  app.get("/geo/pano/:room/:round/:i/:q", async (q, r) => {
    const L = [...lobbies.values()].find((x) => x.id === q.params.room), loc = L && L.loc;
    if (!loc || loc.kind !== "pano" || String(L.round) !== q.params.round || L.phase !== "guess") return r.sendStatus(404);
    const st = loc.steps[+q.params.i]; if (!st) return r.sendStatus(404);
    const url = q.params.q === "hd" ? st.hd : st.sd;
    if (url === "mockpano") return r.sendFile("/tmp/aut/mockpano.jpg");
    try {
      let buf = imgCache.get(url);
      if (!buf) { const f = await fetch(url, { headers: { "User-Agent": UA } }); if (!f.ok) return r.sendStatus(502); buf = Buffer.from(await f.arrayBuffer()); imgCache.set(url, buf); if (imgCache.size > 10) imgCache.delete(imgCache.keys().next().value); }
      r.set("Content-Type", "image/jpeg").set("Cache-Control", "private, max-age=600").send(buf);
    } catch { r.sendStatus(502); }
  });
  app.get("/geo/health", (_q, r) => r.json({ pools: Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, v.map((l) => l.kind + (l.steps ? ":" + l.steps.length : ""))])) }));

  const nsp = io.of("/geo");
  const lobbies = new Map();
  const now = () => Date.now();
  const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
  const DEF = { rounds: 5, time: 90, region: "world", move: true };

  function lobby(code, name) {
    let L = lobbies.get(code);
    if (!L) { L = { id: Math.random().toString(36).slice(2, 10), code, name, players: new Map(), host: null, phase: "lobby", set: { ...DEF }, round: 0, loc: null, until: 0, history: [], chat: [], seq: 0 }; lobbies.set(code, L);
      DB.loadSettings("geo", code).then((st) => { if (st && L.phase === "lobby") Object.assign(L.set, st); });
      DB.top("geo", code).then((t) => { if (t) L.top = t; }); }
    return L;
  }
  const score = (km, region) => Math.round(5000 * Math.exp(-km / (REGIONS[region] || REGIONS.world).scale));

  async function nextRound(L) {
    L.phase = "loading"; L.round++; L.loc = null; emit(L);
    const loc = await pickLocation(L.set.region);
    if (!lobbies.has(L.code)) return;
    if (!loc) { L.phase = "lobby"; L.round = 0; sys(L, "⚠️ Geen foto's gevonden, probeer opnieuw."); return emit(L); }
    L.loc = loc; L.phase = "guess"; L.until = now() + L.set.time * 1000; L.started = now();
    for (const p of L.players.values()) p.guess = null;
    emit(L);
  }
  function endRound(L) {
    const res = [];
    for (const p of L.players.values()) {
      if (!p.inGame) continue;
      const km = p.guess ? dist(p.guess, L.loc) : null, pts = p.guess ? score(km, L.set.region) : 0;
      p.total = (p.total || 0) + pts;
      res.push({ u: p.uid, n: p.name, c: p.color, g: p.guess, km: km == null ? null : Math.round(km * 10) / 10, pts, total: p.total });
    }
    res.sort((a, b) => b.pts - a.pts);
    L.last = { lat: L.loc.lat, lon: L.loc.lon, res, credit: L.loc.credit || null };
    L.history.push(L.last);
    L.phase = L.round >= L.set.rounds ? "final" : "result";
    if (L.phase === "final") {
      const ps = [...L.players.values()].filter((p) => p.inGame), best = Math.max(0, ...ps.map((p) => p.total || 0));
      DB.addStats("geo", L.code, ps.map((p) => ({ u: p.uid, n: p.name, win: (p.total || 0) === best && best > 0, pts: p.total || 0 }))).then(() => DB.top("geo", L.code)).then((t) => { if (t) { L.top = t; emit(L); } });
    } L.until = L.phase === "result" ? now() + 15000 : 0;
    emit(L);
  }
  function sys(L, b) { L.chat.push({ id: ++L.seq, n: "", b }); if (L.chat.length > 50) L.chat.shift(); }
  function view(L, me) {
    const t = now();
    return {
      ph: L.phase, cls: L.name, host: L.host === me.uid, me: me.uid, set: L.set, round: L.round, left: L.until ? Math.max(0, Math.ceil((L.until - t) / 1000)) : 0, room: L.id, gkey: L.loc && L.loc.kind === "sv" ? GKEY : null,
      loc: L.phase === "guess" && L.loc ? (L.loc.kind === "sv" ? { kind: "sv", pano: L.loc.pano } : L.loc.kind === "mly" ? { kind: "mly", id: L.loc.id, token: MLY } : L.loc.kind === "pano" ? { kind: "pano", n: L.loc.steps.length, start: L.loc.start, yaw: L.loc.steps.map((x) => x.yaw) } : { kind: "photo", n: L.loc.photos.length }) : null,
      last: L.phase === "result" || L.phase === "final" ? L.last : null, history: L.phase === "final" ? L.history.map((h) => ({ lat: h.lat, lon: h.lon })) : null,
      pl: [...L.players.values()].map((p) => ({ u: p.uid, n: p.name, c: p.color, h: p.uid === L.host, g: p.inGame, done: !!p.guess, total: p.total || 0, on: !!p.sock })),
      chat: L.chat.slice(-30), top: L.top || [],
    };
  }
  function emit(L) { for (const p of L.players.values()) { if (!p.sock) continue; const v = JSON.stringify(view(L, p)); if (v !== p.last) { p.last = v; p.sock.emit("s", JSON.parse(v)); } } }
  const COLORS = 12;

  setInterval(() => {
    for (const L of lobbies.values()) {
      for (const p of L.players.values()) if (!p.sock && now() - p.goneAt > 60000) L.players.delete(p.uid);
      if (!L.players.size) { lobbies.delete(L.code); continue; }
      if (!L.players.has(L.host)) L.host = L.players.keys().next().value;
      const inG = [...L.players.values()].filter((p) => p.inGame);
      if (L.phase === "guess" && (now() >= L.until || (inG.length && inG.every((p) => p.guess)))) endRound(L);
      else if (L.phase === "result" && now() >= L.until) nextRound(L);
      else emit(L);
    }
  }, 1000);

  nsp.on("connection", (sock) => {
    const tk = verify(sock.handshake.auth?.t);
    if (!tk) { sock.emit("fatal", "Your ticket is invalid or expired. Open the game again from the extension."); return sock.disconnect(true); }
    const L = lobby(tk.c, clean(tk.cn || tk.c, 40));
    let p = L.players.get(tk.u);
    if (p) { if (p.sock && p.sock !== sock) { p.sock.emit("fatal", "You are already playing in another window."); p.sock.disconnect(true); } }
    else {
      const used = new Set([...L.players.values()].map((q) => q.color));
      let c = 0; while (used.has(c) && c < COLORS - 1) c++;
      p = { uid: tk.u, name: clean(tk.n, 20) || "Player", color: c, total: 0, inGame: L.phase === "lobby" || L.phase === "final" };
      L.players.set(p.uid, p); if (!L.host) L.host = p.uid;
      sys(L, `${p.name} joined.`);
    }
    p.sock = sock; p.goneAt = 0; emit(L);
    sock.on("settings", (d) => {
      if (L.host !== p.uid || (L.phase !== "lobby" && L.phase !== "final") || !d) return;
      if ([3, 5, 7, 10].includes(d.rounds)) L.set.rounds = d.rounds;
      if ([30, 60, 90, 120, 180, 0].includes(d.time)) L.set.time = d.time || 600;
      if (REGIONS[d.region]) L.set.region = d.region;
      if (typeof d.move === "boolean") L.set.move = d.move;
      DB.saveSettings("geo", L.code, L.set);
      emit(L);
    });
    sock.on("start", () => {
      if (L.host !== p.uid || (L.phase !== "lobby" && L.phase !== "final")) return;
      L.round = 0; L.history = []; for (const q of L.players.values()) { q.total = 0; q.inGame = true; q.guess = null; }
      sys(L, "🌍 New game started!"); nextRound(L);
    });
    sock.on("next", () => { if (L.host === p.uid && L.phase === "result") nextRound(L); });
    sock.on("lobby", () => { if (L.host === p.uid && L.phase === "final") { L.phase = "lobby"; emit(L); } });
    sock.on("guess", (g) => {
      if (L.phase !== "guess" || !p.inGame || p.guess || !g) return;
      const lat = +g.lat, lon = +g.lon;
      if (!(lat >= -90 && lat <= 90 && lon >= -540 && lon <= 540)) return;
      p.guess = { lat, lon: ((lon + 540) % 360) - 180 }; emit(L);
    });
    sock.on("chat", (b) => { b = clean(b, 140); if (!b) return; L.chat.push({ id: ++L.seq, n: p.name, c: p.color, b }); if (L.chat.length > 50) L.chat.shift(); emit(L); });
    sock.on("disconnect", () => { if (p.sock === sock) { p.sock = null; p.goneAt = now(); emit(L); } });
  });
};
