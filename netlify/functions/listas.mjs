// Lista compartida de conductores y placas adicionales (Netlify Blobs).
// GET  -> { ok, conductores, placas }
// POST { pin, conductores, placas } -> guarda (solo administradora)
import { getStore } from "@netlify/blobs";

const PIN_ADMIN = "031023";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const store = getStore({ name: "relevos-listas", consistency: "strong" });
  try {
    if (req.method === "POST") {
      const b = await req.json();
      if (String(b.pin || "").replace(/\D/g, "") !== PIN_ADMIN) return json({ ok: false, error: "Solo la administradora puede cambiar la lista." }, 403);
      const conductores = (Array.isArray(b.conductores) ? b.conductores : []).map((c) => String(c).trim().toUpperCase().slice(0, 60)).filter(Boolean).slice(0, 300);
      const placas = (Array.isArray(b.placas) ? b.placas : []).slice(0, 500).map((p) => ({ placa: String(p.placa || "").toUpperCase().slice(0, 12), ruta: String(p.ruta || "").slice(0, 20), emp: String(p.emp || "").slice(0, 60) })).filter((p) => p.placa);
      await store.setJSON("listas", { conductores, placas, cuando: new Date().toISOString() });
      return json({ ok: true });
    }
    const v = (await store.get("listas", { type: "json" })) || null;
    return json({ ok: true, conductores: v ? v.conductores : null, placas: v ? v.placas : null });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
};

export const config = { path: "/api/listas" };
