// Correcciones de hora de los relevos (Netlify Blobs).
// GET  ?fecha=AAAA-MM-DD -> { ok, ed: { clave: { ini, fin, por, cuando } } }
// POST { clave, ini, fin, por } -> guarda la corrección
import { getStore } from "@netlify/blobs";

const CLAVE_OK = /^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_\-:\/]{3,200}$/;
const HORA_OK = /^([01]\d|2[0-3]):[0-5]\d$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const store = getStore({ name: "relevos-ediciones", consistency: "strong" });
  try {
    if (req.method === "POST") {
      const b = await req.json();
      if (!CLAVE_OK.test(b.clave || "") || !HORA_OK.test(b.ini || "") || !HORA_OK.test(b.fin || "")) return json({ ok: false, error: "Datos no válidos" }, 400);
      await store.setJSON(b.clave, { ini: b.ini, fin: b.fin, por: String(b.por || "").slice(0, 60), cuando: new Date().toISOString() });
      return json({ ok: true });
    }
    const fecha = new URL(req.url).searchParams.get("fecha") || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return json({ ok: false, error: "Falta la fecha" }, 400);
    const { blobs } = await store.list({ prefix: fecha + "/" });
    const ed = {};
    await Promise.all(blobs.map(async (x) => { const v = await store.get(x.key, { type: "json" }); if (v) ed[x.key] = v; }));
    return json({ ok: true, ed });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
};

export const config = { path: "/api/ediciones" };
