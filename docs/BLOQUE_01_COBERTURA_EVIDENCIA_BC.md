# VISURA PREPARA · Bloque 01 — Cobertura de evidencias BC por línea

**Fecha:** 27/10/2026. **Rama aislada:** `feat/visura-prepara-b01-auditoria-cantidades-completa-20261027`. **Origen verificado:** PR #69, SHA `13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf`.

## Defecto realmente reproducido

La función original `kontrola_total_bc_documentado(p_carga,p_correcciones)` devolvía `true` en cuanto encontraba **una única corrección BC válida** que coincidiera con su línea final. No comprobaba las demás líneas del mismo documento: una segunda fila con `qty` cambiado de 3 a 9 sin evidencia podía beneficiarse de la primera justificación. Se comprobó en el preflight aislado de PR #70 ([CI 40503733037](https://github.com/josegude-ux/KONTROLA/actions/runs/40503733037), evidencia adversarial explícita, no declaración de seguridad).

## Solución conservadora propuesta

- `supabase/proposals/kontrola_total_bc_todas_lineas_auditadas_b01.sql`: propuesta **solo de reemplazo del helper**, que la RPC administrativa existente de PR #69 ya utiliza. Sin nuevas tablas, grants a clientes ni alteraciones de las RPC, de documentos o de estados; requiere aplicar PR #69 previamente **solo en base temporal** para las pruebas.
- Revisa las líneas una a una. Cuando una línea tiene `pdfOriginal.qty` distinto del `qty` final, exige una corrección **de esa misma línea** cuyo `after` coincida con la cantidad final y documente `tipo` válido, `before`, autor con formato UUID, fecha y motivo suficientemente descriptivo. Nunca deja que una corrección ampare otra línea.
- Sigue admitiendo que en una misma revisión existan correcciones `lectura_pdf` y `dato_pdf_bc`; para relajar el desacuerdo `declared_total` frente a `actual_total` debe existir al menos una corrección final `dato_pdf_bc` justificada.
- `src/document-review.mjs` aplica la misma restricción funcional de revisión por línea antes de presentar la discrepancia como advertencia, para no confundir a Administración. Las RPC siguen siendo el control decisivo.
- Una evidencia antigua cuyo valor `after` ya no coincide con la cantidad final no sirve. Se rechazan correcciones sin autor, tipo o justificación válida.
- La publicación mantiene las protecciones existentes de autorización de administración, PDF original, suma total de productos, conservación de `pdfOriginal`, almacén F/C y bloqueo si Preparación o Verificación se ha iniciado.

## Verificación independiente

`tests/integration/b01-quantity-full-coverage.sql` compara escenarios de dos líneas: una sola corrección BC no ampara la otra; ambas con evidencia individual sí se aceptan; cambio de lectura combinado con BC; corrección obsoleta, sin tipo, sin actor o con justificación insuficiente. Después ejecuta RPC reales sobre un PDF y carga ficticios `LP26-95001`, primero sin segunda evidencia (permanece en revisión), posteriormente con ambas justificadas (aprueba/publica preservando cantidades originales). Verifica que no se inicia ninguna preparación ni verificación ficticia.

`tests/quantity-coverage.test.mjs` cubre la coherencia de la clasificación visual de advertencia/error, múltiples líneas y correcciones obsoletas.

La GitHub Action `.github/workflows/visura-prepara-b01-auditoria-cantidades-completa-ci.yml` ejecuta `npm ci`, `npm run check`, todas las regresiones documentales de PR #69 con `KONTROLA_TEST_TOTAL_BC=1` y demás propuestas opt-in, y finalmente aplica la propuesta de refuerzo **únicamente sobre `kontrola_test_quantity_coverage` en PostgreSQL 16 efímero**. No accede a Supabase ni a Business Central.

## Alcance real y limitación pendiente

**Este refuerzo cubre las líneas con `pdfOriginal.qty` presente y distinto de la cantidad corregida.** Como la función heredada recibe campos originados en el cliente, **no puede probar criptográficamente ni contra un registro inmutable que nadie haya eliminado `pdfOriginal` o alterado una línea antes de guardarla**. Para cerrar ese vector hace falta un contraste servidor contra una copia original inmutable derivada del PDF y una revisión explícita del circuito de reprocesamiento. No se debe declarar seguridad integral de documentos o aprobar producción solo con estos tests.

**Relación con PR #70:** el preflight de PR #70 permanece inalterado y documenta el defecto de la línea base PR #69. Esta rama ofrece la corrección como PR independiente; no debe sobrescribir la prueba adversarial ni hacer merge automático.

**Estado:** propuesta de software y ensayos temporales; sin merge, despliegue, modificación de permisos empresariales, cambios de datos reales o código del Bloque 02.

**Siguiente tarea segura:** revisar CI del HEAD actual, crear PR en borrador vinculada a PR #69 y dejar `docs/CONTINUIDAD.md` actualizado. Posteriormente estudiar en lectura el mecanismo de origen inmutable de líneas antes de ofrecer seguridad completa.
