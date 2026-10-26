# VISURA — Integración de icono aprobado B (Centro de mando)

**Fecha:** 2026-10-26
**Destino:** Centro de mando web, icono en pantalla de inicio iPhone y favicon
**Rama de preparación:** `feat/visura-centro-mando-icono-b-20261026`
**Rama web actual que no se ha modificado:** `visura-panel`
**Publicación:** NO realizada; NO fusionar hasta incluir los binarios y probar.

## Identidad y procedencia
- Imagen maestra hallada en la Biblioteca de ChatGPT: `VISURA_CENTRO_DE_MANDO_ICONO_DEFINITIVO.png` (PNG, 1024×1024, RGB).
- Usuario seleccionó la propuesta B definitiva; no se han generado ni rediseñado alternativas.
- SHA-256 del original: `45890808fada6590d90a925c06139d4ea860d1ff37423835f71dce801c75ab2e`.

## Trabajo realizado
- Derivados locales generados sin cambiar composición: `apple-touch-icon.png` (180×180), `favicon-32x32.png` (32×32), `icon-192.png`, `icon-512.png`.
- Se preparó un ZIP local de transferencia que contiene imagen maestra, cuatro derivados, `manifest.webmanifest`, hoja de instrucciones y página de previsualización.
- En esta rama aislada se añadieron referencias relativas a iconos y al manifest dentro de `docs/index.html` y `docs/VISURA_ORDENES.html`.
- Se añadió `docs/manifest.webmanifest`.

## Importante: estado PENDIENTE
**NO ESTÁ COMPLETA la integración en GitHub:** no se han podido enviar aún los archivos PNG binarios con la interfaz de herramientas disponible. Las referencias HTML a `./assets/icons/*.png` no encontrarán los ficheros en la rama hasta que se carguen. No utilizar esta rama como fuente de publicación sin completar este paso.

Archivos que faltan en GitHub (dentro de `docs/`):
- `assets/icons/VISURA_CENTRO_DE_MANDO_ICONO_ORIGINAL.png`
- `assets/icons/apple-touch-icon.png`
- `assets/icons/favicon-32x32.png`
- `assets/icons/icon-192.png`
- `assets/icons/icon-512.png`

Los binarios se encuentran preparados en el paquete local de la conversación actual; no se debe afirmar que el paquete está guardado en GitHub. No borrar ni alterar el icono anterior.

## Validaciones pendientes
1. Subir los cinco PNG al árbol `docs/assets/icons/` de ESTA rama sin tocar `main` ni `visura-panel`.
2. Verificar hashes/dimensiones de cada archivo y que las URLs devuelven 200.
3. Verificar HTML, manifest y ausencia de errores en consola.
4. Verificar legibilidad y aspecto en Safari, pantalla de inicio de iPhone y navegador de escritorio.
5. Solo con autorización adicional, proponer integración en `visura-panel` para que se refleje en el enlace público actual.

**Regla:** registro separado de estados: imagen aprobada = sí; derivados preparados = sí; referencias integradas en rama de prueba = sí; archivos binarios integrados en GitHub = NO; visualización publicada/verificada en iPhone = NO.
