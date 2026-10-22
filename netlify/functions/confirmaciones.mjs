// Confirmación de reprogramaciones: ver es público; registrar o cambiar, DEC o administrador.
import { store } from "../../src/source.mjs";
import { roleOf, json } from "../../src/auth.mjs";

const KEY = "confirmaciones.json";
const AUT = ["Supervisor de ventas", "BDR", "Cliente"];
const load = async () => (await store().get(KEY, { type: "json" })) || [];
const clean = (v, n) => String(v ?? "").trim().slice(0, n);

export default async (req) => {
  if (req.method === "GET") return json({ rows: await load() });
  const role = roleOf(req);
  if (!role) return json({ error: "Sesión vencida o no válida" }, 401);

  if (req.method === "POST") {
    let b = {};
    try { b = await req.json(); } catch (e) { return json({ error: "Datos no válidos" }, 400); }
    const id = clean(b.id, 80), reprog = clean(b.reprog, 2).toUpperCase(), autoriza = clean(b.autoriza, 40);
    if (!id || !["SI", "NO"].includes(reprog) || !AUT.includes(autoriza)) return json({ error: "Elige si se reprograma y quién autorizó" }, 400);
    const rows = (await load()).filter((r) => r.id !== id);
    rows.push({ id, fecha: clean(b.fecha, 10), ruta: clean(b.ruta, 12), codigo: clean(b.codigo, 20), cliente: clean(b.cliente, 120), reprog, autoriza, by: role, at: new Date().toISOString() });
    await store().setJSON(KEY, rows);
    return json({ rows });
  }
  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id") || "";
    const rows = (await load()).filter((r) => r.id !== id);
    await store().setJSON(KEY, rows);
    return json({ rows });
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/confirmaciones" };
