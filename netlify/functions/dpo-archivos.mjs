// Archivos del Menú Delivery DPO H2 (Netlify Blobs).
// GET  ?op=list                         -> { ok, docs:[...], hidden:[ids] }
// GET  ?op=part&id=ID&n=N[&ct=tipo]     -> parte N del archivo (binario)
// POST ?op=part&id=ID&n=N&pin=031023    -> guarda la parte N (cuerpo binario, máx. 4,5 MB)
// POST ?op=meta  { pin, id, doc }       -> registra el archivo (con fecha y período H1/H2)
// POST ?op=del   { pin, id }            -> quita el archivo (o lo oculta si vino con el menú)
import { getStore } from "@netlify/blobs";

const PIN_ADMIN = "031023";
const ID_OK = /^[A-Za-z0-9_-]{4,60}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const pinOk = (p) => String(p || "").replace(/\D/g, "") === PIN_ADMIN;
const periodo = (d) => d.getUTCFullYear() + " " + (d.getUTCMonth() < 6 ? "H1" : "H2");
const t = (v, n) => String(v == null ? "" : v).slice(0, n);

export default async (req) => {
  const store = getStore({ name: "dpo-archivos", consistency: "strong" });
  const url = new URL(req.url);
  const op = url.searchParams.get("op") || "list";
  try {
    if (req.method === "GET" && op === "list") {
      const { blobs } = await store.list({ prefix: "m/" });
      const docs = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
      const hidden = (await store.get("hidden", { type: "json" })) || [];
      return json({ ok: true, docs, hidden });
    }
    if (op === "part") {
      const id = url.searchParams.get("id") || "", n = +url.searchParams.get("n");
      if (!ID_OK.test(id) || !(n >= 0 && n < 400)) return json({ ok: false, error: "Datos no válidos" }, 400);
      const key = "p/" + id + "/" + n;
      if (req.method === "GET") {
        const v = await store.get(key, { type: "arrayBuffer" });
        if (!v) return json({ ok: false }, 404);
        const ct = /^[a-z]+\/[a-z0-9.+-]+$/i.test(url.searchParams.get("ct") || "") ? url.searchParams.get("ct") : "application/octet-stream";
        return new Response(v, { headers: { "content-type": ct, "cache-control": "private, max-age=86400" } });
      }
      if (!pinOk(url.searchParams.get("pin"))) return json({ ok: false, error: "Clave incorrecta" }, 403);
      const buf = await req.arrayBuffer();
      if (buf.byteLength > 4_800_000) return json({ ok: false, error: "Parte muy grande" }, 413);
      await store.set(key, buf);
      return json({ ok: true });
    }
    if (req.method !== "POST") return json({ ok: false, error: "Método no válido" }, 405);
    const b = await req.json();
    if (!pinOk(b.pin)) return json({ ok: false, error: "Clave incorrecta" }, 403);
    if (!ID_OK.test(b.id || "")) return json({ ok: false, error: "Datos no válidos" }, 400);
    if (op === "meta") {
      const d = b.doc || {}, now = new Date();
      const doc = {
        _id: b.id, code: t(d.code, 20), cat: t(d.cat, 20), name: t(d.name, 200), rel: t(d.rel, 300), size: +d.size || 0, ext: t(d.ext, 10),
        enc: t(d.enc, 10), parts: (Array.isArray(d.parts) ? d.parts : []).slice(0, 50).map((p) => t(p, 80)), lote: t(d.lote, 40), slot: t(d.slot, 80),
        kind: t(d.kind, 10), title: t(d.title, 120), url: d.kind === "link" ? t(d.url, 1000) : "",
        at: now.toISOString(), per: periodo(new Date(now.getTime() - 5 * 3600e3))
      };
      await store.setJSON("m/" + b.id, doc);
      return json({ ok: true, doc });
    }
    if (op === "del") {
      const had = await store.get("m/" + b.id, { type: "json" });
      if (had) {
        await store.delete("m/" + b.id);
        const { blobs } = await store.list({ prefix: "p/" + b.id + "/" });
        await Promise.all(blobs.map((x) => store.delete(x.key)));
      } else {
        const hidden = (await store.get("hidden", { type: "json" })) || [];
        if (!hidden.includes(b.id)) { hidden.push(b.id); await store.setJSON("hidden", hidden.slice(-2000)); }
      }
      return json({ ok: true });
    }
    return json({ ok: false, error: "Operación no válida" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
};
