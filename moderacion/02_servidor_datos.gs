/**
 * FLORA ROSARIO · PASO 2: SERVIDOR DE DATOS + MODERACIÓN
 * ======================================================
 * Pegar en el MISMO proyecto de Apps Script que el paso 01.
 * Editar ID_HOJA con el id que devolvió el paso 1 (y MODERADORES/PIN).
 *
 * Después: Implementar → Nueva implementación → "App web"
 *   · Ejecutar como: Yo
 *   · Quién tiene acceso: Cualquier persona        ← (el PIN protege la moderación)
 * Copiar la URL /exec: esa es la FUENTE DE DATOS del mapa.
 *
 * Endpoints:
 *   /exec?accion=ping              → estado del servicio
 *   /exec?accion=datos             → JSON con los ejemplares APROBADOS (lo que consume el mapa)
 *   /exec?accion=datos&callback=x  → JSONP (mismo JSON, para navegadores viejos)
 *   /exec?accion=panel             → panel de moderación (HTML)
 *   /exec?accion=moderar&id=…&estado=aprobado|rechazado&pin=…
 *
 * Moderación por código (opcional, desde el editor): aprobar('id'), rechazar('id','motivo')
 * Cada envío nuevo dispara un email a los moderadores (función procesarEnvioFormulario).
 */

// ✏️ EDITAR ESTAS TRES LÍNEAS
const ID_HOJA = 'PEGAR_AQUI_EL_ID_DE_LA_HOJA';   // el que devolvió el paso 1
const MODERADORES = ['tu-email@gmail.com'];       // emails con poder de aprobación
const PIN_MODERADOR = 'flora-mod-2026';           // contraseña del panel

// ✏️ URL FIJA de la app web (la misma que consume el mapa). Se usa en los emails a
// moderadores, porque getService().getUrl() puede devolver URLs de implementaciones
// viejas cuando el mail lo manda el trigger. Si algún día cambia la URL, editá esta línea.
const URL_SERVICIO = 'https://script.google.com/macros/s/AKfycbzblf0YhvSDOkvq-xJPu59TlzMsN2iQJzPokQZ2vj3rpXKUhuad8ETqu8WSrFtuR_XR/exec';
const CLAVE_ENVIO = 'flora2026';                  // clave que trae la app relevador para ENVIAR (misma que su candado)

const HOJA_EJ = 'Ejemplares';
const HOJA_CFG = 'Config';

/* ══════════ ENTRADA WEB ══════════ */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const accion = p.accion || 'datos';
    if (accion === 'ping') return json({ ok: true, ts: new Date().toISOString(), pendientes: contar('pendiente') });
    if (accion === 'datos') return json(leerAprobados(), p.callback);
    if (accion === 'panel') return HtmlService.createHtmlOutputFromFile('03_panel_moderacion')
      .setTitle('Flora Rosario · Moderación').addMetaTag('viewport', 'width=device-width, initial-scale=1');
    if (accion === 'moderar') return json(moderarPorUrl(p.id, p.estado, p.pin, p.motivo));
    if (accion === 'verificar') return json(verificarEnviosApp(p), p.callback);
    return json({ error: 'accion desconocida' });
  } catch (err) {
    return json({ error: String(err) });
  }
}

/* ══════════ DATOS PARA EL MAPA ══════════ */
function leerAprobados() {
  const sh = hoja(HOJA_EJ);
  const datos = sh.getDataRange().getValues();
  const enc = datos[0];
  const out = [];
  for (let f = 1; f < datos.length; f++) {
    const r = filaObj(enc, datos[f]);
    if (r.estado !== 'aprobado') continue;
    out.push({
      id: 'com_' + r.id,
      speciesId: r.speciesId,
      _speciesName: r._speciesName,
      _comunitario: true,
      _relevador: r.relevador,
      parkId: r.parkId,
      parkName: r.parkName,
      lat: Number(r.lat), lng: Number(r.lng),
      addressOrZone: r.addressOrZone,
      specimenCount: Number(r.specimenCount) || 1,
      specimenType: r.specimenType,
      estimatedAgeYears: r.estimatedAgeYears,
      curiosityFact: r.curiosityFact,
      isDyePlant: r.isDyePlant === true || r.isDyePlant === 'TRUE' || r.isDyePlant === 'sí',
      foto: r.fotoUrl || null,
      _gpsAccuracy: r._gpsAccuracy ? Number(r._gpsAccuracy) : null,
      _fecha: r._fecha,
      _estado: 'aprobado'
    });
  }
  return {
    _lote: 'flora-comunitaria', _version: 1,
    _actualizado: new Date().toISOString(),
    _cantidad: out.length,
    _pendientes: contar('pendiente'),
    ejemplares: out
  };
}

/* ══════════ RECIBIR ENVÍOS DIRECTOS DE LA APP RELEVADOR ══════════
 * La app manda POST con JSON: {clave, idApp, relevador, speciesId, _speciesName,
 * parkId, parkName, lat, lng, _gpsAccuracy, addressOrZone, specimenCount,
 * specimenType, estimatedAgeYears, curiosityFact, isDyePlant, fotoBase64, _fecha}
 * La fila entra como PENDIENTE (mismo embudo que el formulario). Idempotente:
 * reenviar el mismo registro no crea duplicados (id = 'app_' + idApp).
 * La app confirma la recepción consultando /exec?accion=verificar&clave=…&callback=x */
function doPost(e) {
  try {
    let raw = '';
    if (e && e.parameter && e.parameter.payload) raw = e.parameter.payload;      // POST de formulario (la app)
    else if (e && e.postData && e.postData.contents) raw = e.postData.contents;  // POST crudo (fetch/text-plain)
    return json(enviarDesdeApp(JSON.parse(raw || '{}')));
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function enviarDesdeApp(d) {
  if (d.clave !== CLAVE_ENVIO) throw new Error('clave de envío inválida');
  const lat = Number(d.lat), lng = Number(d.lng);
  if (isNaN(lat) || isNaN(lng)) throw new Error('coordenadas inválidas');
  const id = 'app_' + String(d.idApp || (slug(String(d._speciesName || 'registro')) + '_' + Date.now().toString(36)));
  const sh = hoja(HOJA_EJ);
  const colA = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
  for (let f = 0; f < colA.length; f++) {
    if (colA[f][0] === id) return { ok: true, id: id, duplicado: true };
  }
  const fotoUrl = d.fotoBase64 ? guardarFoto(d.fotoBase64, id) : '';
  sh.appendRow([id, new Date().toISOString(),
    String(d.relevador || 'anónimo') + ' (app)',
    String(d.speciesId || ('otra_' + slug(String(d._speciesName || 'sin_identificar')))),
    String(d._speciesName || 'Sin identificar'),
    String(d.parkId || 'otro'), String(d.parkName || 'Otro lugar'),
    lat, lng, d._gpsAccuracy ? Number(d._gpsAccuracy) : null,
    String(d.addressOrZone || ''), Number(d.specimenCount) || 1,
    String(d.specimenType || 'Ejemplar único'), String(d.estimatedAgeYears || ''),
    String(d.curiosityFact || ''), d.isDyePlant === true || d.isDyePlant === 'true',
    fotoUrl, 'pendiente', '', '', '']);
  notificarModeradores(id, String(d._speciesName || 'ejemplar'), lat, lng,
    String(d.relevador || 'anónimo') + ' (app)', fotoUrl);
  return { ok: true, id: id, duplicado: false };
}

/** dataURI base64 → archivo en Drive (visible por link) → URL miniatura */
function guardarFoto(dataUri, id) {
  try {
    const m = String(dataUri).match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!m) return '';
    const ext = m[1] === 'image/png' ? 'png' : 'jpg';
    const archivo = DriveApp.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], id + '.' + ext));
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/thumbnail?id=' + archivo.getId() + '&sz=w640';
  } catch (err) { return ''; }
}

/** La app consulta qué registros 'app_' ya llegaron, para marcar los confirmados */
function verificarEnviosApp(p) {
  if (String(p.clave || '') !== CLAVE_ENVIO) return { ok: false, error: 'clave inválida' };
  const sh = hoja(HOJA_EJ);
  const datos = sh.getDataRange().getValues();
  const colId = datos[0].indexOf('id');
  const ids = [];
  for (let f = 1; f < datos.length; f++) {
    const v = String(datos[f][colId] || '');
    if (v.lastIndexOf('app_', 0) === 0) ids.push(v);
  }
  return { ok: true, cantidad: ids.length, ids: ids, pendientes: contar('pendiente') };
}

/* ══════════ PROCESAR ENVÍOS DEL FORMULARIO (disparador) ══════════ */
function procesarEnvioFormulario(e) {
  try {
    const ss = SpreadsheetApp.openById(ID_HOJA);
    const formSheet = ss.getSheets()[0];           // "Form Responses 1"
    const enc = formSheet.getDataRange().getValues()[0];
    const idx = nombre => enc.findIndex(h => String(h).toLowerCase().indexOf(nombre.toLowerCase()) !== -1);
    const vals = e.values;
    const val = n => (idx(n) >= 0 ? String(vals[idx(n)] || '').trim() : '');
    const num = n => parseFloat(String(val(n)).replace(',', '.'));

    const esp = val('Especie');
    const otra = val('"Otra especie"') || val('Otra especie') || '';
    const esOtra = /otra/i.test(esp);
    const spNombre = esOtra && otra ? otra : esp;
    const spId = 'otra_' + slug(spNombre);
    const lat = num('latitud'), lng = num('longitud');
    const email = val('@') || val('email') || '';
    if (isNaN(lat) || isNaN(lng)) return;          // sin coordenadas: no se puede mapear

    // foto: puede venir de pregunta de subida de archivo O de link pegado (cuentas personales)
    // → escanea TODAS las columnas que contengan "foto" y usa la primera con datos
    var fotoCelda = '';
    enc.forEach(function(h, i) {
      if (!fotoCelda && /foto/i.test(String(h))) fotoCelda = String(vals[i] || '').trim();
    });
    const fotoUrl = asegurarPublica(fotoCelda);
    const sh = ss.getSheetByName(HOJA_EJ);
    const id = slug(spNombre) + '_' + Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd_HHmmss');
    sh.appendRow([id, new Date().toISOString(), email,
      esOtra ? spId : slug(spNombre), spNombre,
      PARKS[val('Parque / sitio')] || 'otro', val('Parque / sitio') || 'Otro lugar',
      lat, lng, null, val('Referencia / dirección'),
      parseInt(val('Cantidad de ejemplares')) || 1, val('Tipo') || 'Ejemplar único',
      val('Edad estimada'), val('Notas / dato de curiosidad'),
      normalizarTinte(val('tintórea')), fotoUrl, 'pendiente', '', '', '']);

    notificarModeradores(id, spNombre, lat, lng, email, fotoUrl);
  } catch (err) {
    console.error('procesarEnvioFormulario: ' + err);
  }
}

const PARKS = {
  'Parque de la Independencia': 'parque_independencia',
  'Bulevar Nicasio Oroño': 'bv_orono',
  'Bosque de los Constituyentes': 'bosque_constituyentes',
  'Parque Urquiza': 'parque_urquiza',
  'Parque Nacional a la Bandera': 'parque_bandera',
  'Parque de España': 'parque_espana',
  'Parque de las Colectividades y Sunchales (MACRO)': 'parque_colectividades_sunchales',
  'Parque Scalabrini Ortiz': 'parque_scalabrini_ortiz',
  'Parque Leandro N. Alem': 'parque_alem',
  'Plazas Históricas (centro)': 'plazas_historicas'
};

/** La foto del formulario vive en Drive: la hace visible por link y devuelve URL de miniatura */
function asegurarPublica(celda) {
  const s = String(celda || '').trim();
  const m = s.match(/[-\w]{25,}/);
  if (!m) return /^https?:\/\//.test(s) ? s : '';   // link externo (no Drive): se usa tal cual
  try {
    const f = DriveApp.getFileById(m[0]);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w640';
  } catch (err) { return ''; }
}

function notificarModeradores(id, especie, lat, lng, relevador, fotoUrl) {
  const lista = moderadores().filter(Boolean);
  if (!lista.length) return;
  const base = URL_SERVICIO || ScriptApp.getService().getUrl() || '';
  const urlPanel = base ? base + '?accion=panel' : '(abrir el panel desde la implementación)';
  MailApp.sendEmail({
    to: lista.join(','),
    subject: '🌿 Flora Rosario · envío pendiente de ' + especie,
    htmlBody: '<p>Nuevo relevamiento <b>pendiente de aprobación</b>:</p>'
      + '<ul><li><b>Especie:</b> ' + especie + '</li>'
      + '<li><b>Por:</b> ' + relevador + '</li>'
      + '<li><b>Ubicación:</b> <a href="https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng
      + '#map=18/' + lat + '/' + lng + '">' + lat + ', ' + lng + '</a></li></ul>'
      + (fotoUrl ? '<p><img src="' + fotoUrl + '" width="320"></p>' : '')
      + '<p><a href="' + urlPanel + '">Abrir panel de moderación</a></p>'
  });
}

/* ══════════ MODERACIÓN ══════════ */
function moderar(id, estado, moderador, motivo) {
  if (estado !== 'aprobado' && estado !== 'rechazado') throw new Error('estado inválido');
  const sh = hoja(HOJA_EJ);
  const datos = sh.getDataRange().getValues();
  const enc = datos[0];
  const col = n => enc.indexOf(n);
  for (let f = 1; f < datos.length; f++) {
    if (datos[f][col('id')] === id) {
      sh.getRange(f + 1, col('estado') + 1).setValue(estado);
      sh.getRange(f + 1, col('moderador') + 1).setValue(moderador || 'panel');
      sh.getRange(f + 1, col('fechaModeracion') + 1).setValue(new Date().toISOString());
      sh.getRange(f + 1, col('motivoRechazo') + 1).setValue(motivo || '');
      return { ok: true, id: id, estado: estado };
    }
  }
  throw new Error('id no encontrado: ' + id);
}

/** llamado por google.script.run desde el panel */
function moderarDesdePanel(id, estado, pin, motivo) {
  const quien = quienModifica(pin);
  if (!quien) throw new Error('No autorizado');
  return moderar(id, estado, quien, motivo);
}

function moderarPorUrl(id, estado, pin, motivo) {
  const quien = quienModifica(pin);
  if (!quien) return { error: 'PIN inválido' };
  return moderar(id, estado, quien, motivo);
}

function quienModifica(pin) {
  if (pin === PIN_MODERADOR) return 'panel(PIN)';
  try {
    const email = Session.getActiveUser().getEmail();
    if (email && moderadores().indexOf(email) !== -1) return email;
  } catch (e) { /* sin sesión */ }
  return null;
}

function validarPin(pin) {
  return !!quienModifica(pin);
}

function pendientes() {
  const sh = hoja(HOJA_EJ);
  const datos = sh.getDataRange().getValues();
  const enc = datos[0];
  const out = [];
  for (let f = 1; f < datos.length; f++) {
    const r = filaObj(enc, datos[f]);
    if (r.estado === 'pendiente') out.push({
      id: r.id, _speciesName: r._speciesName, parkName: r.parkName,
      lat: Number(r.lat), lng: Number(r.lng), addressOrZone: r.addressOrZone,
      relevador: r.relevador, _fecha: r._fecha, foto: r.fotoUrl || '',
      isDyePlant: r.isDyePlant, estimatedAgeYears: r.estimatedAgeYears,
      specimenCount: r.specimenCount, curiosityFact: r.curiosityFact
    });
  }
  return out;
}

// acceso directo desde el editor: aprobar('id')
function aprobar(id) { return moderar(id, 'aprobado', 'editor'); }
function rechazar(id, motivo) { return moderar(id, 'rechazado', 'editor', motivo || ''); }

/* ══════════ UTILIDADES ══════════ */
function hoja(nombre) {
  return SpreadsheetApp.openById(ID_HOJA).getSheetByName(nombre);
}
function moderadores() {
  try {
    const sh = hoja(HOJA_CFG);
    const fila = sh.createTextFinder('moderadores').findNext();
    if (fila) return String(sh.getRange(fila.getRow(), 2).getValue()).split(',').map(s => s.trim());
  } catch (e) { }
  return MODERADORES;
}
function filaObj(enc, fila) {
  const o = {};
  enc.forEach((h, i) => o[String(h).trim()] = fila[i]);
  return o;
}
function contar(estado) {
  const sh = hoja(HOJA_EJ);
  const datos = sh.getDataRange().getValues();
  const enc = datos[0]; const i = enc.indexOf('estado');
  let n = 0;
  for (let f = 1; f < datos.length; f++) if (datos[f][i] === estado) n++;
  return n;
}
function slug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function json(obj, callback) {
  const txt = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + txt + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}
