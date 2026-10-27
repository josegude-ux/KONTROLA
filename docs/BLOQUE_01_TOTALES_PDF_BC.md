# VISURA PREPARA — Bloque 01 · Total PDF original y cantidad operativa validada con BC

**Fecha:** 27/10/2026. **Rama:** `feat/visura-prepara-b01-totales-bc-auditados-20261027`.
**Base:** `0b9d02a1d7b89444a14f0f00b4bc2850ad2ac6c9` (PR #68), enlazada a PR #66/#65/#64/#63/#62 sin fusionarlas.
**Estado:** propuesta SQL y frontend de revisión, **NO aplicada a ningún servidor productivo**.

## Problema real
El usuario aprobó poder corregir cantidades en VISURA después de contrastarlas con Business Central incluso si el PDF original contenía el dato equivocado. El formulario de PR #68 documenta la corrección, pero la RPC existente exigía `declared_total == actual_total`, bloqueando todos los casos de PDF de origen erróneo.

## Regla aprobada y solución
- `declared_total`: **total del PDF original**, que permanece intacto y no se sustituye.
- `actual_total`: **cantidad operativa validada** tras correcciones manuales documentadas con BC, que debe cuadrar con la suma exacta de artículos.
- `productos[].pdfOriginal.qty`: la cantidad que constaba en la lectura del PDF, nunca se sobrescribe al corregir.
- `kontrola_importaciones.correcciones` y `kontrola_carga_revisiones.correcciones`: historial por línea con valor anterior/posterior, autor, fecha, motivo `dato_pdf_bc` y justificación.
- La discrepancia de totales pasa de error a **advertencia** solo si existe una corrección final coincidente con la cantidad operativa, que conserve el valor original del PDF y documentación BC. Una corrección de lectura sin justificación BC no permite saltarse el total documental.
- Guardar revisión y Publicar son **dos acciones administrativas distintas**. El servidor revisa el contrato de cifras y justificantes; no se publica desde el mero cambio del formulario.
- La documentación y PDF originales permanecen accesibles y no se produce sincronización automática con BC.

## Código propuesto
- `src/document-review.mjs`: `hasDocumentedBCQuantityOverride` clasifica una discrepancia justificada como `warning`; sin prueba continúa siendo `error`.
- `supabase/proposals/kontrola_total_bc_documentado_b01.sql`: transacción de reemplazo exclusivamente de dos RPC (`kontrola_corregir_importacion`, `kontrola_publicar_importacion`) y helper interno que revisa correcciones/auditoría de cantidad. Se preservan otras protecciones existentes, como rol administrador, validez de referencias, cantidad, unidad y almacén, historial, bloqueo de sustitución tras inicio y ausencia de autopreparación.
- `tests/integration/bc-total-difference.sql`: caso de prueba con carga ficticia, rechazo de evidencia insuficiente, conservación del total PDF, prueba de rechazo de alteración del total original, publicación autorizada bajo documento validado y garantía de que no se inician Preparación ni Verificación.
- `tests/quantity-audit.test.mjs`: la corrección `dato_pdf_bc` sustentada se presenta como advertencia; `lectura_pdf` sin cuadrar sigue siendo error.
- CI `.github/workflows/visura-prepara-b01-total-bc-ci.yml` usa solo PostgreSQL efímero `kontrola_test` con `KONTROLA_TEST_TOTAL_BC=1`, además de Node.

## Controles aún pendientes
- No constituye verificación directa de los datos de Business Central; la evidencia es una declaración documentada y firmada operativamente por Administración.
- No sustituye validación visual real con usuarios, PDF de empresa ni revisión de seguridad antes de producción.
- No se ha modificado `supabase/migrations`; se emplea `supabase/proposals` con opt-in de prueba, sin despliegue.
- Los documentos identificados pero ya iniciados conservan el bloqueo de cambios materiales existente. No se desarrolla el recuento físico del Bloque 02.

**Próxima tarea:** comprobar CI del HEAD; corregir cualquier fallo; preparar PR borrador; realizar auditoría de compatibilidad de las PR derivadas antes de proponer integración, siempre sin fusionar.


## Protección adicional frente a Verificación iniciada
Al revisar el contrato de publicación se detectó que la protección heredada solo comprobaba `kontrola_preparaciones`. Como los flujos aprobados permiten iniciar Verificación **antes o después** de Preparación, la propuesta comprueba ambas tablas antes de sustituir cualquier documento de una carga ya publicada. Un inicio de Verificación sin preparación previa basta para bloquear la sustitución material.

La regresión `tests/integration/bc-total-difference.sql` crea una carga ficticia publicada, inicia únicamente su Verificación en la base temporal, intenta aprobar/publicar otra revisión del mismo LP y comprueba que la publicación se rechaza (SQLSTATE 42501), dejando intacto documento, hash y revisión anterior. No se usa ninguna carga real.

