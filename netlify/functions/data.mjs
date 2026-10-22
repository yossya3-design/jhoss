import { refresh, store } from "../../src/source.mjs";
import { json } from "../../src/auth.mjs";

const STALE = 15 * 60e3; // se vuelve a leer el Excel si los datos tienen más de 15 minutos

export default async (req) => {
  const force = new URL(req.url).searchParams.has("force");
  let doc = null;
  try { doc = await store().get("data.json", { type: "json" }); } catch (e) { doc = null; }
  const age = doc ? Date.now() - doc.fetchedAt : Infinity;
  if (!doc || age > STALE || (force && age > 30e3)) {
    try { doc = await refresh(); }
    catch (e) {
      if (!doc) return json({ error: e.message, rows: [] }, 502);
      doc = { ...doc, error: e.message };
    }
  }
  return json(doc);
};

export const config = { path: "/api/data" };
