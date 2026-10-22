// Convierte la bitácora (xlsx) en los registros que usa el tablero.
// Es la misma lógica que dash/to_json.py, llevada a JavaScript.
import { readWorkbook } from "./xlsx.mjs";

const nil = (v) => v === null || v === undefined;
const falsy = (v) => nil(v) || v === "" || v === 0 || v === false;
const or = (a, b) => (falsy(a) ? b : a);
const pyStr = (v) => (nil(v) ? "None" : typeof v === "number" ? (Number.isInteger(v) ? String(v) : String(v)) : v instanceof Date ? v.toISOString().slice(0, 19).replace("T", " ") : v === true ? "True" : v === false ? "False" : String(v));
const s = (v) => pyStr(v).trim();
const toInt = (v) => {
  if (typeof v === "number" && isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && /^\s*[+-]?\d+\s*$/.test(v)) return parseInt(v, 10);
  return null;
};
const num = (v) => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" && v.trim() !== "") { const n = Number(v.trim()); return isFinite(n) ? n : 0; }
  return 0;
};
const d = (v) => (v instanceof Date && !isNaN(v) ? v.toISOString().slice(0, 10) : null);
const ru = (v) => (nil(v) || v === "" ? "" : pyStr(v).trim().toUpperCase());
const g = (r, i) => (i === null || i === undefined || i >= r.length ? null : r[i] ?? null);
const limaIso = (dt) => new Date(dt.getTime() - 5 * 3600e3).toISOString().slice(0, 16);

export function convert(buf) {
  const wb = readWorkbook(buf);
  const find = (name) => {
    const n = wb.sheetNames.find((x) => x.trim().toUpperCase() === name);
    if (!n) throw new Error("Falta la hoja " + name + " en el Excel");
    return n;
  };
  const rows = (name, min = 1) => wb.rows(find(name), min);
  const header = (name) => wb.rows(find(name), 1).find((r) => r.r === 1) || [];

  const edt = new Map();
  for (const r of rows("BD EDT", 2)) if (!falsy(g(r, 0))) edt.set(s(g(r, 0)).toUpperCase(), [g(r, 1), s(or(g(r, 4), "SIN EDT"))]);

  const clientes = new Map(), supervisores = new Map(), zonas = new Map(), telefonos = new Map();
  const hc = header("BD CLIENTE").map((h) => s(or(h, "")).toLowerCase());
  const isv = hc.indexOf("supervisor name"), iz = hc.indexOf("sales zone");
  const it = hc.findIndex((h) => /tel[eé]f|^telf|^tel\b|celular|^cel\b|phone|whats/.test(h));
  for (const r of rows("BD CLIENTE", 2)) {
    if (nil(g(r, 0))) continue;
    const k = toInt(g(r, 0)); if (k === null) continue;
    clientes.set(k, s(or(g(r, 1), "")));
    if (isv >= 0 && isv < r.length) supervisores.set(k, s(or(g(r, isv), "")));
    if (iz >= 0 && iz < r.length) zonas.set(k, s(or(g(r, iz), "")));
    if (it >= 0 && it < r.length) telefonos.set(k, s(or(g(r, it), "")));
  }
  const zof = (c) => { const k = toInt(c); return k === null ? "SIN ZONA" : zonas.get(k) || "SIN ZONA"; };
  const svof = (c) => { const k = toInt(c); return k === null ? "SIN SUPERVISOR" : supervisores.get(k) || "SIN SUPERVISOR"; };
  const telof = (c) => { const k = toInt(c); return k === null ? "" : telefonos.get(k) || ""; };
  const sku = new Map();
  for (const r of rows("SKU", 2)) if (!falsy(g(r, 0))) sku.set(g(r, 0), g(r, 1));
  const cli = (code, name) => {
    const n = s(or(name, ""));
    if (n && n !== "-") return n;
    const k = toInt(code); return k === null ? "" : clientes.get(k) || "";
  };
  const info = (rt) => edt.get(rt) || ["", "SIN EDT"];

  const out = [];
  const add = (k) => out.push({ tipo: "", fecha: "", ruta: "", edt: "", placa: "", motivo: "", accion: "", codigo: "", cliente: "", sv: "", alertado: "", sol: "", asistente: "", viaje: "", nviaje: "", ruta2: "", zona: "", ca: 0, hl: 0, ph: 0, cantidad: 0, status: "", medio: "", obs: "", tel: "", ...k });
  const placa = (p) => (falsy(p) ? "" : pyStr(p));

  for (const r of rows("BITACORA", 6)) {
    const f = d(g(r, 1)), rt = ru(g(r, 3)); if (!f || !rt) continue;
    const [p, e] = info(rt);
    add({ tipo: "Modificación de viaje", fecha: f, ruta: rt, edt: e, placa: placa(p), motivo: s(or(g(r, 7), "SIN MOTIVO")), viaje: pyStr(or(g(r, 2), "")), nviaje: pyStr(or(g(r, 4), "")), ruta2: ru(g(r, 8)) });
  }

  const hd = header("DESPLANIFICACIÓN").map((h) => s(or(h, "")).toUpperCase());
  const ci = (...names) => { for (const n of names) { const i = hd.indexOf(n); if (i >= 0) return i; } return null; };
  const iF = ci("FECHA"), iR = ci("RUTA"), iC = ci("CODIGO", "CÓDIGO"), iN = ci("CLIENTE"), iCA = ci("CA"), iHL = ci("HL"), iM = ci("MOTIVO"),
    iQ = ci("QUE SE HACE?", "QUÉ SE HACE?", "QUE SE HACE"), iS = ci("STATUS"), iA = ci("ALERTADO");
  const ACC = { ZT: "ZT (rechazo)", REPROGRAMACION: "Reprogramación", "REPROGRAMACIÓN": "Reprogramación" };
  for (const r of rows("DESPLANIFICACIÓN", 2)) {
    const f = d(g(r, iF)), rt = ru(g(r, iR)); if (!f || !rt) continue;
    const [p, e] = info(rt); const acc = s(or(g(r, iQ), "")).toUpperCase(); const code = g(r, iC);
    add({ tipo: "Cliente desplanificado", fecha: f, ruta: rt, edt: e, placa: placa(p), motivo: s(or(g(r, iM), "")), accion: ACC[acc] || "Sin clasificar",
      codigo: pyStr(or(code, "")), cliente: cli(code, g(r, iN)), sv: svof(code), zona: zof(code), tel: telof(code), ca: num(g(r, iCA)), hl: Math.round(num(g(r, iHL)) * 1000) / 1000,
      status: s(or(g(r, iS), "")).toUpperCase(), alertado: s(or(g(r, iA), "")).toUpperCase() });
  }

  for (const r of rows("LISTA DE TT", 2)) {
    const f = d(g(r, 0)), rt = ru(g(r, 1)); if (!f || !rt) continue;
    const [p, e] = info(rt);
    add({ tipo: "Placa con TT", fecha: f, ruta: rt, edt: e, placa: placa(p), ph: num(g(r, 4)) });
  }

  for (const r of rows("RECLAMOS", 2)) {
    const f = d(g(r, 0)), rt = ru(g(r, 2)); if (!f || !rt) continue;
    const [p, e] = info(rt); const code = g(r, 4);
    add({ tipo: "Reclamo de ventas", fecha: f, ruta: rt, edt: e, placa: placa(p), motivo: s(or(g(r, 6), "")),
      codigo: pyStr(or(code, "")), cliente: cli(code, g(r, 5)), tel: telof(code), sv: s(or(g(r, 8), "")) || svof(code), zona: s(or(g(r, 9), "")) || zof(code),
      status: s(or(g(r, 10), "PENDIENTE")).toUpperCase(), medio: s(or(g(r, 7), "")).toUpperCase(), obs: s(or(g(r, 12), "")), sol: d(g(r, 11)) || "", asistente: s(or(g(r, 1), "")) });
  }

  for (const r of rows("ADULTERADO", 2)) {
    const f = d(g(r, 0)), rt = ru(g(r, 6)); if (!f || !rt) continue;
    const [p, e] = info(rt); const code = g(r, 1), k = g(r, 3);
    const m = sku.has(k) ? sku.get(k) : or(k, "");
    add({ tipo: "Recojo de adulterado", fecha: f, ruta: rt, edt: e, placa: placa(p), codigo: pyStr(or(code, "")), cliente: cli(code, g(r, 2)), sv: svof(code), zona: zof(code), tel: telof(code),
      obs: s(or(g(r, 9), "")), motivo: nil(m) ? "" : pyStr(m), cantidad: num(g(r, 5)) });
  }

  const now = new Date();
  out.push({ tipo: "_meta", fecha: "", act: limaIso(now), xact: wb.modified && !isNaN(wb.modified) ? limaIso(wb.modified) : "" });
  return out;
}
