// Confirmación de reprogramaciones: ver es público; registrar o cambiar, DEC o administrador.
import { store } from "../../src/source.mjs";
import { roleOf, json } from "../../src/auth.mjs";

const KEY = "confirmaciones.json";
const AUT = ["Supervisor de ventas", "BDR", "Cliente"];
const RESP = ["CONFIRMO", "NO CONFIRMO", "SIN RESPUESTA"];
const load = async () => (await store().get(KEY, { type: "json" })) || [];
const clean = (v, n) => String(v ?? "").trim().slice(0, n);

export default async (req) => {
  if (req.method === "GET") return json({ rows: await load() });
  const role = roleOf(req);
  if (!role) return json({ error: "Sesión vencida o no válida" }, 401);

  if (req.method === "POST") {
    let b = {};
    try { b = await req.json(); } catch (e) { return json({ error: "Datos no válidos" }, 400); }
    const id = clean(b.id, 80);
    if (!id) return json({ error: "Falta el cliente" }, 400);
    const all = await load();
    const prev = all.find((r) => r.id === id) || null;
    const reprog = b.reprog !== undefined ? clean(b.reprog, 2).toUpperCase() : prev && prev.reprog;
    const autoriza = b.autoriza !== undefined ? clean(b.autoriza, 40) : prev && prev.autoriza;
    if (!["SI", "NO"].includes(reprog) || !AUT.includes(autoriza)) return json({ error: "Elige si se reprograma y quién autorizó" }, 400);
    const rec = { ...(prev || {}), id, reprog, autoriza };
    for (const k of ["fecha", "ruta", "codigo", "cliente"]) if (b[k] !== undefined) rec[k] = clean(b[k], k === "cliente" ? 120 : 20);
    if (b.reprog !== undefined || b.autoriza !== undefined) { rec.by = role; rec.at = new Date().toISOString(); }
    if (reprog !== "SI") { delete rec.wa; delete rec.resp; }
    if (b.wa === true && reprog === "SI") { rec.wa = new Date().toISOString(); rec.waBy = role; }
    if (b.resp !== undefined) { const r = clean(b.resp, 20).toUpperCase(); if (r && !RESP.includes(r)) return json({ error: "Respuesta no válida" }, 400); if (r) { rec.resp = r; rec.respAt = new Date().toISOString(); } else { delete rec.resp; delete rec.respAt; } }
    const rows = all.filter((r) => r.id !== id); rows.push(rec);
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
