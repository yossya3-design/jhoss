/**
 * Validación de Carga Nocturna – CD Callao
 * Base compartida en Google Sheets para la página publicada en Netlify.
 * Clave de administradora para borrar registros: 031023
 */
const CLAVE_ADMIN = '031023';
const HOJA = 'Registros';
const COLUMNAS = ['id','fecha','hora','placa','empresario','sku','producto','cant','motivo','skuCruce','productoCruce','pickinero','obs','ts','registrado'];

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function texto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Lima', 'yyyy-MM-dd');
  return v == null ? '' : String(v);
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.accion !== 'listar') return salida_({ ok: true, msg: 'Validación de Carga Nocturna activa' });
    const sh = hoja_();
    const datos = sh.getDataRange().getValues();
    const cab = datos.shift();
    const iFecha = cab.indexOf('fecha');
    const registros = datos
      .filter(r => texto_(r[iFecha]) === p.fecha)
      .map(r => {
        const o = {};
        cab.forEach((c, i) => {
          let v = r[i];
          if (c === 'fecha') v = texto_(v);
          else if (c === 'hora' && v instanceof Date) v = Utilities.formatDate(v, 'America/Lima', 'HH:mm');
          else if (c === 'cant' || c === 'ts') v = Number(v) || 0;
          else v = texto_(v);
          o[c] = v;
        });
        return o;
      });
    return salida_({ ok: true, registros });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    const sh = hoja_();
    if (body.accion === 'agregar') {
      const r = body.registro || {};
      r.registrado = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd HH:mm:ss');
      // Texto plano para que Sheets no convierta fecha, hora ni códigos
      const fila = COLUMNAS.map(c => (c === 'cant' || c === 'ts') ? (Number(r[c]) || 0) : "'" + (r[c] == null ? '' : String(r[c])));
      sh.appendRow(fila);
      return salida_({ ok: true });
    }
    if (body.accion === 'borrar') {
      if (String(body.pin || '') !== CLAVE_ADMIN) return salida_({ ok: false, error: 'pin' });
      const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
      for (let i = ids.length - 1; i >= 1; i--) {
        if (String(ids[i][0]) === String(body.id)) { sh.deleteRow(i + 1); return salida_({ ok: true }); }
      }
      return salida_({ ok: false, error: 'no_encontrado' });
    }
    return salida_({ ok: false, error: 'accion' });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
