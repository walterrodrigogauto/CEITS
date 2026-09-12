/**
 * FLORA ROSARIO · PASO 1 de la instalación
 * =========================================
 * Este script CREA AUTOMÁTICAMENTE:
 *   ✓ El Google Formulario de relevamiento (con todas las preguntas)
 *   ✓ La hoja de respuestas vinculada
 *   ✓ La hoja "Ejemplares" (donde se normalizan los registros para el mapa)
 *   ✓ La hoja "Config" (emails de moderadores)
 *   ✓ El disparador automático que procesa cada envío
 *
 * CÓMO USARLO (5 minutos):
 * 1. Entrá a script.google.com → Nuevo proyecto
 * 2. Pegá TODO este archivo, editá la línea MODERADORES con tus emails
 * 3. Ejecutá la función  crearFormularioFlora  (autorizá los permisos)
 * 4. El log te muestra la URL del formulario y de la hoja. ¡Listo!
 */

// ✏️ EDITAR: emails de quienes pueden aprobar registros
const MODERADORES = ['tu-email@gmail.com'];

const ESPECIES = [
  'Aguaribay','Espinillo','Ceibo','Lapacho Rosado','Jacarandá','Tipa Blanca','Eucalipto',
  'Algarrobo Blanco','Plátano de Sombra','Tala','Curupí','Liquidámbar','Palo Borracho Rosado',
  'Morera Negra','Casuarina','Granado','Fresno Americano','Palmera Pindó','Crespón','Tilo',
  'Sauce Llorón','Magnolia Grandiflora','Paraíso','Ficus Benjamina'
];
const ESPECIES_NO_TINTE = [
  'Fresno Americano','Palmera Pindó','Crespón','Tilo','Sauce Llorón',
  'Magnolia Grandiflora','Paraíso','Ficus Benjamina'
];
const SITIOS = [
  'Parque de la Independencia','Bulevar Nicasio Oroño','Bosque de los Constituyentes',
  'Parque Urquiza','Parque Nacional a la Bandera','Parque de España',
  'Parque de las Colectividades y Sunchales (MACRO)','Parque Scalabrini Ortiz',
  'Parque Leandro N. Alem','Plazas Históricas (centro)','Otro lugar (especificar en referencias)'
];
const TIPOS = ['Ejemplar único','Cantero de Alineación','Bosquecillo / Rodal',
               'Ejemplar Monumental','Veredas de Barrio','Planta de Paseo'];

function crearFormularioFlora() {
  // ── Hoja de cálculo contenedora ──
  const ss = SpreadsheetApp.create('Flora Rosario · Relevamiento y moderación');
  const idHoja = ss.getId();

  // ── Formulario ──
  const form = FormApp.create('Flora Rosario · Registro de ejemplares')
    .setDescription('Relevamiento de flora urbana y plantas tintóreas de Rosario. '
      + 'Parate junto al ejemplar, sacá una foto y capturá la ubicación. '
      + 'Tu envío queda pendiente hasta que lo apruebe la moderación.')
    .setCollectEmail(true)              // 🔒 cada envío queda firmado con la cuenta Google
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false);

  form.addTextItem().setTitle('Referencia / dirección').setHelpText(
    'Ej: Bv. Oroño al 1200, cantero central · vereda de calle Mendoza 2100').setRequired(false);

  const itemEsp = form.addMultipleChoiceItem().setTitle('Especie *').setChoiceValues(ESPECIES).setRequired(true);

  form.addTextItem().setTitle('Si elegiste "Otra especie", ¿cuál?')
    .setHelpText('Escribí el nombre con el que la conoce la gente.').setRequired(false);

  form.addMultipleChoiceItem().setTitle('¿Es tintórea? *')
    .setHelpText('Tintórea = sirve para teñir fibras (corteza, flores, frutos, hojas…). '
      + 'Si no estás seguro, elegí "No sé" y la moderación lo define.')
    .setChoiceValues(['Sí 🧶','No','No sé']).setRequired(true);

  form.addTextItem().setTitle('Coordenadas (latitud) *')
    .setHelpText('En Google Maps: mantené presionado el punto del árbol → copiar "−32.9460, −60.6530" '
      + '→ pegá acá el primer número. La app Flora Campo lo llena sola.').setRequired(true);
  form.addTextItem().setTitle('Coordenadas (longitud) *').setRequired(true);

  form.addMultipleChoiceItem().setTitle('Parque / sitio *').setChoiceValues(SITIOS).setRequired(true);

  form.addTextItem().setTitle('Cantidad de ejemplares').setValidation(
    FormApp.createTextValidation().requireNumber().build()).setRequired(false);

  form.addMultipleChoiceItem().setTitle('Tipo').setChoiceValues(TIPOS).setRequired(false);

  form.addTextItem().setTitle('Edad estimada').setHelpText('Ej: 50 años').setRequired(false);

  form.addParagraphTextItem().setTitle('Notas / dato de curiosidad')
    .setHelpText('Estado del ejemplar, color que da, material caído disponible…').setRequired(false);

  form.addFileUploadItem().setTitle('Foto del ejemplar')
    .setHelpText('Una foto clara del árbol (o su flor/fruto) ayuda a identificarlo en el mapa.')
    .setFileTypes([FormApp.FileType.IMAGE]).setMaxFiles(1).setRequired(false);

  // ── Hoja Ejemplares (formato del mapa) ──
  const shEj = ss.insertSheet('Ejemplares');
  shEj.appendRow(['id','_fecha','relevador','speciesId','_speciesName','parkId','parkName',
    'lat','lng','_gpsAccuracy','addressOrZone','specimenCount','specimenType',
    'estimatedAgeYears','curiosityFact','isDyePlant','fotoUrl','estado','moderador',
    'fechaModeracion','motivoRechazo']);
  shEj.setFrozenRows(1);

  // ── Hoja Config ──
  const shCfg = ss.insertSheet('Config');
  shCfg.appendRow(['moderadores', MODERADORES.join(',')]);
  shCfg.appendRow(['creado', new Date().toISOString()]);

  // ── Disparador: procesar cada envío del formulario ──
  ScriptApp.newTrigger('procesarEnvioFormulario').forSpreadsheet(ss).onFormSubmit().create();

  Logger.log('════════════════════════════════════════════');
  Logger.log('✅ Formulario:  ' + form.getEditUrl() + '  (para editar)');
  Logger.log('📤 Formulario para relevadores:  ' + form.getPublishedUrl());
  Logger.log('📊 Hoja de cálculo:  ' + ss.getUrl());
  Logger.log('➡️  PRÓXIMO PASO: pegá el script 02_servidor_datos.gs en ESTE MISMO proyecto');
  Logger.log('    y editá la variable ID_HOJA con:  ' + idHoja);
  Logger.log('════════════════════════════════════════════');
}

/** "Sí 🧶" → true · "No" → false · "No sé" → null (la moderación define) */
function normalizarTinte(txt) {
  const v = String(txt || '').trim().toLowerCase();
  if (/^no s/.test(v)) return null;
  if (/^s/.test(v)) return true;
  if (/^n/.test(v)) return false;
  return null;
}
