# 🌿 Flora Urbana & Plantas Tintóreas de Rosario

Sistema completo: mapa web (escritorio + móvil), app de relevamiento para Android y moderación de aportes comunitarios.

## Componentes

| Carpeta | Qué es | URL en GitHub Pages |
|---|---|---|
| `escritorio/` | Mapa interactivo completo (PC) | `…/escritorio/` |
| `movil/` | App móvil de campo: GPS, fichas con fotos, simulador, circuitos | `…/movil/` |
| `relevador/` | App de relevamiento (GPS + foto + exportación). Diseñada para envolverse en WebView (Sketchware) — ver `moderacion/guia-sketchware.md` | `…/relevador/` |
| `moderacion/` | Scripts de Google Apps Script + guías del sistema de aportes con moderación | (no se publican, es documentación) |
| `index.html` | Raíz: redirige automático a móvil o escritorio según el dispositivo | `…/` |

## 🚀 Publicar (GitHub Pages)

1. Repositorio nuevo en GitHub → subir todo este contenido **respetando las carpetas**.
2. Settings → Pages → `Deploy from a branch` · branch `main` · carpeta `/(root)` → Save.
3. Listo: `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/` redirige solo; las apps están en sus carpetas.

Cada commit redespliega el sitio automáticamente.

## 🔗 Sistema de aportes comunitarios con moderación

Instalación completa (15 min, una vez): seguir `moderacion/README-camino-B.md`.

Flujo: **relevador** envía desde el formulario de Google (con su cuenta = contraseña) → queda **PENDIENTE** → los **moderadores** reciben un email y lo aprueban/rechazan desde el panel (PIN) → lo aprobado aparece **solo** en los mapas.

Para conectar los mapas con el servidor de Google, editar la línea `window.FUENTE_COMUNITARIA = "";`:
- en `movil/index.html` (integración completa: mapa, listas, buscador, fichas, caché offline)
- en `escritorio/index.html` (integración en el mapa con insignia comunitaria)

y pegar tu URL `/exec`. Commit → listo.

## ✏️ Actualizar contenidos

- **Aportes aprobados** → aparecen solos, sin tocar el repo.
- **Base central** (93 ejemplares, fichas de especies, colores, recetas) → editando `window.DATA` en `movil/index.html` (y copiando el mismo dato en el archivo de escritorio si corresponde).
- **Dar de baja un ejemplar** → en la hoja de Google: `estado = rechazado` (desaparece al instante). Para la base central, quitar su objeto del array.
- **Corregir ubicación** → editar `lat`/`lng` en la hoja, o pedir el cambio de la base central.

## 🔒 Seguridad

- Los mapas publicados no contienen secretos.
- Contraseñas reales: cuentas de Google (relevadores) y PIN de moderación (configurados en Google Apps Script, nunca en este repo).
- `relevador/` tiene un candado local de uso (clave `flora2026`, editable en su archivo: hash SHA-256 en `window.PASS_HASH`).

## ⚠️ Requisitos de dispositivo

La cámara y el GPS exigen **HTTPS** — GitHub Pages lo provee. Sin conexión, la app móvil y el relevador degradan con elegancia (mapa base en caché, formulario completo operativo).
