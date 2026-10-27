# VISURA Centro de Mando — Icono B en iPhone

**Fecha:** 2026-10-27
**Rama de trabajo:** `fix/visura-centro-mando-icono-b-ios-20261027`
**Base original:** `visura-panel` en `4a286e67d3967576fe0868a1ee9c3685d31498ec`
**Estado:** configuración HTML y manifest preparados; binarios pendientes de transferencia a GitHub; NO publicado.

## Origen verificado

El diseño B aprobado se recuperó en la Biblioteca del proyecto y se materializó localmente. Original: `VISURA_CENTRO_DE_MANDO_ICONO_DEFINITIVO.png`, 1024×1024, modo RGB, SHA-256 `45890808fada6590d90a925c06139d4ea860d1ff37423835f71dce801c75ab2e`. El nombre que deberá ocupar en GitHub es `VISURA_CENTRO_DE_MANDO_ICONO_ORIGINAL.png`.

## Recursos generados y hashes SHA-256

En `docs/assets/icons/` deben incorporarse exactamente estos archivos, preparados en un ZIP local entregado en el chat (el ZIP NO es un archivo del repositorio):

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

## Bloqueo de integración

El conector GitHub acepta contenido de blobs como texto o Base64, pero no admite transmitir directamente un fichero binario del contenedor local por `source_file_ref` o ruta. Los cinco PNG están verificados localmente, sin demostrar aún su carga en GitHub. **No declarar HTTP 200, MIME correcto ni instalación real en iPhone antes de cargar y comprobar los binarios.**

## Siguientes actuaciones

1. Subir los cinco PNG del paquete a `docs/assets/icons/` de esta rama, comprobando nombres, tamaños y hashes; considerar las alternativas de transporte legítimas disponibles sin rediseñar la imagen.
2. Verificar HTML/manifest con todos los PNG y las rutas públicas, HTTP 200/Content-Type real y funcionamiento de 01–10.
3. Probar en Safari/iPhone real eliminando el icono gris anterior solo después de la publicación autorizada.
4. Cuando la rama esté completamente validada, solicitar autorización independiente para aplicar exclusivamente los recursos y las referencias a `visura-panel`.

**No fusionar ni publicar**; no tocar Supabase, otros proyectos ni `main`.
