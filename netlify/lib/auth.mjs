// Usuarios y sesiones de Control T2 (Netlify Blobs). Claves guardadas solo como hash scrypt.
import { getStore } from "@netlify/blobs";
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const OPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
// Primer usuario (administradora). Solo se usa si aún no existe en la base de usuarios.
const SEED = { "yossya3@gmail.com": Object.assign({ nombre: "Mayra Torres", rol: "admin" }, {"salt":"21490f33534f0ff2d42109e24ab6e613","h":"a102c104894e6b097758e9a2610efe524c5fbfe436e510239c61fb7952fd8d58c8d0384e355d58892e9cb4173380ea00309c6d546df5f3c2ba76be33d014f412"}) };
const DIAS_SESION = 30;

export const store = () => getStore({ name: "control-actividades", consistency: "strong" });
const norm = (u) => String(u || "").trim().toLowerCase();
const b64 = (s) => Buffer.from(s).toString("base64url");

export function hashClave(clave) {
  const salt = randomBytes(16).toString("hex");
  return { salt, h: scryptSync(String(clave), salt, 64, OPT).toString("hex") };
}
function claveOk(clave, u) {
  const a = scryptSync(String(clave), u.salt, 64, OPT), b = Buffer.from(u.h, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
async function secreto(st) {
  let s = await st.get("auth/secret");
  if (!s) { s = randomBytes(32).toString("hex"); await st.set("auth/secret", s); s = (await st.get("auth/secret")) || s; }
  return s;
}
export async function usuarios(st) {
  const u = (await st.get("auth/users", { type: "json" })) || {};
  for (const [k, v] of Object.entries(SEED)) if (!u[k]) u[k] = v;
  return u;
}
export async function guardarUsuarios(st, u) { await st.setJSON("auth/users", u); }

export async function login(st, usuario, clave) {
  const us = await usuarios(st), id = norm(usuario), u = us[id];
  if (!u || !claveOk(clave, u)) return null;
  const p = { u: id, r: u.rol, n: u.nombre || id, exp: Date.now() + DIAS_SESION * 864e5 };
  const body = b64(JSON.stringify(p));
  const sig = createHmac("sha256", await secreto(st)).update(body).digest("base64url");
  return { token: body + "." + sig, user: p };
}
export async function sesion(st, req) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [body, sig] = t.split(".");
  if (!body || !sig) return null;
  const ok = createHmac("sha256", await secreto(st)).update(body).digest("base64url");
  if (ok.length !== sig.length || !timingSafeEqual(Buffer.from(ok), Buffer.from(sig))) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString());
  if (!p.exp || p.exp < Date.now()) return null;
  const u = (await usuarios(st))[p.u];
  if (!u) return null; // usuario eliminado
  return { u: p.u, r: u.rol, n: u.nombre || p.u };
}
export { claveOk, norm };
