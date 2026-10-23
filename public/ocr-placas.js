// Lee placas desde la imagen del reporte (captura o foto) y las cruza con la flota.
// El reconocimiento de texto corre en el navegador con Tesseract.js; nada se sube a ningún servidor.
(function () {
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  let cargando = null;
  const cargar = () => cargando || (cargando = new Promise((res, rej) => {
    if (window.Tesseract) return res(window.Tesseract);
    const s = document.createElement('script'); s.src = TESS; s.onload = () => res(window.Tesseract); s.onerror = () => { cargando = null; rej(new Error('No se pudo cargar el lector de imágenes. Revisa tu conexión.')); };
    document.head.append(s);
  }));

  // Mejora la imagen antes de leerla: escala de grises, más grande y con más contraste.
  async function preparar(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo abrir la imagen')); i.src = url; });
      const k = Math.max(1, Math.min(3, 2000 / Math.max(img.width, img.height)));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      let sum = 0; for (let i = 0; i < p.length; i += 4) sum += 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      const mean = sum / (p.length / 4), inv = mean < 110;
      for (let i = 0; i < p.length; i += 4) { let g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; if (inv) g = 255 - g; g = Math.max(0, Math.min(255, (g - 128) * 1.6 + 128)); p[i] = p[i + 1] = p[i + 2] = g; }
      x.putImageData(d, 0, 0); return c;
    } finally { URL.revokeObjectURL(url); }
  }

  async function leer(file, onProgress) {
    const T = await cargar();
    const img = await preparar(file);
    const r = await T.recognize(img, 'eng', { logger: (m) => { if (onProgress && m.status === 'recognizing text') onProgress(m.progress); } });
    return r.data.text || '';
  }

  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const keyOf = (pl) => norm(pl).replace(/^PE(?=[A-Z0-9]{6}$)/, '');
  const CONF = { O: '0', Q: '0', D: '0', I: '1', L: '1', T: '1', S: '5', B: '8', Z: '2', G: '6' };
  const loose = (k) => k.split('').map((ch) => CONF[ch] || ch).join('');
  function lev(a, b) { const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }

  // texto leído + flota [[placa, ruta, edt], ...] -> placas reconocidas y textos dudosos
  function extraer(text, flota) {
    const fl = flota.map(([placa, ruta, edt]) => ({ placa, ruta, edt, k: keyOf(placa), kl: loose(keyOf(placa)) }));
    const byK = new Map(fl.map((f) => [f.k, f])), byL = new Map(), byR = new Map(fl.map((f) => [norm(f.ruta), f]));
    fl.forEach((f) => { byL.set(f.kl, byL.has(f.kl) ? null : f); });
    const buscar = (tok) => {
      const k = keyOf(tok); if (k.length < 6 || k.length > 7) return null;
      if (byK.has(k)) return { f: byK.get(k), via: 'placa' };
      const l = loose(k); if (byL.get(l)) return { f: byL.get(l), via: 'aprox' };
      let best = null, bd = 9, dup = false; fl.forEach((f) => { const dd = lev(l, f.kl); if (dd < bd) { bd = dd; best = f; dup = false; } else if (dd === bd) dup = true; });
      return bd <= 1 && !dup ? { f: best, via: 'aprox' } : null;
    };
    const found = new Map(), dudosos = [];
    String(text).split(/\r?\n/).forEach((line) => {
      const U = line.toUpperCase().replace(/[–—_]/g, '-').replace(/\b\d{1,2}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{2,4}\b/g, ' ').replace(/\b\d{5,}\b/g, ' ');
      const bk = (U.match(/[B8]\s?K\s?-?\s?(\d{4})/) || [])[1];
      const cands = [...U.matchAll(/(?<![A-Z0-9])(?:P\s?E\s?)?[A-Z0-9]{3}\s?[-.]?\s?[A-Z0-9]{3}(?![A-Z0-9])/g)].map((m) => m[0]).filter((t) => /[A-Z]/.test(t.replace(/^PE/, '')) && /\d/.test(t) && !/^[B8]\s?K/.test(t) && !/^\d{2}\/?\d{2}/.test(t));
      let hit = null; for (const c of cands) { const h = buscar(c); if (h) { hit = { ...h, leido: c.replace(/\s/g, '') }; break; } }
      const fr = bk && byR.get('BK' + bk);
      if (fr && (!hit || (hit.via === 'aprox' && hit.f.placa !== fr.placa))) hit = { f: fr, via: 'ruta', leido: 'BK' + bk };
      if (hit) { if (!found.has(hit.f.placa)) found.set(hit.f.placa, { placa: hit.f.placa, ruta: hit.f.ruta, edt: hit.f.edt, via: hit.via, leido: hit.leido }); }
      else cands.forEach((c) => { const t = c.replace(/\s/g, ''); if (t.length >= 6 && !dudosos.includes(t)) dudosos.push(t); });
    });
    return { placas: [...found.values()], dudosos };
  }
  window.bxOcr = { leer, extraer };
})();
