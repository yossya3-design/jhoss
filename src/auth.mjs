// Sesión de administrador: usuario y clave viven solo en variables de entorno de Netlify.
import { createHmac, timingSafeEqual } from "node:crypto";

const env = (k) => (globalThis.Netlify?.env.get(k) || "").trim();
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const mac = (p) => createHmac("sha256", "reportes-delivery:" + env("ADMIN_KEY") + ":" + env("ADMIN_USER")).update(p).digest("base64url");

export function checkCreds(user, key) {
  const U = env("ADMIN_USER"), K = env("ADMIN_KEY");
  if (!U || !K) return false;
  return eq(String(user || "").trim().toUpperCase(), U.toUpperCase()) && eq(String(key || "").trim(), K);
}
export function sign() {
  const exp = Date.now() + 12 * 3600e3;
  const p = `admin.${exp}`;
  return `${p}.${mac(p)}`;
}
export function isAdmin(req) {
  if (!env("ADMIN_KEY")) return false;
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [who, exp, sig] = t.split(".");
  if (who !== "admin" || !exp || !sig || +exp < Date.now()) return false;
  return eq(sig, mac(`${who}.${exp}`));
}
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
