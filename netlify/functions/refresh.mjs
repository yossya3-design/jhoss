// Lectura programada del Excel: cada hora en punto (hora UTC; Lima = UTC-5).
import { refresh } from "../../src/source.mjs";

export default async () => {
  try { const d = await refresh(); console.log("Excel leído:", d.rows.length, "filas"); }
  catch (e) { console.error(e.message); }
};

export const config = { schedule: "@hourly" };
