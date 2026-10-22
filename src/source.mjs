// Descarga el Excel compartido de Google Drive y guarda los registros en Netlify Blobs.
import { getStore } from "@netlify/blobs";
import { convert } from "./convert.mjs";

const DEFAULT_ID = "1TwSBNWfZPRqk0GsDTjd1HUMrkwsDNHDN";
export const store = () => getStore({ name: "reportes-delivery", consistency: "strong" });

async function download() {
  const id = (globalThis.Netlify?.env.get("DRIVE_FILE_ID") || DEFAULT_ID).trim();
  const urls = [
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`,
  ];
  let last = "";
  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 reportes-delivery" } });
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) return buf;
      last = `HTTP ${r.status}`;
    } catch (e) { last = e.message; }
  }
  throw new Error(`No se pudo leer el Excel de Drive (${last}). Revisa que el enlace esté como "Cualquier persona con el enlace · Lector".`);
}

export async function refresh() {
  const buf = await download();
  const rows = convert(buf);
  const doc = { fetchedAt: Date.now(), rows };
  await store().setJSON("data.json", doc);
  return doc;
}
