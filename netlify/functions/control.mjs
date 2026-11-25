// Control de Actividades · Asistentes de Transporte CD Callao (Netlify Blobs).
// GET  ?op=estado            -> { ok, estado }  (último corte cargado + puntero de bitácora)
// GET  ?op=get&id=ID         -> archivo guardado (JSON comprimido gzip)
// POST ?op=put&id=ID         -> guarda un archivo (cuerpo gzip, máx. 5 MB)
// POST ?op=estado  {..}      -> guarda el estado del corte
// POST ?op=bitaptr {id,..}   -> bitácora subida a mano desde la página
// POST ?op=dia {dia,data,..} -> índice por día (base acumulativa)
import { getStore } from "@netlify/blobs";

const ID_OK = /^[A-Za-z0-9_-]{4,64}$/;
const DIA_OK = /^\d{4}-\d{2}-\d{2}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const limpio = (o, n = 20000) => { const s = JSON.stringify(o ?? {}); if (s.length > n) throw new Error("muy grande"); return JSON.parse(s); };

export default async (req) => {
  const st = getStore({ name: "control-actividades", consistency: "strong" });
  const url = new URL(req.url);
  const op = url.searchParams.get("op") || "estado";
  try {
    if (req.method === "GET" && op === "estado") {
      const e = (await st.get("estado", { type: "json" })) || null;
      const b = (await st.get("bitaptr", { type: "json" })) || null;
      if (!e && !b) return json({ ok: true, estado: null });
      return json({ ok: true, estado: Object.assign({ files: {} }, e || {}, b ? { bita: b } : {}) });
    }
    if (req.method === "GET" && op === "get") {
      const id = url.searchParams.get("id") || "";
      if (!ID_OK.test(id)) return json({ ok: false, error: "id" }, 400);
      const v = await st.get("f/" + id, { type: "arrayBuffer" });
      if (!v) return json({ ok: false }, 404);
      return new Response(v, { headers: { "content-type": "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
    }
    if (req.method === "POST" && op === "put") {
      const id = url.searchParams.get("id") || "";
      if (!ID_OK.test(id)) return json({ ok: false, error: "id" }, 400);
      const buf = await req.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > 5_000_000) return json({ ok: false, error: "tamaño" }, 400);
      const u = new Uint8Array(buf);
      if (u[0] !== 0x1f || u[1] !== 0x8b) return json({ ok: false, error: "formato" }, 400);
      await st.set("f/" + id, buf);
      return json({ ok: true, id });
    }
    if (req.method === "POST" && op === "estado") {
      const e = limpio(await req.json());
      delete e.bita;
      await st.setJSON("estado", e);
      return json({ ok: true });
    }
    if (req.method === "POST" && op === "bitaptr") {
      const b = limpio(await req.json(), 2000);
      if (!ID_OK.test(b.id || "")) return json({ ok: false, error: "id" }, 400);
      await st.setJSON("bitaptr", b);
      return json({ ok: true });
    }
    if (req.method === "POST" && op === "dia") {
      const d = limpio(await req.json(), 2000);
      if (!DIA_OK.test(d.dia || "")) return json({ ok: false, error: "dia" }, 400);
      await st.setJSON("dia/" + d.dia, d);
      return json({ ok: true });
    }
    return json({ ok: false, error: "operación no válida" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
};
