// Tiny Supabase helper: saves settings and stats so nothing important is lost when Render restarts or sleeps.
// Every call is authorised with the shared secret (same one that signs the tickets).
const URL = (process.env.SUPABASE_URL || "https://rgrmrshyseprmrwuyokd.supabase.co").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_KEY || "sb_publishable_Z6Wae67I44G8UTI4QPxilg_kUxIu81y";
const AUTH = process.env.AU_SECRET || "";
async function rpc(name, args) {
  if (!AUTH) return null;
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_auth: AUTH, ...args }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) { console.warn("db", name, r.status, (await r.text()).slice(0, 160)); return null; }
    const t = await r.text(); return t ? JSON.parse(t) : null;
  } catch (e) { console.warn("db", name, e.message); return null; }
}
const pending = new Map();
module.exports = {
  loadSettings: (game, code) => rpc("srv_settings_get", { p_game: game, p_code: code }),
  // debounced: saves at most once every 2 s per class
  saveSettings(game, code, set) {
    clearTimeout(pending.get(game + code)?.t);
    const job = { run: () => { pending.delete(game + code); return rpc("srv_settings_set", { p_game: game, p_code: code, p_set: set }); } };
    job.t = setTimeout(job.run, 2000); pending.set(game + code, job);
  },
  addStats: (game, code, rows) => rows.length ? rpc("srv_stats_add", { p_game: game, p_code: code, p_rows: rows }) : null,
  top: (game, code) => rpc("srv_stats_top", { p_game: game, p_code: code }),
  // on shutdown: write everything that is still waiting
  flush: () => Promise.all([...pending.values()].map((j) => { clearTimeout(j.t); return j.run(); })),
};
