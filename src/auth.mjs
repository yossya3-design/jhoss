// Sesiones: administrador y DEC. Usuarios y claves viven solo en variables de entorno de Netlify.
import { createHmac, timingSafeEqual } from "node:crypto";

const env = (k) => (globalThis.Netlify?.env.get(k) || "").trim();
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const mac = (p) => createHmac("sha256", "reportes-delivery:" + env("ADMIN_KEY") + ":" + env("DEC_KEY")).update(p).digest("base64url");
const ROLES = { admin: ["ADMIN_USER", "ADMIN_KEY", ""], dec: ["DEC_USER", "DEC_KEY", "DEC"] };

export function roleFor(user, key) {
  const u = String(user || "").trim().toUpperCase(), k = String(key || "").trim();
  for (const [role, [uk, kk, defU]] of Object.entries(ROLES)) {
    const U = (env(uk) || defU).toUpperCase(), K = env(kk);
    if (U && K && eq(u, U) && eq(k, K)) return role;
  }
  return null;
}
export function sign(role) {
  const exp = Date.now() + 12 * 3600e3;
  const p = `${role}.${exp}`;
  return `${p}.${mac(p)}`;
}
export function roleOf(req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [who, exp, sig] = t.split(".");
  if (!ROLES[who] || !exp || !sig || +exp < Date.now()) return null;
  return eq(sig, mac(`${who}.${exp}`)) ? who : null;
}
export const isAdmin = (req) => roleOf(req) === "admin";
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
