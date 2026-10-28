// Respaldo de relevos (Netlify Blobs): guarda cada relevo sin la foto.
// POST { key, rel } -> guarda
// GET  ?dias=N      -> relevos de los últimos N días (máx. 60)
import { getStore } from "@netlify/blobs";

const CLAVE_OK = /^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_\-:\/]{3,200}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const limpiar = (r) => {
  const t = (x, n = 80) => String(x ?? "").slice(0, n);
  return { tipo: t(r.tipo, 10), fecha: t(r.fecha, 10), at: t(r.at, 20), cond: t(r.cond), placa: t(r.placa, 12), ini: t(r.ini, 5), fin: t(r.fin, 5), com: t(r.com, 200), fotoKey: t(r.fotoKey, 220), geo: r.geo && typeof r.geo === "object" ? { lat: +r.geo.lat || 0, lon: +r.geo.lon || 0, acc: +r.geo.acc || 0 } : null };
};

export default async (req) => {
  const store = getStore({ name: "relevos-respaldo", consistency: "strong" });
  try {
    if (req.method === "POST") {
      const b = await req.json();
      if (!CLAVE_OK.test(b.key || "") || !b.rel) return json({ ok: false, error: "Datos no válidos" }, 400);
      await store.setJSON(b.key, limpiar(b.rel));
      return json({ ok: true });
    }
    const dias = Math.min(60, Math.max(1, +new URL(req.url).searchParams.get("dias") || 14));
    const hoy = new Date(Date.now() - 5 * 3600e3);
    const fechas = Array.from({ length: dias }, (_, i) => new Date(hoy.getTime() - i * 864e5).toISOString().slice(0, 10));
    const out = [];
    for (const f of fechas) {
      const { blobs } = await store.list({ prefix: f + "/" });
      const vals = await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })));
      vals.forEach((v) => v && out.push(v));
    }
    return json({ ok: true, relevos: out });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
};

export const config = { path: "/api/relevos" };
