// Lectura programada del Excel cada 15 minutos, aunque nadie abra el tablero.
import { refresh } from "../../src/source.mjs";

export default async () => {
  try { const d = await refresh(); console.log("Excel leído:", d.rows.length, "filas"); }
  catch (e) { console.error(e.message); }
};

export const config = { schedule: "*/15 * * * *" };
