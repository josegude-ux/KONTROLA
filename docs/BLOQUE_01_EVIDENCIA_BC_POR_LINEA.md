# VISURA PREPARA · Bloque 01 — Evidencia BC por cada cantidad modificada

**Fecha:** 27/10/2026 · **Estado:** propuesta sin aplicar a Supabase, sin fusionar, sin desplegar.

## Motivación y riesgo reproducido

Al realizar pruebas cruzadas entre PR #60, PR #61 y PR #69 desde el chat responsable del Bloque 01, se detectó que el predicado `kontrola_total_bc_documentado` admitía la diferencia global de cantidades si encontraba **al menos una** corrección `dato_pdf_bc` con justificación, aunque una segunda línea también estuviera cambiada y no tuviera evidencia.

El caso se reproduce mediante [la CI de auditoría 40503733037](https://github.com/josegude-ux/KONTROLA/actions/runs/40503733037), exclusivamente contra PostgreSQL temporal. El test de auditoría identifica el fallo **de la propuesta original**; un CI SUCCESS de esa auditoría no significa que la propuesta sea segura.

## Solución propuesta aislada

Rama `feat/visura-prepara-b01-evidencia-por-linea-20261027` basada exactamente en `13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf` de PR #69.

- **`supabase/proposals/kontrola_bc_evidencia_por_linea_b01.sql`:** revisa solo funciones propuestas, sin ejecutar una migración real. `kontrola_total_bc_documentado` exige evidencia por **cada** elemento que presente una cantidad final distinta de `pdfOriginal.qty`, y exige que cada justificación coincida con el índice y la cantidad final de esa misma línea. Si una línea carece de prueba, el total deja de estar aprobado y la discrepancia sigue siendo bloqueante.
- **Origen anclado al registro previo:** `kontrola_bc_origen_preservado` verifica, para las excepciones BC, que `pdfOriginal.qty` coincida con la cantidad original guardada en `kontrola_importaciones.carga_datos` (o con el origen ya preservado en una corrección anterior), y rechaza cantidades cambiadas sin valor de origen. Los PDF originales no se editan.
- **RPC de revisión:** `kontrola_corregir_importacion` mantiene la restricción administrativa y exige que el total original declarado permanezca intacto; el anclaje adicional se aplica cuando se presenta una excepción BC documentada. Las otras modalidades de revisión no se someten innecesariamente a ese guard añadido.
- **Cliente:** `src/document-review.mjs` utiliza el mismo criterio de evidencia por línea para determinar si una discrepancia de totales es advertencia o error.
- **Sin cambios de flujo operativo:** sigue siendo necesaria la revisión/confirmación de Administración; no se inicia Preparación, Verificación, paletaje ni picking por esta propuesta. La protección de una carga iniciada de PR #69 permanece vigente.

## Ensayos en PostgreSQL 16 y Node

`tests/quantity-every-line.test.mjs` comprueba errores/advertencias para dos líneas, evidencia faltante, cantidad final distinta, justificación corta y tipos de corrección incorrectos.

`tests/integration/bc-evidence-every-line.sql` comprueba:
1. Dos cantidades BC corregidas con una sola prueba se rechazan.
2. Ambas cantidades con evidencia independiente se aceptan.
3. El origen PDF inventado o cambiado entre revisiones se rechaza.
4. La alteración del total original impreso se rechaza incluso si no se presenta excepción BC.
5. Las RPC con una carga ficticia de dos referencias conservan originales y publican solo tras justificar las dos.
6. Sin cambios de datos empresariales ni acceso al servidor real.

La CI `.github/workflows/visura-prepara-b01-evidencia-linea-ci.yml` ejecuta `npm run check` y la suite SQL documental histórica antes de aplicar esta propuesta al PostgreSQL 16 efímero `kontrola_test_bc_linea`. No aplica SQL fuera del ejecutor.

**Resultados confirmados:**
- [CI 40504781871](https://github.com/josegude-ux/KONTROLA/actions/runs/40504781871): SUCCESS, primera prueba completa.
- [CI 40505070832](https://github.com/josegude-ux/KONTROLA/actions/runs/40505070832): SUCCESS, incluyendo ataques al origen y total PDF mediante la RPC.
- [CI 40505194781](https://github.com/josegude-ux/KONTROLA/actions/runs/40505194781): SUCCESS, tras limitar el guard nuevo a correcciones BC.

## Limitaciones y siguiente tarea

El servidor todavía depende de datos del parser enviados por un cliente autorizado y de correcciones con metadatos de autor/fecha que deberán ser auditados antes de producción. La función no reemplaza una verificación humana de BC ni pretende certificar todas las propiedades de seguridad del flujo documental.

La propuesta SQL se deberá **ordenar y reconciliar** con `kontrola_prepara_verificacion_paralelas.sql` y `kontrola_total_bc_documentado_b01.sql` en una integración posterior autorizada; las propuestas originales pueden redefinir la misma RPC si se aplican en orden incorrecto. Las pruebas de frontend integrado, dispositivos reales y perfiles autenticados siguen pendientes.

**No se han fusionado PR, alterado Business Central, ejecutado migraciones reales, cambiado permisos productivos ni desplegado.**
