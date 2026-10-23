// Cierre de turno: arma las tablas del día (total, parcial, resumen por EDT y reclamos)
// y las dibuja como imagen para pegar en el correo, o como tablas HTML para Outlook.
(function () {
  const sum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0);
  const f3 = (v) => (Math.round(v * 1000) / 1000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const fecha = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

  function build(all, day, short) {
    const bit = all.filter((r) => r.tipo === 'Modificación de viaje' && r.fecha === day);
    const des = all.filter((r) => r.tipo === 'Cliente desplanificado' && r.fecha === day);
    const kindOf = (r) => {
      const b = (r.viaje && bit.find((x) => x.viaje && x.viaje === r.viaje)) || bit.find((x) => x.ruta === r.ruta && /DESPLANIF/.test(x.motivo));
      return b ? (/TOTAL/.test(b.motivo) ? 'TOTAL' : 'PARCIAL') : 'PARCIAL';
    };
    des.forEach((r) => { r._k = kindOf(r); });
    const linesOf = (b) => des.filter((r) => (r.viaje && b.viaje ? r.viaje === b.viaje : r.ruta === b.ruta) && r._k === 'TOTAL');
    const totalRows = bit.filter((b) => /TOTAL/.test(b.motivo)).map((b) => { const ls = linesOf(b); return [b.ruta, b.viaje || '', b.nviaje || '', (b.placa || '').replace(/^PE/, ''), ls.length, sum(ls, (x) => x.hl)]; })
      .sort((a, b) => a[0].localeCompare(b[0]));
    const sinLineas = totalRows.filter((r) => !r[4]).map((r) => r[0] + ' (total)');
    const parc = new Map();
    des.filter((r) => r._k === 'PARCIAL').forEach((r) => { const o = parc.get(r.ruta) || { n: 0, hl: 0 }; o.n++; o.hl += +r.hl || 0; parc.set(r.ruta, o); });
    bit.filter((b) => /PARCIAL/.test(b.motivo) && !parc.has(b.ruta)).forEach((b) => parc.set(b.ruta, { n: 0, hl: 0 }));
    parc.forEach((o, ru) => { if (!o.n) sinLineas.push(ru + ' (parcial)'); });
    const parcRows = [...parc.entries()].filter(([, o]) => o.n).sort((a, b) => a[0].localeCompare(b[0])).map(([ru, o]) => [ru, o.n, o.hl]);
    const ACC = [['ZT (rechazo)', 'ZT'], ['Reprogramación', 'REPROGRAMACIÓN'], ['Sin clasificar', 'SIN CLASIFICAR']];
    const edtGroups = ACC.map(([a, lab]) => { const ls = des.filter((r) => r.accion === a); if (!ls.length) return null;
      const m = new Map(); ls.forEach((r) => { const k = short(r.edt); const o = m.get(k) || { n: 0, hl: 0 }; o.n++; o.hl += +r.hl || 0; m.set(k, o); });
      return { lab, n: ls.length, hl: sum(ls, (x) => x.hl), rows: [...m.entries()].sort((a2, b2) => b2[1].hl - a2[1].hl).map(([k, o]) => [k, o.n, o.hl]) }; }).filter(Boolean);
    const recl = all.filter((r) => r.tipo === 'Reclamo de ventas' && (r.fecha === day || (r.fecha <= day && r.status !== 'SOLUCIONADO')))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const recSol = recl.filter((r) => r.status === 'SOLUCIONADO').length;
    const cab = bit.filter((b) => /CABECERA/.test(b.motivo)).length;
    const totalConLineas = totalRows.filter((r) => r[4]);
    const rmap = new Map(); des.forEach((r) => { const o = rmap.get(r.ruta) || { ruta: r.ruta, tipo: r._k, edt: short(r.edt), n: 0, hl: 0, zt: 0, rp: 0 }; o.n++; o.hl += +r.hl || 0;
      if (r.accion === 'ZT (rechazo)') o.zt += +r.hl || 0; else if (r.accion === 'Reprogramación') o.rp += +r.hl || 0; if (r._k === 'TOTAL') o.tipo = 'TOTAL'; rmap.set(r.ruta, o); });
    const rutas = [...rmap.values()].sort((a, b) => b.hl - a.hl);
    const emap = new Map(); des.forEach((r) => { const k = short(r.edt); const o = emap.get(k) || { edt: k, n: 0, hl: 0, zt: 0, rp: 0, nzt: 0, nrp: 0 }; o.n++; o.hl += +r.hl || 0;
      if (r.accion === 'ZT (rechazo)') { o.zt += +r.hl || 0; o.nzt++; } else if (r.accion === 'Reprogramación') { o.rp += +r.hl || 0; o.nrp++; } emap.set(k, o); });
    const edts = [...emap.values()].sort((a, b) => b.hl - a.hl);
    return { rutas, edts, sinLineas, day, fecha: fecha(day), dia: DIAS[new Date(day + 'T12:00:00Z').getUTCDay()], totalRows: totalConLineas, parcRows, edtGroups, recl, recSol, recPend: recl.length - recSol,
      nTotal: bit.filter((b) => /TOTAL/.test(b.motivo)).length, nParc: bit.filter((b) => /PARCIAL/.test(b.motivo)).length || parcRows.length, cab, nDes: des.length, hlDes: sum(des, (x) => x.hl), short };
  }

  // ---------- imagen (estilo Tapiz Backus: negro y dorado) ----------
  const K = { bg: '#0A0A0B', panel: '#14120D', panel2: '#1B1810', line: '#3A3121', fg: '#F4F1E8', mute: '#A79F8C', gold: '#F2C52A', gold2: '#C8960F', gold3: '#FFE97A', red: '#C94A43', amber: '#D9A62E', green: '#2FA36B', headBg: '#2A2310' };
  const FD = (w, s) => `${w} ${s}px 'Big Shoulders Display', 'Bahnschrift Condensed', 'Arial Narrow', Arial, sans-serif`;
  const FT = (w, s) => `${w} ${s}px Barlow, 'Segoe UI', Arial, sans-serif`;
  const FM = (w, s) => `${w} ${s}px 'JetBrains Mono', Consolas, 'Courier New', monospace`;
  const imgCache = {};
  const loadImg = (src) => imgCache[src] || (imgCache[src] = new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  function fit(ctx, t, w) { t = String(t); if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function goldText(ctx, t, x, y, size) { const g = ctx.createLinearGradient(0, y - size * 0.7, 0, y + size * 0.4); g.addColorStop(0, K.gold3); g.addColorStop(0.55, K.gold); g.addColorStop(1, K.gold2); ctx.fillStyle = g; ctx.fillText(t, x, y); }
  function panel(ctx, x, y, w, h, accent) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; rr(ctx, x, y, w, h, 12); ctx.fillStyle = K.panel; ctx.fill(); ctx.restore();
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 12); ctx.strokeStyle = K.line; ctx.lineWidth = 1; ctx.stroke();
    if (accent) { ctx.save(); rr(ctx, x, y, w, h, 12); ctx.clip(); ctx.fillStyle = accent; ctx.fillRect(x, y, w, 4); ctx.restore(); } }
  const RH = 28;
  const tblH = (n, total) => 50 + RH * (1 + Math.max(n, 1) + (total ? 1 : 0)) + 14;
  function table(ctx, x, y, w, title, cols, rows, opt = {}) {
    const h = tblH(rows.length, !!opt.total); panel(ctx, x, y, w, h, opt.accent || K.gold);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = FD(800, 20); goldText(ctx, title.toUpperCase(), x + 16, y + 28, 20);
    const cw = cols.reduce((s, c) => s + c.w, 0), sc = (w - 28) / cw; const X = x + 14; let cy = y + 46;
    const row = (cells, st) => {
      if (st.bg) { ctx.fillStyle = st.bg; if (st.round) { rr(ctx, X, cy, w - 28, RH, 6); ctx.fill(); } else ctx.fillRect(X, cy, w - 28, RH); }
      if (st.bar) { ctx.fillStyle = st.bar; ctx.fillRect(X, cy + 4, 3, RH - 8); }
      let cx = X; cells.forEach((v, i) => { const c = cols[i], cwd = c.w * sc; ctx.font = st.font || (st.bold ? FT(700, 14) : FT(500, 14)); ctx.fillStyle = st.ink || K.fg;
        let span = cwd; if (!c.r) for (let j = i + 1; j < cells.length && cells[j] === ''; j++) span += cols[j].w * sc;
        const pad = 10 + (i === 0 && st.indent ? 16 : 0); const t = fit(ctx, v == null ? '' : v, span - pad - 10);
        if (c.r) { ctx.textAlign = 'right'; ctx.fillText(t, cx + cwd - 10, cy + RH / 2 + 1); } else { ctx.textAlign = 'left'; ctx.fillText(t, cx + pad, cy + RH / 2 + 1); } cx += cwd; });
      if (!st.noLine) { ctx.strokeStyle = 'rgba(58,49,33,.7)'; ctx.beginPath(); ctx.moveTo(X, cy + RH + 0.5); ctx.lineTo(X + w - 28, cy + RH + 0.5); ctx.stroke(); }
      cy += RH; };
    row(cols.map((c) => c.h.toUpperCase()), { bg: K.headBg, ink: K.gold, font: FM(700, 11), round: 1, noLine: 1 });
    if (!rows.length) { ctx.font = FT(500, 14); ctx.fillStyle = K.mute; ctx.textAlign = 'left'; ctx.fillText(opt.empty || 'Sin registros', X + 10, cy + RH / 2 + 1); cy += RH; }
    rows.forEach((r) => row(r.cells || r, r.st || {}));
    if (opt.total) { const g = ctx.createLinearGradient(0, cy, 0, cy + RH); g.addColorStop(0, '#F2C52A'); g.addColorStop(1, '#C8960F'); row(opt.total, { bg: g, bold: 1, ink: '#14110A', round: 1, noLine: 1 }); }
    return y + h;
  }
  function kpi(ctx, x, y, w, h, lab, val, sub, accent) {
    panel(ctx, x, y, w, h, accent); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = FM(700, 11); ctx.fillStyle = K.mute; ctx.fillText(lab.toUpperCase(), x + 16, y + 30);
    ctx.font = FD(800, 40); ctx.fillStyle = K.fg; ctx.fillText(val, x + 16, y + 72);
    ctx.font = FT(500, 13); ctx.fillStyle = K.mute; ctx.fillText(fit(ctx, sub, w - 32), x + 16, y + 96); ctx.textBaseline = 'middle';
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  function label(ctx, t, x, y, col) { ctx.font = FM(700, 12); ctx.fillStyle = col || K.mute; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t.toUpperCase(), x, y); }
  function chip(ctx, t, x, y, bg, ink) { ctx.font = FM(700, 10); const w = ctx.measureText(t).width + 14; rr(ctx, x, y - 10, w, 20, 10); ctx.fillStyle = bg; ctx.fill(); ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.fillText(t, x + 7, y + 1); return w; }
  function wrap(ctx, t, w) { const out = []; let line = ''; t.split(' ').forEach((wd) => { const tt = line ? line + ' ' + wd : wd; if (ctx.measureText(tt).width > w && line) { out.push(line); line = wd; } else line = tt; }); if (line) out.push(line); return out; }
  function insights(d) {
    const out = []; const zt = d.edtGroups.find((g) => g.lab === 'ZT') || { n: 0, hl: 0 }, rp = d.edtGroups.find((g) => g.lab === 'REPROGRAMACIÓN') || { n: 0, hl: 0 };
    if (!d.nDes) { out.push(['gold', 'No se registraron clientes desplanificados en la bitácora para este día.']); }
    else {
      const e = d.edts[0]; if (e) out.push(['gold', `${e.edt} concentró el ${pct(e.hl, d.hlDes)}% del HL desplanificado (${f1(e.hl)} HL en ${e.n} cliente${e.n > 1 ? 's' : ''}).`]);
      const r = d.rutas[0]; if (r) out.push(['gold', `La ruta más afectada fue ${r.ruta} (${r.tipo === 'TOTAL' ? 'desplanificación total' : 'parcial'}): ${r.n} cliente${r.n > 1 ? 's' : ''} y ${f1(r.hl)} HL, el ${pct(r.hl, d.hlDes)}% del día.`]);
      out.push([zt.hl > rp.hl ? 'red' : 'amber', `${zt.n} de ${d.nDes} clientes terminaron en ZT (${pct(zt.hl, d.hlDes)}% del HL) y ${rp.n} se reprograman (${pct(rp.hl, d.hlDes)}% del HL).`]);
    }
    if (d.recPend) out.push(['red', `${d.recPend} reclamo${d.recPend > 1 ? 's' : ''} de ventas sigue${d.recPend > 1 ? 'n' : ''} pendiente${d.recPend > 1 ? 's' : ''} de solución.`]);
    if (d.sinLineas.length) out.push(['mute', `Revisar bitácora: ${d.sinLineas.length} viaje${d.sinLineas.length > 1 ? 's' : ''} sin clientes en DESPLANIFICACIÓN (${d.sinLineas.map((x) => x.split(' ')[0]).join(', ')}).`]);
    return out;
  }
  async function draw(canvas, d) {
    const L = window.BX_LOGOS || {};
    try { if (document.fonts) await Promise.all([document.fonts.load(FD(800, 40)), document.fonts.load(FT(500, 14)), document.fonts.load(FT(700, 14)), document.fonts.load(FM(700, 11))]); } catch (e) { /* sin fuentes web */ }
    const [iTap, iAb, iT77, iCd] = await Promise.all([loadImg(L.tapiz), loadImg(L.ab), loadImg(L.t77), loadImg(L.cd)]);
    const S = 2, Wd = 1600, M = 32, G = 20;
    const zt = d.edtGroups.find((g) => g.lab === 'ZT') || { n: 0, hl: 0 }, rp = d.edtGroups.find((g) => g.lab === 'REPROGRAMACIÓN') || { n: 0, hl: 0 };
    const RMAX = 9, rutas = d.rutas.slice(0, RMAX), extraR = d.rutas.length - rutas.length;
    const ins = insights(d);
    const yHero = 168, hHero = 250, yB = yHero + hHero + G;
    const hB = 64 + Math.max(Math.max(d.edts.length, 1) * 58, Math.max(rutas.length, 1) * 40 + (extraR ? 26 : 0)) + 18;
    const yC = yB + hB + G;
    const recRows = d.recl.filter((r) => r.status !== 'SOLUCIONADO').slice(0, 5);
    const hIns = 58 + ins.length * 30 + 14, hRec = 58 + Math.max(recRows.length, 1) * 30 + 14, hC = Math.max(hIns, hRec);
    const H = yC + hC + 58;
    canvas.width = Wd * S; canvas.height = H * S; canvas.style.aspectRatio = `${Wd} / ${H}`;
    const ctx = canvas.getContext('2d'); ctx.setTransform(S, 0, 0, S, 0, 0); ctx.textBaseline = 'middle';
    // fondo con tapiz
    ctx.fillStyle = K.bg; ctx.fillRect(0, 0, Wd, H);
    if (iTap) { ctx.save(); ctx.globalAlpha = 0.28; const r = Math.max(Wd / iTap.width, H / iTap.height); ctx.drawImage(iTap, 0, 0, iTap.width * r, iTap.height * r); ctx.restore(); }
    const vg = ctx.createRadialGradient(Wd * 0.75, 40, 40, Wd * 0.6, H * 0.4, Wd * 0.9); vg.addColorStop(0, 'rgba(242,197,42,.10)'); vg.addColorStop(0.35, 'rgba(10,10,11,.55)'); vg.addColorStop(1, 'rgba(10,10,11,.92)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, Wd, H);
    // encabezado
    let bx = M; if (iAb) { const h = 26, w = iAb.width * h / iAb.height; ctx.drawImage(iAb, bx, 26, w, h); bx += w + 14; }
    if (iT77) { const h = 24, w = iT77.width * h / iT77.height; rr(ctx, bx, 23, w + 16, 32, 6); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.drawImage(iT77, bx + 8, 27, w, h); bx += w + 30; }
    ctx.fillStyle = 'rgba(242,197,42,.4)'; ctx.fillRect(bx, 26, 1, 26); label(ctx, 'CD Callao · Delivery · Cierre de turno', bx + 14, 40, K.gold);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = FD(800, 64); goldText(ctx, 'CIERRE DEL DÍA', M, 122, 64);
    const tw = ctx.measureText('CIERRE DEL DÍA').width; ctx.font = FD(700, 34); ctx.fillStyle = K.fg; ctx.fillText(`${d.dia.toUpperCase()} ${d.fecha}`, M + tw + 24, 120);
    const lg = ctx.createLinearGradient(M, 0, M + 520, 0); lg.addColorStop(0, K.gold); lg.addColorStop(1, 'rgba(242,197,42,0)'); ctx.fillStyle = lg; ctx.fillRect(M, 136, 520, 2);
    if (iCd) { const cx = Wd - M - 66, cy = 80, r = 60; ctx.save(); ctx.shadowColor = 'rgba(242,197,42,.45)'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); const rg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); rg.addColorStop(0, K.gold3); rg.addColorStop(0.5, K.gold); rg.addColorStop(1, '#B07E07'); ctx.strokeStyle = rg; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); ctx.drawImage(iCd, cx - r, cy - r, r * 2, r * 2); }
    ctx.textBaseline = 'middle';
    // HERO: HL desplanificado + división ZT / reprogramación
    const wH = 700; panel(ctx, M, yHero, wH, hHero, K.gold);
    label(ctx, 'HL desplanificado del día', M + 26, yHero + 32);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = FD(800, 110); goldText(ctx, f1(d.hlDes), M + 22, yHero + 132, 110);
    const nw = ctx.measureText(f1(d.hlDes)).width; ctx.font = FD(700, 34); ctx.fillStyle = K.fg; ctx.fillText('HL', M + 34 + nw, yHero + 128);
    ctx.font = FT(500, 17); ctx.fillStyle = K.mute; ctx.fillText(`${d.nDes} cliente${d.nDes === 1 ? '' : 's'} · ${d.nTotal + d.nParc} viaje${d.nTotal + d.nParc === 1 ? '' : 's'} modificado${d.nTotal + d.nParc === 1 ? '' : 's'} (${d.nTotal} total · ${d.nParc} parcial${d.cab ? ` · ${d.cab} cambio de cabecera` : ''})`, M + 26, yHero + 166);
    ctx.textBaseline = 'middle';
    const bx0 = M + 26, bw = wH - 52, by = yHero + 196, bh = 18, tot = (zt.hl + rp.hl) || 1;
    rr(ctx, bx0, by, bw, bh, 9); ctx.fillStyle = '#2A251B'; ctx.fill();
    ctx.save(); rr(ctx, bx0, by, bw, bh, 9); ctx.clip(); const wz = bw * zt.hl / tot; ctx.fillStyle = K.red; ctx.fillRect(bx0, by, wz, bh); ctx.fillStyle = K.amber; ctx.fillRect(bx0 + wz, by, bw - wz, bh); ctx.restore();
    ctx.font = FT(700, 15); ctx.textAlign = 'left'; ctx.fillStyle = '#E8776F'; ctx.fillText(`ZT ${pct(zt.hl, d.hlDes)}% · ${f1(zt.hl)} HL · ${zt.n} cl.`, bx0, by + 36);
    ctx.textAlign = 'right'; ctx.fillStyle = '#E9C46A'; ctx.fillText(`Reprogramación ${pct(rp.hl, d.hlDes)}% · ${f1(rp.hl)} HL · ${rp.n} cl.`, bx0 + bw, by + 36);
    // tiles a la derecha
    const tx = M + wH + G, tWd = Wd - M - tx, tw3 = (tWd - G * 2) / 3;
    const tiles = [
      { lab: 'ZT · rechazo', big: String(zt.n), unit: zt.n === 1 ? 'cliente' : 'clientes', sub: `${f1(zt.hl)} HL cerrados`, col: K.red },
      { lab: 'Reprogramación', big: String(rp.n), unit: rp.n === 1 ? 'cliente' : 'clientes', sub: `${f1(rp.hl)} HL para otro día`, col: K.amber },
      { lab: 'Reclamos de ventas', big: String(d.recPend), unit: 'pendientes', sub: d.recl.length ? `${d.recl.length} en seguimiento · ${d.recSol} solucionado${d.recSol === 1 ? '' : 's'}` : 'Sin reclamos en seguimiento', col: d.recPend ? K.red : K.green }];
    tiles.forEach((t, i) => { const x = tx + i * (tw3 + G); panel(ctx, x, yHero, tw3, hHero, t.col);
      label(ctx, t.lab, x + 22, yHero + 32); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = FD(800, 92); ctx.fillStyle = K.fg; ctx.fillText(t.big, x + 20, yHero + 132);
      const bw2 = ctx.measureText(t.big).width; ctx.font = FD(700, 24); ctx.fillStyle = t.col; ctx.fillText(t.unit.toUpperCase(), x + 30 + bw2, yHero + 128);
      ctx.textBaseline = 'middle'; ctx.font = FT(500, 15); ctx.fillStyle = K.mute; wrap(ctx, t.sub, tw3 - 44).slice(0, 2).forEach((ln, k) => ctx.fillText(ln, x + 22, yHero + 168 + k * 22));
      if (i === 2 && !d.recPend) { ctx.font = FT(700, 15); ctx.fillStyle = '#7FD3A5'; ctx.fillText('✓ Todo al día', x + 22, yHero + 220); } });
    // BLOQUE B: impacto por EDT (barras) | rutas desplanificadas
    const wB1 = 700; panel(ctx, M, yB, wB1, hB, K.gold);
    ctx.font = FD(800, 24); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; goldText(ctx, 'IMPACTO POR EMPRESARIO', M + 26, yB + 34, 24);
    const lgx = M + wB1 - 26; ctx.font = FT(500, 12); ctx.textAlign = 'right'; ctx.fillStyle = K.mute; ctx.fillText('Reprogramación', lgx, yB + 34); let lw = ctx.measureText('Reprogramación').width;
    ctx.fillStyle = K.amber; ctx.fillRect(lgx - lw - 16, yB + 29, 10, 10); ctx.fillStyle = K.mute; ctx.fillText('ZT', lgx - lw - 28, yB + 34); const lw2 = ctx.measureText('ZT').width; ctx.fillStyle = K.red; ctx.fillRect(lgx - lw - 28 - lw2 - 16, yB + 29, 10, 10);
    const emax = Math.max(...d.edts.map((e) => e.hl), 0.001);
    if (!d.edts.length) { ctx.font = FT(500, 15); ctx.fillStyle = K.mute; ctx.textAlign = 'left'; ctx.fillText('Sin clientes desplanificados', M + 26, yB + 84); }
    d.edts.forEach((e, i) => { const y = yB + 72 + i * 58; ctx.textAlign = 'left'; ctx.font = FT(700, 16); ctx.fillStyle = K.fg; ctx.fillText(e.edt, M + 26, y);
      ctx.textAlign = 'right'; ctx.font = FT(700, 16); ctx.fillStyle = K.fg; ctx.fillText(`${f1(e.hl)} HL`, M + wB1 - 26, y); const vw = ctx.measureText(`${f1(e.hl)} HL`).width;
      ctx.font = FT(500, 13); ctx.fillStyle = K.mute; ctx.fillText(`${pct(e.hl, d.hlDes)}% · ${e.n} cl. ·`, M + wB1 - 32 - vw, y + 1);
      const x0 = M + 26, W0 = wB1 - 52, y0 = y + 14, hb = 14; rr(ctx, x0, y0, W0, hb, 7); ctx.fillStyle = '#221E16'; ctx.fill();
      const wz2 = W0 * e.zt / emax, wr2 = W0 * e.rp / emax; ctx.save(); rr(ctx, x0, y0, Math.max(wz2 + wr2, 2), hb, 7); ctx.clip(); ctx.fillStyle = K.red; ctx.fillRect(x0, y0, wz2, hb); ctx.fillStyle = K.amber; ctx.fillRect(x0 + wz2, y0, wr2, hb); ctx.restore(); });
    const xR = M + wB1 + G, wR = Wd - M - xR; panel(ctx, xR, yB, wR, hB, K.gold);
    ctx.font = FD(800, 24); ctx.textAlign = 'left'; goldText(ctx, 'RUTAS DESPLANIFICADAS', xR + 26, yB + 34, 24);
    const rmax = Math.max(...rutas.map((r) => r.hl), 0.001);
    if (!rutas.length) { ctx.font = FT(500, 15); ctx.fillStyle = K.mute; ctx.fillText('Sin rutas con clientes desplanificados', xR + 26, yB + 84); }
    rutas.forEach((r, i) => { const y = yB + 80 + i * 40; ctx.textAlign = 'left'; ctx.font = FD(800, 22); ctx.fillStyle = K.fg; ctx.fillText(r.ruta, xR + 26, y);
      chip(ctx, r.tipo === 'TOTAL' ? 'TOTAL' : 'PARCIAL', xR + 116, y, r.tipo === 'TOTAL' ? 'rgba(201,74,67,.25)' : 'rgba(242,197,42,.14)', r.tipo === 'TOTAL' ? '#E8776F' : K.gold);
      ctx.font = FT(500, 14); ctx.fillStyle = K.mute; ctx.fillText(fit(ctx, r.edt, 200), xR + 200, y + 1);
      const x0 = xR + 410, W0 = wR - 410 - 190, hb = 12; rr(ctx, x0, y - 6, W0, hb, 6); ctx.fillStyle = '#221E16'; ctx.fill();
      const wz3 = W0 * r.zt / rmax, wr3 = W0 * r.rp / rmax; if (wz3 + wr3 > 0) { ctx.save(); rr(ctx, x0, y - 6, Math.max(wz3 + wr3, 2), hb, 6); ctx.clip(); ctx.fillStyle = K.red; ctx.fillRect(x0, y - 6, wz3, hb); ctx.fillStyle = K.amber; ctx.fillRect(x0 + wz3, y - 6, wr3, hb); ctx.restore(); }
      ctx.textAlign = 'right'; ctx.font = FT(700, 15); ctx.fillStyle = K.fg; ctx.fillText(`${f3(r.hl)} HL`, xR + wR - 26, y); ctx.font = FT(500, 13); ctx.fillStyle = K.mute; ctx.fillText(`${r.n} cl.`, xR + wR - 120, y + 1);
      if (i < rutas.length - 1) { ctx.strokeStyle = 'rgba(58,49,33,.6)'; ctx.beginPath(); ctx.moveTo(xR + 26, y + 20.5); ctx.lineTo(xR + wR - 26, y + 20.5); ctx.stroke(); } });
    if (extraR) { ctx.font = FT(500, 13); ctx.fillStyle = K.mute; ctx.textAlign = 'left'; ctx.fillText(`+ ${extraR} ruta(s) más con menor impacto`, xR + 26, yB + 80 + rutas.length * 40); }
    // BLOQUE C: lo más importante | reclamos pendientes
    const wC1 = 960; panel(ctx, M, yC, wC1, hC, K.gold);
    ctx.font = FD(800, 24); ctx.textAlign = 'left'; goldText(ctx, 'LO MÁS IMPORTANTE DEL DÍA', M + 26, yC + 34, 24);
    const dotC = { gold: K.gold, red: K.red, amber: K.amber, mute: K.gray || '#6E6758' };
    ins.forEach(([c, t], i) => { const y = yC + 74 + i * 30; ctx.beginPath(); ctx.arc(M + 32, y, 5, 0, Math.PI * 2); ctx.fillStyle = dotC[c] || K.gold; ctx.fill();
      ctx.font = FT(c === 'mute' ? 500 : 600, 16); ctx.fillStyle = c === 'mute' ? K.mute : K.fg; ctx.textAlign = 'left'; ctx.fillText(fit(ctx, t, wC1 - 80), M + 46, y + 1); });
    const xR2 = M + wC1 + G, wR2 = Wd - M - xR2; panel(ctx, xR2, yC, wR2, hC, d.recPend ? K.red : K.green);
    ctx.font = FD(800, 24); ctx.textAlign = 'left'; goldText(ctx, 'RECLAMOS PENDIENTES', xR2 + 26, yC + 34, 24);
    if (!recRows.length) { ctx.font = FT(700, 17); ctx.fillStyle = '#7FD3A5'; ctx.fillText('✓ Sin reclamos pendientes', xR2 + 26, yC + 76); }
    recRows.forEach((r, i) => { const y = yC + 74 + i * 30; ctx.font = FT(700, 14); ctx.fillStyle = K.fg; ctx.textAlign = 'left'; ctx.fillText(`${r.fecha.slice(8, 10)}/${r.fecha.slice(5, 7)} · ${r.ruta}`, xR2 + 26, y);
      ctx.font = FT(500, 14); ctx.fillStyle = K.mute; ctx.fillText(fit(ctx, `${r.cliente} — ${r.motivo}`, wR2 - 200), xR2 + 150, y + 1); });
    if (d.recPend > recRows.length) { ctx.font = FT(500, 12); ctx.fillStyle = K.mute; ctx.fillText(`+ ${d.recPend - recRows.length} más`, xR2 + 26, yC + 74 + recRows.length * 30); }
    // pie
    const now = new Date(Date.now() - 5 * 3600e3).toISOString(); ctx.font = FM(500, 11); ctx.fillStyle = '#8C7A45'; ctx.textAlign = 'left'; ctx.fillText('FUENTE: BITÁCORA COMPARTIDA · REPORTES DE DELIVERY', M, H - 28);
    ctx.textAlign = 'right'; ctx.fillText(`GENERADO ${now.slice(8, 10)}/${now.slice(5, 7)} ${now.slice(11, 16)} · TRANSPORTES · CD CALLAO`, Wd - M, H - 28);
    return canvas;
  }

  // ---------- tablas para Outlook ----------
  function html(d) {
    const th = (t, r) => `<th style="background:#BDD7EE;color:#0F2A44;font:bold 10pt Calibri,Arial;padding:3px 8px;border-bottom:1px solid #9DC3E6;text-align:${r ? 'right' : 'left'}">${t}</th>`;
    const td = (t, r, st = '') => `<td style="font:10pt Calibri,Arial;padding:3px 8px;border-bottom:1px solid #D6DCE4;text-align:${r ? 'right' : 'left'};${st}">${t == null ? '' : String(t).replace(/</g, '&lt;')}</td>`;
    const tot = (cells, rs) => '<tr>' + cells.map((c, i) => td(c, rs[i], 'background:#9DC3E6;font-weight:bold')).join('') + '</tr>';
    const tbl = (title, heads, rs, rows, total) => `<p style="font:bold 11pt Calibri,Arial;margin:12px 0 4px">${title}</p><table cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>${heads.map((h, i) => th(h, rs[i])).join('')}</tr>${rows.join('')}${total ? tot(total, rs) : ''}</table>`;
    const A = tbl('DESPLANIFICACIÓN TOTAL', ['Ruta', 'Transporte', 'Viaje', 'Vehículo', 'Clientes', 'HL'], [0, 0, 1, 0, 1, 1],
      d.totalRows.map((r) => '<tr>' + [r[0], r[1], r[2], r[3], r[4], f3(r[5])].map((v, i) => td(v, [0, 0, 1, 0, 1, 1][i])).join('') + '</tr>'), ['Total general', '', '', '', sum(d.totalRows, (r) => r[4]), f3(sum(d.totalRows, (r) => r[5]))]);
    const B = tbl('DESPLANIFICACIÓN PARCIAL', ['Ruta', 'Clientes', 'HL'], [0, 1, 1], d.parcRows.map((r) => '<tr>' + td(r[0]) + td(r[1], 1) + td(f3(r[2]), 1) + '</tr>'), ['Total general', sum(d.parcRows, (r) => r[1]), f3(sum(d.parcRows, (r) => r[2]))]);
    const eRows = []; d.edtGroups.forEach((g) => { eRows.push('<tr>' + td(g.lab, 0, 'font-weight:bold;background:#EEF4FA') + td(g.n, 1, 'font-weight:bold;background:#EEF4FA') + td(f3(g.hl), 1, 'font-weight:bold;background:#EEF4FA') + '</tr>');
      g.rows.forEach((r) => eRows.push('<tr>' + td(r[0], 0, 'padding-left:22px') + td(r[1], 1) + td(f3(r[2]), 1) + '</tr>')); });
    const E = tbl('RESUMEN POR EDT', ['Acción / EDT', 'Clientes', 'HL'], [0, 1, 1], eRows, ['Total general', d.nDes, f3(d.hlDes)]);
    const R = tbl('RECLAMOS DEL DÍA Y PENDIENTES', ['Fecha', 'Ruta', 'Placa', 'Código', 'Cliente', 'Motivo del reclamo', 'Supervisor', 'EDT', 'Status'], [], d.recl.map((r) => '<tr>' + [r.fecha.slice(8, 10) + '/' + r.fecha.slice(5, 7), r.ruta, r.placa, r.codigo, r.cliente, r.motivo, r.sv, d.short(r.edt), r.status].map((v) => td(v, 0, r.status === 'SOLUCIONADO' ? '' : 'background:#FFF4CC')).join('') + '</tr>'));
    return `<div style="font:10pt Calibri,Arial;color:#1F2329"><p style="font:bold 13pt Calibri,Arial;margin:0 0 4px">Cierre del día · ${d.dia} ${d.fecha}</p>`
      + `<p style="margin:0 0 6px">Viajes desplanificados: ${d.nTotal} total · ${d.nParc} parcial${d.cab ? ` · ${d.cab} cambio(s) de cabecera` : ''} | Clientes desplanificados: ${d.nDes} · ${f3(d.hlDes)} HL</p>`
      + `<table cellspacing="0" cellpadding="0"><tr><td style="vertical-align:top;padding-right:24px">${A}</td><td style="vertical-align:top;padding-right:24px">${B}</td><td style="vertical-align:top">${E}</td></tr></table>`
      + (d.sinLineas.length ? `<p style="margin:8px 0 0;color:#5E6670;font-size:9pt">Viajes en bitácora sin clientes en DESPLANIFICACIÓN: ${d.sinLineas.join(', ')}</p>` : '')
      + `<p style="margin:14px 0 0">Status de reclamos de ventas: ${d.recl.length} — <b style="background:#FFE14D">${d.recSol} solucionado(s) y ${d.recPend} pendiente(s)</b></p>${R}</div>`;
  }
  window.bxCierre = { build, draw, html };
})();
