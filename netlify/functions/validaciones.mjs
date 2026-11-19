// Validación de Carga Nocturna – CD Callao (Netlify Blobs).
// GET  ?fecha=YYYY-MM-DD                       -> { ok, registros }
// POST { accion:"agregar", registro }           -> guarda un hallazgo o placa conforme
// POST { accion:"borrar", fecha, id, pin }      -> borra (solo administradora)
import { getStore } from "@netlify/blobs";

const PIN_ADMIN = "031023";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const okFecha = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || ""));
const okId = (i) => /^[a-z0-9]{6,40}$/i.test(String(i || ""));
const txt = (v, n) => String(v == null ? "" : v).slice(0, n);

export default async (req) => {
  const store = getStore({ name: "validacion-carga-nocturna", consistency: "strong" });
  try {
    if (req.method === "POST") {
      const b = await req.json();
      if (b.accion === "agregar") {
        const r = b.registro || {};
        if (!okFecha(r.fecha) || !okId(r.id)) return json({ ok: false, error: "datos" }, 400);
        const limpio = {
          id: r.id, fecha: r.fecha, hora: txt(r.hora, 5), ts: Number(r.ts) || Date.now(),
          placa: txt(r.placa, 12).toUpperCase(), empresario: txt(r.empresario, 80), pickinero: txt(r.pickinero, 60),
          sku: txt(r.sku, 20), producto: txt(r.producto, 120), cant: Math.max(0, Math.round(Number(r.cant) || 0)),
          motivo: ["Faltante", "Sobrante", "Cruce", "Conforme"].includes(r.motivo) ? r.motivo : "Faltante",
          skuCruce: txt(r.skuCruce, 20), productoCruce: txt(r.productoCruce, 120), obs: txt(r.obs, 140),
          registrado: new Date().toISOString(),
        };
        await store.setJSON(`${limpio.fecha}/${limpio.id}`, limpio);
        return json({ ok: true });
      }
      if (b.accion === "borrar") {
        if (String(b.pin || "").replace(/\D/g, "") !== PIN_ADMIN) return json({ ok: false, error: "pin" }, 403);
        if (!okFecha(b.fecha) || !okId(b.id)) return json({ ok: false, error: "datos" }, 400);
        await store.delete(`${b.fecha}/${b.id}`);
        return json({ ok: true });
      }
      return json({ ok: false, error: "accion" }, 400);
    }
    const fecha = new URL(req.url).searchParams.get("fecha");
    if (!okFecha(fecha)) return json({ ok: false, error: "fecha" }, 400);
    const { blobs } = await store.list({ prefix: `${fecha}/` });
    const registros = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
    return json({ ok: true, registros });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
};

export const config = { path: "/api/validaciones" };
