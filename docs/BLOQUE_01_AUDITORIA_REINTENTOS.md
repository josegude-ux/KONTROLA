# VISURA PREPARA — Bloque 01 · Auditoría de reintentos de PDF

**Fecha:** 27/10/2026.
**Rama:** `feat/visura-prepara-b01-auditoria-reintentos-20261027`.
**Base SHA:** `8e63ca63270baa90b96e78e90ef819011f6c64fa` (PR #62 importación PDF individual; PR #52 F/C subyacente).
**Estado:** propuesta funcional en código/SQL y pruebas aisladas, NO aplicada a Supabase.

## Comparación con el comportamiento anterior
- Ya existía deduplicación por SHA-256 en `kontrola_importaciones.documento_hash`. Las peticiones repetidas devolvían `repetida=true` sin crear nuevos documentos.
- Faltaba evidencia persistente de cada solicitud repetida con el nombre presentado por Administración.
- La tabla `kontrola_importacion_eventos` ya existe y conserva actor y fecha. No se crea una tabla adicional.

## Implementación limitada
- Archivo: `supabase/proposals/kontrola_auditoria_reintentos_b01.sql`. Propuesta de sustitución de la función existente `kontrola_reservar_importacion`. Añade solamente una inserción de evento `reintento_importacion` en la rama que recibe un hash ya conocido **de la misma carga**.
- El evento guarda identificador de importación, actor autenticado, fecha del servidor, código solicitado, nombre del archivo, tamaño y hash. No copia ni altera el PDF y no modifica el estado documental.
- Continúan vigentes los controles de administrador, los límites de tamaño y las restricciones de hash/identificación.
- Prueba SQL `tests/integration/import-attempt-audit.sql`: compara número de eventos antes/después, verifica que no se duplican importaciones y que un operario no puede reservar.
- `tests/integration/run.sh` carga esta propuesta **solo con** `KONTROLA_TEST_REINTENTOS=1`. Sin esa variable, la secuencia habitual no cambia. La salvaguarda de base `kontrola_test` y PGHOST local sigue vigente.
- Workflow exclusivo `.github/workflows/visura-prepara-b01-reintentos-ci.yml`: Node y PostgreSQL 16 temporal sin acceso a Supabase empresarial.

## Limitaciones
- Las solicitudes con hash conocido pero código de carga **distinto** siguen bloqueadas. No pueden auditarse persistentemente mediante una inserción seguida de `RAISE EXCEPTION` en la misma transacción, porque el rechazo revierte las escrituras; requerirían una vía de auditoría independiente. No debilitar esta protección.
- Los documentos sin código LP válido aún no se admiten como borradores duraderos. El campo `kontrola_importaciones.codigo` exige un LP válido y la RPC protege dicho contrato. Habilitarlos exige un diseño de estado provisional independiente, permisos, política de promoción y pruebas aisladas; no fingir que están implementados.
- No se han modificado los flujos de Preparación/Verificación, información de palets, Business Central ni el Bloque 02.

## Próximo paso
Revisar GitHub Actions sobre el HEAD, corregir cualquier error, documentar el resultado y dejar PR en borrador separada de #61/#60. Después continuar con el diseño/implementación incremental de borradores sin identificación solo si se puede probar su aislamiento y la preservación de originales; no ejecutar SQL ni modificaciones de datos reales.
