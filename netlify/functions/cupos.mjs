// Paletas que cada empresario pidió (autorizadas) por día. Ver: público. Guardar: solo administrador.
import { store } from "../../src/source.mjs";
import { isAdmin, json } from "../../src/auth.mjs";

const KEY = "cupos.json";
const load = async () => (await store().get(KEY, { type: "json" })) || {};

export default async (req) => {
  if (req.method === "GET") return json({ cupos: await load() });
  if (!isAdmin(req)) return json({ error: "Sesión de administrador vencida o no válida" }, 401);
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let b = {};
  try { b = await req.json(); } catch (e) { return json({ error: "Datos no válidos" }, 400); }
  const fecha = String(b.fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return json({ error: "Fecha no válida" }, 400);
  const all = await load(); const dia = {};
  for (const [edt, v] of Object.entries(b.cupos || {}).slice(0, 30)) { const n = Math.round(Number(v)); if (String(edt).trim() && Number.isFinite(n) && n >= 0 && n <= 2000) dia[String(edt).trim().slice(0, 60)] = n; }
  if (Object.keys(dia).length) all[fecha] = dia; else delete all[fecha];
  await store().setJSON(KEY, all);
  return json({ cupos: all });
};

export const config = { path: "/api/cupos" };
