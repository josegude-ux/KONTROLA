# VISURA PREPARA — Bloque 01 · Importación múltiple con errores aislados

**Fecha:** 27/10/2026
**Repositorio:** `josegude-ux/KONTROLA`
**Rama:** `feat/visura-prepara-b01-importacion-aislada-20261027`
**Base:** `9a48ce9cef6c9afd5f4e719dec83406103c0f7f6` (PR #52, importación F/C).
**Naturaleza:** funcionalidad aislada, no fusionada ni desplegada.

## Hallazgo comprobado
`src/admin.mjs` llamaba a `validarLotePdf` para **todos** los archivos antes de iniciar el bucle. Si un solo archivo tenía extensión/tipo o tamaño inválido, el lote completo se rechazaba, incumpliendo la decisión de tratamiento individualizado de errores en importaciones múltiples.

## Solución mínima
- `validarSeleccionPdf`: conserva prohibición de selección vacía y límite de veinte archivos.
- `validarArchivoPdf`: valida individualmente formato, tipo y tamaño, antes de analizar o reservar el documento.
- `validarLotePdf`: conserva contrato histórico estricto para otros consumidores. No cambia el comportamiento por defecto de la función ya existente.
- `src/admin.mjs`: usa validación de selección global al principio y validación de contenido por archivo **dentro del try de cada iteración**. Los siguientes documentos continúan procesándose; cada error queda listado en el resumen existente.
- Pruebas de regresión ampliadas: `tests/import-batch.test.mjs`.
- Workflow Node aislado `.github/workflows/visura-prepara-b01-import-ci.yml` para pruebas sin ningún dato real.

## Límites y compatibilidad
- Los PDFs originales no se modifican. No hay publicación automática.
- No se cambia la lógica F/C, el motor PDF, las RPC, las políticas RLS ni la detección de duplicados.
- Permanece un bloqueo seguro si la selección global excede veinte archivos o está vacía.
- Importaciones sin identificador LP **aún no generan borradores provisionales**: actualmente `processSinglePdf` lanza error antes de reservar. Habilitarlas requiere un contrato de almacenamiento/identificación seguro y revisión de SQL; no inventar identificadores ni modificar datos productivos.
- No se sustituye PR #52, que debe revisarse antes de cualquier integración conjunta con PR #60.
- Las pruebas automatizadas no equivalen a ensayo físico con Business Central o Supabase real.

## Siguiente paso exacto
Comprobar CI Node sobre HEAD, revisar rama y PR sin fusionar. Luego diseñar e implementar borradores de PDF no identificados en otra rama segura solo después de verificar las restricciones SQL y la compatibilidad con el historial documental, sin cargar datos empresariales.
