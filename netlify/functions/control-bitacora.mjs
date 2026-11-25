// Cada hora (6:00–22:00 Lima) lee la bitácora del Drive (link compartido) y la deja lista para la página.
import { getStore } from "@netlify/blobs";
import * as XLSX from "xlsx";
import M from "../lib/motor.cjs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const FILE_ID = "1TwSBNWfZPRqk0GsDTjd1HUMrkwsDNHDN";
const HOJAS = ["DESPLANIFICACIÓN", "RECLAMOS", "ADULTERADO", "BD EDT", "BD CLIENTE", "AGENDAS TELEFÓNICAS"];
const URLS = [
  `https://drive.usercontent.google.com/download?id=${FILE_ID}&export=download&confirm=t`,
  `https://drive.google.com/uc?export=download&id=${FILE_ID}`,
];

async function bajar() {
  for (const u of URLS) {
    try {
      const r = await fetch(u, { redirect: "follow" });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && !ct.includes("text/html")) return Buffer.from(await r.arrayBuffer());
    } catch (e) { /* siguiente */ }
  }
  throw new Error("No se pudo descargar la bitácora del Drive (revisa que el link siga compartido).");
}

export default async () => {
  const st = getStore({ name: "control-actividades", consistency: "strong" });
  const buf = await bajar();
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 16);
  const prev = await st.get("bitaptr", { type: "json" });
  if (prev && prev.hash === hash) return new Response("sin cambios");
  const wb = XLSX.read(buf, { type: "buffer", sheets: HOJAS });
  const sh = {};
  for (const n of wb.SheetNames) sh[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null });
  const b = M.bita(sh);
  if (!b.d.length) throw new Error("La bitácora salió vacía");
  const id = "bita-" + hash;
  await st.set("f/" + id, gzipSync(JSON.stringify(b)));
  const ahora = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 19).replace("T", " ");
  await st.setJSON("bitaptr", { id, hash, n: "Drive · BITACORA_DELIVERY_CD_CALLAO.xlsx", at: ahora, act: b.act });
  return new Response("ok " + b.d.length);
};

export const config = { schedule: "0 0-3,11-23 * * *" };
