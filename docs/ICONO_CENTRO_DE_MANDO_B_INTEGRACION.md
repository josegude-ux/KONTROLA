# VISURA Centro de Mando — Icono B en iPhone

**Fecha:** 2026-10-27
**Rama de trabajo:** `fix/visura-centro-mando-icono-b-ios-20261027`
**Base original:** `visura-panel` en `4a286e67d3967576fe0868a1ee9c3685d31498ec`
**Estado:** configuración HTML y manifest preparados; **cinco PNG transferidos y verificados en GitHub** en `ab6c6618aa4b10cef0efe0ed79e9dfda11a890da`; **NO publicado** en `visura-panel`.

## Origen verificado

El diseño B aprobado se recuperó en la Biblioteca del proyecto y se materializó localmente. Original: `VISURA_CENTRO_DE_MANDO_ICONO_DEFINITIVO.png`, 1024×1024, modo RGB, SHA-256 `45890808fada6590d90a925c06139d4ea860d1ff37423835f71dce801c75ab2e`. El nombre que deberá ocupar en GitHub es `VISURA_CENTRO_DE_MANDO_ICONO_ORIGINAL.png`.

## Recursos generados y hashes SHA-256

En `docs/assets/icons/` **ya están incorporados** los cinco archivos derivados del PNG aprobado, originalmente preparados también en un ZIP local:

| Archivo | Resolución | SHA-256 |
| --- | --- | --- |
| VISURA_CENTRO_DE_MANDO_ICONO_ORIGINAL.png | 1024×1024 | 45890808fada6590d90a925c06139d4ea860d1ff37423835f71dce801c75ab2e |
| apple-touch-icon.png | 180×180 | 211438c00b140589752e2e154e0de52a2935537691febd45d672035ced0f77c4 |
| favicon-32x32.png | 32×32 | bf54f4961257ea6d26e19df22a85add04a89f4f1d2d74623d88dc7850df7bd9a |
| icon-192.png | 192×192 | ace502eb4aec8124c316defb9457b1812c913a4adbcb09cf79e57c38297e9409 |
| icon-512.png | 512×512 | d10b06cfd6ed0eb8cf38c4d4e272f1a48941521b9df95bd4e261faaccdf3bb47 |

## Cambios limitados de código

- `docs/index.html` y `docs/VISURA_ORDENES.html`: enlaces adicionales a apple-touch-icon, favicon de 32 px y manifest; metadatos para iPhone. Sin cambios en formularios, prompts, estilos, scripts ni instrucciones.
- `docs/manifest.webmanifest`: PWA standalone, título corto VISURA MANDO, iconos de 192/512 px.
- Se conserva el favicon previo de 64 px como alternativa.

## Transferencia binaria resuelta

Se transmitió cada PNG mediante una copia temporal Base64 de sus bytes originales; GitHub creó blobs con `encoding=base64`, se verificaron los cinco SHA-1 Git frente a `git hash-object` local y se incorporaron juntos mediante Git Data API (árbol + commit + actualización de la rama protegida por `expected_sha`). **No se regeneraron iconos, no se cambió `visura-panel` ni `main`.**

| Recurso | Git blob SHA-1 comprobado |
| --- | --- |
| VISURA_CENTRO_DE_MANDO_ICONO_ORIGINAL.png | `7a7c998d8337324cc6835348b7501dde0dee9655` |
| apple-touch-icon.png | `1bc13b9407933b163bf887d1611a6510f1e872ca` |
| favicon-32x32.png | `533e27bb57195d4c73785cdd0d368a60251f042d` |
| icon-192.png | `a469e88898d4f2b8cdcb53473c42d7e7af9d7a26` |
| icon-512.png | `791f76cc5dc1dc86534dd63f5435062edf9f39f6` |

Comprobado en el árbol GitHub: los cinco archivos y sus tamaños exactos coinciden; se conserva además el antiguo favicon de 64 px. Las pruebas estáticas compararon ambos HTML frente a `visura-panel`: las únicas diferencias de código son las cinco líneas de metadatos/iconos del `<head>`, se conservan `id=funcion-1` hasta `id=funcion-10`, los botones de copia y la orden 10 íntegra. Manifest JSON válido con iconos 192/512 y `short_name=VISURA MANDO`. **Pendiente:** HTTP 200/Content-Type comprobado en servidor web externo, pruebas visuales Safari/iPhone y autorización para actualizar `visura-panel`.

## Siguientes actuaciones

1. Los cinco PNG **están subidos y los SHA Git comprobados**; mantenerlos sin modificaciones de diseño.
2. Revisar las rutas externas de todos los recursos con HTTP 200/Content-Type real, y complementar la revisión estática con pruebas interactivas de 01–10 en navegador si es posible.
3. Obtener autorización independiente para integrar los cambios mínimos en `visura-panel`; no publicar ni fusionar sin ella.
4. Una vez publicada la versión autorizada, reinstalar acceso directo desde Safari para vencer la caché y comprobar en iPhone real que muestra el icono B.

**No fusionar ni publicar**; no tocar Supabase, otros proyectos ni `main`.
