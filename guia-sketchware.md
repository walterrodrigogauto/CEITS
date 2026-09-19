# Guía: convertir el relevador en app Android (webview)

La app de relevamiento es una página web autocontenida. Para tenerla como **app nativa en Android**, lo más simple es envolverla en un **WebView** con Sketchware. La app sigue siendo la misma página publicada: cuando actualices el sitio, **todos los teléfonos reciben la versión nueva sin reinstalar el APK**.

## Antes de empezar

Necesitás la **URL publicada** del relevador. En GitHub Pages será:

```
https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/relevador/
```

(Para probar en local podés usar la del preview, pero para el APK final usá la de GitHub Pages: es HTTPS estable y habilita cámara y GPS sin fricción.)

## Opción recomendada: Sketchware Pro (gratis)

Sketchware Pro es la versión abierta y actualizada; soporta subida de archivos (imprescindible para la cámara) sin trucos.

### 1. Crear el proyecto
1. **Nuevo proyecto** → nombre: `Flora Campo` · paquete: `ar.rosario.floracampo` (o el que quieras) · tema oscuro o claro.
2. En el diseñador, arrastrá un **LinearLayout (vertical)** que ocupe toda la pantalla.
3. Andá a la pestaña **View → avanzado → WebView** e insertala dentro del LinearLayout. Llamala `web1`. En sus propiedades: ancho `match_parent`, alto `match_parent`.

### 2. Ajustes del WebView (CRÍTICOS)
Abrí `web1` → **Propiedades del componente** y verificá:

| Ajuste | Valor | Por qué |
|---|---|---|
| JavaScript | **ON** | sin esto la app se ve en blanco |
| **DOM Storage** | **ON** | ⚠️ **el más importante**: sin esto los registros NO se guardan en el teléfono |
| File Access | **ON** | permite leer la foto que saca la cámara |
| File Upload / File Chooser | **ON** (si aparece) | habilita `<input type="file">` = botón de la cámara |
| Zoom / botones de zoom | OFF | la app ya es mobile-first |
| Geolocalización | ON (si aparece) | para el GPS |

### 3. Bloques (lógica)
En el evento **onCreate**:
```
web1 → loadUrl → [pegar la URL publicada del relevador]
```
Opcional (muy recomendado), en el evento **onBackPressed**:
```
if web1.canGoBack → web1.goBack
else → finish
```

### 4. Permisos
En **Manifiesto / permisos** agregá:
- `INTERNET`
- `ACCESS_FINE_LOCATION` y `ACCESS_COARSE_LOCATION` (GPS)
- `CAMERA` y `READ_MEDIA_IMAGES` (foto)

Y pedilos en tiempo de ejecución al primer uso (en Sketchware Pro: bloque **"Request permissions"** en onCreate; Android los va a pedir solos al tocar 📷 y 📍 igualmente — aceptá los diálogos).

### 5. Generar el APK
**Build → APK** → instalar en el teléfono → abrir.

### 6. Checklist de prueba (5 minutos)
Abrí la app (te va a pedir la contraseña del relevador) y probá en orden:
1. ✅ Entra con la contraseña (si queda en blanco → JavaScript está OFF)
2. ✅ Cargá un registro de prueba y **cerrá y reabrí la app**: tiene que seguir en "Registros" (si se pierde → DOM Storage está OFF)
3. ✅ Tocá 📷 → abre la cámara y la foto se ve en la vista previa (si no → File Upload OFF)
4. ✅ Tocá 📍 Capturar GPS → da coordenadas con precisión (aceptá el permiso de ubicación)
5. ✅ Exportar lote .json → genera el archivo (podés compartirlo a WhatsApp/email desde el menú compartir de Android)

## Opción B: Sketchware clásico (sin Pro)

Funciona igual, pero la **subida de archivos** (cámara) requiere el add-on/parche "WebView File Upload" o código extra en `onShowFileChooser`. Si no querés lidiar con eso, usá Sketchware Pro.

## Opción C: otros constructores

| Herramienta | Cámara en webview | Nota |
|---|---|---|
| **Kodular / Niotron** | ✅ con componente WebViewer + "file upload" activado | similar a Sketchware Pro |
| **MIT App Inventor** | ⚠️ limitado | el WebViewer estándar no soporta `<input file>` bien; desaconsejado para esta app |
| **Android Studio** | ✅ | plantilla WebView Activity; configurar `WebSettings` igual que la tabla de arriba + `WebChromeClient` con `onShowFileChooser` y `onPermissionRequest` |
| **Sin APK (PWA)** | ✅ | el navegador del teléfono + "Añadir a pantalla de inicio": cero desarrollo, misma experiencia de uso |

## Preguntas frecuentes

**¿Los registros se sincronizan solos al servidor?**
No: la app es *offline-first* por diseño (relevás en zonas sin señal). La salida es el **lote .json** que exportás y se manda a moderación (o el formulario de Google, que sí sube directo). Si más adelante querés subida automática desde el teléfono, es el "Camino C" (servidor propio).

**¿Cambió algo del sitio? ¿Hay que actualizar la app?**
No: el WebView carga siempre la página publicada. Al hacer commit en GitHub, todos los teléfonos ya están usando la versión nueva en el próximo arranque.

**La app pide contraseña cada vez**
El candado dura la sesión (por privacidad, si comparten el teléfono). Si querés que quede abierta, se puede cambiar el comportamiento (pedir que lo confirme el moderador del proyecto).

**¿Se puede personalizar ícono y nombre?**
Sí, todo eso es del proyecto Sketchware (nombre: "Flora Campo", ícono 🧶 o el logo que elijan).
