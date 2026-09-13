# 🌿 Flora Rosario · Guía completa del flujo: del relevamiento al mapa

Cómo funciona **hoy** el sistema, pieza por pieza, desde que alguien releva un árbol en el parque hasta que aparece en el mapa público. Verificado contra el código real del proyecto.

## El sistema en una imagen

```
   📍 CAMPO                ☁️ GOOGLE (privado)              🌐 PÚBLICO
  ══════════              ═══════════════════              ═════════════════════

  ┌───────────────┐      ┌──────────────┐   email      ┌─────────────────────┐
  │ APP RELEVADOR │─────▶│  FORMULARIO  │─────────────▶│   MODERADOR/A       │
  │  GPS · foto   │ con  │  de Google   │  "hay envío  │  abre el PANEL      │
  │  · datos      │ señal│  (con login  │   pendiente" │  (PIN) y decide:    │
  └───────┬───────┘      │   de Google) │              │  ✅ aprobar         │
          │ sin señal    └──────┬───────┘              │  ❌ rechazar        │
          ▼                     ▼                      │  ✏️ corregir lat/lng│
   ┌─────────────┐       ┌──────────────┐            └──────────┬──────────┘
   │ lote .json  │       │ HOJA       PENDIENTE                │ estado=aprobado
   │ (con fotos) │──────▶│ de cálculo ─────────────────────────▼
   │ por WhatsApp│ envío │ + Apps Script        ┌─────────────────────────┐
   └─────────────┘ manual│  (trigger + API)     │ SERVIDOR /exec          │
                         └──────────────┘       │ accion=datos            │
                                                │ → solo los APROBADOS    │
                                                └───────────┬─────────────┘
                                                            │ cada vez que
                                                            │ alguien abre el mapa
                                                            ▼
                                                  ┌─────────────────────┐
                                                  │  MAPAS PÚBLICOS     │
                                                  │  📱 móvil  🖥️ PC    │
                                                  │  🌱 chip + badge    │
                                                  └─────────────────────┘
```

---

> **⭐ Novedad:** la app relevador ahora **envía directo al servidor** (botón 🚀 en la pestaña Exportar). El formulario de Google queda como segunda vía y el lote .json como plan C sin señal. Detalle en la sección 3.

## 1 · Las piezas y dónde viven

| Pieza | Dónde vive | Quién la usa |
|---|---|---|
| **Relevador** (app de campo) | `relevador/` en el repo → envuelta en WebView (Sketchware) o navegador | Relevadores |
| **Formulario de Google** | Se crea solo al correr `moderacion/01_crear_formulario.gs` | Relevadores (con señal) |
| **Hoja de cálculo + Apps Script** | Google Drive del coordinador | Nadie la toca a mano (salvo correcciones) |
| **Panel de moderación** | `moderacion/03_panel_moderacion.html`, servido por el script en `…/exec?accion=panel` | Moderadores |
| **Mapa móvil** | `movil/` en el repo | Público |
| **Mapa escritorio** | `escritorio/` en el repo | Público |
| Raíz del sitio | `index.html` → detecta celular vs PC y redirige solo | Público |

---

## 2 · Paso 1: el relevador en campo

**Acceso.** La app abre con un candado local (clave `flora2026`). Dura toda la sesión; es para el uso del dispositivo, no un sistema de usuarios real. La identidad de verdad viene después, en el formulario (ver paso 2).

**Funciona sin señal.** Leaflet (el mapa) está embebido dentro del propio archivo HTML, íconos incluidos: 0 descargas. Lo único que necesita internet alguna vez son las **teselas del minimapa**, y el teléfono las guarda en caché al primer uso. Después se puede relevar en cualquier lugar sin datos.

**Cargar un ejemplar** (pestaña Nuevo registro):
1. **Especie**: se elige de la lista, o "Otra especie" escribiendo el nombre.
2. **Parque / sitio**: lista de parques, o "Otro lugar" a mano.
3. **Ubicación**: botón 📍 **Capturar GPS** (guarda lat, lng y precisión en metros) o tocar el punto en el minimapa.
   - *Control de calidad*: si la coordenada cae fuera de Rosario (lat −33,05…−32,80 / lng −60,85…−60,40) la app avisa y no deja guardar hasta corregir.
4. **Datos**: cantidad de ejemplares, tipo (árbol/arbusto/etc.), edad estimada, referencia/dirección, dato de curiosidad, **¿es tintórea?** (sí/no/no sé).
5. **Foto** con la cámara del teléfono: queda embebida en el registro.

**Dónde queda.** Todo se guarda en el propio teléfono (`localStorage`, clave `fc_registros_v1`), visible en la pestaña **Registros** con opción de editar o borrar antes de enviar. Hay botón de **respaldo** (.json) y **restaurar** por si cambian de teléfono.

---

## 3 · Paso 2: el envío (tres rutas)

### Ruta principal · botón 🚀 de la app (con señal)
En la pestaña **Exportar** de la app relevador: se escribe el **nombre o email** (la "firma" de cada registro, se guarda en el teléfono) y se toca **"🚀 Enviar registros nuevos al moderador"**.

- La app manda cada registro (datos + **foto embebida**) por POST al servidor, con la clave de envío (`flora2026`, la misma del candado).
- El servidor valida la clave, guarda la **foto en Drive**, crea la fila con `estado = pendiente` y avisa por email. Es idempotente: reenviar no duplica.
- Cada registro queda marcado en la app: 🚀 *enviado (verificando)* → ✅ *en el servidor* (la app confirma sola contra `accion=verificar`).
- Si no había señal en el momento de tocar el botón, los registros quedan en el teléfono y se envían después.

### Ruta 2 · formulario de Google (segunda vía)
El formulario sigue funcionando intacto (con login de Google como firma y subida de foto al Drive — vía link en cuentas personales). Útil para quien prefiera el formulario o reporte desde la PC.

### Ruta 3 · lote .json (plan C, sin señal)
Si se relevó sin datos y hace falta sacar todo del teléfono por WhatsApp/email: **Exportar lote .json** (con fotos embebidas). Hoy se incorpora cargándolo por el formulario o la app. El .csv no incluye fotos.

Las tres rutas convergen en la misma hoja **Ejemplares** con `estado = pendiente`: mismo panel, misma moderación, mismo mapa.

---

## 4 · Paso 3: qué pasa en Google al llegar un envío

Todo esto es automático (`01_crear_formulario.gs` instaló el disparador una sola vez):

1. **Se dispara el trigger** `onFormSubmit` → `procesarEnvioFormulario`.
2. **Normalización**: la respuesta de tintórea se convierte (`Sí`→verdadero, `No`→falso, `No sé`→sin dato); se genera el `id` único; se completan todas las columnas técnicas.
3. **Foto**: queda en Drive con permiso "cualquiera con el link" y se guarda su URL miniatura (`…/thumbnail?id=…&sz=w640`).
4. **La fila entra a la hoja "Ejemplares" con `estado = pendiente`** — todavía invisible para el mundo.

Columnas de la hoja: `id, _fecha, relevador, speciesId, _speciesName, parkId, parkName, lat, lng, _gpsAccuracy, addressOrZone, specimenCount, specimenType, estimatedAgeYears, curiosityFact, isDyePlant, fotoUrl, estado, moderador, fechaModeracion, motivoRechazo`

5. **Email automático** a los moderadores: *"🌿 Flora Rosario · envío pendiente de \<especie\>"* con link directo al panel.

---

## 5 · Paso 4: la moderación (nadie publica sin filtro)

**Abrir el panel**: `https://…/exec?accion=panel` (el link llega en el email). Se desbloquea con el **PIN de moderación** — el mismo PIN vale, o ser editor de la hoja. La sesión queda abierta en el navegador.

**Decidir cada envío** — el panel muestra foto, ubicación con link a OpenStreetMap, y distintivos (tintórea / cantidad):

| Acción | Qué hace en la hoja | Efecto |
|---|---|---|
| ✅ **Aprobar** | `estado = aprobado` | Aparece en los mapas (paso 5) |
| ❌ **Rechazar** | `estado = rechazado` + motivo (lo pide con un cuadro de texto) | Nunca se publica; el motivo queda registrado |
| ✏️ **Corregir coordenadas** | editar celdas `lat`/`lng` directamente en la hoja | La próxima lectura del servidor usa la corregida |
| 🗑️ **Dar de baja** | cambiar `estado` a `rechazado` en la hoja | Desaparece del mapa al instante |

Queda auditoría de todo: quién moderó (`moderador`) y cuándo (`fechaModeracion`).

---

## 6 · Paso 5: la aparición en el mapa

**El portero es el servidor**: `…/exec?accion=datos` recorre la hoja y devuelve **únicamente las filas con `estado = aprobado`** — las pendientes y rechazadas jamás salen de Google.

**Los mapas ya traen el cargador adentro.** Tanto el móvil como el escritorio tienen una línea de configuración:

```js
window.FUENTE_COMUNITARIA = "";   // ← acá se pega UNA VEZ la URL /exec
```

Con la URL pegada (y un commit para publicarla), cada vez que alguien abre el mapa:

1. El mapa pide los aprobados al servidor (`fetch`; si el navegador lo bloquea, usa JSONP como plan B).
2. Los integra a la base central **sin duplicar** (control por `id`) y **sin mostrar nada fuera de Rosario** (filtro por área).
3. Lo guarda en **caché del navegador**: si después se abre el mapa sin conexión, se ve lo último conocido.
4. En pantalla, los aportes se distinguen de la base central:
   - 📱 **Móvil**: chip `🌱 Registro comunitario` en la lista/buscador/mapa; badge `🌱 Aporte comunitario · <relevador>`; al tocar se abre su ficha (completa si la especie ya tiene ficha; básica "en construcción" si es una especie nueva).
   - 🖥️ **Escritorio**: punto verde sobre el mapa con popup (foto, nombre, tintórea, link OSM, badge); insignia fija abajo a la izquierda con el estado de la conexión.

**⏱️ Tiempo real sin tocar GitHub**: el moderador aprueba → el servidor ya lo publica → el próximo visitante lo ve. No hay que "actualizar la página" ni redesplegar nada. La caché del navegador es por-visita (cada apertura reconsulta).

---

## 7 · Los dos pisos de datos (importante no confundirlos)

| | **Base central** | **Capa comunitaria** |
|---|---|---|
| Qué es | Los 93 ejemplares, 24 fichas de especies con colores/recetas, 10 ubicaciones, circuitos | Todo lo que envían los relevadores |
| Dónde vive | Embebida en el código (`window.DATA` dentro de `movil/` y `escritorio/`) | Hoja de Google |
| Cómo se actualiza | Editando el archivo y haciendo **commit** → GitHub Pages redespliega (~1 min) | Panel del moderador → **aparece solo** |
| Control | Curaduría total del coordinador | Moderación obligatoria antes de publicar |

---

## 8 · Credenciales: quién sabe qué

| Credencial | Valor actual | Dónde vive | Quién la usa |
|---|---|---|---|
| Candado del relevador | `flora2026` | Dentro de `relevador/index.html` (hash) | Relevadores |
| Clave de envío de la app | `flora2026` (misma que el candado) | `relevador/index.html` + `02_servidor_datos.gs` | Viaja automática en cada POST |
| Login del formulario | Cuenta de Google de cada uno | Google | Relevadores (es su firma) |
| PIN de moderación | `flora-mod-2026` | **Solo en Apps Script** (en tu Google, no en el repo) | Moderadores |
| Lista MODERADORES | emails | **Solo en Apps Script** | — |

🔒 El repo público **no contiene secretos**: las contraseñas reales viven en Google Apps Script.

---

## 9 · Instalación única (resumen)

Detalle paso a paso en `moderacion/README-camino-B.md` y `moderacion/guia-sketchware.md`. En corto:

1. Subir este repo a GitHub → Settings → Pages → `main` / `/(root)`.
2. En Google: correr `01_crear_formulario.gs` (crea formulario + hoja + trigger).
3. En `02_servidor_datos.gs`: pegar ID de la hoja + emails de moderadores → Implementar como **app web** (ejecutar como vos, acceso: cualquiera) → copiar la URL `/exec`.
4. Pegar esa URL en: la línea `window.FUENTE_COMUNITARIA` de `movil/` y `escritorio/` (commit) + repartir el link del formulario a los relevadores + guardar el link `?accion=panel` para moderadores.

---

## 10 · Preguntas rápidas

- **¿Cuánto tarda un aporte en verse?** Moderación inmediata → visible en la próxima apertura del mapa (segundos). Si el moderador tarda 2 días, tarda 2 días: nada se publica sin aprobación.
- **¿Se puede testear el servidor?** `…/exec?accion=ping` responde si está vivo.
- **¿Y si dos personas relevan lo mismo?** Son registros distintos (ids únicos); el moderador aprueba uno y rechaza el otro indicando el motivo.
- **El relevador en el teléfono se ve en blanco** → en el WebView falta *JavaScript ON*. **Los registros se borran al cerrar** → falta *DOM Storage ON*. **La cámara no abre** → falta *File Upload ON* (todo en `moderacion/guia-sketchware.md`).
- **¿Actualicé la hoja y no se ve?** Revisá que `estado` sea exactamente `aprobado`, y que el mapa esté configurado con la URL `/exec` (insignia 🌱 en pantalla = cargador activo).
