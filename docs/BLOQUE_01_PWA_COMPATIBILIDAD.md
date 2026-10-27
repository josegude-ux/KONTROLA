# VISURA PREPARA B01 — Preflight PWA y recursos offline entre ramas

**Fecha:** 27/10/2026. **Estado:** validación de ramas de origen en GitHub Actions, sin integración, sin publicación y sin alterar instalaciones del usuario.

## Datos verificados

Las ramas fijadas de los flujos paralelos (PR #60), responsive (PR #61) y documental (PR #69) usan versiones y recursos PWA distintos:

| Línea | version.json | Caché service worker | Entradas de precaché |
|---|---|---|---:|
| Paralela | 0.3.44 | `kontrola-integral-visura-v077` | 43 |
| Responsive | 0.3.44 | `kontrola-integral-visura-v077` | 43 |
| Documental | 0.3.40 | `kontrola-integral-visura-v073` | 40 |

La rama responsive tiene cambios en `index.html` y `styles.css` frente a la paralela, aunque ambas tienen el mismo token de caché y la misma versión visible. Esta situación exige decidir el versionado final de la futura interfaz combinada, especialmente en modo offline; el service worker utiliza **red primero** en su estrategia de fetch, por lo que no se afirma que la versión online actual esté bloqueada.

## Falsa alarma depurada y comprobación real

El inventario de objetos Git mostraba ausencia de `vendor/pdf-lib.min.mjs` en las ramas paralela y responsive. **No es un archivo de origen perdido:** `scripts/build-vendor.mjs` lo genera con esbuild, y `.github/workflows/pages.yml` ejecuta `npm run build:vendor` antes de incluir la carpeta `vendor` en `dist`.

Para no confundir esta ausencia de archivo versionado con un fallo de publicación se añadieron:

- `scripts/preflight-b01-pwa.mjs`: distingue archivos presentes en Git, recursos explícitamente generados por build y recursos sin origen reconocido; compara caché, versión, HTML, CSS y módulos. Comprueba SHA fijos.
- `tests/preflight-b01-pwa.test.mjs`: clasifica con fixtures la diferencia entre falta real y generación en compilación, y detecta caché idéntica cuando la UI cambia.
- Un ensayo de GitHub Actions que ejecuta `git archive` del SHA exacto de PR #61 en un directorio temporal, instala dependencias bloqueadas, ejecuta `npm run build:vendor` y comprueba que el archivo `vendor/pdf-lib.min.mjs` generado existe, no está vacío y llega a `dist/vendor/pdf-lib.min.mjs`.

**Última CI confirmada:** [GitHub Actions #40510866461](https://github.com/josegude-ux/KONTROLA/actions/runs/40510866461) **SUCCESS** en jobs de inspección frontend/PWA y compatibilidad SQL cruzada. Mensaje de verificación `KONTROLA_B01_PWA_BUILD_OK`. No se ejecutó `deploy-pages`.

## Pendientes antes de una futura integración autorizada

1. No copiar `sw.js` ni `version.json` de una línea sin comprobar que representan el frontend final y el listado real de recursos.
2. Definir una única versión de caché para el resultado combinado; no incrementar una versión productiva durante esta auditoría.
3. Ensayar instalación y actualización PWA, incluida transición desde una caché anterior, y modo offline real en iPhone/tablet/escritorio autorizados.
4. Garantizar que la carpeta `vendor` generada se incluya en el artefacto, sin asumir que todos los archivos están versionados en Git.
5. Mantener la prohibición vigente de fusionar PR o desplegar sin autorización expresa.

**No se han tocado Supabase, Business Central, datos reales ni Bloque 02.**
