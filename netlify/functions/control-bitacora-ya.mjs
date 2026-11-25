// Botón "Actualizar bitácora" de la página: lee el Drive en ese momento.
import { sincronizar } from "../lib/bitasync.mjs";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "usa POST" }, 405);
  try { return json(Object.assign({ ok: true }, await sincronizar())); }
  catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500); }
};
