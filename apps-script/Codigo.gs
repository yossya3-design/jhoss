/**
 * Relevos SIF · CD Callao T2 — Apps Script (cuenta nueva)
 * Pegar en un proyecto de Apps Script vinculado a un Google Sheet vacío.
 * Implementar → Nueva implementación → Aplicación web
 *   Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 */

// ====== CONFIGURA AQUÍ ======
const PIN_ADMIN = '031023';          // clave de administradora
const PIN_CONDUCTOR = 'CAMBIAR';     // PIN que usan los conductores de relevo
const DEST_DEFECTO = ['manuel.huapaya@ab-inbev.com', 'jhoselyn.m.torres@ab-inbev.com'];
const CARPETA_FOTOS = 'Relevos SIF - fotos';
// ============================

const HOJA = 'Relevos';
const CAB = ['ID', 'Fecha', 'Hora registro', 'Tipo', 'Conductor', 'Placa', 'Inicio', 'Fin', 'Comentario', 'Foto URL', 'Foto ID', 'Lat', 'Lon', 'Precision m'];
const TZ = 'America/Lima';

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.getRange(1, 1, 1, CAB.length).setValues([CAB]).setFontWeight('bold');
    sh.getRange('A:K').setNumberFormat('@');
    sh.setFrozenRows(1);
  }
  return sh;
}
function salida_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function prop_(k, d) { const v = PropertiesService.getScriptProperties().getProperty(k); return v ? JSON.parse(v) : d; }
function setProp_(k, v) { PropertiesService.getScriptProperties().setProperty(k, JSON.stringify(v)); }

function doGet(e) {
  const accion = (e && e.parameter && e.parameter.action) || 'estado';
  if (accion !== 'estado') return salida_({ ok: false, error: 'Acción no válida' });
  const sh = hoja_(), n = sh.getLastRow();
  const filas = n > 1 ? sh.getRange(2, 1, n - 1, CAB.length).getDisplayValues() : [];
  const relevos = filas.map(f => ({
    id: f[0], fecha: f[1], at: f[1] + ' ' + f[2], tipo: f[3], cond: f[4], placa: f[5], ini: f[6], fin: f[7], com: f[8], fotoUrl: f[9],
    geo: f[11] ? { lat: +f[11], lon: +f[12], acc: +f[13] } : null
  }));
  return salida_({ ok: true, relevos, conductores: prop_('conductores', []), placas: prop_('placas', []) });
}

function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents || '{}'); } catch (err) { return salida_({ ok: false, error: 'Datos no válidos' }); }
  const pin = String(b.pin || '');
  try {
    switch (b.action) {
      case 'pin':
        return salida_(pin === PIN_ADMIN ? { ok: true } : { ok: false, error: 'PIN incorrecto' });
      case 'pinRelevo':
        return salida_(pin === PIN_CONDUCTOR || pin === PIN_ADMIN ? { ok: true } : { ok: false, error: 'PIN incorrecto' });
      case 'relevo':
        if (pin !== PIN_CONDUCTOR && pin !== PIN_ADMIN) return salida_({ ok: false, error: 'PIN incorrecto' });
        return salida_(guardarRelevo_(b));
      case 'listas':
        if (pin !== PIN_ADMIN) return salida_({ ok: false, error: 'PIN incorrecto' });
        if (Array.isArray(b.conductores)) setProp_('conductores', b.conductores.slice(0, 200));
        if (Array.isArray(b.placas)) setProp_('placas', b.placas.slice(0, 500));
        return salida_({ ok: true });
      case 'enviarPpt':
        if (pin !== PIN_ADMIN) return salida_({ ok: false, error: 'PIN incorrecto' });
        return salida_(enviarPpt_(b));
      default:
        return salida_({ ok: false, error: 'Acción no válida' });
    }
  } catch (err) {
    return salida_({ ok: false, error: String(err && err.message || err) });
  }
}

function guardarRelevo_(b) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ahora = new Date();
    const fecha = b.fecha || Utilities.formatDate(ahora, TZ, 'yyyy-MM-dd');
    const hora = Utilities.formatDate(ahora, TZ, 'HH:mm');
    const id = Utilities.getUuid().slice(0, 8);
    let fotoUrl = b.fotoUrl || '', fotoId = '';
    if (b.foto && /^data:image\//.test(b.foto)) {
      try {
        const it = DriveApp.getFoldersByName(CARPETA_FOTOS);
        const carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
        const datos = Utilities.base64Decode(b.foto.split(',')[1]);
        const nombre = [fecha, hora.replace(':', ''), b.placa, b.cond].join('_').replace(/[^\w\-]+/g, '_') + '.jpg';
        const f = carpeta.createFile(Utilities.newBlob(datos, 'image/jpeg', nombre));
        fotoUrl = f.getUrl(); fotoId = f.getId();
      } catch (err) { /* si el Drive falla, el relevo se guarda igual: la foto ya está en el sitio */ }
    }
    const g = b.geo || {};
    hoja_().appendRow([id, fecha, hora, b.tipo === 'mov' ? 'mov' : 'doble', String(b.cond || ''), String(b.placa || ''), String(b.ini || ''), String(b.fin || ''), String(b.com || ''), fotoUrl, fotoId, g.lat || '', g.lon || '', g.acc ? Math.round(g.acc) : '']);
    return { ok: true, id };
  } finally { lock.releaseLock(); }
}

function enviarPpt_(b) {
  const para = (Array.isArray(b.para) && b.para.length ? b.para : DEST_DEFECTO).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  if (!para.length) return { ok: false, error: 'No hay correos válidos.' };
  if (!b.ppt) return { ok: false, error: 'No llegó el PPT. Vuelve a intentarlo.' };
  const nombre = b.nombre || 'Relevos_SIF.pptx';
  const adj = Utilities.newBlob(Utilities.base64Decode(b.ppt), 'application/vnd.openxmlformats-officedocument.presentationml.presentation', nombre);
  const dia = b.fecha || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const n = Number(b.n || 0);
  MailApp.sendEmail({
    to: para.join(','),
    subject: 'Relevos SIF · CD Callao T2 · ' + dia.split('-').reverse().join('/'),
    htmlBody: 'Buen día,<br><br>Adjunto el PPT de relevos SIF del ' + dia.split('-').reverse().join('/') + (n ? ' (' + n + ' relevos)' : '') + '.<br><br>Saludos,<br>Transportes T2 · CD Callao',
    attachments: [adj]
  });
  return { ok: true, para: para.join(', '), hojas: Number(b.hojas || 0) };
}

// Ejecuta esta función una vez desde el editor para dar los permisos (Drive, Sheets y correo).
function autorizar() { hoja_(); DriveApp.getRootFolder(); MailApp.getRemainingDailyQuota(); }
