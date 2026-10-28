# VISURA Centro de Mando — Función 11: Diagnosticar parada y reanudar
**Fecha:** 2026-10-28. **Responsable:** chat 03.1. **Estado:** implementado en rama aislada; no publicado, no fusionado.

## Auditoría y protección
Base: `visura-panel` @ `e8b4b177ee172b50ba0a96ee8f1d8819ce53344e`. Existe trabajo independiente sobre importador de chats en PR #73 (`feat/visura-centro-chatgpt-import-local-mvp-20261027`) que modifica estos mismos HTML: **no fusionar los dos PR automáticamente**; coordinar integración selectiva posterior. El PR #71 es solo diseño y #67 es icono B ya publicado mediante commit selectivo. `main` no interviene.

## Implementado
- Añadida opción **DIAGNOSTICAR PARADA Y REANUDAR** inmediatamente después de «CONTINUAR DESARROLLO» en el menú. Se mantiene numeración 01–10 y se crea función 11 con `#funcion-11`; navegación antigua y orden 01 intactas.
- Paso 1: orden diagnóstica A–J íntegra de solo lectura, editable por proyecto y responsable, copiable.
- Paso 2: análisis **determinista y orientativo** del texto pegado; extrae campos estructurados y clasifica A–I según indicios. Señala contradicciones y expresa incertidumbre. **No es lectura automática del estado de ChatGPT, no consulta GitHub ni diagnostica fallos internos.**
- Paso 3: estrategias y prompts realmente distintos para A–I; incorporan causa, certeza, hechos comunicados, último estado, tareas pendientes, operaciones no repetibles, permisos y verificaciones. El contenido pegado es **dato no confiable**, se muestra como texto y no se ejecuta.
- Paso 4: análisis orientativo de la respuesta de reanudación; distingue avance comunicado con/sin evidencia, bloqueo persistente, sin cambios; segundo diagnóstico solo con información nueva.
- Ambos botones de copia usan Clipboard API y fallback local para iPhone; copian el texto completo.
- No hay acceso a red, persistencia o almacenamiento de diagnósticos y prompts en el nuevo JS. El contenido dura mientras la página esté abierta; no se envía a servidores. El panel original conserva su comportamiento/almacenamiento existente.

## Archivos de esta rama
- `docs/index.html`, `docs/VISURA_ORDENES.html`: dos HTML idénticos, nuevos accesos, artículo #funcion-11, enlace CSS/JS y routing 11.
- `docs/visura-recovery.css`: estilo responsive aislado.
- `docs/visura-recovery.js`: clasificación y UI.
- `docs/test-recovery.js`: 21 pruebas unitarias sintéticas.

## Pruebas realizadas
- `node --check docs/visura-recovery.js`: correcto.
- `node docs/test-recovery.js`: 21/21 pruebas sintéticas correctas, incluidos A–I, contradicciones, orden A–J, prompts distintos, input malicioso, verificación fallida/exitosa no confirmada y bucles.
- Validación estática en GitHub: HTML idénticos, IDs 01–11, icono B conservado y orden 10 presente.

## Pendientes y límites
- Ejecutar y documentar pruebas **de interacción DOM real** en navegadores (desktop, móvil emulado), copiar contenido exacto, navegación y regresión del panel; verificar en Safari iPhone físico por separado.
- El clasificador **no sustituye** un modelo de lenguaje conectado ni la revisión real de pruebas/logs; su certeza es orientativa. Citas/evidencias son **comunicadas**, no verificadas. Una respuesta no prueba recuperación.
- PR en borrador sin merge. No publicar hasta revisión y autorización. Mantener separada la implementación de importación de chats de PR #73; resolver solapamientos antes de integrar.

## Verificación adicional de interfaz — 2026-10-28

- En banco de pruebas DOM con **Chromium headless** en tres viewports (390×844, 768×1024, 1440×900) se verificaron: abrir opción 11, generación de diagnóstico, copia exacta del texto completo, clasificación tipo B, construcción y copia exacta del prompt, introducir resultado fallido y mostrar bloqueo persistente. Sin errores JS de página ni desbordamiento horizontal en el banco de pruebas.
- Se añadieron 1 prueba unitaria por negación explícita «no hay error de streaming», evitando ese falso positivo: **21/21 pruebas** sintéticas superadas con Node.js.
- Limitaciones: el banco de pruebas contiene un armazón DOM local representativo; **no equivale a navegación del panel completo publicado**. No se verificó Safari/iPhone físico, ni todos los botones de las diez funciones antiguas con navegador real. La comparación estática asegura que su HTML y scripts permanecen intactos salvo navegación que incorpora la función 11.
- La clasificación sigue siendo heurística conservadora, no un modelo de lenguaje que pueda confirmar causas por sí mismo.
