// Sirve la librería de Excel (SheetJS) desde el mismo sitio, para redes que bloquean cdnjs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
let JS = null;
export default async () => {
  if (!JS) {
    for (const p of [join(process.cwd(), "node_modules/xlsx/dist/xlsx.full.min.js"), "/var/task/node_modules/xlsx/dist/xlsx.full.min.js"]) {
      try { JS = readFileSync(p, "utf8"); break; } catch (e) { /* siguiente */ }
    }
  }
  if (!JS) return new Response("// no disponible", { status: 404, headers: { "content-type": "text/javascript" } });
  return new Response(JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=86400", "access-control-allow-origin": "*" } });
};
export const config = { path: "/control-actividades/lib/xlsx.full.min.js" };
