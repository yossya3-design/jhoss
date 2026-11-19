/* Archivos del subbloque · Delivery DPO CD Callao
   Subir archivos o carpetas completas (desde cualquier PC: OneDrive o escritorio)
   y descargarlos después, uno por uno o todo en .zip.
   - Metadatos: db, colección "archivos" (un documento por archivo).
   - Contenido: assets. PDF, imágenes y video se guardan tal cual; Word, Excel,
     PowerPoint y demás se guardan empaquetados (texto base64, en partes) y se
     reconstruyen idénticos al descargar. */
(function () {
  "use strict";
  var CATS = [
    { k: "evid", n: "Evidencias" },
    { k: "opl", n: "OPL" },
    { k: "sop", n: "SOP y documentos" },
    { k: "ind", n: "Indicadores y datos" },
    { k: "otro", n: "Otros" }
  ];
  var CATN = {}; CATS.forEach(function (c) { CATN[c.k] = c.n; });
  var RAW = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };
  var SAVE_OK = /^(gif|png|jpg|jpeg|webp|mp4|webm|mov|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip|fig)$/;
  var MAX_RAW = 20 * 1024 * 1024;
  var CHUNK = 18 * 1024 * 1024; // caracteres base64 por parte (< 20 MiB)
  var ICON = { pdf: "PDF", doc: "W", docx: "W", xls: "X", xlsx: "X", xlsm: "X", csv: "CSV", ppt: "P", pptx: "P", png: "IMG", jpg: "IMG", jpeg: "IMG", gif: "IMG", webp: "IMG", mp4: "VID", webm: "VID", mov: "VID", zip: "ZIP", txt: "TXT" };
  var ICOL = { W: "#2B579A", X: "#217346", P: "#C43E1C", PDF: "#C8102E", IMG: "#1F84A0", VID: "#7A4FB0", CSV: "#217346", ZIP: "#8C7A45", TXT: "#5F5B53" };

  var S = { db: null, assets: null, dl: null, docs: [], ready: false, err: "", loading: true, busy: false, usage: null, open: {}, slotBusy: {}, slotMsg: {} };

  /* ---------- estilos ---------- */
  var css = document.createElement("style");
  css.textContent = [
    ".fx{margin-top:16px;border:1px solid rgba(242,197,42,.45);border-radius:16px;background:rgba(14,14,13,.92);padding:14px 16px 16px;color:#F4F1E8;font-family:var(--f-body,Barlow,Arial,sans-serif)}",
    ".fx-h{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px}",
    ".fx-h h4{margin:0;font:900 22px var(--f-display,Impact,sans-serif);text-transform:uppercase;letter-spacing:.02em}",
    ".fx-h h4 small{display:block;font:700 10px var(--f-mono,monospace);letter-spacing:.12em;color:#F2C52A;margin-bottom:2px}",
    ".fx-sum{font:600 12px var(--f-mono,monospace);color:#A6A093}",
    ".fx-up{margin-top:12px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 12px;align-items:center;border:2px dashed #3A352B;border-radius:14px;padding:12px;transition:border-color .15s,background .15s}",
    ".fx-up.drag{border-color:#F2C52A;background:rgba(242,197,42,.08)}",
    ".fx-up label{font:700 11px var(--f-mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:#A6A093}",
    ".fx-up select{font:inherit;font-size:14px;color:#F4F1E8;background:#151513;border:1px solid #3A352B;border-radius:10px;padding:7px 10px;max-width:100%}",
    ".fx-btns{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}",
    ".fx-b{display:inline-flex;align-items:center;gap:8px;cursor:pointer;border-radius:999px;padding:9px 15px;font:700 14px var(--f-body,Barlow,Arial,sans-serif);border:1px solid #F2C52A;background:#F2C52A;color:#070707}",
    ".fx-b.alt{background:transparent;color:#F2C52A}",
    ".fx-b.ghost{background:transparent;color:#F4F1E8;border-color:#3A352B}",
    ".fx-b:disabled{opacity:.45;cursor:default}",
    ".fx-hint{grid-column:1/-1;font-size:13px;color:#A6A093;margin:0}",
    ".fx-per{list-style:none;margin:10px 0 4px;font:700 11px var(--f-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:#F2C52A;border-bottom:1px dashed rgba(242,197,42,.4);padding-bottom:4px}",
    ".fx-ph+.fx-per{margin-top:14px}",
    ".fx.fx-in{margin:0 0 10px;border:0;background:transparent;padding:0}",
    ".fx-in .fx-prog{margin-top:0}.fx-in .fx-bar{margin-bottom:8px}.fx-in .fx-prog:empty+.fx-bar{display:none}",
    ".fx-in .fx-nm small{display:block}",
    ".fx-prog{margin-top:10px;font:600 13px var(--f-mono,monospace);color:#F2C52A}",
    ".fx-bar{height:6px;border-radius:3px;background:#2B2822;overflow:hidden;margin-top:6px}.fx-bar i{display:block;height:100%;width:0;background:#2E7D3A;transition:width .2s}",
    ".fx-msg{margin-top:10px;font-size:13.5px;border-radius:10px;padding:8px 10px}",
    ".fx-msg.ok{background:rgba(46,125,58,.2);color:#7FD99A}.fx-msg.bad{background:rgba(200,16,46,.2);color:#FF8A96}.fx-msg.warn{background:rgba(242,197,42,.14);color:#F2C52A}",
    ".fx-cat{margin-top:14px}",
    ".fx-ch{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #2B2822;padding-bottom:6px;margin-bottom:6px}",
    ".fx-ch b{font:800 16px var(--f-display,Impact,sans-serif);text-transform:uppercase;letter-spacing:.03em}",
    ".fx-ch b em{font:600 12px var(--f-mono,monospace);font-style:normal;color:#A6A093;margin-left:6px}",
    ".fx-dir{font:700 11px var(--f-mono,monospace);color:#F2C52A;margin:8px 0 4px;display:flex;gap:6px;align-items:center;overflow-wrap:anywhere}",
    ".fx-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}",
    ".fx-it{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;background:#151513;border:1px solid #2B2822;border-radius:10px;padding:8px 10px}",
    ".fx-ic{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;color:#fff;font:800 11px var(--f-mono,monospace)}",
    ".fx-nm{min-width:0}.fx-nm b{display:block;font-size:14px;font-weight:600;overflow-wrap:anywhere;line-height:1.25}",
    ".fx-nm small{font:12px var(--f-mono,monospace);color:#A6A093}",
    ".fx-act{display:flex;gap:6px}",
    ".fx-a{cursor:pointer;border-radius:8px;padding:6px 10px;font:700 12.5px var(--f-body,Barlow,Arial,sans-serif);border:1px solid #F2C52A;background:transparent;color:#F2C52A;white-space:nowrap}",
    ".fx-a.del{border-color:#5A2A2F;color:#FF8A96}",
    ".fx-a:disabled{opacity:.4;cursor:default}",
    ".fx-empty{margin-top:12px;font-size:14px;color:#A6A093;border:1px dashed #3A352B;border-radius:12px;padding:12px;text-align:center}",
    ".fx-meter{margin-top:12px;font:12px var(--f-mono,monospace);color:#A6A093}",
    ".fx-cnt{display:inline-flex;align-items:center;gap:3px;margin-left:6px;font:700 9.5px var(--f-mono,monospace);font-style:normal;color:#070707;background:#F2C52A;border-radius:999px;padding:1px 6px;vertical-align:1px}",
    ".fx-nm button{all:unset;cursor:pointer;display:block;font-size:14px;font-weight:600;overflow-wrap:anywhere;line-height:1.25}.fx-nm button:hover{color:#F2C52A;text-decoration:underline}",
    /* casilleros con archivo (tarjeta, fila y botón) */
    ".fxs{margin-top:16px;border-radius:14px;border:1px solid rgba(242,197,42,.55);background:linear-gradient(120deg,rgba(242,197,42,.16),rgba(242,197,42,.04));color:var(--ink,#F4F1E8);overflow:hidden}",
    ".fxs.empty{border-style:dashed;background:rgba(242,197,42,.05)}",
    ".fxs-main{all:unset;box-sizing:border-box;width:100%;cursor:pointer;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 16px}",
    ".fxs-main:hover{background:rgba(242,197,42,.1)}.fxs-main:focus-visible,.fxr-main:focus-visible{outline:2px solid #F2C52A;outline-offset:-2px}",
    ".fxs .tool-tx{display:flex;flex-direction:column;min-width:0}",
    ".fxs-file{margin-top:4px;font:600 12px var(--f-mono,monospace)!important;color:#F2C52A!important;overflow-wrap:anywhere}",
    ".fxs.empty .fxs-file{color:var(--muted,#A6A093)!important}",
    ".fxs-go{font-weight:700;color:#070707;background:#F2C52A;border-radius:999px;padding:7px 14px;white-space:nowrap}",
    ".fxs.empty .fxs-go{background:transparent;color:#F2C52A;border:1px solid #F2C52A}",
    ".fxs-act{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding:0 16px 12px}",
    ".fxs-act:empty{display:none}",
    ".fxs-act button,.fxr-t button{cursor:pointer;border-radius:8px;padding:6px 12px;font:700 13px var(--f-body,Barlow,Arial,sans-serif);border:1px solid #F2C52A;background:rgba(7,7,7,.5);color:#F2C52A;white-space:nowrap}",
    ".fxs-act button.del{border-color:#5A2A2F;color:#FF8A96}",
    ".fxs-act button:disabled,.fxr-t button:disabled{opacity:.45;cursor:default}",
    ".fxs-msg{padding:0 16px 12px;font-size:13px}.fxs-msg.ok{color:#7FD99A}.fxs-msg.bad{color:#FF8A96}",
    ".fxs.busy .fxs-go,.fxr.busy em{animation:fxpulse 1s ease-in-out infinite}@keyframes fxpulse{50%{opacity:.4}}",
    ".evid li.fxr{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;border-radius:10px;border:1px solid var(--line,#2B2822);background:var(--surface,#151513);overflow:hidden}",
    ".evid li.fxr.empty{border-style:dashed;background:transparent}",
    ".evid li.fxr:hover{border-color:#F2C52A}",
    ".fxr-main{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 10px;font-size:13.5px;min-width:0}",
    ".fxr-main>span{overflow-wrap:anywhere;line-height:1.2;min-width:0}",
    ".fxr-main small{display:block;margin-top:2px;font:11px var(--f-mono,monospace);color:var(--muted,#A6A093);overflow-wrap:anywhere}",
    ".fxr.empty .fxr-main i{background:#2A2722;color:#A6A093}",
    ".fxr-t{display:flex;align-items:center;gap:4px;padding:0 8px 0 0}",
    ".fxr-t button{padding:5px 8px;font-size:13px;line-height:1}",
    ".fxr.empty em{color:#F2C52A}",
    ".fxr-msg{grid-column:1/-1;padding:0 10px 8px;font-size:12.5px}.fxr-msg.ok{color:#7FD99A}.fxr-msg.bad{color:#FF8A96}",
    ".sbs [data-slot],.sbs [data-fxup]{display:inline-flex;flex-wrap:wrap;gap:6px}",
    "button.sb{cursor:pointer;background:transparent;font-family:inherit}",
    "button.sb:hover{border-color:#F2C52A;color:#F2C52A}",
    ".sb.fxp-s{padding:5px 8px}",
    ".fxu{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 14px;margin-bottom:10px;border-radius:12px;background:linear-gradient(120deg,rgba(242,197,42,.22),rgba(242,197,42,.06));border:1px solid rgba(242,197,42,.7)}",
    ".fxu .up-ic{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:#F2C52A;color:#070707;font-size:20px;font-weight:700}",
    ".fxu .up-tx{display:flex;flex-direction:column;min-width:0}.fxu .up-tx b{font-family:var(--f-display,Impact,sans-serif);font-size:20px;text-transform:uppercase;line-height:1.05}",
    ".fxu .up-tx small{font:600 11px var(--f-mono,monospace);color:var(--muted,#A6A093)}",
    ".fxu-b{display:flex;gap:8px;flex-wrap:wrap}",
    ".evid li.fxr{min-height:62px}",
    ".fxr-main i{min-width:46px;text-align:center;box-sizing:border-box}",
    ".fxr-main>span b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:600;line-height:1.25}",
    ".fxr-main small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".fxr-main em{font-style:normal;font-weight:700;color:#F2C52A;white-space:nowrap}",
    "a.fxs-main{color:inherit;text-decoration:none}",
    ".fxl .tool-ic{font-size:20px}",
    ".fxl{position:relative}.fxl-x{position:absolute;top:8px;right:8px;z-index:2;width:30px;height:30px;border-radius:50%;border:1px solid #5A2A2F;background:rgba(7,7,7,.75);color:#FF8A96;font:800 15px/1 Arial,sans-serif;cursor:pointer;display:grid;place-items:center}.fxl-x:hover{background:#C8102E;color:#fff}.fxl .fxs-main .tool-tx{padding-right:34px}",
    ".fxq{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between;margin-top:12px;padding:8px 12px;border:1px dashed #5A2A2F;border-radius:12px;color:#A6A093;font-size:13px}.fxq b{color:#F4F1E8;font-weight:600}.fxq button{cursor:pointer;border-radius:8px;padding:5px 10px;font:700 12.5px var(--f-body,Barlow,Arial,sans-serif);border:1px solid #F2C52A;background:transparent;color:#F2C52A}",
    ".fxl-f{display:grid;gap:10px;padding:14px 16px}.fxl-f label{display:grid;gap:4px;font:600 12px var(--f-mono,monospace);color:var(--muted,#A6A093)}",
    ".fxl-f input{box-sizing:border-box;width:100%;padding:10px 12px;border-radius:10px;border:1px solid #3A352B;background:#0E0E0D;color:#F4F1E8;font:15px var(--f-body,Barlow,Arial,sans-serif)}",
    ".fxl-f input:focus{outline:2px solid #F2C52A;border-color:#F2C52A}.fxl-f .fxs-act{padding:0;justify-content:flex-start}",
    ".fxu.ph .up-ic{font-size:18px}",
    ".fx-ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;margin-top:4px}",
    ".fx-ph figure{position:relative;margin:0;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1px solid #2B2822;background:#151513}",
    ".fx-ph figure>button:first-child{all:unset;cursor:pointer;display:grid;place-items:center;width:100%;height:100%}",
    ".fx-ph img{width:100%;height:100%;object-fit:cover;display:block}",
    ".fx-ph .del{position:absolute;top:4px;right:4px;padding:2px 7px;background:rgba(7,7,7,.75)}",
    ".zone .fxs:first-child{margin-top:0}",
    "@media (max-width:560px){.fxs-main{grid-template-columns:auto minmax(0,1fr)}.fxs-go{grid-column:1/-1;justify-self:start}.fxs-act{justify-content:flex-start}.fxu{grid-template-columns:auto minmax(0,1fr)}.fxu-b{grid-column:1/-1}.fxu-b .fx-b{flex:1;justify-content:center}}",
    "@media (max-width:560px){.fx-up{grid-template-columns:minmax(0,1fr)}.fx-it{grid-template-columns:auto minmax(0,1fr)}.fx-act{grid-column:1/-1;justify-content:flex-end}.fx-b{flex:1;justify-content:center}}"
  ].join("\n");
  document.head.appendChild(css);

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ext(n) { var m = /\.([A-Za-z0-9]+)$/.exec(n || ""); return m ? m[1].toLowerCase() : ""; }
  function size(b) { if (b < 1024) return b + " B"; if (b < 1048576) return (b / 1024).toFixed(0) + " KB"; return (b / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  function fdate(iso) { try { var d = new Date(iso); return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); } catch (e) { return ""; } }
  function safe(s) { return String(s || "").replace(/[\\:*?"<>|]+/g, "_").trim() || "archivo"; }
  function icon(e) { var t = ICON[e] || (e ? e.slice(0, 3).toUpperCase() : "?"); return '<span class="fx-ic" style="background:' + (ICOL[t] || "#3A352B") + '">' + esc(t) + "</span>"; }
  function codeOf(page) { var m = /Subbloque\s+([\d.]+)/.exec(page.getAttribute("aria-label") || ""); return m ? m[1] : null; }
  /* Período del año: enero–junio = H1, julio–diciembre = H2 (hora de Lima) */
  function periodo(dt) { var l = new Date(dt.getTime() - 5 * 3600e3); return l.getUTCFullYear() + " " + (l.getUTCMonth() < 6 ? "H1" : "H2"); }
  function perOf(d) { return d.per || (d.at ? periodo(new Date(d.at)) : ""); }
  function allParts(d) { return (d.parts || []).concat(d.pdf ? [d.pdf] : []); }
  function docsFor(c) { return S.docs.filter(function (d) { return d.code === c; }); }
  function errText(e) {
    var c = e && e.code;
    var M = {
      too_large: "El archivo es demasiado grande.", quota_or_state: "Se llenó el espacio de almacenamiento del menú. Borra archivos que ya no uses.",
      unsupported_type: "Ese tipo de archivo no se pudo guardar.", rate_limited: "Muchas acciones seguidas. Espera unos segundos y vuelve a intentar.",
      upstream_auth: "Se cerró la sesión. Recarga la página e inténtalo de nuevo.", declined: "Descarga cancelada.",
      not_granted: "Esta vista no tiene permiso para esa acción.", unavailable: "La descarga no está disponible en esta vista."
    };
    return M[c] || ("No se pudo completar (" + (c || (e && e.message) || "error") + ").");
  }
  function readB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); res(s.slice(s.indexOf(",") + 1)); };
      r.onerror = function () { rej({ code: "read_error", message: "No se pudo leer el archivo" }); };
      r.readAsDataURL(file);
    });
  }
  function b64ToBlob(b64) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u]);
  }
  async function fetchBlob(d) {
    if (d.url) { var ru = await fetch(d.url); if (!ru.ok) throw { code: "missing" }; return await ru.blob(); }
    if (d.enc === "raw") { var r = await fetch("/_blob/" + d.parts[0]); if (!r.ok) throw { code: "missing" }; return await r.blob(); }
    var txt = "";
    for (var i = 0; i < d.parts.length; i++) {
      var rr = await fetch("/_blob/" + d.parts[i]); if (!rr.ok) throw { code: "missing" };
      txt += (await rr.text()).trim();
    }
    return b64ToBlob(txt);
  }
  var zipLib = null;
  function loadZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (zipLib) return zipLib;
    zipLib = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = "js/jszip.min.js";
      s.onload = function () { res(window.JSZip); };
      s.onerror = function () { zipLib = null; rej({ code: "zip_unavailable", message: "No cargó el compresor" }); };
      document.head.appendChild(s);
    });
    return zipLib;
  }

  /* ---------- Netlify: subir y guardar en la función dpo-archivos ---------- */
  var NET = "/.netlify/functions/dpo-archivos", PART = 4 * 1024 * 1024;
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function getPin() {
    var p = ""; try { p = sessionStorage.getItem("dpo-pin") || ""; } catch (e) { }
    if (!p) { p = String(window.prompt("Clave de administradora para cargar o quitar archivos:") || "").replace(/\D/g, ""); if (!p) throw { code: "pin", message: "falta la clave" }; try { sessionStorage.setItem("dpo-pin", p); } catch (e) { } }
    return p;
  }
  function pinFail() { try { sessionStorage.removeItem("dpo-pin"); } catch (e) { } return { code: "clave incorrecta" }; }
  async function netPost(op, body) {
    body.pin = getPin();
    var r = await fetch(NET + "?op=" + op, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 403) throw pinFail();
    var j = await r.json().catch(function () { return {}; }); if (!r.ok || !j.ok) throw { code: j.error || ("error " + r.status) };
    return j;
  }
  function netSetup(base) {
    S.net = true;
    var subs = [], hidden = {}, net = [];
    function emit() {
      var all = base.filter(function (d) { return !hidden[d._id]; }).concat(net);
      var snap = { docs: all.map(function (d) { return { id: d._id, data: function () { return d; } }; }), metadata: { fromCache: false } };
      subs.forEach(function (f) { f(snap); });
    }
    async function refresh() {
      var r = await fetch(NET + "?op=list", { cache: "no-store" }); var j = await r.json();
      hidden = {}; (j.hidden || []).forEach(function (h) { hidden[h] = 1; });
      net = (j.docs || []).map(function (d) {
        var p = String((d.parts || [])[0] || ""), m = /^(.+)~1$/.exec(p);
        if (m && d.enc === "raw" && /^(png|jpe?g|gif|webp)$/.test(d.ext || "")) d.url = NET + "?op=part&id=" + m[1] + "&n=0&ct=image/" + (d.ext === "jpg" ? "jpeg" : d.ext);
        return d;
      });
      emit();
    }
    S.db = { collection: function () { return {
      onSnapshot: function (f, err) { subs.push(f); refresh().catch(function (e) { if (err) err(e); }); return function () { }; },
      add: async function (doc) { var id = rid(); await netPost("meta", { id: id, doc: doc }); await refresh(); return { id: id }; },
      doc: function (id) { return { delete: async function () { await netPost("del", { id: id }); await refresh(); } }; }
    }; } };
    S.assets = {
      upload: async function (blob) {
        var id = rid(), buf = await blob.arrayBuffer(), pin = getPin(), n = 0;
        for (var o = 0; o < Math.max(buf.byteLength, 1); o += PART) {
          var r = await fetch(NET + "?op=part&id=" + id + "&n=" + n + "&pin=" + encodeURIComponent(pin), { method: "POST", body: buf.slice(o, o + PART) });
          if (r.status === 403) throw pinFail();
          if (!r.ok) throw { code: r.status === 413 ? "too_large" : "error " + r.status };
          n++;
        }
        return { id: id + "~" + n };
      },
      delete: async function () { return { deleted: true }; },
      list: async function () { return { assets: [], usage: null }; }
    };
    var of = window.fetch.bind(window);
    window.fetch = function (u, o) {
      var m = /^\/_blob\/([A-Za-z0-9_-]+)~(\d+)$/.exec(String(u));
      if (!m) return of(u, o);
      return (async function () {
        var parts = [];
        for (var i = 0; i < +m[2]; i++) { var r = await of(NET + "?op=part&id=" + m[1] + "&n=" + i); if (!r.ok) return new Response(null, { status: 404 }); parts.push(await r.arrayBuffer()); }
        return new Response(new Blob(parts));
      })();
    };
  }

  /* ---------- carga de capacidades ---------- */
  (async function init() {
    var cl = window.claude;
    /* Versión publicada fuera de Claude (Netlify): archivos de archivos.json + lo que se sube a la función dpo-archivos */
    async function estatico() {
      try {
        var r = await fetch("archivos.json", { cache: "no-store" }); if (!r.ok) return false;
        var base = await r.json(); S.static = true;
        S.dl = { save: function (o) { var u = URL.createObjectURL(o.data instanceof Blob ? o.data : new Blob([o.data])); var a = document.createElement("a"); a.href = u; a.download = o.filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); return Promise.resolve({ status: "saved" }); } };
        var net = false;
        try { var t = await fetch(NET + "?op=list", { cache: "no-store" }); net = t.ok && (await t.json()).ok; } catch (x) { net = false; }
        if (net) {
          netSetup(base);
          S.db.collection("archivos").onSnapshot(function (snap) {
            S.docs = snap.docs.map(function (d) { var o = Object.assign({}, d.data()); o._id = d.id; return o; });
            S.loading = false; S.err = ""; paint(); paintSlots(); badges();
          }, function () { S.loading = false; S.docs = base; paint(); paintSlots(); badges(); });
          return true;
        }
        S.docs = base; S.loading = false; S.err = "";
        paint(); paintSlots(); badges(); return true;
      } catch (e) { return false; }
    }
    if (!cl || !cl.use) { if (await estatico()) return; S.loading = false; S.err = "Abre el menú desde claude.ai para subir y descargar archivos."; paint(); paintSlots(); return; }
    try { S.db = await cl.use("db"); } catch (e) { S.db = null; }
    try { S.assets = await cl.use("assets"); } catch (e) { S.assets = null; }
    try { S.dl = await cl.use("downloads"); } catch (e) { S.dl = null; }
    if (!S.db) { if (await estatico()) return; S.loading = false; S.err = "Inicia sesión en claude.ai para ver los archivos."; paint(); paintSlots(); return; }
    var timer = setTimeout(function () { if (S.loading) { S.err = "Los archivos aún no cargan; revisa tu conexión."; paint(); } }, 10000);
    S.db.collection("archivos").onSnapshot(function (snap) {
      S.docs = snap.docs.map(function (d) { var o = Object.assign({}, d.data()); o._id = d.id; return o; });
      if (!snap.metadata.fromCache) { clearTimeout(timer); S.loading = false; S.err = ""; }
      paint(); paintSlots(); badges();
    }, function (e) { clearTimeout(timer); S.loading = false; S.err = "No se pudieron leer los archivos (" + (e && e.code) + ")."; paint(); paintSlots(); });
    paint(); paintSlots();
  })();

  async function refreshUsage() {
    if (!S.assets) return;
    try { var r = await S.assets.list(); S.usage = r.usage; paint(); } catch (e) { }
  }

  /* ---------- subir ---------- */
  async function uploadOne(file, code, cat, rel, lote, slot) {
    var e = ext(file.name), parts = [], enc;
    if ((RAW[e] && file.size <= MAX_RAW) || S.net) {
      var r = await S.assets.upload(file, { type: RAW[e] || "application/octet-stream" });
      parts.push(r.id); enc = "raw";
    } else {
      var b64 = await readB64(file);
      for (var i = 0; i < b64.length; i += CHUNK) {
        var piece = new Blob([b64.slice(i, i + CHUNK)], { type: "text/plain" });
        try { var rr = await S.assets.upload(piece, { type: "text/plain" }); parts.push(rr.id); }
        catch (err) { for (var j = 0; j < parts.length; j++) { try { await S.assets.delete(parts[j]); } catch (x) { } } throw err; }
      }
      enc = "b64";
    }
    await S.db.collection("archivos").add({
      code: code, cat: cat, name: file.name, rel: rel || "", size: file.size, ext: e,
      enc: enc, parts: parts, at: new Date().toISOString(), per: periodo(new Date()), lote: lote || "", slot: slot || ""
    });
  }
  async function uploadMany(items, code, cat, box) {
    if (!S.assets || S.busy || !items.length) return;
    S.busy = true; box.dataset.busy = "1";
    var lote = Date.now().toString(36), ok = 0, fail = [];
    var prog = box.querySelector(".fx-prog"), bar = box.querySelector(".fx-bar i");
    box.querySelectorAll(".fx-b").forEach(function (b) { b.disabled = true; });
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (prog) prog.textContent = "Subiendo " + (i + 1) + " de " + items.length + ": " + it.file.name;
      try { await uploadOne(it.file, code, cat, it.rel, lote); ok++; }
      catch (e) { fail.push(it.file.name + " — " + errText(e)); if (e && (e.code === "quota_or_state" || e.code === "upstream_auth")) break; }
      if (bar) bar.style.width = Math.round((i + 1) / items.length * 100) + "%";
    }
    S.busy = false; delete box.dataset.busy;
    S.flash = { code: code, host: cat, kind: fail.length ? (ok ? "warn" : "bad") : "ok",
      text: (ok ? ok + (ok === 1 ? " archivo subido." : " archivos subidos.") : "") + (fail.length ? " No se subieron: " + fail.join(" · ") : "") };
    refreshUsage(); paint();
  }
  function collectInput(input) {
    var out = [];
    Array.prototype.forEach.call(input.files || [], function (f) {
      var p = f.webkitRelativePath || "", dir = p ? p.split("/").slice(0, -1).join("/") : "";
      out.push({ file: f, rel: dir });
    });
    return out;
  }
  function walkEntry(entry, path) {
    return new Promise(function (res) {
      if (entry.isFile) { entry.file(function (f) { res([{ file: f, rel: path }]); }, function () { res([]); }); return; }
      if (!entry.isDirectory) { res([]); return; }
      var reader = entry.createReader(), all = [];
      (function next() {
        reader.readEntries(async function (ents) {
          if (!ents.length) {
            var lists = [];
            for (var i = 0; i < all.length; i++) lists.push(await walkEntry(all[i], path ? path + "/" + entry.name : entry.name));
            res([].concat.apply([], lists)); return;
          }
          all = all.concat(Array.prototype.slice.call(ents)); next();
        }, function () { res([]); });
      })();
    });
  }
  async function collectDrop(dt) {
    var items = dt.items, out = [];
    if (items && items.length && items[0].webkitGetAsEntry) {
      var ents = []; for (var i = 0; i < items.length; i++) { var en = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry(); if (en) ents.push(en); }
      for (var k = 0; k < ents.length; k++) out = out.concat(await walkEntry(ents[k], ""));
      return out;
    }
    Array.prototype.forEach.call(dt.files || [], function (f) { out.push({ file: f, rel: "" }); });
    return out;
  }

  /* ---------- descargar ---------- */
  async function saveBlob(name, blob) {
    if (!S.dl) throw { code: "unavailable" };
    return S.dl.save({ filename: name, data: blob });
  }
  async function downloadOne(d, btn, code) {
    var old = btn ? btn.textContent : "", failed = "";
    if (btn) { btn.disabled = true; btn.textContent = "Preparando…"; }
    try {
      var blob = await fetchBlob(d);
      if (SAVE_OK.test(d.ext)) await saveBlob(safe(d.name), blob);
      else {
        var Z = await loadZip(), z = new Z(); z.file(d.name, blob);
        await saveBlob(safe(d.name) + ".zip", await z.generateAsync({ type: "blob" }));
      }
    } catch (e) { if (!e || e.code !== "declined") { failed = e && e.code === "missing" ? "el archivo ya no está disponible." : errText(e); S.flash = { code: code, kind: "bad", text: d.name + ": " + failed }; if (!btn || !btn.closest(".vw")) paint(); } }
    if (btn) { btn.disabled = false; btn.textContent = failed ? "No se pudo" : old; if (failed) { btn.title = failed; setTimeout(function () { if (btn.isConnected) btn.textContent = old; }, 3500); } }
  }
  async function downloadZip(list, zipName, btn, code) {
    if (!list.length) return;
    var old = btn ? btn.textContent : "";
    try {
      var Z = await loadZip(), z = new Z();
      for (var i = 0; i < list.length; i++) {
        var d = list[i];
        if (btn) btn.textContent = "Empaquetando " + (i + 1) + "/" + list.length + "…";
        try { var b = await fetchBlob(d); z.file((CATN[d.cat] || "Otros") + "/" + (d.rel ? d.rel + "/" : "") + d.name, b); } catch (e) { }
      }
      if (btn) btn.textContent = "Generando .zip…";
      await saveBlob(zipName, await z.generateAsync({ type: "blob" }));
    } catch (e) { if (!e || e.code !== "declined") { S.flash = { code: code, kind: "bad", text: errText(e) }; paint(); } }
    if (btn) btn.textContent = old;
  }
  async function removeOne(d, btn, code) {
    if (!S.assets) return;
    if (btn.dataset.confirm !== "1") { btn.dataset.confirm = "1"; btn.textContent = "¿Eliminar?"; setTimeout(function () { if (btn.isConnected) { btn.dataset.confirm = ""; btn.textContent = "Eliminar"; } }, 4000); return; }
    btn.disabled = true; btn.textContent = "Eliminando…";
    try {
      var pr = allParts(d); for (var i = 0; i < pr.length; i++) await S.assets.delete(pr[i]);
      await S.db.collection("archivos").doc(d._id).delete();
      S.flash = { code: code, host: S.flashHost, kind: "ok", text: "Se eliminó " + d.name + "." };
      refreshUsage();
    } catch (e) { S.flash = { code: code, kind: "bad", text: errText(e) }; }
    paint();
  }

  /* ---------- visor ---------- */
  var visorP = null;
  function loadVisor() {
    if (window.FXVisor) return Promise.resolve(window.FXVisor);
    if (visorP) return visorP;
    visorP = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "js/visor.js";
      s.onload = function () { window.FXVisor ? res(window.FXVisor) : rej(new Error("visor")); };
      s.onerror = function () { visorP = null; rej(new Error("visor")); };
      document.head.appendChild(s);
    });
    return visorP;
  }
  function viewDoc(d, title, code) {
    if (!d) return;
    loadVisor().then(function (V) {
      V.open({ name: d.name, ext: d.pdf || d.pdfUrl ? "pdf" : d.ext, title: title || d.name, sub: (title ? d.name + " · " : "") + size(d.size || 0) + " · subido el " + fdate(d.at) + " · " + perOf(d),
        getBlob: function () { return d.pdfUrl ? fetch(d.pdfUrl).then(function (r) { if (!r.ok) throw { code: "missing" }; return r.blob(); }) : d.pdf ? fetch("/_blob/" + d.pdf).then(function (r) { if (!r.ok) throw { code: "missing" }; return r.blob(); }) : fetchBlob(d); }, onDownload: S.dl ? function (b) { downloadOne(d, b, code); } : null });
    });
  }
  window.fxVerUrl = function (u, n, t, du, dn) { viewUrl(u, n, t, du, dn); };
  function viewUrl(url, name, title, dlUrl, dlName) {
    loadVisor().then(function (V) {
      V.open({ name: name, title: title || name, sub: (dlName || name) + " · incluido en el menú",
        getBlob: function () { return fetch(url).then(function (r) { if (!r.ok) throw { code: "missing" }; return r.blob(); }); },
        onDownload: S.dl ? function (b) { downloadUrl(dlUrl || url, dlName || name, b); } : null });
    });
  }
  async function downloadUrl(url, name, btn) {
    var old = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Preparando…"; }
    try { var r = await fetch(url); if (!r.ok) throw { code: "missing" }; await saveBlob(safe(name), await r.blob()); if (btn) btn.textContent = old; }
    catch (e) { if (btn) { btn.textContent = e && e.code === "declined" ? old : "No se pudo"; setTimeout(function () { if (btn.isConnected) btn.textContent = old; }, 3500); } }
    if (btn) btn.disabled = false;
  }

  /* ---------- casilleros: cada tarjeta o fila guarda su propio archivo ---------- */
  var PICK = document.createElement("input"); PICK.type = "file"; PICK.hidden = true; PICK.setAttribute("aria-hidden", "true");
  var pickFor = null;
  PICK.onchange = function () { var f = PICK.files && PICK.files[0], t = pickFor; PICK.value = ""; pickFor = null; if (f && t) uploadSlot(f, t.code, t.key, t.cat); };
  (document.body || document.documentElement).appendChild(PICK);
  function slotDoc(code, key) {
    var l = S.docs.filter(function (d) { return d.code === code && d.slot === key; });
    l.sort(function (a, b) { return String(b.at || "").localeCompare(String(a.at || "")); });
    return l[0] || null;
  }
  async function uploadSlot(file, code, key, cat) {
    var k = code + "|" + key;
    if (!S.assets || S.slotBusy[k]) return;
    S.slotBusy[k] = true; S.slotMsg[k] = null; paintSlots();
    try {
      var old = S.docs.filter(function (d) { return d.code === code && d.slot === key; });
      await uploadOne(file, code, cat || "evid", "", "", key);
      for (var i = 0; i < old.length; i++) {
        try { var pp = allParts(old[i]); for (var j = 0; j < pp.length; j++) await S.assets.delete(pp[j]); await S.db.collection("archivos").doc(old[i]._id).delete(); } catch (x) { }
      }
      S.slotMsg[k] = { kind: "ok", text: "Listo: " + file.name + (old.length ? " reemplazó al anterior." : " quedó cargado.") };
    } catch (e) { S.slotMsg[k] = { kind: "bad", text: "No se cargó " + file.name + ": " + errText(e) }; }
    S.slotBusy[k] = false; refreshUsage(); paintSlots(); badges();
    setTimeout(function () { if (S.slotMsg[k] && S.slotMsg[k].kind === "ok") { S.slotMsg[k] = null; paintSlots(); } }, 6000);
  }
  async function removeSlot(code, key, btn) {
    var k = code + "|" + key, d = slotDoc(code, key);
    if (!d || !S.assets) return;
    if (btn.dataset.confirm !== "1") { btn.dataset.confirm = "1"; btn.textContent = "¿Quitar archivo?"; setTimeout(function () { if (btn.isConnected) { btn.dataset.confirm = ""; btn.textContent = "Quitar"; } }, 4000); return; }
    S.slotBusy[k] = true; paintSlots();
    try {
      var l = S.docs.filter(function (x) { return x.code === code && x.slot === key; });
      for (var i = 0; i < l.length; i++) { var pq = allParts(l[i]); for (var j = 0; j < pq.length; j++) await S.assets.delete(pq[j]); await S.db.collection("archivos").doc(l[i]._id).delete(); }
      S.slotMsg[k] = { kind: "ok", text: "Se quitó " + d.name + "." };
    } catch (e) { S.slotMsg[k] = { kind: "bad", text: errText(e) }; }
    S.slotBusy[k] = false; refreshUsage(); paintSlots(); badges();
  }
  function slotState(el, code) {
    var key = el.dataset.slot, k = code + "|" + key, d = slotDoc(code, key), def = el.dataset.def || "";
    var defName = el.dataset.defname || (def ? decodeURIComponent(def.split("/").pop()) : "");
    var st = { key: key, k: k, d: d, def: d ? "" : def, has: !!(d || def), can: !!S.assets, busy: !!S.slotBusy[k], msg: S.slotMsg[k], cat: el.dataset.cat || "evid" };
    st.name = d ? d.name : defName;
    st.ext = d ? d.ext : ext(defName);
    st.short = st.busy ? "Subiendo…" : d ? (d.ext || "").toUpperCase() + " · " + size(d.size || 0) + " · " + fdate(d.at) + " · " + perOf(d) : def ? (ext(defName) || "").toUpperCase() + " · incluido" : (S.db && S.loading ? "Cargando…" : "Sin archivo");
    st.meta = st.busy ? "Subiendo… no cierres esta ventana" : d ? d.name + " · " + size(d.size || 0) + " · " + fdate(d.at) + " · " + perOf(d) : def ? defName + " · incluido en el menú"
      : (S.db && S.loading ? "Cargando…" : st.can ? "Sin archivo · toca para cargarlo" : "Sin archivo cargado");
    return st;
  }
  function renderSlot(el, code) {
    var st = slotState(el, code), kind = el.dataset.kind || "row", n = el.dataset.n || "", tag = el.dataset.tag || "";
    var go = st.busy ? "Subiendo…" : st.has ? "Ver ▸" : st.can ? "⬆ Cargar" : "Por cargar";
    var msg = st.msg ? '<div class="' + (kind === "card" ? "fxs-msg " : "fxr-msg ") + st.msg.kind + '" role="status">' + esc(st.msg.text) + "</div>" : "";
    var dis = st.busy ? " disabled" : "";
    if (kind === "card") {
      el.className = "fxs" + (st.has ? "" : " empty") + (st.busy ? " busy" : "");
      var ic = el.dataset.ic || (st.ext || "?").toUpperCase().slice(0, 3);
      var acts = "";
      if (st.has && S.dl) acts += '<button type="button" data-a="dl"' + dis + ">⬇ Descargar</button>";
      if (st.can) acts += '<button type="button" data-a="up"' + dis + ">" + (st.d ? "⟳ Reemplazar" : st.def ? "⟳ Cargar nueva versión" : "⬆ Cargar archivo") + "</button>";
      if (st.can && st.d) acts += '<button type="button" class="del" data-a="del"' + dis + ">Quitar</button>";
      el.innerHTML = '<button type="button" class="fxs-main" data-a="main"' + dis + ' aria-label="' + esc((st.has ? "Ver " : "Cargar ") + n) + '"><span class="tool-ic' + (el.dataset.cls ? " " + esc(el.dataset.cls) : "") + '" aria-hidden="true">' + esc(ic) + '</span><span class="tool-tx"><small>' + esc(tag) + "</small><b>" + esc(n) + "</b>" + (el.dataset.d ? "<span>" + esc(el.dataset.d) + "</span>" : "") +
        '<span class="fxs-file">📎 ' + esc(st.meta) + '</span></span><span class="fxs-go">' + go + "</span></button>" + '<div class="fxs-act">' + acts + "</div>" + msg;
    } else if (kind === "pill") {
      var h = "";
      if (st.has) {
        h += '<button type="button" class="sb" data-a="main" title="' + esc(st.name) + '"' + dis + "><b>▣</b>" + esc(n) + "</button>";
        if (S.dl) h += '<button type="button" class="sb fxp-s" data-a="dl" title="Descargar" aria-label="Descargar ' + esc(n) + '"' + dis + ">⬇</button>";
        if (st.can) h += '<button type="button" class="sb fxp-s" data-a="up" title="Reemplazar" aria-label="Reemplazar ' + esc(n) + '"' + dis + ">⟳</button>";
      } else if (st.can) h += '<button type="button" class="sb" data-a="up"' + dis + "><b>⬆</b>" + (st.busy ? "Subiendo…" : "Cargar " + esc(n)) + "</button>";
      else h += '<span class="sb off"><b>▣</b>' + esc(n) + "</span>";
      el.innerHTML = h + (st.msg ? '<span class="fxr-msg ' + st.msg.kind + '">' + esc(st.msg.text) + "</span>" : "");
    } else {
      el.className = "fxr" + (st.has ? "" : " empty") + (st.busy ? " busy" : "");
      var tools = "";
      if (st.has) {
        if (S.dl) tools += '<button type="button" data-a="dl" title="Descargar" aria-label="Descargar ' + esc(n) + '"' + dis + ">⬇</button>";
        if (st.can) tools += '<button type="button" data-a="up" title="Reemplazar" aria-label="Reemplazar ' + esc(n) + '"' + dis + ">⟳</button>";
      }
      el.innerHTML = '<button type="button" class="fxr-main" data-a="main"' + dis + "><i>" + esc(tag) + '</i><span><b title="' + esc(n) + '">' + esc(n) + "</b><small>" + esc(st.short) + "</small></span><em>" + (st.busy ? "Subiendo…" : st.has ? "Ver" : st.can ? "Cargar ⬆" : "Pendiente") + "</em></button>" +
        (tools ? '<span class="fxr-t">' + tools + "</span>" : "") + msg;
    }
    el.dataset.fxOn = "1";
    el.querySelectorAll("[data-a]").forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var a = b.dataset.a, s2 = slotState(el, code);
        if (a === "main") a = s2.has ? "view" : s2.can ? "up" : "";
        if (a === "view") { if (s2.d) viewDoc(s2.d, n, code); else if (s2.def) viewUrl(s2.def, s2.name, n); }
        else if (a === "up") { pickFor = { code: code, key: s2.key, cat: s2.cat }; PICK.click(); }
        else if (a === "dl") { if (s2.d) downloadOne(s2.d, b, code); else if (s2.def) downloadUrl(s2.def, s2.name, b); }
        else if (a === "del") removeSlot(code, s2.key, b);
      };
    });
  }
  /* ---------- links a mis visuales (artefactos, tableros, carpetas) ---------- */
  function normUrl(u) { u = String(u || "").trim(); if (!u) return ""; if (!/^https?:\/\//i.test(u)) u = "https://" + u; try { return new URL(u).href; } catch (e) { return ""; } }
  async function saveLink(code, key, title, url) {
    var old = S.docs.filter(function (d) { return d.code === code && d.slot === key; });
    if (url) await S.db.collection("archivos").add({ code: code, cat: "link", kind: "link", name: title, title: title, url: url, slot: key, ext: "link", enc: "link", parts: [], size: 0, rel: "", lote: "", at: new Date().toISOString() });
    for (var i = 0; i < old.length; i++) { try { await S.db.collection("archivos").doc(old[i]._id).delete(); } catch (x) { } }
  }
  async function quitarLink(code, key, title) {
    var old = S.docs.filter(function (d) { return d.code === code && d.slot === key; });
    await S.db.collection("archivos").add({ code: code, cat: "link", kind: "quitar", name: title, title: title, url: "", slot: key, ext: "link", enc: "link", parts: [], size: 0, rel: "", lote: "", at: new Date().toISOString() });
    for (var i = 0; i < old.length; i++) { try { await S.db.collection("archivos").doc(old[i]._id).delete(); } catch (x) { } }
  }
  async function ponerLink(code, key) {
    var old = S.docs.filter(function (d) { return d.code === code && d.slot === key && d.kind === "quitar"; });
    for (var i = 0; i < old.length; i++) { try { await S.db.collection("archivos").doc(old[i]._id).delete(); } catch (x) { } }
  }
  function renderLink(el, code) {
    var key = el.dataset.link, d = slotDoc(code, key), can = !!S.db && !!S.assets, k = code + "|" + key;
    if (d && d.kind === "quitar") {
      el.dataset.fxOn = "1";
      if (!can) { el.hidden = true; el.innerHTML = ""; return; }
      el.hidden = false; el.className = "fxq-w";
      el.innerHTML = '<div class="fxq"><span>Quitado de esta visual: <b>' + esc(el.dataset.n || d.title || "") + '</b></span><button type="button" data-a="back">↺ Volver a poner</button></div>';
      el.querySelector('[data-a="back"]').onclick = async function (ev) { ev.target.disabled = true; ev.target.textContent = "Guardando…"; try { await ponerLink(code, key); } catch (x) { ev.target.disabled = false; ev.target.textContent = "↺ Volver a poner"; S.slotMsg[k] = { kind: "bad", text: errText(x) }; } paintSlots(); };
      return;
    }
    el.hidden = false;
    var url = d ? d.url : (el.dataset.def || "");
    var title = (d && d.title) || el.dataset.n || "Link de la visual", busy = !!S.slotBusy[k], msg = S.slotMsg[k];
    var host = ""; try { host = url ? new URL(url).hostname.replace(/^www\./, "") : ""; } catch (e) { host = url; }
    el.dataset.fxOn = "1"; el.className = "fxs fxl" + (url ? "" : " empty") + (busy ? " busy" : "");
    if (el.dataset.edit === "1" && can) {
      el.innerHTML = '<form class="fxl-f"><label>Nombre<input name="t" maxlength="80" value="' + esc(title) + '"></label><label>Link · pega la dirección de tu visual o carpeta<input name="u" inputmode="url" autocomplete="off" placeholder="https://claude.ai/artifact/…" value="' + esc(url) + '"></label>' +
        '<div class="fxs-act"><button type="submit">Guardar</button><button type="button" data-a="cancel">Cancelar</button>' + (d ? '<button type="button" class="del" data-a="unlink">Quitar link</button>' : "") + "</div></form>";
      var f = el.querySelector("form"), inp = f.querySelector('[name="u"]');
      setTimeout(function () { inp.focus(); }, 30);
      f.onsubmit = async function (ev) {
        ev.preventDefault(); var u = normUrl(inp.value), t = (f.querySelector('[name="t"]').value || "").trim() || el.dataset.n || "Link";
        if (!u) { inp.setCustomValidity("Pega un link válido"); inp.reportValidity(); inp.setCustomValidity(""); return; }
        el.dataset.edit = ""; S.slotBusy[k] = true; renderLink(el, code);
        try { await saveLink(code, key, t, u); S.slotMsg[k] = { kind: "ok", text: "Link guardado." }; } catch (e) { S.slotMsg[k] = { kind: "bad", text: errText(e) }; }
        S.slotBusy[k] = false; paintSlots();
      };
      f.querySelector('[data-a="cancel"]').onclick = function () { el.dataset.edit = ""; renderLink(el, code); };
      var ul = f.querySelector('[data-a="unlink"]'); if (ul) ul.onclick = async function () { el.dataset.edit = ""; S.slotBusy[k] = true; renderLink(el, code); try { await saveLink(code, key, title, ""); } catch (e) { } S.slotBusy[k] = false; paintSlots(); };
      return;
    }
    var inner = '<span class="tool-ic" aria-hidden="true">' + esc(el.dataset.ic || "🔗") + '</span><span class="tool-tx"><small>' + esc(el.dataset.tag || "Visual vinculada") + "</small><b>" + esc(title) + "</b>" + (el.dataset.d ? "<span>" + esc(el.dataset.d) + "</span>" : "") +
      '<span class="fxs-file">🔗 ' + esc(busy ? "Guardando…" : url ? host : can ? "Sin link · toca para pegarlo" : "Sin link") + '</span></span><span class="fxs-go">' + (url ? "Abrir ↗" : can ? "🔗 Cargar link" : "Pendiente") + "</span>";
    el.innerHTML = (can && !busy ? '<button type="button" class="fxl-x" data-a="quitar" title="Quitar de esta visual" aria-label="Quitar ' + esc(title) + ' de esta visual">✕</button>' : "") + (url ? '<a class="fxs-main" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + "</a>" : '<button type="button" class="fxs-main" data-a="edit"' + (can ? "" : " disabled") + ">" + inner + "</button>") +
      (can && url ? '<div class="fxs-act"><button type="button" data-a="edit">✎ Cambiar link</button></div>' : "") + (msg ? '<div class="fxs-msg ' + msg.kind + '" role="status">' + esc(msg.text) + "</div>" : "");
    el.querySelectorAll('[data-a="edit"]').forEach(function (b) { b.onclick = function () { el.dataset.edit = "1"; S.slotMsg[k] = null; renderLink(el, code); }; });
    var qx = el.querySelector('[data-a="quitar"]');
    if (qx) qx.onclick = async function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (!window.confirm("¿Quitar «" + title + "» de este subbloque?\nPuedes volver a ponerlo cuando quieras.")) return;
      S.slotBusy[k] = true; renderLink(el, code);
      try { await quitarLink(code, key, title); S.slotMsg[k] = null; } catch (x) { S.slotMsg[k] = { kind: "bad", text: errText(x) }; }
      S.slotBusy[k] = false; paintSlots();
    };
  }

  /* ---------- barras de carga (archivos, evidencias, fotos) ---------- */
  function renderUp(el, code) {
    el.dataset.fxOn = "1";
    if (!S.assets) { var b0 = el.querySelector(".fxu-host"); if (b0) b0.remove(); if (el.hasAttribute("data-mini")) el.hidden = true; return; }
    el.hidden = false;
    var host = el.querySelector(":scope > .fxu-host");
    if (!host) { host = document.createElement("div"); host.className = "fxu-host"; el.insertBefore(host, el.firstChild); }
    var fotos = el.dataset.kind === "fotos";
    if (el.hasAttribute("data-mini")) host.innerHTML = '<button type="button" class="sb" data-a="files"><b>⬆</b>' + esc(el.dataset.n || "Subir archivos") + "</button>";
    else host.innerHTML = '<div class="fxu' + (fotos ? " ph" : "") + '"><span class="up-ic" aria-hidden="true">' + (fotos ? "📷" : "⬆") + '</span><span class="up-tx"><b>' + esc(el.dataset.t || (fotos ? "Fotos del personal capacitado" : "Subir mis archivos")) + "</b><small>" +
      esc(el.dataset.s || (fotos ? "Toma o sube las fotos desde tu celular o tu PC" : "Desde tu PC, escritorio u OneDrive · archivos sueltos o carpetas completas")) + "</small></span>" +
      '<span class="fxu-b">' + (fotos ? '<button type="button" class="fx-b" data-a="fotos">📷 Subir fotos</button>' : '<button type="button" class="fx-b" data-a="files">⬆ Archivos</button><button type="button" class="fx-b alt" data-a="dir">📁 Carpeta</button>') + "</span></div>";
    var boxOf = function () { return el.querySelector(":scope > .fx"); };
    host.querySelectorAll("[data-a]").forEach(function (b) {
      b.onclick = function () { var box = boxOf(); if (!box) return; var inp = box.querySelector('[data-in="' + b.dataset.a + '"]'); if (inp) inp.click(); };
    });
    var drop = host.querySelector(".fxu");
    if (drop) {
      drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.style.borderStyle = "dashed"; });
      drop.addEventListener("dragleave", function () { drop.style.borderStyle = ""; });
      drop.addEventListener("drop", async function (e) { e.preventDefault(); drop.style.borderStyle = ""; var box = boxOf(); if (!box) return; var items = await collectDrop(e.dataTransfer); uploadMany(items, code, el.dataset.cat || "evid", box); });
    }
  }
  function paintSlots() {
    var page = document.querySelector("#sheet .page"); if (!page) return;
    var code = codeOf(page); if (!code) return;
    page.querySelectorAll("[data-slot]").forEach(function (el) { renderSlot(el, code); });
    page.querySelectorAll("[data-link]").forEach(function (el) { if (el.dataset.edit !== "1") renderLink(el, code); });
    page.querySelectorAll("[data-fxup]").forEach(function (el) { renderUp(el, code); });
  }

  /* ---------- lista de lo subido bajo cada barra ---------- */
  function panelHtml(code, host, isFirst, cats) {
    var hc = host.dataset.cat || "evid", fotos = host.dataset.kind === "fotos", can = !!S.assets, h = "";
    var list = docsFor(code).filter(function (d) { var c = d.cat || "otro"; return !d.slot && c !== "link" && (c === hc || (isFirst && cats.indexOf(c) < 0)); });
    if (S.err && !list.length) return "";
    if (can) h += (fotos ? '<input type="file" multiple hidden accept="image/*" data-in="fotos">' : '<input type="file" multiple hidden data-in="files"><input type="file" multiple hidden webkitdirectory data-in="dir">') + '<div class="fx-prog" aria-live="polite"></div><div class="fx-bar"><i></i></div>';
    if (S.flash && S.flash.code === code && (S.flash.host ? S.flash.host === hc : isFirst)) h += '<div class="fx-msg ' + S.flash.kind + '" role="status">' + esc(S.flash.text) + "</div>";
    /* lo más reciente primero, agrupado por período (H1 / H2) */
    list.sort(function (a, b) { return String(b.at || "").localeCompare(String(a.at || "")) || (a.rel + "/" + a.name).localeCompare(b.rel + "/" + b.name, "es"); });
    var perHead = function (d, prev) { var p = perOf(d); return p && p !== prev ? p : ""; };
    if (fotos) {
      if (list.length) {
        var pv = "", open = false;
        list.forEach(function (d) {
          var ph = perHead(d, pv); if (ph) { if (open) h += "</div>"; h += '<div class="fx-per">Período ' + esc(ph.replace(" ", " · ")) + "</div><div class=\"fx-ph\">"; open = true; pv = ph; }
          else if (!open) { h += '<div class="fx-ph">'; open = true; }
          var img = (d.enc === "raw" || d.url) && /^(png|jpe?g|gif|webp)$/.test(d.ext || "");
          h += '<figure><button type="button" data-view="' + esc(d._id) + '" title="' + esc(d.name) + '">' + (img ? '<img loading="lazy" alt="' + esc(d.name) + '" src="' + esc(d.url || "/_blob/" + d.parts[0]) + '">' : icon(d.ext)) + "</button>" + (can ? '<button type="button" class="fx-a del" data-del="' + esc(d._id) + '" aria-label="Eliminar foto">✕</button>' : "") + "</figure>";
        });
        if (open) h += "</div>";
      } else if (!S.loading) h += '<div class="fx-empty">Aún no hay fotos.</div>';
      return h;
    }
    if (list.length) {
      h += '<ul class="fx-list">'; var pv2 = "";
      list.forEach(function (d) {
        var ph2 = perHead(d, pv2); if (ph2) { h += '<li class="fx-per">Período ' + esc(ph2.replace(" ", " · ")) + "</li>"; pv2 = ph2; }
        h += '<li class="fx-it">' + icon(d.ext) + '<div class="fx-nm"><button type="button" data-view="' + esc(d._id) + '" title="Ver ' + esc(d.name) + '">' + esc(d.name) + "</button><small>" + (d.rel ? "📁 " + esc(d.rel) + " · " : "") + size(d.size || 0) + " · " + fdate(d.at) + (perOf(d) ? " · " + perOf(d) : "") + "</small></div>" +
          '<div class="fx-act"><button class="fx-a" data-view="' + esc(d._id) + '">Ver</button><button class="fx-a" data-get="' + esc(d._id) + '">Descargar</button>' + (can ? '<button class="fx-a del" data-del="' + esc(d._id) + '">Eliminar</button>' : "") + "</div></li>";
      });
      h += "</ul>";
      if (list.length > 1) h += '<div class="fx-btns" style="margin-top:8px"><button class="fx-b ghost" data-zip="all">⬇ Descargar todos (.zip)</button></div>';
    }
    return h;
  }
  function wire(box, code, host) {
    var cat = function () { return host.dataset.cat || "evid"; };
    box.querySelectorAll("[data-in]").forEach(function (inp) {
      inp.onchange = function () { var items = collectInput(inp); inp.value = ""; uploadMany(items, code, cat(), box); };
    });
    var byId = {}; docsFor(code).forEach(function (d) { byId[d._id] = d; });
    box.querySelectorAll("[data-get]").forEach(function (b) { b.onclick = function () { downloadOne(byId[b.dataset.get], b, code); }; });
    box.querySelectorAll("[data-view]").forEach(function (b) { b.onclick = function () { viewDoc(byId[b.dataset.view], null, code); }; });
    box.querySelectorAll("[data-del]").forEach(function (b) { b.onclick = function () { S.flashHost = cat(); removeOne(byId[b.dataset.del], b, code); }; });
    box.querySelectorAll("[data-zip]").forEach(function (b) {
      b.onclick = function () {
        var ids = {}; box.querySelectorAll("[data-get]").forEach(function (x) { ids[x.dataset.get] = 1; });
        downloadZip(docsFor(code).filter(function (d) { return ids[d._id]; }), "Subbloque_" + code + ".zip", b, code);
      };
    });
  }
  function paint() {
    var page = document.querySelector("#sheet .page");
    if (!page) return;
    var code = codeOf(page); if (!code) return;
    page.querySelectorAll(".fx").forEach(function (b) { if (!b.parentNode || !b.parentNode.matches("[data-fxup]")) b.remove(); });
    var hosts = Array.prototype.slice.call(page.querySelectorAll("[data-fxup]:not([data-mini])"));
    if (!hosts.length) return;
    var cats = hosts.map(function (x) { return x.dataset.cat || "evid"; });
    var first = -1; hosts.forEach(function (x, i) { if (first < 0 && x.dataset.kind !== "fotos") first = i; });
    hosts.forEach(function (host, i) {
      var box = host.querySelector(":scope > .fx");
      if (box && box.dataset.busy === "1") return; // no repintar durante la subida
      if (!box) { box = document.createElement("div"); box.className = "fx fx-in"; box.setAttribute("aria-label", "Archivos subidos"); host.appendChild(box); }
      box.dataset.code = code;
      box.innerHTML = panelHtml(code, host, i === first, cats);
      wire(box, code, host);
    });
  }
  function badges() {
    var cnt = {}; S.docs.forEach(function (d) { cnt[d.code] = (cnt[d.code] || 0) + 1; });
    try { if (window.fxEstado) { var set = new Set(); S.docs.forEach(function (d) { if (d.code && d.kind !== "quitar") set.add(d.code); }); window.fxEstado(set); } } catch (e) { }
    document.querySelectorAll(".leaf[data-c]").forEach(function (el) {
      var n = cnt[el.dataset.c] || 0, b = el.querySelector(".fx-cnt"), host = el.querySelector(".ts") || el;
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement("em"); b.className = "fx-cnt"; b.title = "Archivos subidos"; host.appendChild(b); }
      b.textContent = "📎 " + n;
    });
  }
  var sheet = document.getElementById("sheet");
  if (sheet) new MutationObserver(function () {
    var page = sheet.querySelector(".page");
    if (!page) return;
    var need = Array.prototype.some.call(page.querySelectorAll("[data-fxup]:not([data-mini])"), function (h) { return !h.querySelector(":scope > .fx"); });
    if (need) { if (!page.querySelector(".fx")) S.flash = null; paint(); }
    if (page.querySelector("[data-slot]:not([data-fx-on]),[data-fxup]:not([data-fx-on]),[data-link]:not([data-fx-on])")) paintSlots();
  }).observe(sheet, { childList: true, subtree: true });
})();
