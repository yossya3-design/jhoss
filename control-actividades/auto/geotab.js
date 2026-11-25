/* Control T2 · ayudante de carga automática desde Geotab.
   Se inyecta en la pestaña de Geotab (my.geotab.com) o del add-in RTT2 (azurewebsites) y:
   - toma el último reporte listo (SIC Retorno de Unidades / Tiempo de entrega en punto de venta),
   - lo lee en el navegador (SheetJS) y deja solo las columnas que usa Control T2,
   - abre Control T2 con el archivo comprimido en el #fragmento (no viaja a ningún servidor ajeno).
   No lee contraseñas ni tokens: reutiliza la descarga que hace la propia página. */
(function () {
  const CT2 = 'https://seguimiento-delivery-t2.netlify.app/control-actividades/';
  const XLSX_URL = CT2 + 'lib/xlsx.full.min.js';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // SheetJS propio (algunas páginas ya tienen otro "XLSX"): se carga, se guarda aparte y se restaura el de la página
  let SJS = null;
  const loadXLSX = async () => {
    if (SJS) return;
    if (window.XLSX && window.XLSX.read && window.XLSX.utils && window.XLSX.utils.sheet_to_json) { SJS = window.XLSX; return; }
    const prev = window.XLSX;
    await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = XLSX_URL; s.onload = ok; s.onerror = () => ko(new Error('no cargó SheetJS')); document.head.appendChild(s); });
    SJS = window.XLSX; if (prev !== undefined) window.XLSX = prev;
  };
  async function b64gz(obj) {
    const gz = await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let s = ''; const u = new Uint8Array(gz); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function enviar(name, sheets) {
    const b = await b64gz({ files: [{ name, sheets }] });
    setTimeout(() => { location.href = CT2 + '#ct2=' + b; }, 50);
    return { enviado: name, bytes: b.length };
  }
  const pick = (aoa, cols) => {
    const hi = aoa.findIndex((r) => r && cols.slice(0, 2).every((c) => r.map((x) => String(x || '').trim()).includes(c)));
    if (hi < 0) throw new Error('no encontré la cabecera ' + cols.slice(0, 2).join(' / '));
    const h = aoa[hi].map((x) => String(x || '').trim()), ix = cols.map((c) => h.indexOf(c));
    return [cols].concat(aoa.slice(hi + 1).filter((r) => r && r[ix[0]] != null && r[ix[0]] !== '').map((r) => ix.map((j) => (j < 0 || r[j] === undefined ? null : (typeof r[j] === 'number' ? Math.round(r[j] * 1e6) / 1e6 : r[j])))));
  };

  // ---- SIC Retorno de Unidades (página Mis reportes de MyGeotab) ----
  async function sic({ desde } = {}) {
    const ts = (e) => { const m = e.textContent.match(/(\d\d)\/(\d\d)\/(\d\d) (\d\d):(\d\d):(\d\d) (am|pm)/); if (!m) return 0; const h = (+m[4] % 12) + (m[7] === 'pm' ? 12 : 0); return Date.UTC(2000 + +m[3], m[2] - 1, +m[1], h, +m[5], +m[6]); };
    let items = [];
    for (let i = 0; i < 40 && !items.length; i++) { if (i) await sleep(500); items = [...document.querySelectorAll('.zen-feed-item, tr')].filter((e) => /SIC Retorno de Unidades/.test(e.textContent) && e.textContent.split('SIC Retorno').length === 2 && /Listo/.test(e.textContent) && e.querySelector('button')).sort((a, b) => ts(b) - ts(a)); }
    if (!items.length) throw new Error('no hay un SIC Retorno de Unidades listo en Mis reportes');
    const it = items[0], t = ts(it);
    if (desde && t < desde) throw new Error('el SIC más reciente aún no está listo (último: ' + new Date(t).toISOString().slice(11, 16) + ')');
    await loadXLSX();
    const os = HTMLFormElement.prototype.submit; let F = null; HTMLFormElement.prototype.submit = function () { F = this; };
    try { it.querySelector('button').click(); await sleep(800); } finally { HTMLFormElement.prototype.submit = os; }
    if (!F) throw new Error('no se capturó la descarga del SIC');
    const blob = await (await fetch(F.action, { method: 'POST', body: new URLSearchParams(new FormData(F)) })).blob();
    const wb = SJS.read(await blob.arrayBuffer(), { type: 'array' });
    const det = SJS.utils.sheet_to_json(wb.Sheets.Detalle, { header: 1, raw: true, defval: null });
    const rows = pick(det, ['Unidad', 'Hora Ini. Real', 'H. Fin Real', 'Hora Fin Plan (lim. 10:30)', 'Tiempo Avance', 'Tiempo Restante', 'Dist. (Km)', 'Tiempo en CD', 'Ubicación']).filter((r, i) => i === 0 || /^PE/.test(String(r[0])));
    const hhmm = new Date(t).toISOString().slice(11, 16); // hora local mostrada en Geotab
    return enviar('SIC Geotab ' + hhmm, { Detalle: rows });
  }

  // ---- Tiempo de entrega en punto de venta (add-in RTT2, página standalone en azurewebsites) ----
  async function geo() {
    let a = null;
    for (let i = 0; i < 60 && !a; i++) { a = [...document.querySelectorAll('a')].find((e) => /Tiempo de entrega en punto de venta_/.test(e.textContent)); if (!a) await sleep(1000); }
    if (!a) throw new Error('el reporte de tiempo de entrega aún no está listo');
    await loadXLSX();
    const u = new URL(a.getAttribute('href'), location.href);
    const blob = await (await fetch(u.pathname)).blob();
    const wb = SJS.read(await blob.arrayBuffer(), { type: 'array' });
    const aoa = SJS.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
    const rows = pick(aoa, ['Placa', 'Viaje', 'Codigo Cliente', 'Secuencia', 'Secuencia real', 'Cliente visitado', 'Tiempo visita Plan', 'Tiempo visita Real', 'Latitud', 'Longitud', 'Distancia Plan Cliente Ant', 'Distancia ejec Cliente Ant', 'Hora plan Llegada cliente', 'Hora ejec Llegada cliente', 'Hora plan Salida cliente', 'Hora ejec Salida cliente', 'Fecha']);
    return enviar('Geotab tiempo de entrega ' + new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 16), { Data: rows });
  }

  // ---- BEES Deliver: Detalles de los transportes → Descargar CSV (página /control-tower) ----
  async function bees() {
    if (!/\/control-tower/.test(location.pathname)) throw new Error('abre primero https://deliver-portal.bees-platform.com/control-tower');
    let btn = null;
    for (let i = 0; i < 30 && !btn; i++) { btn = [...document.querySelectorAll('button')].find((b) => /^\s*DESCARGAR\s*$/i.test(b.textContent)); if (!btn) await sleep(500); }
    if (!btn) throw new Error('no encontré el botón DESCARGAR');
    let blob = null, nombre = '';
    const oc = URL.createObjectURL, ac = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = function (b) { if (b instanceof Blob) blob = b; return oc.call(URL, b); };
    HTMLAnchorElement.prototype.click = function () { if (String(this.href).startsWith('blob:')) { nombre = this.download || ''; return; } return ac.call(this); };
    try { btn.click(); for (let i = 0; i < 90 && !blob; i++) await sleep(500); }
    finally { URL.createObjectURL = oc; HTMLAnchorElement.prototype.click = ac; }
    if (!blob) throw new Error('BEES no generó el CSV');
    await loadXLSX();
    const wb = SJS.read(await blob.text(), { type: 'string', FS: ';', raw: true });
    const aoa = SJS.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
    const rows = pick(aoa, ['tour_display_id', 'poc_external_id', 'tour_date', 'truck_license_plate', 'status', 'tour_status', 'trip_start_timestamp', 'arrived_at', 'finished_at', 'within_radius', 'out_of_radius_reason', 'total_delivered_vol', 'total_refused_vol', 'volume_hectoliters_sum']);
    return enviar('BEES ' + (nombre.match(/(\d\dh\d\dm)/) || ['', new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 16)])[1].replace('h', ':').replace('m', ''), { BEES: rows });
  }

  window.CT2AUTO = { sic, geo, bees, version: '2026-11-25b' };
})();
