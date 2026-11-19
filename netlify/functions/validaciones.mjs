// Validación de Carga Nocturna – CD Callao (Netlify Blobs).
// GET  ?fecha=YYYY-MM-DD  o  ?desde=&hasta=     -> { ok, registros }
// POST { accion:"agregar", registro }           -> guarda un hallazgo o placa conforme
// POST { accion:"borrar", fecha, id, pin|tk }   -> borra (administradora, o quien lo registró desde su celular)
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
          tk: txt(r.tk, 40), registrado: new Date().toISOString(),
        };
        await store.setJSON(`${limpio.fecha}/${limpio.id}`, limpio);
        return json({ ok: true });
      }
      if (b.accion === "borrar") {
        if (!okFecha(b.fecha) || !okId(b.id)) return json({ ok: false, error: "datos" }, 400);
        const esAdmin = String(b.pin || "").replace(/\D/g, "") === PIN_ADMIN;
        if (!esAdmin) {
          // Quien registró desde su celular puede borrar su propio registro (por si se equivocó)
          const actual = await store.get(`${b.fecha}/${b.id}`, { type: "json" });
          if (!actual || !actual.tk || String(b.tk || "") !== actual.tk) return json({ ok: false, error: "pin" }, 403);
        }
        await store.delete(`${b.fecha}/${b.id}`);
        return json({ ok: true });
      }
      return json({ ok: false, error: "accion" }, 400);
    }
    const sp = new URL(req.url).searchParams;
    const fecha = sp.get("fecha");
    let desde = sp.get("desde"), hasta = sp.get("hasta");
    if (okFecha(fecha)) { desde = fecha; hasta = fecha; }
    if (!okFecha(desde) || !okFecha(hasta) || desde > hasta) return json({ ok: false, error: "fecha" }, 400);
    // Un solo día: listado por prefijo. Rango (semana, mes, trimestre): por prefijo de mes y filtro por fecha.
    const meses = [];
    for (let d = new Date(desde.slice(0, 7) + "-01T00:00:00Z"); d.toISOString().slice(0, 7) <= hasta.slice(0, 7); d.setUTCMonth(d.getUTCMonth() + 1)) meses.push(d.toISOString().slice(0, 7));
    if (meses.length > 13) return json({ ok: false, error: "rango" }, 400);
    const prefijos = desde === hasta ? [`${desde}/`] : meses.map((m) => `${m}-`);
    const keys = [];
    for (const prefix of prefijos) {
      const { blobs } = await store.list({ prefix });
      for (const x of blobs) { const f = x.key.slice(0, 10); if (f >= desde && f <= hasta) keys.push(x.key); }
    }
    const registros = [];
    for (let i = 0; i < keys.length; i += 50) {
      const lote = await Promise.all(keys.slice(i, i + 50).map((k) => store.get(k, { type: "json" })));
      for (const r of lote) if (r) { const { tk, ...resto } = r; registros.push(resto); }
    }
    return json({ ok: true, registros });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
};

export const config = { path: "/api/validaciones" };
