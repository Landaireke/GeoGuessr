// Saves the full state of every lobby (players, host, chat, running game, scores) to Supabase,
// on shutdown (SIGTERM) and every 2 minutes when something changed, and puts it back after a restart.
const DB = require("./db.js");
const SKIP = new Set(["sock", "last", "nextLoc", "path", "_saved"]);
const toJSON = (L) => JSON.stringify(L, (k, v) => (SKIP.has(k) ? undefined : v instanceof Map ? { __map: [...v] } : v instanceof Set ? { __set: [...v] } : v));
const fromJSON = (o) => JSON.parse(JSON.stringify(o), (k, v) => (v && v.__map ? new Map(v.__map) : v && v.__set ? new Set(v.__set) : v));
// timestamps (ms) move with the time the server was asleep, so timers continue where they stopped
function shift(o, d) {
  if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === "number" && v > 1.6e12 && v < 2.2e12) o[i] = v + d; else if (v && typeof v === "object") shift(v, d); }); return; }
  if (o instanceof Map) { for (const v of o.values()) if (v && typeof v === "object") shift(v, d); return; }
  for (const [k, v] of Object.entries(o)) { if (typeof v === "number" && v > 1.6e12 && v < 2.2e12) o[k] = v + d; else if (v && typeof v === "object") shift(v, d); }
}
module.exports = function persist(game, lobbies, opts = {}) {
  const save = (L) => { const s = toJSON(L); if (s === L._saved) return null; L._saved = s; return DB.saveState(game, L.code, JSON.parse(s)); };
  const saveAll = () => Promise.all([...lobbies.values()].map(save));
  setInterval(saveAll, 120000);
  const restored = DB.loadState(game).then((rows) => {
    for (const r of rows || []) {
      if (lobbies.has(r.code)) continue;
      try {
        const L = fromJSON(r.data); shift(L, Date.now() - r.at);
        for (const p of L.players.values()) { p.sock = null; if (!p.bot) p.goneAt = Date.now() + 9 * 60000; } // 10 min to come back
        opts.revive?.(L);
        L._saved = toJSON(L); lobbies.set(r.code, L);
        console.log(`[${game}] restored lobby ${r.code} (${L.phase}, ${L.players.size} players)`);
      } catch (e) { console.warn("restore failed", r.code, e.message); }
    }
  }).catch(() => {});
  return {
    restored,
    drop: (code) => DB.dropState(game, code),
    // SIGTERM: everything to Supabase before Render stops the server
    async shutdown() { try { await saveAll(); await DB.flush(); } catch {} },
  };
};
