// Lee la foto de la planilla "Control de incumplimiento de envases" con IA (Claude).
// Solo administrador. Necesita la variable de entorno ANTHROPIC_API_KEY; sin ella responde 501.
import { isAdmin, json } from "../../src/auth.mjs";

const PROMPT = `Esta es la foto de una planilla manuscrita "CONTROL DE INCUMPLIMIENTO DE ENVASES SIN CLASIFICAR" de un centro de distribución.
Columnas: ASISTENTE ALMACÉN, TURNO, PLACA, PH, CAJAS, TOTAL CAJAS. Arriba está la FECHA (dd/mm/aa).
Transcribe TODAS las filas con placa, en orden, aunque la placa se repita. La placa suele estar abreviada (ej. "G-732", "D880", "B-863"): cópiala tal cual la ves, sin inventar letras.
Para cada fila copia la columna PH tal cual (ej. "1(6xx)", "2(Lt)"), la columna CAJAS tal cual (ej. "38(6xx)", "4(Lt)", "16(3xx)") y el número de TOTAL CAJAS. Si una celda está vacía usa null. Copia también el nombre del ASISTENTE ALMACÉN y el TURNO escritos en la planilla.
Responde SOLO con JSON válido, sin texto adicional, con esta forma:
{"fecha":"AAAA-MM-DD o null","asistente":"texto o null","turno":"texto o null","filas":[{"placa":"G-732","ph":"1(6xx)","cajas":"38(6xx)","total_cajas":122}]}`;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!isAdmin(req)) return json({ error: "Sesión de administrador vencida o no válida" }, 401);
  const key = (globalThis.Netlify?.env.get("ANTHROPIC_API_KEY") || "").trim();
  if (!key) return json({ error: "sin_clave" }, 501);
  let b = {};
  try { b = await req.json(); } catch (e) { return json({ error: "Datos no válidos" }, 400); }
  const data = String(b.imagen || "").replace(/^data:[^,]+,/, ""), mt = /^image\/(jpeg|png|webp|gif)$/.test(b.tipo) ? b.tipo : "image/jpeg";
  if (!data || data.length > 4_500_000) return json({ error: "Imagen vacía o muy grande" }, 400);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: globalThis.Netlify?.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5", max_tokens: 4000,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mt, data } }, { type: "text", text: PROMPT }] }] }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: (j.error && j.error.message) || `Error ${r.status} al leer la imagen` }, 502);
  const txt = (j.content || []).map((c) => c.text || "").join("");
  const m = txt.match(/\{[\s\S]*\}/);
  try { return json(JSON.parse(m ? m[0] : txt)); } catch (e) { return json({ error: "No se pudo interpretar la lectura", texto: txt.slice(0, 500) }, 502); }
};

export const config = { path: "/api/leer-planilla" };
