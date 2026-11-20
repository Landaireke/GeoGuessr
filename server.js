// GeoGuess class edition: standalone server. Players log in with a short ticket from the Smartschool Reveal database.
const express = require("express");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

const SECRET = process.env.AU_SECRET || "";
const PORT = process.env.PORT || 3000;
const app = express();
app.get("/health", (_q, r) => r.send("ok"));
app.get("/", (_q, r) => r.redirect("/geo/"));
const srv = http.createServer(app);
const io = new Server(srv, { cors: { origin: "*" }, pingInterval: 10000, pingTimeout: 20000, perMessageDeflate: { threshold: 256 } });

function verify(t) {
  if (!SECRET || typeof t !== "string" || !t.includes(".")) return null;
  const [body, sig] = t.split(".");
  const exp = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig || ""), b = Buffer.from(exp);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p.u || !p.c || p.exp * 1000 < Date.now()) return null;
    return p;
  } catch { return null; }
}
require("./geo")(app, io, verify);
process.on("SIGTERM", async () => { try { await (require("./geo").shutdown?.() || require("./db.js").flush()); } catch {} process.exit(0); });
srv.listen(PORT, () => console.log("GeoGuess on port " + PORT));
