# 🌿 Flora Rosario · Camino B completo
## Relevamiento multiusuario + moderación + mapa auto-actualizable (gratis, con Google)

### Cómo funciona el sistema completo

```
RELEVADOR (celular)                      MODERADOR
Google Formulario ──envío──▶ Hoja "Ejemplares" ──▶ Panel de moderación
(con cuenta Google=                 (estado:          │ aprobar / rechazar
 contraseña real) 🔒                PENDIENTE)        ▼
                                              estado: APROBADO
                                                      │
              Página escritorio ◀── /exec?accion=datos ◀──┘
              App móvil          (JSON de aprobados)
              ── lo leen automáticamente al abrirse ──
```

- **Contraseña de relevadores:** el formulario se limita a cuentas de Google específicas y registra el email de cada envío.
- **Contraseña de moderación:** PIN (`flora-mod-2026` por defecto, cámbialo) + opcionalmente restricción por email del moderador.
- **Automático:** aprobás en el panel → el mapa ya lo muestra la próxima vez que alguien lo abre. **Sin tocar nunca más el HTML.**

---

## Instalación (una sola vez, ~15 minutos)

### PASO 1 · Crear formulario + hojas automáticamente
1. Entrá a [script.google.com](https://script.google.com) con la cuenta de Google del proyecto → **Nuevo proyecto**.
2. Pegá el contenido de `apps-script/01_crear_formulario.gs`.
3. Editá arriba: `MODERADORES = ['tu-email@gmail.com']`.
4. Ejecutá ▶ `crearFormularioFlora` (autorizá los permisos que pide: es tu propia cuenta).
5. En el **log de ejecución** quedan las URLs: formulario (para editar), formulario (para relevadores) y hoja de cálculo. **Copiá el ID de la hoja** (es el texto largo en la URL de la hoja, entre `/d/` y `/edit`).

### PASO 2 · Servidor de datos + panel de moderación
1. En el **mismo proyecto** de Apps Script, agregá un archivo (+ → Secuencia de comandos) y pegá `apps-script/02_servidor_datos.gs`.
2. Editá arriba: `ID_HOJA` (el que copiaste), `MODERADORES`, y `PIN_MODERADOR` (elegí una contraseña buena).
3. **Implementar → Nueva implementación** → tipo **"Aplicación web"**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
4. Copiá la **URL /exec** que te da. Ejemplo: `https://script.google.com/macros/s/AKfy…/exec`

> 🔒 ¿Y la seguridad de esa URL? La lectura de *datos aprobados* es pública (es lo que consume el mapa, igual que cualquier mapa web). Lo sensible —enviar, moderar— está protegido: el formulario por cuenta Google, la moderación por PIN/emails.

### PASO 3 · Conectar el mapa (una línea)
Abrí `flora-rosario-movil/index.html` con un editor de texto y buscá esta línea (está al inicio de los scripts):

```js
window.FUENTE_COMUNITARIA = "";  // ⬅ pegá acá tu URL /exec
```

Pegá tu URL entre las comillas y guardá. **Eso es todo**: la app móvil ahora, en cada apertura con internet, descarga los aprobados, los marca con una insignia "comunitario", los guarda en caché para cuando no haya señal, y muestra cuándo se actualizó por última vez.

### PASO 4 · Probar el circuito completo
1. Abrí el **formulario** desde el celular (con otra cuenta o el modo incógnito) y enviá un ejemplar de prueba.
2. Los moderadores reciben **un email automático** con foto y ubicación.
3. Entrá al **panel**: `TU-URL/exec?accion=panel` → PIN → apareció el pendiente → **✅ Aprobar**.
4. Abrí el mapa móvil: el ejemplar aprobado está en el mapa, en la lista y en el buscador, con su insignia. Si volvés a abrir el panel, ya no está pendiente.

---

## Uso diario

| Quién | Qué hace | Dónde |
|---|---|---|
| Relevador | Completa el formulario (2 min por ejemplar) | `URL-publica-del-form` |
| Moderador | Recibe email → abre panel → aprueba/rechaza | `URL/exec?accion=panel` |
| Todos | El mapa se actualiza solo | página web + app móvil |

**Atajos del panel:** el botón de rechazo permite poner motivo. Los rechazados quedan en la hoja (historial completo, nunca se borran).

## Detalles técnicos útiles

- **Fotos:** las del formulario viven en tu Drive; el script las hace visibles por link automáticamente y el mapa las muestra como miniatura (URL `drive.google.com/thumbnail?...&sz=w640`).
- **"No sé" en tintórea:** queda `tintórea: sin definir` en el panel; el moderador decide (aprobando queda como lo defina la hoja: editá la celda `isDyePlant` con `TRUE`/`FALSE` antes de aprobar si hace falta).
- **Filtrado anti-basura:** los envíos sin coordenadas válidas no entran al flujo; el cliente además valida que el punto esté en Rosario.
- **Offline:** la app móvil guarda en caché lo aprobado; sin internet muestra la caché con su fecha.
- **Especies nuevas ("Otra especie"):** entran al mapa como categoría comunitaria con nombre propio; si después querés ficha completa (paleta, receta), se agrega a la base central.

## Archivos de esta carpeta

| Archivo | Qué es |
|---|---|
| `apps-script/01_crear_formulario.gs` | Crea formulario + hojas + disparador (ejecutar 1 vez) |
| `apps-script/02_servidor_datos.gs` | API de datos + moderación + emails (web app) |
| `apps-script/03_panel_moderacion.html` | Interfaz del panel (se agrega como archivo HTML en el proyecto) |

> ⚠️ En el paso 2, el archivo `03_panel_moderacion.html` se agrega en Apps Script con el signo **+ → HTML** (nombralo exactamente `03_panel_moderacion`).

## ¿Y la página de escritorio?

Los mismos datos aprobados pueden cargarse allí también; por ahora la integración automática vive en la **app móvil** (la herramienta de terreno). Cuando quieras, regenero la de escritorio con el mismo cargador.


---

## ⭐ Novedad: la app relevador ahora envía directa

La app tiene el botón **"🚀 Enviar registros nuevos al moderador"** (pestaña Exportar): manda datos + foto por POST a la URL `/exec` (ya viene horneada), con clave `flora2026`. No hace falta tocar el formulario: el envío entra **pendiente** como cualquier otro y se modera igual. El formulario queda como segunda vía; el .json como plan sin señal. Para activarlo basta con la implementación de este mismo servidor actualizada (incluye `doPost` y `accion=verificar`).


---

## 🗑️ Bajas de ejemplares (incluida la base central) · pestaña "Publicados"

1. **Una sola vez**: abrir la hoja de Google → Archivo → Importar → subir `base-para-importar.csv` → **"Insertar hoja nueva"** → renombrarla exactamente **`Base`**. (Es la copia editable de los 93 ejemplares de la base central.)
2. Desde el panel: pestaña **🌍 Publicados** → botón **🗑️ Dar de baja** en el ejemplar que ya no existe. Desaparece de los mapas en la próxima recarga (el servidor lo publica en `_bajas` y los mapas lo ocultan solos).
3. Reactivar: hoja "Base" → poner `estado = aprobado` en esa fila.

El rechazo de pendientes también mejoró: motivo integrado en la tarjeta (sin ventanas emergentes, que el entorno de Google bloquea) y la tarjeta desaparece al instante al confirmar.


---

## 📖 Completar fichas de especies nuevas (hoja "Fichas")

Los registros de especies que no están en la base publican una **ficha provisional** (con color de referencia y datos "A determinar") para que nada se rompa ni quede en blanco. Para completarla de verdad:

1. **Una sola vez**: hoja de Google → Archivo → Importar → subir `fichas-plantilla.csv` → **"Insertar hoja nueva"** → renombrarla exactamente **`Fichas`**. (Trae una fila de ejemplo: Ginkgo Biloba, edítala o bórrala.)
2. **Una fila por especie nueva**, con `id` = el que aparece como especie en el registro (ej: `ginkgo_biloba`; la lista de ids que faltan se ve en el panel → Publicados, o en el mapa tocando la ficha provisional).
3. Reglas de formato: listas separadas por `|` (ej: `Lana|Seda`) · colores como `Nombre=#hex` separados por `;` (ej: `Amarillo miel=#E5C468;Ocre=#B8912F`) · **`coloresMordientes`**: la lista de mordientes en el MISMO orden que los colores, separada por `;` (ej: `Alumbre de potasio (15%);Sin mordiente`). Esa es la **correspondencia mordiente↔color** que se muestra en cada tarjeta de color de la ficha y usa el simulador · `isDyePlant`: `sí`/`no` · `fotoUrl`: link de imagen (Drive compartido o Wikimedia) = **imagen de referencia** de la ficha (móvil).
   - Los valores pendientes se dejan vacíos o con `Por definir`: la ficha muestra "Por definir" y explica cómo completarla. Los campos se llenan a medida que avance la investigación del equipo y se publican solos.
4. **Publicar**: no hay que tocar nada más — la próxima apertura de los mapas trae las fichas actualizadas (en escritorio se recarga solo una vez).

La hoja solo afecta especies **nuevas**: las 24 fichas curadas de la base jamás se pisan desde acá.


**Notas del simulador:** el simulador lista solo las especies **tintóreas** (es un simulador de tinte): una especie nueva aparece cuando su ficha dice `isDyePlant = sí`. La lista se actualiza sola al recargar el mapa.
