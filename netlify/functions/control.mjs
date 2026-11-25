// Control T2 · Control de Actividades de Asistentes de Transporte CD Callao (Netlify Blobs).
// Todo pide sesión (Authorization: Bearer <token>), menos op=login.
// POST ?op=login {usuario,clave}         -> { token, user }
// GET  ?op=me                             -> usuario de la sesión
// GET  ?op=estado                         -> último corte cargado + puntero de bitácora
// GET  ?op=get&id=ID                      -> archivo guardado (JSON gzip)
// POST ?op=put&id=ID                      -> guarda un archivo (cuerpo gzip, máx. 5 MB)
// POST ?op=estado | bitaptr | dia         -> guarda estado del corte / bitácora subida a mano / índice por día (+ tendencia)
// GET  ?op=dia&dia=YYYY-MM-DD             -> data e historial de avance de ese día
// GET/POST ?op=pend (&dia=)               -> placas pendientes por cargar en almacén
// GET  ?op=ck  ·  POST ?op=ck (admin)     -> checklist por asistente (solo la administradora marca)
// GET  ?op=users · POST ?op=adduser · POST ?op=deluser (admin) · POST ?op=passwd (propia clave)
import { store, login, sesion, usuarios, guardarUsuarios, hashClave, claveOk, norm } from "../lib/auth.mjs";

const ID_OK = /^[A-Za-z0-9_-]{4,64}$/;
const DIA_OK = /^\d{4}-\d{2}-\d{2}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const limpio = (o, n = 20000) => { const s = JSON.stringify(o ?? {}); if (s.length > n) throw new Error("muy grande"); return JSON.parse(s); };

export default async (req) => {
  const st = store();
  const url = new URL(req.url);
  const op = url.searchParams.get("op") || "estado";
  try {
    if (op === "login" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const r = await login(st, b.usuario, b.clave);
      if (!r) { await new Promise((ok) => setTimeout(ok, 700)); return json({ ok: false, error: "Usuario o clave incorrectos" }, 401); }
      return json(Object.assign({ ok: true }, r));
    }
    const s = await sesion(st, req);
    if (!s) return json({ ok: false, error: "sesion" }, 401);
    const admin = s.r === "admin";

    if (req.method === "GET") {
      if (op === "me") return json({ ok: true, user: s });
      if (op === "estado") {
        const e = (await st.get("estado", { type: "json" })) || null;
        const b = (await st.get("bitaptr", { type: "json" })) || null;
        if (!e && !b) return json({ ok: true, estado: null });
        return json({ ok: true, estado: Object.assign({ files: {} }, e || {}, b ? { bita: b } : {}) });
      }
      if (op === "get") {
        const id = url.searchParams.get("id") || "";
        if (!ID_OK.test(id)) return json({ ok: false, error: "id" }, 400);
        const v = await st.get("f/" + id, { type: "arrayBuffer" });
        if (!v) return json({ ok: false }, 404);
        // fmt=b64: JSON con el gzip en base64 (las redes corporativas bloquean descargas binarias)
        if (url.searchParams.get("fmt") === "b64") return new Response(JSON.stringify({ ok: true, gz: Buffer.from(v).toString("base64") }), { headers: { "content-type": "application/json", "cache-control": "private, max-age=31536000, immutable" } });
        return new Response(v, { headers: { "content-type": "application/octet-stream", "cache-control": "private, max-age=31536000, immutable" } });
      }
      if (op === "ck") return json({ ok: true, ck: (await st.get("ck", { type: "json" })) || {} });
      if (op === "pend") {
        const dia = url.searchParams.get("dia") || "";
        if (!DIA_OK.test(dia)) return json({ ok: false, error: "dia" }, 400);
        return json({ ok: true, pend: (await st.get("pend/" + dia, { type: "json" })) || { placas: [] } });
      }
      if (op === "dia") {
        const dia = url.searchParams.get("dia") || "";
        if (!DIA_OK.test(dia)) return json({ ok: false, error: "dia" }, 400);
        return json({ ok: true, dia: (await st.get("dia/" + dia, { type: "json" })) || null });
      }
      if (op === "users") {
        if (!admin) return json({ ok: false, error: "solo administradora" }, 403);
        const us = await usuarios(st);
        return json({ ok: true, users: Object.entries(us).map(([u, v]) => ({ u, nombre: v.nombre || "", rol: v.rol })) });
      }
    }

    if (req.method === "POST") {
      if (op === "put") {
        const id = url.searchParams.get("id") || "";
        if (!ID_OK.test(id)) return json({ ok: false, error: "id" }, 400);
        let buf;
        if ((req.headers.get("content-type") || "").includes("application/json")) {
          const b = await req.json();
          const x = Buffer.from(String(b.gz || ""), "base64");
          buf = x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength);
        } else buf = await req.arrayBuffer();
        if (!buf.byteLength || buf.byteLength > 5_000_000) return json({ ok: false, error: "tamaño" }, 400);
        const u = new Uint8Array(buf);
        if (u[0] !== 0x1f || u[1] !== 0x8b) return json({ ok: false, error: "formato" }, 400);
        await st.set("f/" + id, buf);
        return json({ ok: true, id });
      }
      if (op === "estado") {
        const e = limpio(await req.json());
        delete e.bita;
        e.por = s.n;
        await st.setJSON("estado", e);
        return json({ ok: true });
      }
      if (op === "bitaptr") {
        const b = limpio(await req.json(), 2000);
        if (!ID_OK.test(b.id || "")) return json({ ok: false, error: "id" }, 400);
        await st.setJSON("bitaptr", b);
        return json({ ok: true });
      }
      if (op === "dia") {
        const d = limpio(await req.json(), 6000);
        if (!DIA_OK.test(d.dia || "")) return json({ ok: false, error: "dia" }, 400);
        const prev = (await st.get("dia/" + d.dia, { type: "json" })) || {};
        const hist = (prev.hist || []).slice(-39);
        if (d.snap) hist.push(d.snap);
        delete d.snap;
        await st.setJSON("dia/" + d.dia, Object.assign({}, d, { hist }));
        return json({ ok: true });
      }
      if (op === "pend") {
        const d = limpio(await req.json(), 20000);
        if (!DIA_OK.test(d.dia || "")) return json({ ok: false, error: "dia" }, 400);
        const placas = (Array.isArray(d.placas) ? d.placas : []).slice(0, 200).map((x) => ({ p: String(x.p || "").slice(0, 12), at: String(x.at || "").slice(0, 5), por: String(x.por || "").slice(0, 60) }));
        await st.setJSON("pend/" + d.dia, { placas, at: new Date().toISOString(), por: s.n });
        return json({ ok: true });
      }
      if (op === "ck") {
        if (!admin) return json({ ok: false, error: "Solo la administradora marca el checklist" }, 403);
        await st.setJSON("ck", limpio(await req.json(), 200000));
        return json({ ok: true });
      }
      if (op === "adduser") {
        if (!admin) return json({ ok: false, error: "solo administradora" }, 403);
        const b = await req.json();
        const id = norm(b.usuario);
        if (!/^[a-z0-9._@+-]{3,80}$/.test(id)) return json({ ok: false, error: "Usuario no válido" }, 400);
        if (String(b.clave || "").length < 6) return json({ ok: false, error: "La clave debe tener al menos 6 caracteres" }, 400);
        const us = await usuarios(st);
        us[id] = Object.assign({ nombre: String(b.nombre || "").slice(0, 60), rol: b.rol === "admin" ? "admin" : "asistente" }, hashClave(b.clave));
        await guardarUsuarios(st, us);
        return json({ ok: true });
      }
      if (op === "deluser") {
        if (!admin) return json({ ok: false, error: "solo administradora" }, 403);
        const id = norm((await req.json()).usuario);
        if (id === s.u) return json({ ok: false, error: "No puedes eliminar tu propio usuario" }, 400);
        const us = await usuarios(st);
        delete us[id];
        await guardarUsuarios(st, us);
        return json({ ok: true });
      }
      if (op === "passwd") {
        const b = await req.json();
        const us = await usuarios(st), u = us[s.u];
        if (!u || !claveOk(b.actual, u)) return json({ ok: false, error: "La clave actual no es correcta" }, 400);
        if (String(b.nueva || "").length < 6) return json({ ok: false, error: "La clave nueva debe tener al menos 6 caracteres" }, 400);
        us[s.u] = Object.assign({}, u, hashClave(b.nueva));
        await guardarUsuarios(st, us);
        return json({ ok: true });
      }
    }
    return json({ ok: false, error: "operación no válida" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
};
