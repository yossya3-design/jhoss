// Botón "Actualizar bitácora" de la página: lee el Drive en ese momento (requiere sesión).
import { sincronizar } from "../lib/bitasync.mjs";
import { store, sesion } from "../lib/auth.mjs";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "usa POST" }, 405);
  if (!(await sesion(store(), req))) return json({ ok: false, error: "sesion" }, 401);
  try { return json(Object.assign({ ok: true }, await sincronizar())); }
  catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500); }
};
