// Cada hora (6:00–22:00 Lima) actualiza la bitácora desde el Drive.
import { sincronizar } from "../lib/bitasync.mjs";
export default async () => new Response(JSON.stringify(await sincronizar()));
export const config = { schedule: "0 0-3,11-23 * * *" };
