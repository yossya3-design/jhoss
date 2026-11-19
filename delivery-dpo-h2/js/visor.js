/* Visor de archivos dentro del menú · Delivery DPO CD Callao
   PowerPoint, Word, Excel, PDF, imágenes, video y texto se muestran aquí mismo,
   sin salir del menú. window.FXVisor.open({name, ext, getBlob, onDownload}) */
(function () {
  "use strict";
  if (window.FXVisor) return;
  var EMU = 9525; // EMU por px (96 dpi)

  /* ---------- estilos ---------- */
  var css = document.createElement("style");
  css.textContent = [
    ".vw{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:#070707;color:#F4F1E8;font-family:var(--f-body,Barlow,Arial,sans-serif)}",
    ".vw-top{flex:none;display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(242,197,42,.4);background:#0E0E0D}",
    ".vw-ic{flex:none;width:36px;height:36px;border-radius:9px;display:grid;place-items:center;color:#fff;font:800 11px var(--f-mono,monospace)}",
    ".vw-tt{min-width:0;flex:1}.vw-tt b{display:block;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".vw-tt small{font:12px var(--f-mono,monospace);color:#A6A093}",
    ".vw-b{flex:none;cursor:pointer;border-radius:999px;padding:8px 14px;font:700 13.5px var(--f-body,Barlow,Arial,sans-serif);border:1px solid #F2C52A;background:transparent;color:#F2C52A;white-space:nowrap}",
    ".vw-b.x{background:#F2C52A;color:#070707}",
    ".vw-tabs{flex:none;display:flex;gap:6px;overflow-x:auto;padding:8px 14px;border-bottom:1px solid #2B2822;background:#0E0E0D}",
    ".vw-tabs button{flex:none;cursor:pointer;border-radius:8px;padding:5px 11px;font:600 13px var(--f-body,Barlow,Arial,sans-serif);border:1px solid #3A352B;background:#151513;color:#F4F1E8}",
    ".vw-tabs button[aria-pressed=true]{border-color:#F2C52A;color:#070707;background:#F2C52A}",
    ".vw-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:16px}",
    ".vw-st{margin:40px auto;max-width:520px;text-align:center;font-size:15px;color:#A6A093;line-height:1.5}",
    ".vw-st b{display:block;color:#F4F1E8;font-size:17px;margin-bottom:6px}",
    ".vw-spin{width:34px;height:34px;margin:0 auto 12px;border:3px solid #3A352B;border-top-color:#F2C52A;border-radius:50%;animation:vwsp 0.9s linear infinite}@keyframes vwsp{to{transform:rotate(360deg)}}",
    ".vw-note{max-width:1100px;margin:0 auto 10px;font:12px var(--f-mono,monospace);color:#A6A093}",
    ".vw-pages{display:grid;gap:14px;justify-items:center}",
    ".vw-pages canvas,.vw-media{display:block;max-width:100%;height:auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.5);border-radius:2px}",
    ".vw-media{margin:0 auto;max-height:calc(100vh - 120px);background:transparent}",
    ".vw-pn{font:12px var(--f-mono,monospace);color:#A6A093;margin:-6px 0 0}",
    /* PowerPoint */
    ".pv-wrap{position:relative;width:100%;max-width:1100px;margin:0 auto;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.5);background:#fff}",
    ".pv-s{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;background:#fff;color:#000}",
    ".pv-s .sh{position:absolute;box-sizing:border-box}",
    ".pv-s .tx{position:absolute;inset:0;display:flex;flex-direction:column;box-sizing:border-box;overflow:visible;word-wrap:break-word}",
    ".pv-s p{margin:0;white-space:pre-wrap}",
    ".pv-s img{position:absolute;display:block}",
    ".pv-s table{position:absolute;border-collapse:collapse;table-layout:fixed}",
    ".pv-s td{border:1px solid #9a9a9a;vertical-align:top;padding:4px 6px;overflow:hidden}",
    ".pv-ph{position:absolute;display:grid;place-items:center;border:1px dashed #999;color:#666;font:14px Arial,sans-serif;background:rgba(0,0,0,.03)}",
    ".pv-list{display:grid;gap:18px}",
    ".pv-n{max-width:1100px;margin:6px auto 0;font:12px var(--f-mono,monospace);color:#A6A093}",
    /* Word */
    ".dv-page{max-width:850px;margin:0 auto;background:#fff;color:#111;box-shadow:0 4px 24px rgba(0,0,0,.5);padding:56px 64px;font-family:Calibri,Carlito,Arial,sans-serif;font-size:14.6px;line-height:1.35;overflow-wrap:anywhere}",
    ".dv-page p{margin:0 0 6px;min-height:1em}",
    ".dv-page h1,.dv-page h2,.dv-page h3{margin:14px 0 6px;line-height:1.2}",
    ".dv-page table{border-collapse:collapse;margin:6px 0 10px;max-width:100%}",
    ".dv-page td{border:1px solid #888;padding:4px 6px;vertical-align:top}",
    ".dv-page img{max-width:100%;height:auto}",
    ".dv-page hr{border:0;border-top:1px dashed #bbb;margin:18px 0}",
    ".docx-wrapper{background:transparent!important;padding:0!important}",
    ".docx-wrapper>section.docx{box-shadow:0 4px 24px rgba(0,0,0,.5)!important;margin:0 auto 18px!important;max-width:100%}",
    /* Excel */
    ".xv{overflow:auto;background:#fff;color:#111;border-radius:4px;box-shadow:0 4px 24px rgba(0,0,0,.5);max-height:calc(100vh - 170px)}",
    ".xv table{border-collapse:collapse;font:13px Calibri,Carlito,Arial,sans-serif}",
    ".xv td,.xv th{border:1px solid #d4d4d4;padding:3px 7px;white-space:nowrap;max-width:420px;overflow:hidden;text-overflow:ellipsis}",
    ".xv th{position:sticky;top:0;background:#EFEFEF;color:#444;font-weight:600;z-index:1}",
    ".xv td.rn{position:sticky;left:0;background:#EFEFEF;color:#444;text-align:center;font-weight:600}",
    ".xv td.n{text-align:right}",
    ".ml{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:12px}",
    ".ml-h{background:#151513;border:1px solid #2B2822;border-left:4px solid #F2C52A;border-radius:12px;padding:14px 16px}",
    ".ml-h h2{margin:0 0 10px;font:800 20px/1.2 var(--f-body,Barlow,Arial,sans-serif);color:#F4F1E8;overflow-wrap:anywhere}",
    ".ml-h dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13.5px}.ml-h dt{color:#A6A093;font-weight:700}.ml-h dd{margin:0;color:#F4F1E8;overflow-wrap:anywhere}",
    ".ml-f{width:100%;border:0;border-radius:12px;background:#fff;min-height:200px;display:block}",
    ".ml-t{white-space:pre-wrap;background:#fff;color:#111;border-radius:12px;padding:16px;font:14px/1.5 Arial,sans-serif;overflow-wrap:anywhere}",
    ".ml-s{font:700 12px var(--f-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:#A6A093;margin-top:4px}",
    ".ml-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.ml-g a{display:block;border-radius:10px;overflow:hidden;border:1px solid #2B2822;background:#151513}.ml-g img{display:block;width:100%;height:130px;object-fit:cover}.ml-g span{display:block;padding:6px 8px;font-size:12px;color:#A6A093;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".ml-a{display:flex;flex-wrap:wrap;gap:8px}.ml-a a{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;border-radius:999px;border:1px solid #3A352B;background:#151513;color:#F4F1E8;font-size:13px;text-decoration:none}",
    ".tv{max-width:1000px;margin:0 auto;white-space:pre-wrap;font:13px var(--f-mono,monospace);background:#151513;border:1px solid #2B2822;border-radius:10px;padding:14px;color:#F4F1E8}",
    "@media (max-width:560px){.vw-top{flex-wrap:wrap}.vw-tt{flex-basis:calc(100% - 50px)}.vw-b{flex:1}.vw-body{padding:10px}.dv-page{padding:22px 18px}}"
  ].join("\n");
  document.head.appendChild(css);

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function loadScript(src, test, ms) {
    return new Promise(function (res, rej) {
      if (test()) return res();
      var s = document.createElement("script"), done = false;
      var t = setTimeout(function () { if (!done) { done = true; rej(new Error("timeout")); } }, ms || 8000);
      s.src = src; s.async = true;
      s.onload = function () { if (done) return; done = true; clearTimeout(t); test() ? res() : rej(new Error("noglobal")); };
      s.onerror = function () { if (done) return; done = true; clearTimeout(t); rej(new Error("load")); };
      document.head.appendChild(s);
    });
  }
  function zipLib() { return loadScript("js/jszip.min.js", function () { return !!window.JSZip; }, 15000).then(function () { return window.JSZip; }); }

  /* ---------- XML ---------- */
  function xml(s) { return new DOMParser().parseFromString(s, "application/xml"); }
  function kids(el, n) { var o = []; if (!el) return o; for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (!n || c.localName === n) o.push(c); return o; }
  function kid(el, n) { if (!el) return null; for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (c.localName === n) return c; return null; }
  function path(el, p) { var parts = p.split("/"); for (var i = 0; i < parts.length && el; i++) el = kid(el, parts[i]); return el; }
  function all(el, n) { if (!el) return []; var o = [], l = el.getElementsByTagName("*"); for (var i = 0; i < l.length; i++) if (l[i].localName === n) o.push(l[i]); return o; }
  function at(el, n) { if (!el) return null; var v = el.getAttribute(n); if (v != null) return v; for (var i = 0; i < el.attributes.length; i++) if (el.attributes[i].localName === n) return el.attributes[i].value; return null; }
  function atR(el, n) { if (!el) return null; for (var i = 0; i < el.attributes.length; i++) { var a = el.attributes[i]; if (a.localName === n && /relationships/.test(a.namespaceURI || "")) return a.value; } return null; }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function dirOf(p) { return p.slice(0, p.lastIndexOf("/") + 1); }
  function resolve(base, t) {
    if (t.charAt(0) === "/") return t.slice(1);
    var parts = (dirOf(base) + t).split("/"), o = [];
    parts.forEach(function (x) { if (x === "..") o.pop(); else if (x && x !== ".") o.push(x); });
    return o.join("/");
  }
  async function readRels(zip, file) {
    var rp = dirOf(file) + "_rels/" + file.slice(file.lastIndexOf("/") + 1) + ".rels", f = zip.file(rp), m = {};
    if (!f) return m;
    kids(xml(await f.async("string")).documentElement, "Relationship").forEach(function (r) {
      m[at(r, "Id")] = { target: at(r, "TargetMode") === "External" ? at(r, "Target") : resolve(file, at(r, "Target")), type: at(r, "Type") || "", ext: at(r, "TargetMode") === "External" };
    });
    return m;
  }
  var MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", svg: "image/svg+xml", webp: "image/webp", tif: "image/tiff", tiff: "image/tiff" };
  function mediaUrl(zip, p, cache, urls) {
    if (cache[p]) return cache[p];
    var f = zip.file(p), e = (p.split(".").pop() || "").toLowerCase();
    if (!f || !MIME[e]) return (cache[p] = Promise.resolve(null));
    cache[p] = f.async("blob").then(function (b) { var u = URL.createObjectURL(new Blob([b], { type: MIME[e] })); urls.push(u); return u; });
    return cache[p];
  }

  /* ---------- colores ---------- */
  function hex2rgb(h) { h = (h || "000000").replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { var d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
  function hsl2rgb(h, s, l) { function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; } if (!s) return [l * 255, l * 255, l * 255]; var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]; }
  var PRST = { black: "000000", white: "FFFFFF", red: "FF0000", green: "008000", blue: "0000FF", yellow: "FFFF00", gray: "808080", grey: "808080" };
  function color(el, th) {
    if (!el) return null;
    var c = null, base = null;
    for (var x = el.firstElementChild; x; x = x.nextElementSibling) {
      var n = x.localName;
      if (n === "srgbClr") { base = at(x, "val"); c = x; break; }
      if (n === "sysClr") { base = at(x, "lastClr") || (at(x, "val") === "window" ? "FFFFFF" : "000000"); c = x; break; }
      if (n === "schemeClr") { var k = at(x, "val"); k = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2", phClr: "accent1" }[k] || k; base = (th && th.clr[k]) || "000000"; c = x; break; }
      if (n === "prstClr") { base = PRST[at(x, "val")] || "000000"; c = x; break; }
      if (n === "scrgbClr") { base = [at(x, "r"), at(x, "g"), at(x, "b")].map(function (v) { return ("0" + Math.round(num(v, 0) / 100000 * 255).toString(16)).slice(-2); }).join(""); c = x; break; }
    }
    if (!c) return null;
    var rgb = hex2rgb(base), a = 1;
    kids(c).forEach(function (m) {
      var v = num(at(m, "val"), 100000) / 100000, hsl;
      switch (m.localName) {
        case "lumMod": hsl = rgb2hsl.apply(null, rgb); hsl[2] *= v; rgb = hsl2rgb.apply(null, hsl); break;
        case "lumOff": hsl = rgb2hsl.apply(null, rgb); hsl[2] = Math.min(1, hsl[2] + v); rgb = hsl2rgb.apply(null, hsl); break;
        case "shade": rgb = rgb.map(function (q) { return q * v; }); break;
        case "tint": rgb = rgb.map(function (q) { return q + (255 - q) * (1 - v); }); break;
        case "alpha": a = v; break;
      }
    });
    rgb = rgb.map(function (q) { return Math.max(0, Math.min(255, Math.round(q))); });
    return a < 1 ? "rgba(" + rgb.join(",") + "," + a.toFixed(2) + ")" : "rgb(" + rgb.join(",") + ")";
  }

  /* ================= PowerPoint ================= */
  async function renderPptx(blob, body, ctx) {
    var Z = await zipLib(), zip = await Z.loadAsync(blob);
    var pres = xml(await zip.file("ppt/presentation.xml").async("string")).documentElement;
    var sz = path(pres, "sldSz"), W = num(at(sz, "cx"), 9144000) / EMU, H = num(at(sz, "cy"), 5143500) / EMU;
    var prel = await readRels(zip, "ppt/presentation.xml");
    var ids = kids(path(pres, "sldIdLst"), "sldId").map(function (s) { var r = prel[atR(s, "id")]; return r && r.target; }).filter(Boolean);
    if (!ids.length) throw new Error("sin diapositivas");
    var cache = {}, docs = {};
    async function load(p) { if (!docs[p]) { var f = zip.file(p); docs[p] = f ? f.async("string").then(function (s) { return xml(s).documentElement; }) : Promise.resolve(null); } return docs[p]; }
    var themes = {};
    async function theme(p) {
      if (themes[p]) return themes[p];
      var t = { clr: {}, maj: "Calibri", min: "Calibri" }, d = await load(p);
      if (d) {
        kids(path(d, "themeElements/clrScheme")).forEach(function (c) { var v = kid(c, "srgbClr"), s = kid(c, "sysClr"); t.clr[c.localName] = v ? at(v, "val") : s ? (at(s, "lastClr") || "000000") : "000000"; });
        var mj = path(d, "themeElements/fontScheme/majorFont/latin"), mn = path(d, "themeElements/fontScheme/minorFont/latin");
        if (mj) t.maj = at(mj, "typeface") || t.maj; if (mn) t.min = at(mn, "typeface") || t.min;
      }
      return (themes[p] = t);
    }
    body.innerHTML = '<div class="vw-note">Vista previa del PowerPoint · ' + ids.length + (ids.length === 1 ? " diapositiva" : " diapositivas") + '. Para ver animaciones o editar, descárgalo.</div><div class="pv-list"></div>';
    var list = body.querySelector(".pv-list"), wraps = [];
    function fit() { wraps.forEach(function (w) { var s = w.clientWidth / W; w.style.height = (H * s) + "px"; w.firstChild.style.transform = "scale(" + s + ")"; }); }
    ctx.onResize = fit;
    for (var i = 0; i < ids.length; i++) {
      if (ctx.closed) return;
      var wrap = document.createElement("div"); wrap.className = "pv-wrap";
      var s = document.createElement("div"); s.className = "pv-s"; s.style.width = W + "px"; s.style.height = H + "px";
      wrap.appendChild(s); list.appendChild(wrap);
      var n = document.createElement("div"); n.className = "pv-n"; n.textContent = "Diapositiva " + (i + 1) + " de " + ids.length; list.appendChild(n);
      wraps.push(wrap); fit();
      try { await renderSlide(ids[i], s); } catch (e) { s.innerHTML = '<div class="pv-ph" style="inset:0">No se pudo mostrar esta diapositiva</div>'; }
    }
    fit();

    async function renderSlide(sp, el) {
      var sd = await load(sp), srel = await readRels(zip, sp), lp = null, mp = null;
      Object.keys(srel).forEach(function (k) { if (/slideLayout$/.test(srel[k].type)) lp = srel[k].target; });
      var ld = lp ? await load(lp) : null, lrel = lp ? await readRels(zip, lp) : {};
      Object.keys(lrel).forEach(function (k) { if (/slideMaster$/.test(lrel[k].type)) mp = lrel[k].target; });
      var md = mp ? await load(mp) : null, mrel = mp ? await readRels(zip, mp) : {}, tp = null;
      Object.keys(mrel).forEach(function (k) { if (/theme$/.test(mrel[k].type)) tp = mrel[k].target; });
      var th = tp ? await theme(tp) : { clr: {}, maj: "Calibri", min: "Calibri" };
      var phs = { layout: phMap(ld), master: phMap(md) };
      var txS = md ? path(md, "txStyles") : null;
      var C = { zip: zip, th: th, phs: phs, txS: txS, el: el };
      // fondo
      var bg = null, bgRels = srel;
      [[sd, srel], [ld, lrel], [md, mrel]].some(function (p) { var b = p[0] && path(p[0], "cSld/bg"); if (b) { bg = b; bgRels = p[1]; return true; } return false; });
      el.style.background = "#fff";
      if (bg) {
        var bp = kid(bg, "bgPr"), br = kid(bg, "bgRef");
        if (bp) await applyFill(el, bp, th, bgRels, true);
        else if (br) { var c0 = color(br, th); if (c0) el.style.background = c0; }
      }
      var showM = at(sd, "showMasterSp") !== "0" && !(ld && at(ld, "showMasterSp") === "0");
      if (md && showM) await tree(path(md, "cSld/spTree"), C, mrel, null, true);
      if (ld && at(sd, "showMasterSp") !== "0") await tree(path(ld, "cSld/spTree"), C, lrel, null, true);
      await tree(path(sd, "cSld/spTree"), C, srel, null, false);
    }
    function phMap(d) {
      var m = { idx: {}, type: {} };
      if (!d) return m;
      all(path(d, "cSld/spTree"), "sp").forEach(function (s) {
        var ph = path(s, "nvSpPr/nvPr/ph"); if (!ph) return;
        var info = { xfrm: path(s, "spPr/xfrm"), sp: s };
        var ix = at(ph, "idx"), ty = at(ph, "type") || "body";
        if (ix != null) m.idx[ix] = info;
        if (!m.type[ty]) m.type[ty] = info;
      });
      return m;
    }
    function phLookup(C, ph) {
      var ix = at(ph, "idx"), ty = at(ph, "type") || (ix != null ? null : "body"), out = [];
      ["layout", "master"].forEach(function (k) {
        var m = C.phs[k], hit = (ix != null && m.idx[ix]) || (ty && m.type[ty]) || (ty === "ctrTitle" && m.type.title) || (ty === "subTitle" && m.type.body) || (!ty && m.type.body);
        if (hit) out.push(hit);
      });
      return out;
    }
    function xf(x, T) {
      if (!x) return null;
      var o = kid(x, "off"), e = kid(x, "ext");
      var r = { x: num(at(o, "x"), 0), y: num(at(o, "y"), 0), w: num(at(e, "cx"), 0), h: num(at(e, "cy"), 0), rot: num(at(x, "rot"), 0) / 60000, fh: at(x, "flipH") === "1", fv: at(x, "flipV") === "1" };
      if (T) { r.x = T.ox + (r.x - T.cx) * T.sx; r.y = T.oy + (r.y - T.cy) * T.sy; r.w *= T.sx; r.h *= T.sy; r.rot += T.rot || 0; }
      return r;
    }
    function box(d, r) {
      d.style.left = r.x / EMU + "px"; d.style.top = r.y / EMU + "px"; d.style.width = Math.max(0, r.w / EMU) + "px"; d.style.height = Math.max(0, r.h / EMU) + "px";
      var t = []; if (r.rot) t.push("rotate(" + r.rot + "deg)"); if (r.fh) t.push("scaleX(-1)"); if (r.fv) t.push("scaleY(-1)");
      if (t.length) d.style.transform = t.join(" ");
    }
    async function applyFill(d, pr, th, rels, isBg) {
      for (var f = pr.firstElementChild; f; f = f.nextElementSibling) {
        var n = f.localName;
        if (n === "noFill") { d.style.background = isBg ? "#fff" : "transparent"; return true; }
        if (n === "solidFill") { var c = color(f, th); if (c) d.style.background = c; return true; }
        if (n === "gradFill") {
          var stops = all(f, "gs").map(function (g) { return { p: num(at(g, "pos"), 0) / 1000, c: color(g, th) || "#ccc" }; }).sort(function (a, b) { return a.p - b.p; });
          var lin = kid(f, "lin"), ang = lin ? num(at(lin, "ang"), 0) / 60000 + 90 : 180;
          if (stops.length) d.style.background = "linear-gradient(" + ang + "deg," + stops.map(function (s) { return s.c + " " + s.p + "%"; }).join(",") + ")";
          return true;
        }
        if (n === "blipFill") {
          var bl = kid(f, "blip"), id = bl && (at(bl, "embed")), r = id && rels[id];
          if (r && !r.ext) { var u = await mediaUrl(zip, r.target, cache, ctx.urls); if (u) { d.style.background = "url('" + u + "') center/" + (kid(f, "tile") ? "auto" : "100% 100%") + " no-repeat"; } }
          return true;
        }
      }
      return false;
    }
    function groupT(g, T) {
      var x = path(g, "grpSpPr/xfrm"); if (!x) return T;
      var o = kid(x, "off"), e = kid(x, "ext"), co = kid(x, "chOff"), ce = kid(x, "chExt");
      var R = { x: num(at(o, "x"), 0), y: num(at(o, "y"), 0), w: num(at(e, "cx"), 1), h: num(at(e, "cy"), 1) };
      if (T) { R.x = T.ox + (R.x - T.cx) * T.sx; R.y = T.oy + (R.y - T.cy) * T.sy; R.w *= T.sx; R.h *= T.sy; }
      var cw = num(at(ce, "cx"), 0) || R.w, chh = num(at(ce, "cy"), 0) || R.h;
      return { ox: R.x, oy: R.y, cx: num(at(co, "x"), 0), cy: num(at(co, "y"), 0), sx: R.w / cw, sy: R.h / chh, rot: (T && T.rot || 0) };
    }
    async function tree(t, C, rels, T, skipPh) {
      if (!t) return;
      for (var n = t.firstElementChild; n; n = n.nextElementSibling) {
        if (ctx.closed) return;
        var k = n.localName;
        try {
          if (k === "AlternateContent") { var fb = kid(n, "Fallback") || kid(n, "Choice"); if (fb) await tree(fb, C, rels, T, skipPh); }
          else if (k === "sp") await shape(n, C, rels, T, skipPh);
          else if (k === "pic") await pic(n, C, rels, T, skipPh);
          else if (k === "grpSp") await tree(n, C, rels, groupT(n, T), skipPh);
          else if (k === "graphicFrame") await frame(n, C, rels, T);
          else if (k === "cxnSp") line(n, C, T);
        } catch (e) { /* una forma rota no debe tumbar la diapositiva */ }
      }
    }
    function isPh(n, nv) { return !!path(n, nv + "/nvPr/ph"); }
    async function shape(n, C, rels, T, skipPh) {
      var ph = path(n, "nvSpPr/nvPr/ph");
      if (ph && skipPh) return;
      var pr = kid(n, "spPr"), inh = ph ? phLookup(C, ph) : [];
      var x = path(pr, "xfrm"); if (!x) inh.some(function (h) { if (h.xfrm) { x = h.xfrm; return true; } return false; });
      var r = xf(x, T); if (!r) return;
      var d = document.createElement("div"); d.className = "sh"; box(d, r);
      var filled = pr ? await applyFill(d, pr, C.th, rels) : false;
      var st = kid(n, "style");
      if (!filled && st && !ph) { var fr = kid(st, "fillRef"); if (fr && at(fr, "idx") !== "0") { var fc = color(fr, C.th); if (fc) d.style.background = fc; } }
      var ln = pr && kid(pr, "ln"), lnDone = false;
      if (ln) {
        if (kid(ln, "noFill")) lnDone = true;
        else { var lc = color(kid(ln, "solidFill"), C.th); if (lc) { d.style.border = Math.max(1, num(at(ln, "w"), 12700) / EMU) + "px solid " + lc; lnDone = true; } }
      }
      if (!lnDone && st && !ph) { var lr = kid(st, "lnRef"); if (lr && at(lr, "idx") !== "0") { var lc2 = color(lr, C.th); if (lc2) d.style.border = "1px solid " + lc2; } }
      var g = path(pr, "prstGeom"), pg = g ? at(g, "prst") : "rect";
      if (pg === "ellipse" || pg === "flowChartConnector") d.style.borderRadius = "50%";
      else if (pg === "roundRect" || pg === "flowChartAlternateProcess") { var av = all(g, "gd")[0], adj = av ? num((at(av, "fmla") || "").replace(/\D+/g, ""), 16667) : 16667; d.style.borderRadius = Math.min(r.w, r.h) / EMU * adj / 100000 + "px"; }
      else if (pg === "triangle") d.style.clipPath = "polygon(50% 0,100% 100%,0 100%)";
      else if (pg === "rightArrow") d.style.clipPath = "polygon(0 25%,60% 25%,60% 0,100% 50%,60% 100%,60% 75%,0 75%)";
      else if (pg === "leftArrow") d.style.clipPath = "polygon(100% 25%,40% 25%,40% 0,0 50%,40% 100%,40% 75%,100% 75%)";
      else if (pg === "downArrow") d.style.clipPath = "polygon(25% 0,75% 0,75% 60%,100% 60%,50% 100%,0 60%,25% 60%)";
      else if (pg === "upArrow") d.style.clipPath = "polygon(50% 0,100% 40%,75% 40%,75% 100%,25% 100%,25% 40%,0 40%)";
      else if (pg === "chevron" || pg === "homePlate") d.style.clipPath = pg === "chevron" ? "polygon(0 0,75% 0,100% 50%,75% 100%,0 100%,25% 50%)" : "polygon(0 0,80% 0,100% 50%,80% 100%,0 100%)";
      else if (pg === "diamond" || pg === "flowChartDecision") d.style.clipPath = "polygon(50% 0,100% 50%,50% 100%,0 50%)";
      var tb = kid(n, "txBody");
      if (tb) {
        var ty = ph ? (at(ph, "type") || "body") : null;
        var defClr = null;
        if (st && !ph) { var fo = kid(st, "fontRef"); if (fo) defClr = color(fo, C.th); }
        text(d, tb, C, { ph: ty, lvlIdx: ph, inh: inh, defClr: defClr, r: r });
      }
      C.el.appendChild(d);
    }
    function lvlPr(list, lvl) { return list ? kid(list, "lvl" + (lvl + 1) + "pPr") : null; }
    function text(d, tb, C, o) {
      var bp = kid(tb, "bodyPr");
      var inhBp = null; o.inh.some(function (h) { var t = kid(h.sp, "txBody"); var b = t && kid(t, "bodyPr"); if (b && b.attributes.length) { inhBp = b; return true; } return false; });
      function bpa(n2, def) { var v = bp && at(bp, n2); if (v == null && inhBp) v = at(inhBp, n2); return v == null ? def : v; }
      var tx = document.createElement("div"); tx.className = "tx";
      tx.style.padding = num(bpa("tIns"), 45720) / EMU + "px " + num(bpa("rIns"), 91440) / EMU + "px " + num(bpa("bIns"), 45720) / EMU + "px " + num(bpa("lIns"), 91440) / EMU + "px";
      var an = bpa("anchor", o.ph === "title" || o.ph === "ctrTitle" ? "ctr" : "t");
      tx.style.justifyContent = an === "ctr" ? "center" : an === "b" ? "flex-end" : "flex-start";
      if (bpa("wrap") === "none") tx.style.whiteSpace = "nowrap";
      var vert = bpa("vert"); if (vert === "vert270") { tx.style.writingMode = "vertical-rl"; tx.style.transform = "rotate(180deg)"; } else if (vert === "vert" || vert === "eaVert") tx.style.writingMode = "vertical-rl";
      var fa = bp && kid(bp, "normAutofit"), scale = fa ? num(at(fa, "fontScale"), 100000) / 100000 : 1;
      var lnRed = fa ? num(at(fa, "lnSpcReduction"), 0) / 100000 : 0;
      // estilos heredados: master txStyles + lstStyle del placeholder
      var master = null;
      if (C.txS) master = o.ph === "title" || o.ph === "ctrTitle" ? kid(C.txS, "titleStyle") : o.ph ? kid(C.txS, "bodyStyle") : kid(C.txS, "otherStyle");
      var lists = [];
      lists.push(kid(tb, "lstStyle"));
      o.inh.forEach(function (h) { var t = kid(h.sp, "txBody"); if (t) lists.push(kid(t, "lstStyle")); });
      function prop(lvl, fn, noMaster) { var L = noMaster ? lists : lists.concat([master]); for (var i = 0; i < L.length; i++) { var p = lvlPr(L[i], lvl); if (p) { var v = fn(p); if (v != null) return v; } } return null; }
      var bulletOn = o.ph && o.ph !== "title" && o.ph !== "ctrTitle" && o.ph !== "subTitle" && o.ph !== "sldNum" && o.ph !== "dt" && o.ph !== "ftr";
      kids(tb, "p").forEach(function (p) {
        var pPr = kid(p, "pPr"), lvl = pPr ? num(at(pPr, "lvl"), 0) : 0;
        var pe = document.createElement("p");
        var algn = (pPr && at(pPr, "algn")) || prop(lvl, function (x) { return at(x, "algn"); }) || "l";
        pe.style.textAlign = { l: "left", ctr: "center", r: "right", just: "justify", dist: "justify" }[algn] || "left";
        var mar = (pPr && at(pPr, "marL")) || prop(lvl, function (x) { return at(x, "marL"); });
        var ind = (pPr && at(pPr, "indent")) || prop(lvl, function (x) { return at(x, "indent"); });
        var ls = (pPr && path(pPr, "lnSpc/spcPct")) || prop(lvl, function (x) { return path(x, "lnSpc/spcPct"); });
        pe.style.lineHeight = ((ls ? num(at(ls, "val"), 100000) / 100000 : 1) * 1.17 * (1 - lnRed)).toFixed(3);
        var sb = (pPr && path(pPr, "spcBef/spcPts")) || prop(lvl, function (x) { return path(x, "spcBef/spcPts"); });
        if (sb) pe.style.marginTop = num(at(sb, "val"), 0) / 100 * 4 / 3 * scale + "px";
        var sa = (pPr && path(pPr, "spcAft/spcPts")) || prop(lvl, function (x) { return path(x, "spcAft/spcPts"); });
        if (sa) pe.style.marginBottom = num(at(sa, "val"), 0) / 100 * 4 / 3 * scale + "px";
        var defR = function (fn, noMaster) { var pr2 = pPr && kid(pPr, "defRPr"); var v = pr2 ? fn(pr2) : null; return v != null ? v : prop(lvl, function (x) { var r2 = kid(x, "defRPr"); return r2 ? fn(r2) : null; }, noMaster); };
        var defSz = num(defR(function (r2) { return at(r2, "sz"); }), o.ph === "title" || o.ph === "ctrTitle" ? 4400 : o.ph ? 2800 - lvl * 400 : 1800);
        var clrOf = function (r2) { return color(kid(r2, "solidFill"), C.th); };
        var defCl = defR(clrOf, true) || o.defClr || defR(clrOf) || "#" + (C.th.clr.dk1 || "000000");
        var defB = defR(function (r2) { return at(r2, "b"); }) === "1";
        var defFont = defR(function (r2) { var l = kid(r2, "latin"); return l ? at(l, "typeface") : null; });
        // viñeta
        var buDec = function (x) { if (kid(x, "buNone")) return "none"; var bc = kid(x, "buChar"); if (bc) return at(bc, "char") || "•"; if (kid(x, "buAutoNum")) return "•"; return null; };
        var bu = (pPr && buDec(pPr)) || prop(lvl, buDec) || (bulletOn ? "•" : "none");
        var hasText = kids(p, "r").some(function (r2) { return (kid(r2, "t") || {}).textContent; });
        var marPx = mar != null ? num(mar, 0) / EMU : (bu !== "none" ? 24 * (lvl + 1) : 0);
        if (marPx) pe.style.paddingLeft = marPx + "px";
        var indPx = ind != null ? num(ind, 0) / EMU : (bu !== "none" ? -Math.min(marPx, 18) : 0);
        if (indPx < 0) pe.style.textIndent = indPx + "px";
        if (hasText && bu !== "none") {
          var bs = document.createElement("span"); bs.textContent = bu + "\u2002"; bs.style.fontSize = defSz / 100 * 4 / 3 * scale + "px"; bs.style.color = defCl; pe.appendChild(bs);
        }
        var any = false;
        for (var r = p.firstElementChild; r; r = r.nextElementSibling) {
          var rn = r.localName;
          if (rn === "br") { pe.appendChild(document.createElement("br")); continue; }
          if (rn !== "r" && rn !== "fld") continue;
          var rp = kid(r, "rPr"), t = kid(r, "t"), s = document.createElement("span");
          s.textContent = t ? t.textContent : "";
          var szv = num(rp && at(rp, "sz"), defSz);
          s.style.fontSize = szv / 100 * 4 / 3 * scale + "px";
          var b = rp && at(rp, "b"); if (b === "1" || (b == null && defB)) s.style.fontWeight = "700";
          if (rp && at(rp, "i") === "1") s.style.fontStyle = "italic";
          if (rp && at(rp, "u") && at(rp, "u") !== "none") s.style.textDecoration = "underline";
          if (rp && at(rp, "strike") && at(rp, "strike") !== "noStrike") s.style.textDecoration = "line-through";
          var cl = rp && color(kid(rp, "solidFill"), C.th); s.style.color = cl || defCl;
          var hl = rp && kid(rp, "highlight"); if (hl) { var hc = color(hl, C.th); if (hc) s.style.background = hc; }
          var lat = rp && kid(rp, "latin"), face = (lat && at(lat, "typeface")) || defFont || (o.ph === "title" || o.ph === "ctrTitle" ? "+mj-lt" : "+mn-lt");
          if (face === "+mj-lt") face = C.th.maj; else if (face === "+mn-lt") face = C.th.min;
          s.style.fontFamily = "'" + face + "'," + (/(Calibri)/i.test(face) ? "Carlito," : "") + "Arial,sans-serif";
          var bl = rp && at(rp, "baseline"); if (bl && num(bl, 0)) { s.style.verticalAlign = num(bl, 0) > 0 ? "super" : "sub"; s.style.fontSize = szv / 100 * 4 / 3 * scale * 0.7 + "px"; }
          pe.appendChild(s); any = true;
        }
        if (!any) { var e2 = document.createElement("span"); e2.innerHTML = "&#8203;"; var es = kid(p, "endParaRPr"); e2.style.fontSize = num(es && at(es, "sz"), defSz) / 100 * 4 / 3 * scale + "px"; pe.appendChild(e2); }
        tx.appendChild(pe);
      });
      d.appendChild(tx);
    }
    async function pic(n, C, rels, T, skipPh) {
      var ph = path(n, "nvPicPr/nvPr/ph"); if (ph && skipPh) return;
      var x = path(n, "spPr/xfrm"); if (!x && ph) phLookup(C, ph).some(function (h) { if (h.xfrm) { x = h.xfrm; return true; } return false; });
      var r = xf(x, T); if (!r) return;
      var bl = path(n, "blipFill/blip"), id = bl && at(bl, "embed"), rel = id && rels[id];
      var u = rel && !rel.ext ? await mediaUrl(zip, rel.target, cache, ctx.urls) : null;
      if (!u) { var ph2 = document.createElement("div"); ph2.className = "pv-ph"; box(ph2, r); ph2.textContent = "Imagen"; C.el.appendChild(ph2); return; }
      var src = path(n, "blipFill/srcRect"), host = document.createElement("div"); host.className = "sh"; host.style.overflow = "hidden"; box(host, r);
      var img = document.createElement("img"); img.src = u; img.alt = "";
      if (src) {
        var l = num(at(src, "l"), 0) / 1000, t = num(at(src, "t"), 0) / 1000, rr = num(at(src, "r"), 0) / 1000, bb = num(at(src, "b"), 0) / 1000;
        var ww = 100 / Math.max(1, 100 - l - rr) * 100, hh = 100 / Math.max(1, 100 - t - bb) * 100;
        img.style.width = ww + "%"; img.style.height = hh + "%"; img.style.left = -l * ww / 100 + "%"; img.style.top = -t * hh / 100 + "%";
      } else { img.style.width = "100%"; img.style.height = "100%"; img.style.left = "0"; img.style.top = "0"; }
      host.appendChild(img);
      var ln = path(n, "spPr/ln"); if (ln && !kid(ln, "noFill")) { var lc = color(kid(ln, "solidFill"), C.th); if (lc) host.style.border = Math.max(1, num(at(ln, "w"), 12700) / EMU) + "px solid " + lc; }
      C.el.appendChild(host);
    }
    function line(n, C, T) {
      var r = xf(path(n, "spPr/xfrm"), T); if (!r) return;
      var ln = path(n, "spPr/ln"), c = ln && color(kid(ln, "solidFill"), C.th);
      if (!c) { var st = kid(n, "style"), lr = st && kid(st, "lnRef"); c = lr ? color(lr, C.th) : null; }
      if (ln && kid(ln, "noFill")) return;
      var w = ln ? Math.max(1, num(at(ln, "w"), 12700) / EMU) : 1;
      var NS = "http://www.w3.org/2000/svg", sv = document.createElementNS(NS, "svg"), L = document.createElementNS(NS, "line");
      var W2 = Math.max(r.w / EMU, 1), H2 = Math.max(r.h / EMU, 1);
      sv.setAttribute("width", W2 + 2 * w); sv.setAttribute("height", H2 + 2 * w);
      sv.style.cssText = "position:absolute;overflow:visible;left:" + (r.x / EMU - w) + "px;top:" + (r.y / EMU - w) + "px" + (r.rot ? ";transform:rotate(" + r.rot + "deg)" : "");
      var x1 = r.fh ? W2 : 0, x2 = r.fh ? 0 : W2, y1 = r.fv ? H2 : 0, y2 = r.fv ? 0 : H2;
      if (r.h === 0) { y1 = y2 = 0; } if (r.w === 0) { x1 = x2 = 0; }
      L.setAttribute("x1", x1 + w); L.setAttribute("y1", y1 + w); L.setAttribute("x2", x2 + w); L.setAttribute("y2", y2 + w);
      L.setAttribute("stroke", c || "#000"); L.setAttribute("stroke-width", w);
      sv.appendChild(L); C.el.appendChild(sv);
    }
    async function frame(n, C, rels, T) {
      var r = xf(kid(n, "xfrm"), T); if (!r) return;
      var gd = path(n, "graphic/graphicData"), tbl = gd && kid(gd, "tbl");
      if (!tbl) {
        var ph = document.createElement("div"); ph.className = "pv-ph"; box(ph, r);
        ph.textContent = /chart/.test(at(gd, "uri") || "") ? "Gráfico · descárgalo para verlo completo" : "Objeto incrustado"; C.el.appendChild(ph); return;
      }
      var cols = kids(kid(tbl, "tblGrid"), "gridCol").map(function (g) { return num(at(g, "w"), 0) / EMU; });
      var t = document.createElement("table"); t.style.left = r.x / EMU + "px"; t.style.top = r.y / EMU + "px"; t.style.width = cols.reduce(function (a, b) { return a + b; }, 0) + "px";
      var cg = document.createElement("colgroup"); cols.forEach(function (w) { var c = document.createElement("col"); c.style.width = w + "px"; cg.appendChild(c); }); t.appendChild(cg);
      kids(tbl, "tr").forEach(function (tr) {
        var row = document.createElement("tr"); row.style.height = num(at(tr, "h"), 0) / EMU + "px";
        kids(tr, "tc").forEach(function (tc) {
          if (at(tc, "hMerge") === "1" || at(tc, "vMerge") === "1") return;
          var td = document.createElement("td");
          if (at(tc, "gridSpan")) td.colSpan = +at(tc, "gridSpan"); if (at(tc, "rowSpan")) td.rowSpan = +at(tc, "rowSpan");
          var pr = kid(tc, "tcPr"); if (pr) { var f = color(kid(pr, "solidFill"), C.th); if (f) td.style.background = f; var an = at(pr, "anchor"); if (an) td.style.verticalAlign = an === "ctr" ? "middle" : an === "b" ? "bottom" : "top"; }
          var holder = document.createElement("div"); holder.style.position = "relative";
          var tb = kid(tc, "txBody"); if (tb) { text(holder, tb, C, { ph: null, inh: [], defClr: null }); var tx = holder.firstChild; if (tx) { tx.style.position = "static"; tx.style.padding = "0"; } }
          td.appendChild(holder); row.appendChild(td);
        });
        t.appendChild(row);
      });
      C.el.appendChild(t);
    }
  }

  /* ================= Word ================= */
  async function renderDocx(blob, body, ctx) {
    // 1) intento con docx-preview (mejor fidelidad) si el CDN responde
    try {
      await zipLib();
      await loadScript("https://cdn.jsdelivr.net/npm/docx-preview@0.3.2/dist/docx-preview.min.js", function () { return window.docx && window.docx.renderAsync; }, 7000);
      body.innerHTML = "";
      var host = document.createElement("div"); body.appendChild(host);
      await window.docx.renderAsync(blob, host, null, { inWrapper: true, ignoreLastRenderedPageBreak: true, experimental: true, useBase64URL: true });
      fitDocx(host); ctx.onResize = function () { fitDocx(host); };
      return;
    } catch (e) { /* sigue con el visor propio */ }
    if (ctx.closed) return;
    var Z = await zipLib(), zip = await Z.loadAsync(blob);
    var f = zip.file("word/document.xml"); if (!f) throw new Error("no es docx");
    var doc = xml(await f.async("string")).documentElement, rels = await readRels(zip, "word/document.xml"), cache = {};
    var styles = {}, sf = zip.file("word/styles.xml"), defSz = 22;
    if (sf) {
      var sd = xml(await sf.async("string")).documentElement;
      var dr = path(sd, "docDefaults/rPrDefault/rPr/sz"); if (dr) defSz = num(at(dr, "val"), 22);
      kids(sd, "style").forEach(function (s) {
        var nm = kid(s, "name"), rp = kid(s, "rPr"), pp = kid(s, "pPr");
        styles[at(s, "styleId")] = { name: nm ? at(nm, "val") : "", based: kid(s, "basedOn") ? at(kid(s, "basedOn"), "val") : null, rPr: rp, pPr: pp };
      });
    }
    function sChain(id, fn) { var g = 0; while (id && styles[id] && g++ < 12) { var v = fn(styles[id]); if (v != null) return v; id = styles[id].based; } return null; }
    var bd = kid(doc, "body"), sect = kid(bd, "sectPr"), pg = kid(sect, "pgSz"), pm = kid(sect, "pgMar");
    var page = document.createElement("div"); page.className = "dv-page";
    if (pg) page.style.maxWidth = num(at(pg, "w"), 11906) / 15 + "px";
    if (pm) page.style.padding = num(at(pm, "top"), 1440) / 15 * .8 + "px " + num(at(pm, "right"), 1440) / 15 * .8 + "px " + num(at(pm, "bottom"), 1440) / 15 * .8 + "px " + num(at(pm, "left"), 1440) / 15 * .8 + "px";
    page.style.fontSize = defSz / 2 * 4 / 3 + "px";
    body.innerHTML = '<div class="vw-note">Vista previa del Word. Para editarlo, descárgalo y ábrelo en Word.</div>';
    body.appendChild(page);
    async function runs(par, out, pStyle) {
      for (var r = par.firstElementChild; r; r = r.nextElementSibling) {
        var n = r.localName;
        if (n === "hyperlink" || n === "ins" || n === "smartTag" || n === "sdt" || n === "sdtContent" || n === "fldSimple") { await runs(r, out, pStyle); continue; }
        if (n !== "r") continue;
        var rp = kid(r, "rPr");
        for (var c = r.firstElementChild; c; c = c.nextElementSibling) {
          var k = c.localName;
          if (k === "t") {
            var s = document.createElement("span"); s.textContent = c.textContent;
            var B = function (nm) { var e = rp && kid(rp, nm); if (e) return at(e, "val") !== "0" && at(e, "val") !== "false"; return sChain(pStyle, function (st) { var e2 = st.rPr && kid(st.rPr, nm); return e2 ? at(e2, "val") !== "0" && at(e2, "val") !== "false" : null; }); };
            if (B("b")) s.style.fontWeight = "700"; if (B("i")) s.style.fontStyle = "italic";
            var u = rp && kid(rp, "u"); if (u && at(u, "val") !== "none") s.style.textDecoration = "underline";
            if (B("strike")) s.style.textDecoration = "line-through";
            var szE = rp && kid(rp, "sz"), szv = szE ? num(at(szE, "val"), defSz) : sChain(pStyle, function (st) { var e3 = st.rPr && kid(st.rPr, "sz"); return e3 ? num(at(e3, "val"), null) : null; });
            if (szv) s.style.fontSize = szv / 2 * 4 / 3 + "px";
            var co = rp && kid(rp, "color"), cv = co ? at(co, "val") : sChain(pStyle, function (st) { var e4 = st.rPr && kid(st.rPr, "color"); return e4 ? at(e4, "val") : null; });
            if (cv && cv !== "auto") s.style.color = "#" + cv;
            var hl = rp && kid(rp, "highlight"); if (hl) s.style.background = at(hl, "val");
            var sh = rp && kid(rp, "shd"); if (sh && at(sh, "fill") && at(sh, "fill") !== "auto") s.style.background = "#" + at(sh, "fill");
            var fn = rp && kid(rp, "rFonts"); if (fn && at(fn, "ascii")) s.style.fontFamily = "'" + at(fn, "ascii") + "',Calibri,Carlito,Arial,sans-serif";
            var va = rp && kid(rp, "vertAlign"); if (va) { s.style.verticalAlign = at(va, "val") === "superscript" ? "super" : "sub"; s.style.fontSize = "0.7em"; }
            out.appendChild(s);
          } else if (k === "tab") out.appendChild(document.createTextNode(" "));
          else if (k === "br") out.appendChild(at(c, "type") === "page" ? document.createElement("hr") : document.createElement("br"));
          else if (k === "drawing" || k === "pict" || k === "object") {
            var bl = all(c, "blip")[0], id = bl ? at(bl, "embed") : null;
            if (!id) { var im = all(c, "imagedata")[0]; id = im ? atR(im, "id") : null; }
            var rel = id && rels[id]; if (!rel || rel.ext) continue;
            var url = await mediaUrl(zip, rel.target, cache, ctx.urls); if (!url) continue;
            var img = document.createElement("img"); img.src = url; img.alt = "";
            var ex = all(c, "extent")[0]; if (ex) img.style.width = num(at(ex, "cx"), 0) / EMU + "px";
            out.appendChild(img);
          }
        }
      }
    }
    async function para(p, host) {
      var pp = kid(p, "pPr"), ps = pp && kid(pp, "pStyle"), sid = ps ? at(ps, "val") : null, nm = (sid && styles[sid] && styles[sid].name) || sid || "";
      var hm = /heading\s*(\d)|ttulo\s*(\d)|título\s*(\d)/i.exec(nm), isTitle = /^title$|^t[ií]tulo$/i.test(nm);
      var el = document.createElement(hm ? "h" + Math.min(3, +(hm[1] || hm[2] || hm[3])) : isTitle ? "h1" : "p");
      var jc = (pp && kid(pp, "jc")) ? at(kid(pp, "jc"), "val") : sChain(sid, function (st) { var j = st.pPr && kid(st.pPr, "jc"); return j ? at(j, "val") : null; });
      if (jc) el.style.textAlign = { center: "center", right: "right", end: "right", both: "justify", distribute: "justify" }[jc] || "left";
      var ind = pp && kid(pp, "ind"); if (ind && (at(ind, "left") || at(ind, "start"))) el.style.marginLeft = num(at(ind, "left") || at(ind, "start"), 0) / 15 + "px";
      var sp = pp && kid(pp, "spacing"); if (sp && at(sp, "after") != null) el.style.marginBottom = num(at(sp, "after"), 0) / 15 + "px"; if (sp && at(sp, "before") != null) el.style.marginTop = num(at(sp, "before"), 0) / 15 + "px";
      var shd = pp && kid(pp, "shd"); if (shd && at(shd, "fill") && at(shd, "fill") !== "auto") el.style.background = "#" + at(shd, "fill");
      var np = pp && kid(pp, "numPr");
      if (np || /list/i.test(nm)) { var lv = np && kid(np, "ilvl") ? num(at(kid(np, "ilvl"), "val"), 0) : 0; el.style.paddingLeft = 18 + lv * 22 + "px"; el.style.textIndent = "-14px"; el.appendChild(document.createTextNode("• ")); }
      await runs(p, el, sid);
      host.appendChild(el);
    }
    async function table(t, host) {
      var tb = document.createElement("table");
      for (var tr of kids(t, "tr")) {
        var row = document.createElement("tr");
        for (var tc of kids(tr, "tc")) {
          var pr = kid(tc, "tcPr"), vm = pr && kid(pr, "vMerge");
          if (vm && at(vm, "val") !== "restart") continue;
          var td = document.createElement("td");
          var gs = pr && kid(pr, "gridSpan"); if (gs) td.colSpan = num(at(gs, "val"), 1);
          var sh = pr && kid(pr, "shd"); if (sh && at(sh, "fill") && at(sh, "fill") !== "auto") td.style.background = "#" + at(sh, "fill");
          await block(tc, td); row.appendChild(td);
        }
        tb.appendChild(row);
      }
      host.appendChild(tb);
    }
    async function block(parent, host) {
      for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
        if (ctx.closed) return;
        if (n.localName === "p") await para(n, host);
        else if (n.localName === "tbl") await table(n, host);
        else if (n.localName === "sdt") await block(kid(n, "sdtContent") || n, host);
      }
    }
    await block(bd, page);
  }
  function fitDocx(host) {
    var w = host.parentNode.clientWidth;
    host.querySelectorAll("section.docx").forEach(function (s) {
      s.style.transform = ""; s.style.marginBottom = "";
      var sw = s.offsetWidth; if (sw > w && sw) { var k = w / sw; s.style.transformOrigin = "0 0"; s.style.transform = "scale(" + k + ")"; s.style.marginBottom = -(s.offsetHeight * (1 - k)) + 18 + "px"; s.style.marginLeft = "0"; }
    });
  }

  /* ================= Excel ================= */
  function colName(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; }
  function colIdx(ref) { var m = /^([A-Z]+)(\d+)$/.exec(ref || ""); if (!m) return null; var c = 0; for (var i = 0; i < m[1].length; i++) c = c * 26 + m[1].charCodeAt(i) - 64; return { c: c - 1, r: +m[2] - 1 }; }
  async function renderXlsx(blob, body, ctx, tabs) {
    var sheets = null, buf = await blob.arrayBuffer();
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", function () { return window.XLSX && window.XLSX.read; }, 7000);
      var wb = window.XLSX.read(buf, { type: "array", cellDates: true });
      var hid = {}; ((wb.Workbook && wb.Workbook.Sheets) || []).forEach(function (x) { if (x && x.Hidden) hid[x.name] = 1; });
      sheets = wb.SheetNames.filter(function (n) { return !hid[n]; }).map(function (n) {
        var ws = wb.Sheets[n], ref = ws["!ref"]; if (!ref) return { name: n, rows: [] };
        var rg = window.XLSX.utils.decode_range(ref), rows = [];
        for (var r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 1999); r++) {
          var row = []; for (var c = 0; c <= Math.min(rg.e.c, 99); c++) { var cell = ws[window.XLSX.utils.encode_cell({ r: r, c: c })]; row.push(cell ? { v: cell.w != null ? cell.w : String(cell.v), n: cell.t === "n" } : null); }
          rows.push(row);
        }
        return { name: n, rows: rows, merges: ws["!merges"] || [] };
      });
    } catch (e) { sheets = null; }
    if (!sheets) sheets = await ownXlsx(buf);
    if (ctx.closed) return;
    var cur = 0;
    function show(i) {
      cur = i;
      var sh = sheets[i], rows = sh.rows, maxC = 0;
      rows.forEach(function (r) { for (var c = r.length - 1; c >= 0; c--) if (r[c] && r[c].v !== "") { maxC = Math.max(maxC, c + 1); break; } });
      var last = rows.length; while (last > 0 && !rows[last - 1].some(function (x) { return x && x.v !== ""; })) last--;
      var h = '<div class="vw-note">Hoja «' + esc(sh.name) + '» · ' + last + " filas. Para editar o ver fórmulas, descárgalo.</div>";
      if (!last) { body.innerHTML = h + '<div class="vw-st"><b>Hoja vacía</b></div>'; return; }
      var skip = {}, span = {};
      (sh.merges || []).forEach(function (m) { span[m.s.r + ":" + m.s.c] = { r: m.e.r - m.s.r + 1, c: m.e.c - m.s.c + 1 }; for (var r = m.s.r; r <= m.e.r; r++) for (var c = m.s.c; c <= m.e.c; c++) if (r !== m.s.r || c !== m.s.c) skip[r + ":" + c] = 1; });
      h += '<div class="xv"><table><thead><tr><th></th>';
      for (var c = 0; c < maxC; c++) h += "<th>" + colName(c) + "</th>";
      h += "</tr></thead><tbody>";
      for (var r = 0; r < last; r++) {
        h += '<tr><td class="rn">' + (r + 1) + "</td>";
        for (var c2 = 0; c2 < maxC; c2++) {
          if (skip[r + ":" + c2]) continue;
          var x = rows[r][c2], sp = span[r + ":" + c2];
          h += "<td" + (x && x.n ? ' class="n"' : "") + (sp ? (sp.r > 1 ? ' rowspan="' + sp.r + '"' : "") + (sp.c > 1 ? ' colspan="' + sp.c + '"' : "") : "") + ">" + (x ? esc(x.v) : "") + "</td>";
        }
        h += "</tr>";
      }
      body.innerHTML = h + "</tbody></table></div>";
      tabs.querySelectorAll("button").forEach(function (b, k) { b.setAttribute("aria-pressed", k === cur ? "true" : "false"); });
    }
    if (sheets.length > 1) {
      tabs.hidden = false;
      tabs.innerHTML = sheets.map(function (s, i) { return '<button type="button" aria-pressed="' + (i === 0) + '">' + esc(s.name) + "</button>"; }).join("");
      tabs.querySelectorAll("button").forEach(function (b, i) { b.onclick = function () { show(i); }; });
    }
    show(0);
  }
  async function ownXlsx(buf) {
    var Z = await zipLib(), zip = await Z.loadAsync(buf);
    var wb = xml(await zip.file("xl/workbook.xml").async("string")).documentElement, rels = await readRels(zip, "xl/workbook.xml");
    var ss = [], sf = zip.file("xl/sharedStrings.xml");
    if (sf) kids(xml(await sf.async("string")).documentElement, "si").forEach(function (si) { ss.push(all(si, "t").map(function (t) { return t.textContent; }).join("")); });
    var out = [];
    for (var s of kids(path(wb, "sheets"), "sheet")) {
      var rel = rels[atR(s, "id")], f = rel && zip.file(rel.target), rows = [], merges = [];
      if (f) {
        var d = xml(await f.async("string")).documentElement;
        kids(path(d, "sheetData"), "row").slice(0, 2000).forEach(function (row) {
          kids(row, "c").forEach(function (c) {
            var p = colIdx(at(c, "r")); if (!p || p.c > 99) return;
            var t = at(c, "t"), v = kid(c, "v"), val = v ? v.textContent : "";
            if (t === "s") val = ss[+val] || ""; else if (t === "inlineStr") val = all(c, "t").map(function (x) { return x.textContent; }).join(""); else if (t === "b") val = val === "1" ? "VERDADERO" : "FALSO";
            while (rows.length <= p.r) rows.push([]);
            rows[p.r][p.c] = { v: val, n: !t && val !== "" && !isNaN(+val) };
          });
        });
        all(d, "mergeCell").forEach(function (m) { var a = (at(m, "ref") || "").split(":"), s0 = colIdx(a[0]), e0 = colIdx(a[1]); if (s0 && e0) merges.push({ s: s0, e: e0 }); });
      }
      out.push({ name: at(s, "name"), rows: rows, merges: merges });
    }
    return out;
  }

  /* ================= PDF ================= */
  var pdfLib = null;
  function loadPdf() {
    if (!pdfLib) pdfLib = import(new URL("js/pdf.min.js", document.baseURI).href).then(function (m) {
      m.GlobalWorkerOptions.workerSrc = new URL("js/pdf.worker.min.js", document.baseURI).href; return m;
    }).catch(function (e) { pdfLib = null; throw e; });
    return pdfLib;
  }
  async function renderPdf(blob, body, ctx) {
    var lib = await loadPdf(), data = new Uint8Array(await blob.arrayBuffer());
    var pdf = await lib.getDocument({ data: data, isEvalSupported: false }).promise;
    ctx.pdf = pdf;
    body.innerHTML = '<div class="vw-pages"></div>';
    var host = body.querySelector(".vw-pages"), dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.min(1100, body.clientWidth - 8);
    for (var i = 1; i <= pdf.numPages; i++) {
      if (ctx.closed) return;
      var pg = await pdf.getPage(i), v1 = pg.getViewport({ scale: 1 }), sc = cw / v1.width, vp = pg.getViewport({ scale: sc * dpr });
      var cv = document.createElement("canvas"); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height); cv.style.width = Math.floor(vp.width / dpr) + "px";
      host.appendChild(cv);
      var n = document.createElement("div"); n.className = "vw-pn"; n.textContent = "Página " + i + " de " + pdf.numPages; host.appendChild(n);
      await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    }
  }

  /* ================= visor ================= */
  var ICOL = { W: "#2B579A", X: "#217346", P: "#C43E1C", PDF: "#C8102E", IMG: "#1F84A0", MSG: "#0F6CBD", VID: "#7A4FB0", TXT: "#5F5B53" };
  function kind(e) {
    if (e === "pdf") return "pdf";
    if (e === "pptx" || e === "ppsx" || e === "potx") return "pptx";
    if (e === "docx" || e === "dotx") return "docx";
    if (e === "xlsx" || e === "xlsm" || e === "xltx" || e === "xls" || e === "ods") return "xlsx";
    if (/^(png|jpe?g|gif|webp|svg|bmp)$/.test(e)) return "img";
    if (/^(mp4|webm|mov|m4v)$/.test(e)) return "vid";
    if (e === "msg" || e === "eml") return "mail";
    if (/^(txt|csv|md|json|log)$/.test(e)) return "txt";
    return "otro";
  }
  var TAG = { mail: "MSG", pdf: "PDF", pptx: "P", docx: "W", xlsx: "X", img: "IMG", vid: "VID", txt: "TXT" };
  var CUR = null;
  function close() {
    if (!CUR) return;
    var c = CUR; CUR = null; c.closed = true;
    try { if (c.pdf) c.pdf.destroy(); } catch (e) { }
    c.urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { } });
    window.removeEventListener("resize", c.rs); document.removeEventListener("keydown", c.kd);
    c.root.remove(); document.documentElement.style.overflow = c.ov;
    if (c.back && c.back.focus) try { c.back.focus(); } catch (e) { }
  }
  async function open(o) {
    close();
    var e = (o.ext || (/\.([A-Za-z0-9]+)$/.exec(o.name || "") || [])[1] || "").toLowerCase(), k = kind(e);
    var ctx = { urls: [], closed: false, back: document.activeElement, ov: document.documentElement.style.overflow };
    var root = document.createElement("div"); root.className = "vw"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Vista del archivo " + (o.name || ""));
    var tg = TAG[k] || (e || "?").slice(0, 3).toUpperCase();
    root.innerHTML = '<div class="vw-top"><span class="vw-ic" style="background:' + (ICOL[tg] || "#3A352B") + '">' + esc(tg) + '</span><div class="vw-tt"><b>' + esc(o.title || o.name) + "</b><small>" + esc(o.sub || o.name || "") + "</small></div>" +
      (o.onDownload ? '<button class="vw-b" data-dl type="button">⬇ Descargar</button>' : "") + '<button class="vw-b x" data-x type="button" aria-label="Cerrar">✕ Cerrar</button></div>' +
      '<div class="vw-tabs" hidden></div><div class="vw-body"><div class="vw-st"><div class="vw-spin"></div>Abriendo ' + esc(o.name || "archivo") + "…</div></div>";
    document.body.appendChild(root); document.documentElement.style.overflow = "hidden";
    ctx.root = root; CUR = ctx;
    var body = root.querySelector(".vw-body"), tabs = root.querySelector(".vw-tabs");
    root.querySelector("[data-x]").onclick = close;
    root.querySelector("[data-x]").focus();
    var dl = root.querySelector("[data-dl]"); if (dl) dl.onclick = function () { o.onDownload(dl); };
    ctx.kd = function (ev) { if (ev.key === "Escape") close(); }; document.addEventListener("keydown", ctx.kd);
    var t; ctx.rs = function () { clearTimeout(t); t = setTimeout(function () { if (ctx.onResize) ctx.onResize(); }, 120); }; window.addEventListener("resize", ctx.rs);
    try {
      var blob = await o.getBlob(); if (ctx.closed) return;
      if (k === "pdf") await renderPdf(blob, body, ctx);
      else if (k === "pptx") await renderPptx(blob, body, ctx);
      else if (k === "docx") await renderDocx(blob, body, ctx);
      else if (k === "xlsx") await renderXlsx(blob, body, ctx, tabs);
      else if (k === "mail") await renderMail(blob, body, ctx, e);
      else if (k === "img") { var u = URL.createObjectURL(new Blob([blob], { type: e === "svg" ? "image/svg+xml" : "image/" + (e === "jpg" ? "jpeg" : e) })); ctx.urls.push(u); body.innerHTML = '<img class="vw-media" alt="' + esc(o.name) + '" src="' + u + '">'; }
      else if (k === "vid") { var v = URL.createObjectURL(new Blob([blob], { type: e === "webm" ? "video/webm" : "video/mp4" })); ctx.urls.push(v); body.innerHTML = '<video class="vw-media" controls playsinline src="' + v + '"></video>'; }
      else if (k === "txt") {
        var s = await blob.text();
        if (e === "csv") { var rows = s.split(/\r?\n/).filter(Boolean).slice(0, 2000).map(function (l) { return l.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map(function (x) { return { v: x.replace(/^"|"$/g, ""), n: x !== "" && !isNaN(+x) }; }); }); await renderSheetRows(rows, body); }
        else body.innerHTML = '<div class="tv">' + esc(s.slice(0, 400000)) + "</div>";
      }
      else body.innerHTML = '<div class="vw-st"><b>Este formato no tiene vista previa</b>Descárgalo para abrirlo en tu computadora.' + (/^(ppt|doc|xls)$/.test(e) ? "<br>Si lo guardas como ." + e + "x (formato nuevo de Office) se verá aquí mismo." : "") + "</div>";
    } catch (err) {
      if (ctx.closed) return;
      if (o.rawUrl && /\.pdf$/i.test(o.rawUrl)) { body.innerHTML = '<iframe title="' + esc(o.name || "PDF") + '" src="' + esc(o.rawUrl) + '" style="display:block;width:100%;height:calc(100vh - 140px);border:0;border-radius:10px;background:#fff"></iframe><p style="text-align:center;margin:10px 0"><a class="vw-b" href="' + esc(o.rawUrl) + '" target="_blank" rel="noopener">↗ Abrir en otra pestaña</a>' + (o.rawDl ? ' <a class="vw-b" href="' + esc(o.rawDl) + '" download="' + esc(o.rawName || "") + '">⬇ Descargar original</a>' : "") + '</p>'; if (window.console) console.warn("visor:", err); return; }
      body.innerHTML = '<div class="vw-st"><b>No se pudo mostrar la vista previa aquí</b>El archivo está guardado bien. Ábrelo en otra pestaña o descárgalo.<br><br>' + (o.rawUrl ? '<a class="vw-b" href="' + esc(o.rawUrl) + '" target="_blank" rel="noopener">↗ Abrir en otra pestaña</a> ' : "") + (o.rawDl ? '<a class="vw-b" href="' + esc(o.rawDl) + '" download="' + esc(o.rawName || "") + '">⬇ Descargar</a>' : o.onDownload ? '<button class="vw-b" type="button" data-dl2>⬇ Descargar</button>' : "") + "</div>";
      var d2 = body.querySelector("[data-dl2]"); if (d2) d2.onclick = function () { o.onDownload(d2); };
      if (window.console) console.warn("visor:", err);
    }
  }
  function mailLib() { return loadScript("js/correo.js", function () { return !!window.FxCorreo; }, 15000).then(function () { return window.FxCorreo; }); }
  var MIMEX = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml", pdf: "application/pdf" };
  function b64(u) { var s = "", C = 0x8000; for (var i = 0; i < u.length; i += C) s += String.fromCharCode.apply(null, u.subarray(i, i + C)); return btoa(s); }
  async function renderMail(blob, body, ctx, e) {
    var M = (await mailLib()).parse(await blob.arrayBuffer(), e);
    var used = {}, fd = function (d) { try { return d && !isNaN(d) ? d.toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "full", timeStyle: "short" }) : ""; } catch (x) { return String(d || ""); } };
    M.atts.forEach(function (a) { var x = (/\.([a-z0-9]+)$/i.exec(a.name) || [])[1]; a.type = a.mime || MIMEX[(x || "").toLowerCase()] || "application/octet-stream"; a.img = /^image\//.test(a.type); });
    var html = M.html;
    if (html) {
      html = html.replace(/(src|background)\s*=\s*(["']?)cid:([^"'\s>]+)\2/gi, function (all, at, q, cid) {
        var a = M.atts.filter(function (x) { return x.cid && (x.cid === cid || x.cid === cid.replace(/^<|>$/g, "")) || x.name === cid; })[0];
        if (!a) return all; used[M.atts.indexOf(a)] = 1; return at + '="data:' + a.type + ";base64," + b64(a.data) + '"';
      }).replace(/<script[\s\S]*?<\/script>/gi, "");
    }
    var h = '<div class="ml"><div class="ml-h"><h2>' + esc(M.subject || "(Sin asunto)") + "</h2><dl>" +
      (M.from || M.fromMail ? "<dt>De</dt><dd>" + esc(M.from) + (M.fromMail && M.fromMail !== M.from ? " &lt;" + esc(M.fromMail) + "&gt;" : "") + "</dd>" : "") +
      (M.to ? "<dt>Para</dt><dd>" + esc(M.to) + "</dd>" : "") + (M.cc ? "<dt>CC</dt><dd>" + esc(M.cc) + "</dd>" : "") +
      (M.date ? "<dt>Fecha</dt><dd>" + esc(fd(M.date)) + "</dd>" : "") + "</dl></div>";
    if (html) h += '<iframe class="ml-f" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" title="Contenido del correo"></iframe>';
    else if (M.text) h += '<div class="ml-t">' + esc(M.text.slice(0, 300000)) + "</div>";
    var imgs = M.atts.filter(function (a, i) { return a.img && !used[i] && !a.hidden; }), otros = M.atts.filter(function (a) { return !a.img; });
    var urlOf = function (a) { var u = URL.createObjectURL(new Blob([a.data], { type: a.type })); ctx.urls.push(u); return u; };
    if (imgs.length) h += '<div class="ml-s">Imágenes del correo (' + imgs.length + ')</div><div class="ml-g">' + imgs.map(function (a) { var u = urlOf(a); return '<a href="' + u + '" target="_blank" rel="noopener"><img alt="' + esc(a.name) + '" src="' + u + '"><span>' + esc(a.name) + "</span></a>"; }).join("") + "</div>";
    if (otros.length) h += '<div class="ml-s">Adjuntos (' + otros.length + ')</div><div class="ml-a">' + otros.map(function (a) { return '<a href="' + urlOf(a) + '" download="' + esc(a.name) + '">📎 ' + esc(a.name) + " · " + Math.max(1, Math.round(a.size / 1024)) + " KB</a>"; }).join("") + "</div>";
    if (!html && !M.text && !imgs.length) h += '<div class="vw-st">El correo no trae texto para mostrar. Descárgalo para abrirlo en Outlook.</div>';
    body.innerHTML = h + "</div>";
    var fr = body.querySelector(".ml-f");
    if (fr) {
      var fit = function () { try { var d = fr.contentDocument; if (d && d.documentElement) fr.style.height = Math.max(200, d.documentElement.scrollHeight + 4) + "px"; } catch (x) { fr.style.height = "70vh"; } };
      fr.onload = function () { fit(); try { Array.prototype.forEach.call(fr.contentDocument.images, function (im) { im.addEventListener("load", fit); }); } catch (x) { } setTimeout(fit, 400); };
      fr.srcdoc = '<!doctype html><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0;background:#fff;color:#111}body{padding:14px;font:14px/1.45 Calibri,Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}</style>' + html;
      ctx.onResize = fit;
    }
  }
  async function renderSheetRows(rows, body) {
    var maxC = rows.reduce(function (a, r) { return Math.max(a, r.length); }, 0), h = '<div class="xv"><table><thead><tr><th></th>';
    for (var c = 0; c < maxC; c++) h += "<th>" + colName(c) + "</th>";
    h += "</tr></thead><tbody>";
    rows.forEach(function (r, i) { h += '<tr><td class="rn">' + (i + 1) + "</td>"; for (var c2 = 0; c2 < maxC; c2++) { var x = r[c2]; h += "<td" + (x && x.n ? ' class="n"' : "") + ">" + (x ? esc(x.v) : "") + "</td>"; } h += "</tr>"; });
    body.innerHTML = h + "</tbody></table></div>";
  }
  window.FXVisor = { open: open, close: close, kind: kind };
})();
