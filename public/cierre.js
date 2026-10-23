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
    return { sinLineas, day, fecha: fecha(day), dia: DIAS[new Date(day + 'T12:00:00Z').getUTCDay()], totalRows: totalConLineas, parcRows, edtGroups, recl, recSol, recPend: recl.length - recSol,
      nTotal: bit.filter((b) => /TOTAL/.test(b.motivo)).length, nParc: bit.filter((b) => /PARCIAL/.test(b.motivo)).length || parcRows.length, cab, nDes: des.length, hlDes: sum(des, (x) => x.hl), short };
  }

  // ---------- imagen ----------
  const C = { ink: '#1F2329', mute: '#5E6670', head: '#BDD7EE', headInk: '#0F2A44', line: '#D6DCE4', grp: '#EEF4FA', tot: '#9DC3E6', band: '#0A0A0B', gold: '#F2C52A' };
  const FONT = (w, s) => `${w} ${s}px Calibri, 'Segoe UI', Arial, sans-serif`;
  function fit(ctx, t, w) { t = String(t); if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
  function table(ctx, x, y, title, cols, rows, opt = {}) {
    const W = cols.reduce((s, c) => s + c.w, 0), RH = 26;
    ctx.fillStyle = C.ink; ctx.font = FONT(700, 15); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(title, x, y + 10); y += 28;
    const row = (cells, st) => {
      if (st.bg) { ctx.fillStyle = st.bg; ctx.fillRect(x, y, W, RH); }
      let cx = x; ctx.font = FONT(st.bold ? 700 : 400, 13);
      cells.forEach((v, i) => { const c = cols[i]; ctx.fillStyle = st.ink || C.ink; const pad = 8 + (i === 0 && st.indent ? 16 : 0);
        const t = fit(ctx, v == null ? '' : v, c.w - pad - 8);
        if (c.r) { ctx.textAlign = 'right'; ctx.fillText(t, cx + c.w - 8, y + RH / 2 + 1); } else { ctx.textAlign = 'left'; ctx.fillText(t, cx + pad, y + RH / 2 + 1); }
        cx += c.w; });
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + RH + 0.5); ctx.lineTo(x + W, y + RH + 0.5); ctx.stroke(); y += RH; };
    row(cols.map((c) => c.h), { bg: C.head, bold: 1, ink: C.headInk });
    if (!rows.length) { ctx.font = FONT(400, 13); ctx.fillStyle = C.mute; ctx.textAlign = 'left'; ctx.fillText(opt.empty || 'Sin registros', x + 8, y + RH / 2 + 1);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x, y + RH + 0.5); ctx.lineTo(x + W, y + RH + 0.5); ctx.stroke(); y += RH; }
    rows.forEach((r) => row(r.cells || r, r.st || {}));
    if (opt.total) row(opt.total, { bg: C.tot, bold: 1, ink: C.headInk });
    return y;
  }
  function draw(canvas, d, maxRec = 14) {
    const S = 2, Wd = 1480;
    const sh = d.short;
    const A = { cols: [{ h: 'Ruta', w: 90 }, { h: 'Transporte', w: 120 }, { h: 'Viaje', w: 55, r: 1 }, { h: 'Vehículo', w: 95 }, { h: 'Clientes', w: 75, r: 1 }, { h: 'HL', w: 85, r: 1 }] };
    const B = { cols: [{ h: 'Ruta', w: 110 }, { h: 'Clientes', w: 80, r: 1 }, { h: 'HL', w: 95, r: 1 }] };
    const E = { cols: [{ h: 'Acción / EDT', w: 290 }, { h: 'Clientes', w: 80, r: 1 }, { h: 'HL', w: 95, r: 1 }] };
    const R = { cols: [{ h: 'Fecha', w: 70 }, { h: 'Ruta', w: 80 }, { h: 'Placa', w: 95 }, { h: 'Código', w: 95 }, { h: 'Cliente', w: 250 }, { h: 'Motivo del reclamo', w: 330 }, { h: 'Supervisor', w: 190 }, { h: 'EDT', w: 170 }, { h: 'Status', w: 130 }] };
    const eRows = []; d.edtGroups.forEach((g) => { eRows.push({ cells: [g.lab, g.n, f3(g.hl)], st: { bold: 1, bg: C.grp } }); g.rows.forEach((r) => eRows.push({ cells: [r[0], r[1], f3(r[2])], st: { indent: 1 } })); });
    const rec = d.recl.slice(-maxRec);
    const rh = (n, extra) => 28 + 26 * (n + 1 + (extra ? 1 : 0) + (n ? 0 : 1));
    const top = 76, h1 = Math.max(rh(d.totalRows.length, 1), rh(d.parcRows.length, 1), rh(eRows.length, 1));
    const H = top + 46 + h1 + 40 + 30 + rh(rec.length, 0) + 46 + (d.sinLineas.length ? 16 : 0);
    canvas.width = Wd * S; canvas.height = H * S; canvas.style.aspectRatio = `${Wd} / ${H}`;
    const ctx = canvas.getContext('2d'); ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, Wd, H);
    ctx.fillStyle = C.band; ctx.fillRect(0, 0, Wd, 58); ctx.fillStyle = C.gold; ctx.fillRect(0, 58, Wd, 3);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = C.gold; ctx.font = FONT(700, 24); ctx.fillText(`CIERRE DEL DÍA · ${d.dia.toUpperCase()} ${d.fecha}`, 24, 30);
    ctx.textAlign = 'right'; ctx.fillStyle = '#F4F1E8'; ctx.font = FONT(400, 14); ctx.fillText('Transportes · Delivery CD Callao', Wd - 24, 30);
    ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.font = FONT(400, 14);
    const resumen = `Viajes desplanificados: ${d.nTotal} total · ${d.nParc} parcial${d.cab ? ` · ${d.cab} cambio(s) de cabecera` : ''}   |   Clientes desplanificados: ${d.nDes} · ${f3(d.hlDes)} HL`;
    ctx.fillText(resumen, 24, top + 6);
    const y0 = top + 30;
    const yA = table(ctx, 24, y0, 'DESPLANIFICACIÓN TOTAL', A.cols, d.totalRows.map((r) => [r[0], r[1], r[2], r[3], r[4], f3(r[5])]),
      { total: ['Total general', '', '', '', sum(d.totalRows, (r) => r[4]), f3(sum(d.totalRows, (r) => r[5]))], empty: 'Sin desplanificación total' });
    const yB = table(ctx, 24 + 520 + 30, y0, 'DESPLANIFICACIÓN PARCIAL', B.cols, d.parcRows.map((r) => [r[0], r[1], f3(r[2])]),
      { total: ['Total general', sum(d.parcRows, (r) => r[1]), f3(sum(d.parcRows, (r) => r[2]))], empty: 'Sin parciales' });
    const yE = table(ctx, 24 + 520 + 30 + 285 + 30, y0, 'RESUMEN POR EDT', E.cols, eRows,
      { total: ['Total general', d.nDes, f3(d.hlDes)], empty: 'Sin clientes desplanificados' });
    let y = Math.max(yA, yB, yE) + 34;
    if (d.sinLineas.length) { ctx.textAlign = 'left'; ctx.font = FONT(400, 12); ctx.fillStyle = C.mute; ctx.fillText(fit(ctx, `Viajes en bitácora sin clientes en DESPLANIFICACIÓN: ${d.sinLineas.join(', ')}`, Wd - 48), 24, y - 10); y += 16; }
    ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.font = FONT(400, 14);
    const pre = `Status de reclamos de ventas: ${d.recl.length} — `; ctx.fillText(pre, 24, y);
    const px = 24 + ctx.measureText(pre).width; const hl = `${d.recSol} solucionado(s) y ${d.recPend} pendiente(s)`;
    ctx.font = FONT(700, 14); const hw = ctx.measureText(hl).width; ctx.fillStyle = '#FFE14D'; ctx.fillRect(px - 3, y - 11, hw + 6, 22); ctx.fillStyle = C.ink; ctx.fillText(hl, px, y);
    if (d.recl.length > rec.length) { ctx.font = FONT(400, 12); ctx.fillStyle = C.mute; ctx.fillText(`(se muestran los ${rec.length} más recientes)`, px + hw + 14, y); }
    const yEnd = table(ctx, 24, y + 14, 'RECLAMOS DEL DÍA Y PENDIENTES', R.cols,
      rec.map((r) => ({ cells: [r.fecha.slice(8, 10) + '/' + r.fecha.slice(5, 7), r.ruta, r.placa.replace(/^PE/, ''), r.codigo, r.cliente, r.motivo, r.sv, sh(r.edt), r.status], st: r.status === 'SOLUCIONADO' ? {} : { bg: '#FFF4CC' } })),
      { empty: 'Sin reclamos registrados ni pendientes' }) + 24;
    if (yEnd < H) { const img = ctx.getImageData(0, 0, Wd * S, Math.ceil(yEnd * S)); canvas.height = Math.ceil(yEnd * S); canvas.style.aspectRatio = `${Wd} / ${yEnd}`; canvas.getContext('2d').putImageData(img, 0, 0); }
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
