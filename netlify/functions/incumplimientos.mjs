// Placas con incumplimiento de retorno TT. Ver: público. Registrar y eliminar: solo administrador.
import { store } from "../../src/source.mjs";
import { isAdmin, json } from "../../src/auth.mjs";

const KEY = "incumplimientos.json";
const load = async () => (await store().get(KEY, { type: "json" })) || [];
const clean = (v, n) => String(v ?? "").trim().slice(0, n);

export default async (req) => {
  if (req.method === "GET") return json({ rows: await load() });
  if (!isAdmin(req)) return json({ error: "Sesión de administrador vencida o no válida" }, 401);

  if (req.method === "POST") {
    let b = {};
    try { b = await req.json(); } catch (e) { return json({ error: "Datos no válidos" }, 400); }
    const fecha = clean(b.fecha, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return json({ error: "Fecha no válida" }, 400);
    const items = Array.isArray(b.items) ? b.items.slice(0, 200) : [];
    const rows = await load();
    const have = new Set(rows.map((r) => r.id));
    const at = new Date().toISOString();
    let n = 0;
    for (const x of items) {
      const placa = clean(x.placa, 12).toUpperCase();
      if (!placa) continue;
      const id = `${fecha}_${placa}`;
      if (have.has(id)) continue;
      const pal = x.paletas === null || x.paletas === undefined || x.paletas === "" ? NaN : Number(x.paletas), cj = Number(x.cajas);
      rows.push({ id, fecha, placa, ruta: clean(x.ruta, 12).toUpperCase(), edt: clean(x.edt, 60) || "SIN EDT", obs: clean(b.obs, 140),
        paletas: Number.isFinite(pal) && pal >= 0 && pal < 1000 ? Math.round(pal) : null, cajas: Number.isFinite(cj) && cj > 0 && cj < 100000 ? Math.round(cj) : null,
        puchos: Number.isFinite(Number(x.puchos)) && x.puchos !== null && x.puchos !== "" ? Math.max(0, Math.round(Number(x.puchos))) : (Number.isFinite(cj) && cj > 0 ? Math.round(cj) % 84 : null), tipo: clean(x.tipo, 40), asistente: clean(b.asistente, 60), turno: clean(b.turno, 10), at });
      have.add(id); n++;
    }
    await store().setJSON(KEY, rows);
    return json({ added: n, rows });
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id") || "";
    const rows = (await load()).filter((r) => r.id !== id);
    await store().setJSON(KEY, rows);
    return json({ rows });
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/incumplimientos" };
