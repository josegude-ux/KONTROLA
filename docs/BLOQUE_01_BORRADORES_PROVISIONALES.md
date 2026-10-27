# VISURA PREPARA — Bloque 01 · Borradores provisionales no identificados

**27/10/2026 · Desarrollo aislado, no fusionado ni desplegado.**

- **Rama:** `feat/visura-prepara-b01-borradores-provisionales-20261027`.
- **Base:** `cac3294f7e0305b49bd3466643bcdfae15c6b0de` de PR #63, que deriva de PR #62 (importación por archivo) y PR #52 (lectura F/C).
- **No combinar automáticamente** con PR #61 (responsive) ni PR #60 (paralelismo).
- **Estado SQL:** propuesta `supabase/proposals/kontrola_pdf_provisionales_b01.sql`. No es una migración aplicada. Es obligatorio revisar seguridad y pruebas con la base de test antes de autorizar su eventual aplicación.

## Problema anterior
Las importaciones estándar requieren código `LPyy-nnnn...` no nulo. Un PDF cuyo código no se identificaba se rechazaba antes de reservar el original. No se debe inventar un LP a partir del nombre ni usar un código falso para sortear la restricción.

## Implementación incremental
1. Se crea una tabla **separada** `kontrola_pdf_provisionales`, con hash SHA-256 único, ruta privada derivada del hash y estados reservada/pendiente_identificacion/identificada. No está conectada a `kontrola_cargas` ni a procesos de Preparación/Verificación.
2. Solo Administración puede consultar los registros mediante RLS. Las escrituras únicamente las realizan RPC que verifican `auth.uid()` y `kontrola_es_administrador()`. Acceso a los PDF exclusivamente mediante políticas adicionales de Storage privado, sin alterar las políticas de cargas existentes.
3. Cuando el motor interpreta el contenido pero no obtiene LP verificable, o detecta ciertas contradicciones documentales de identificación, `src/admin.mjs` reserva un provisional, conserva el PDF sin `upsert` y registra los datos extraídos o el motivo. Los errores de PDF corrupto o de red no se convierten silenciosamente en provisionales.
4. Administración ve una bandeja con los originales, puede descargar cada PDF y contrastarlo con Business Central.
5. Para identificar, debe introducir **LP, almacén y evidencia de contraste manual** (mínimo 15 caracteres), más confirmación explícita. VISURA vuelve a interpretar el original desde el almacenamiento privado. Si no puede reconocer mercancía, mantiene el provisional pendiente.
6. La RPC `kontrola_identificar_provisional_pdf` realiza la promoción **en una transacción** a `kontrola_importaciones` con estado `revision_requerida`, conserva la misma ruta/hash del PDF, registra las correcciones y evidencia, y no crea una carga publicada. Se accede a la revisión administrativa habitual; allí continúan todos los hallazgos y controles de publicación ya existentes.
7. Se mantiene el bloqueo de ejecución hasta que exista una carga efectivamente publicada; no altera nunca la verificación física ni el picking de BC.

## Pruebas
- `tests/provisional-drafts.test.mjs`: contratos de UI y seguridad.
- `tests/integration/provisional-drafts.sql`: creación, original ausente, conservación, hash repetido, RLS para operarios, evidencia insuficiente, promoción atómica, auditoría e idempotencia.
- `tests/integration/run.sh`: `KONTROLA_TEST_PROVISIONALES=1` optativa, junto a `KONTROLA_TEST_REINTENTOS=1`. En uso habitual, estas propuestas no se ejecutan. La salvaguarda original `kontrola_test` y PGHOST exclusivamente local permanece.
- `.github/workflows/visura-prepara-b01-provisional-ci.yml`: CI con PostgreSQL 16 temporal y Node. Esperar confirmación del HEAD definitivo.

## Límites de esta fase
- No se ha verificado con PDF empresariales ni con datos/credenciales reales. Tampoco se han aplicado migraciones a Supabase.
- Documentos ilegibles o corruptos se registran como errores, no como cargas publicables.
- Los documentos provisionales siguen en almacenamiento privado, con recuperación administrativa. No se eliminan automáticamente.
- El formulario identifica la carga mediante evidencia manual introducida por Administración: VISURA no consulta ni escribe directamente en Business Central.
- No se resuelve en este bloque la mecánica de verificación física detallada del Bloque 02.
- **Nunca fusionar, aplicar SQL ni desplegar por efecto de esta propuesta.**

## Siguiente tarea
Confirmar que CI de SQL y Node supera el último commit y comprobar escenarios negativos de Storage/RLS, documento ya existente e identidad distinta. Completar una revisión de seguridad y probar en entorno de pruebas autorizado antes de declarar la funcionalidad operativa. Continuar con otros huecos pendientes de las decisiones 01–23 sin invadir otras ramas.
