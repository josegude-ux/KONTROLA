# VISURA PREPARA · Bloque 01 — Matriz de conservación antes de integrar ramas

**27/10/2026 · Propuesta documental, NO autorización para integrar.**
**Orígenes auditados:** PR #60 (`18c46b0c742bae9321f08603da40dfd1e7d76323`), PR #61 (`d66ecad37a13c3af6dafe2463236a1e2b874f77a`) y PR #69 (`13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf`).
**Hallazgo reproducible:** cada contraste de línea paralela/responsive contra línea documental presenta **17 archivos modificados por ambos lados** respecto al ancestro común. Un archivo modificado por ambas líneas no supone necesariamente conflicto textual, pero sí exige revisión de conservación. La matriz de abajo no predice cómo resolver un merge ni autoriza ejecutarlo.

| Archivo coincidente | Conservar explícitamente | Verificación necesaria en una integración futura |
|---|---|---|
| `docs/CONTINUIDAD.md` | Registros y decisiones de todos los responsables; no descartar documentación de ninguna rama | Comprobar que ambas historias y SHA/PR quedan trazadas |
| `index.html` | Navegación paralela sin reloj ni espera de preparación; bandeja provisional en Administración y formularios | Semántica, IDs DOM únicos, todos los accesos y contenidos sin desbordamiento |
| `package.json` | Scripts y dependencias necesarios para ambas suites; no reinstalar versiones arbitrarias | `npm ci`, `npm run check`, pruebas de CI de ambas líneas |
| `package-lock.json` | Integridad con el `package.json` autorizado; nunca resolver manualmente sin revalidación | Instalación determinista sin errores y sin cambios de dependencias imprevistos |
| `src/admin.mjs` | Importación manual PDF por fichero con errores aislados, hash, originales, provisionales, evidencia de correcciones | Revisión completa de importación, publicación, permisos y recuperación de borradores |
| `src/app.mjs` | Preparación y Verificación independientes; verificador distinto del preparador; sin picking duplicado BC ni cronómetros | Tests de estados simultáneos y de un solo preparador, sin alterar Bloque 02 |
| `src/config.mjs` | Variables y contrato de entorno autorizados, sin volcar credenciales | Revisión de claves y configuraciones, sin activar producción |
| `src/core.mjs` | Interpretación PDF F/C y compatibilidad con nomenclatura histórica, sin inventar LP | Test de PDFs sintéticos, código LP, fecha, almacén y cantidades |
| `styles.css` | Layout ancho real en escritorio, tablet según orientación y móvil táctil; bandeja/cantidad visibles y A4 estable | Chromium escritorio 1440/1920, tablet 768/1024, móvil 320/390, sin overflow y revisión de impresión |
| `sw.js` | Política de actualización PWA/caché existente, sin borrar datos o dejar código antiguo | Comprobación de recursos, versión y actualización segura en ambiente de pruebas |
| `tests/filename-convention.test.mjs` | Compatibilidad de identificadores LP y nomenclatura de PDF F/C | Regresión de identificación y clasificación por almacén |
| `tests/integration/run.sh` | Ambos conjuntos de SQL temporales, sin aplicar ninguna propuesta a Supabase real | Diseñar secuencia en `kontrola_test`, ejecutar suites de paralelismo y documentos sin omitir ninguna |
| `tests/navigation.test.mjs` | Comportamiento del menú y accesos de cada área | E2E autenticada de Administración y Operarios en entorno autorizado |
| `tests/palet-viabilidad.test.mjs` | Palets solo informativos durante Preparación; mecánica física queda en diseño | Test de ausencia de cierre/recuento de palets o picking VISURA |
| `tests/print-pdf.test.mjs` | PDF original intacto, impresión A4 y hojas procesadas independientes | Pruebas de regresión PDF generado y render A4 en dispositivo autorizado |
| `tests/visura-menu.test.mjs` | Identidad visual y menú con bloques completos, sin iconos/textos restaurados de estados obsoletos | Contrato DOM, a11y y prueba de navegación móvil/ordenador |
| `version.json` | Versionado coherente con el último estado autorizado; no adelantar versión productiva | Coherencia caché/PWA/release, sin desplegar |

## Invariantes funcionales transversales

- Solo una persona prepara cada carga; el verificador es diferente; Preparación y Verificación avanzan de manera independiente desde la publicación.
- No generar picking ni operaciones duplicadas de Business Central; el contraste documental se declara manual.
- Original PDF persistente/inmutable; borrador identificado con su hash, permisos restringidos y estado no publicable hasta revisión y acción explícita de Administración.
- Una corrección de cantidad conserva `pdfOriginal.qty`, actor, fecha, motivo y evidencia BC. El total PDF declarado nunca se sustituye silenciosamente por el total operativo.
- La nueva revisión documental no puede sustituir una carga cuya Preparación **o Verificación** se hayan iniciado.
- El paletaje sigue siendo exclusivamente informativo en Preparación; ninguna mecánica detallada de recuento físico del Bloque 02 se incorpora durante esta fase.

## Orden orientativo para una fase futura autorizada

1. Obtener nuevamente SHA/HEAD y comparar los cambios recientes de los responsables. Detenerse si cualquier rama ha avanzado o existe modificación ajena no documentada.
2. Elegir **solo tras autorización** una estrategia de integración, con rama de pruebas no productiva y responsable único. No sobrescribir ni actualizar ramas de origen.
3. Conservar explícitamente los contratos de los 17 archivos, versionado y documentos; validar la integridad de dependencias.
4. Validar SQL en PostgreSQL temporal con pruebas de simultaneidad, RLS, duplicados, PDF privados y bloqueo de publicación. No usar Supabase real.
5. Validar frontend real resultante con roles de prueba, importación sintética, menús, escritorio/tablet/móvil, impresión y PWA.
6. Documentar resultados/bloqueos en continuidad. Toda fusión de rama, despliegue y modificación de datos requiere permisos expresos independientes.

**Estado actual: AUDITADO PERO NO INTEGRADO.** Esta matriz es una guía de conservación y prueba, no una orden de ejecutar la integración.
