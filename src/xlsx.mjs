// Lector mínimo de .xlsx (sin dependencias): zip + XML de hojas.
// Devuelve los valores calculados de las celdas, con fechas como Date (UTC) igual que openpyxl.
import { inflateRawSync } from "node:zlib";

function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("El archivo descargado no es un Excel (.xlsx) válido");
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nl);
    files.set(name, { method, csize, off });
    p += 46 + nl + xl + cl;
  }
  return (name) => {
    const f = files.get(name.replace(/^\//, ""));
    if (!f) return null;
    const lnl = buf.readUInt16LE(f.off + 26), lxl = buf.readUInt16LE(f.off + 28);
    const start = f.off + 30 + lnl + lxl;
    const raw = buf.subarray(start, start + f.csize);
    return (f.method === 0 ? raw : inflateRawSync(raw)).toString("utf8");
  };
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unesc = (s) => s
  .replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e])
  .replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
const attr = (s, k) => { const m = s.match(new RegExp(`(?:^|\\s)${k}="([^"]*)"`)); return m ? unesc(m[1]) : null; };
const textOf = (xml) => { let out = ""; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let m; while ((m = re.exec(xml))) out += m[1]; return unesc(out); };

function colIdx(ref) { let n = 0; for (const ch of ref) { const c = ch.charCodeAt(0); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); } return n - 1; }

const DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);
function isDateFmt(code) {
  const c = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  return /[dmyhs]/i.test(c) && !/^[#0.,%\s]*$/.test(c);
}

export function readWorkbook(buf) {
  const get = unzip(buf);
  const wb = get("xl/workbook.xml");
  if (!wb) throw new Error("El archivo descargado no es un Excel (.xlsx) válido");
  const rels = new Map();
  for (const m of (get("xl/_rels/workbook.xml.rels") || "").matchAll(/<Relationship\b([^>]*)\/?>/g)) rels.set(attr(m[1], "Id"), attr(m[1], "Target"));
  const sheets = new Map();
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const t = rels.get(attr(m[1], "r:id")) || "";
    sheets.set(attr(m[1], "name"), t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, ""));
  }
  const ss = [];
  const sx = get("xl/sharedStrings.xml");
  if (sx) for (const m of sx.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)) ss.push(m[1] ? textOf(m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, "")) : "");
  const st = get("xl/styles.xml") || "";
  const fmts = new Map();
  for (const m of st.matchAll(/<numFmt\b([^>]*)\/?>/g)) fmts.set(+attr(m[1], "numFmtId"), attr(m[1], "formatCode") || "");
  const xfs = [];
  const cx = st.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (cx) for (const m of cx[1].matchAll(/<xf\b([^>]*?)(?:\/>|>)/g)) {
    const id = +(attr(m[1], "numFmtId") || 0);
    xfs.push(DATE_IDS.has(id) || (fmts.has(id) && isDateFmt(fmts.get(id))));
  }
  const core = get("docProps/core.xml") || "";
  const mod = core.match(/<dcterms:modified[^>]*>([^<]+)</);

  function rows(name, minRow = 1) {
    const path = sheets.get(name);
    const xml = path && get(path);
    if (!xml) return [];
    const out = [];
    const reRow = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
    let m, next = 1;
    while ((m = reRow.exec(xml))) {
      const r = +(attr(m[1], "r") || next); next = r + 1;
      if (r < minRow || !m[2]) continue;
      const row = [];
      const reC = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let c, ci = 0;
      while ((c = reC.exec(m[2]))) {
        const a = c[1], body = c[2] || "";
        const ref = attr(a, "r"); const idx = ref ? colIdx(ref) : ci; ci = idx + 1;
        const t = attr(a, "t") || "n", s = +(attr(a, "s") || 0);
        let v = null;
        if (t === "inlineStr") v = textOf(body);
        else {
          const vm = body.match(/<v>([\s\S]*?)<\/v>/);
          if (vm) {
            const raw = unesc(vm[1]);
            if (t === "s") v = ss[+raw] ?? "";
            else if (t === "str" || t === "e") v = raw;
            else if (t === "b") v = raw === "1";
            else if (t === "d") v = new Date(raw);
            else { const num = Number(raw); v = xfs[s] && isFinite(num) ? new Date(Math.round((num - 25569) * 864e5)) : num; }
          }
        }
        row[idx] = v;
      }
      for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null;
      row.r = r;
      out.push(row);
    }
    return out;
  }
  return { sheetNames: [...sheets.keys()], rows, modified: mod ? new Date(mod[1]) : null };
}
