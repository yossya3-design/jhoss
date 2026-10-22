import { roleFor, sign, json } from "../../src/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let b = {};
  try { b = await req.json(); } catch (e) { b = {}; }
  const role = roleFor(b.usuario, b.clave);
  if (!role) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "Usuario o clave incorrectos" }, 401);
  }
  return json({ token: sign(role), role });
};

export const config = { path: "/api/login" };
