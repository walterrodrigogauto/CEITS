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

El panel tiene **dos pestañas** y confirmación visual inmediata de cada acción (sin recargar la página):

**⏳ Pendientes** — foto, ubicación con link a OpenStreetMap y distintivos (tintórea / cantidad). Acciones:

| Acción | Qué hace | Efecto |
|---|---|---|
| ✅ **Aprobar** | `estado = aprobado` | Aparece en los mapas (paso 5) |
| ❌ **Rechazar** | abre un campo de motivo integrado → `estado = rechazado` | Nunca se publica; el motivo queda registrado |

**🌍 Publicados** — lista todo lo visible: comunitarios aprobados + base central importada. Cada uno con botón **🗑️ Dar de baja** que lo quita del mapa al instante (los comunitarios pasan a `rechazado`; la base se marca `baja` en la hoja "Base" y viaja a los mapas como `_bajas`). Reactivar uno de la base: hoja "Base" → `estado = aprobado`.

✏️ Corregir coordenadas: editar celdas `lat`/`lng` en la hoja (la próxima lectura del servidor usa la corregida).

**Completar fichas de especies nuevas** (hoja "Fichas"): los registros de especies fuera de la base publican una ficha provisional a prueba de todo (nada se rompe, marcador y simulador incluidos). Para completarla con datos reales y **imagen de referencia**: importar `fichas-plantilla.csv` como hoja `Fichas` y llenar una fila por especie (listas con `|`, colores `Nombre=#hex;…`, foto con link) — viaja sola a los mapas. Detalle en `moderacion/README-camino-B.md`.

**Importación única de la base (2 min, para poder dar de baja ejemplares centrales):** abrir la hoja de Google → Archivo → Importar → subir `moderacion/base-para-importar.csv` → "Insertar hoja nueva" → nombrarla **`Base`**. Queda una copia editable de los 93 ejemplares (id, especie, parque, coords, estado).

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
4. Los ejemplares aprobados se integran **idénticos al resto**: en móvil se agregan al mapa y a las listas como cualquier ejemplar (con su foto en la ficha cuando el registro la trae), y en escritorio se **inyectan en los datos de la app antes de que arranque**, así los dibuja el mismo código: mismos marcadores con brillo, mismas fichas, mismos filtros — y tanto el **popup del mapa como la ficha-panel** muestran **la foto del relevamiento** (o la imagen de referencia de la hoja Fichas si el registro no trae). La ficha-panel de escritorio tiene además el botón **🔎 Ver información completa**: abre la ficha extendida con la paleta de colores y su mordiente correspondiente por tarjeta, partes, pigmentos, mordientes, fibras, receta, ética y contexto cultural — la misma información que la ficha de la versión móvil. En **ambas versiones**, tocar cualquier foto la abre a **pantalla completa** (overlay con la imagen en alta: `sz=w1600` de Drive). En escritorio, cuando hay novedades, la página se recarga **una sola vez** sola. Si el servidor informa bajas (`_bajas`), los mapas **ocultan solos** esos ejemplares, aunque estén en la base central.

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
- **¿Actualicé la hoja y no se ve?** Revisá que `estado` sea exactamente `aprobado`, y que el mapa esté configurado con la URL `/exec` (la línea 📡 de la Guía (móvil) muestra el estado de sincronización).

---

## 11 · El botón atrás del teléfono: cierra de a una, el mapa queda al final

En las tres apps el botón **atrás** de Android no sale de golpe: va cerrando las capas abiertas **una por una**, y recién cuando no queda ninguna vuelve hacia atrás como siempre (última pantalla = el mapa).

| App | Qué cierra cada "atrás" |
|---|---|
| **Móvil** | Si hay una ficha de ejemplar abierta → la cierra. Si no → vuelve (mapa). |
| **Relevador** | Si estás en "Mis registros" o "Mis datos" → vuelve a "Nuevo registro". Si ya estás ahí → vuelve (salir de la app). |
| **Escritorio** (también en teléfono) | Cierra en orden: foto a pantalla completa → ficha completa (🔎) → simulador → ficha del ejemplar → mapa. |

Notas técnicas (por si se toca el código): el escritorio detecta cada capa con un `MutationObserver` y la registra con `history.pushState`; el botón atrás dispara `popstate` y se cierra **una sola capa**. En el relevador y el móvil lo mismo, con las vistas/ficha correspondientes. En un WebView de Sketchware el botón atrás solo llega si la app llama a `goBack()` del WebView (ver `moderacion/guia-sketchware.md`).
