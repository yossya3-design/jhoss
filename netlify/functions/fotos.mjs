// Almacén de fotos de Relevos SIF (Netlify Blobs).
// POST { key, foto }  -> guarda la foto marcada (data:image/jpeg;base64,...)
// GET  ?fecha=AAAA-MM-DD -> lista las claves del día
// GET  ?key=...       -> devuelve la foto
import { getStore } from "@netlify/blobs";

const CLAVE_OK = /^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_\-:\/ÑñÁÉÍÓÚáéíóú.]{3,160}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const store = getStore({ name: "relevos-fotos", consistency: "strong" });
  const url = new URL(req.url);
  try {
    if (req.method === "POST") {
      const b = await req.json();
      if (!CLAVE_OK.test(b.key || "")) return json({ ok: false, error: "Clave no válida" }, 400);
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(b.foto || "") || b.foto.length > 4_000_000) return json({ ok: false, error: "Foto no válida" }, 400);
      await store.set(b.key, b.foto);
      return json({ ok: true });
    }
    const key = url.searchParams.get("key");
    if (key) {
      if (!CLAVE_OK.test(key)) return json({ ok: false }, 400);
      const v = await store.get(key);
      return v ? json({ ok: true, foto: v }) : json({ ok: false }, 404);
    }
    const fecha = url.searchParams.get("fecha") || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return json({ ok: false, error: "Falta la fecha" }, 400);
    const { blobs } = await store.list({ prefix: fecha + "/" });
    return json({ ok: true, keys: blobs.map((b) => b.key) });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
};

export const config = { path: "/api/fotos" };
