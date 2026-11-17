# VISURA PREPARA · Descarte lógico de cargas no controladas · Fase 1 (modelo y propuesta)

**Proyecto:** VISURA — DESARROLLO Y COORDINACIÓN · **Módulos:** 200 coordinación / 15 ALMACÉN · **Versión documental:** F1-R1.  
**Orden existente:** VISURA-15-AUDITORIA-RECUPERACION-001 · **Matriz:** VISURA-00-AUDITORIA-RECUPERACION-001 · **Distribución:** VISURA-00-DIST-F2-001.
**Base publicada recuperada:** KONTROLA \`cursor/verificacion-fisica-cargas-8ba0\` @ \`d96bc7caee24837186db79cdbd7cd3e7f6c19433\` (version.json 0.3.48).
**Desarrollo:** rama aislada \`lab/prepara-descarte-fase1-20261117\` · sin incorporación a la PWA, sin SQL ejecutado.

## Antecedentes y separación de contratos

- Registro central, variante *PREPARA · retirada lógica reversible* de módulo 15 (16/11): delta con CAS/revisión/opVersion/hash, motivo, recibo/idempotencia, D26 reimportación, D27 cargas anteriores, D28 PDF histórico, D29 métricas. CP036 original: https://drive.google.com/file/d/1l-HeGQycbH9i7Y7eN0W63WuA-RYv80Z8/view. Estado del antecedente: **propuesto, no ejecutado**. No crear orden funcional nueva.
- \`supabase/migrations/20261031_kontrola_archivo_logico_seguro.sql\` contiene un **archivo lógico distinto de registros operativos \`kontrola_cargas\`**, condicionado por verificaciones finalizadas y plazos de 90 días. No reutilizar la RPC \`kontrola_cambiar_archivo\` ni cambiar dicha política: aquí se solicita apartar de la *lista local de Verificación física* cargas **no comprobadas** sin tocar la operativa ni BC.
- \`control-cargas-prueba3.html\`: \`control_cargas_prueba_integrada_2\`+\`scope\` en localStorage; \`date\` extraída del PDF, \`importedAt\` de importación local, \`id\` LP. Los PDF y versiones están en IndexedDB \`control_cargas_originales_prueba_integrada_2\`+\`scope\`, almacén \`originales\`.
- \`src/control-cargas-checklist.mjs\`: revisión local en \`visura_control_revision_v1\`+\`scope\`; \`review.lines\`, \`review.audit\`, \`closedAt\`, \`sourceSignature\`. \`markLine\`, \`saveReview\`, \`closeReview\` intactos.
- \`src/prueba3-tiempos.mjs\`: cola/caché \`visura_p3_tiempos_\`+\`scope\` sin prefijo \`_visura_\`; copia/tiempos de PRUEBA_3 en Supabase **no sincronizan** por sí mismos las revisiones locales. No se han consultado datos empresariales.
- Perfil autenticado \`kontrola_mi_perfil\`: \`administrador\` / \`operario\`, \`activo\`; para futuro descarte se prevé exclusivamente **administrador**, con control autoritativo en servidor cuando exista RPC. El modelo cliente no acredita seguridad por sí solo.

## Esquema de estado propuesto (independiente de la lista importada)

Clave local propuesta: \`visura_prepara_descarte_v1\` + \`_visura_{24hex}\`. Dentro: objeto \`{schema:1,scope,items:{"LP26-0001":record}}\`. Identidad actual: LP dentro del \`scope\` de usuario; para sincronización futura verificar unicidad y utilizar clave autorizada \`(almacen, codigo LP)\` o equivalente real, no asumir alcance global del LP.

Cada entrada de \`items\`:
- \`estado_descarte\`: \`activa\` o \`descartada\` (existentes: \`activa\`).
- \`descartada_en\`: ISO de servidor al ejecutar, \`null\` si nunca descartada.
- \`descartada_por\`: ID estable del usuario autorizado, \`null\` en activas.
- \`motivo_descarte\`: texto corto opcional, \`null\` en activas.
- \`progreso_al_descartar\`: objeto \`{total,checked,pending,incidents,revision_actualizada_en}\`, \`null\` hasta ejecutar.
- \`version_descarte\`: entero monotónico no negativo; futuro CAS.
- \`historial_descarte\`: eventos de descarte/restauración con ID idempotente, fecha, actor y código; en F1 permanece vacío.

**Importante:** el estado se guarda en un ledger separado para evitar que \`revised(old,incoming,...)\` de PRUEBA_3 lo sobrescriba al reimportar. La proyección visible de cada carga suma los campos del ledger; el parser y la fuente PDF no se modifican. En fase 1 solo existe la proyección y propuesta de migración; **no está enlazada a importación, filtrado o interfaz**.

## Migración local aditiva y reversible — PLAN, NO EJECUTADO

1. Autenticar perfil, validar ámbito, verificar no existen LP repetidos, revisar identidad almacén/LP y cotejar revisión/sourceSignature. En caso de conflicto, **abortar**.
2. Antes de cualquier escritura: generar respaldo completo por ámbito con \`prepararCopiaIntegra\` y comprobarlo con \`comprobarCopiaIntegra\`, conservar copia recuperable fuera del terminal; documentar SHA-256, versiones PDF, conteo de cola e incidencias. Si falta un PDF, se supera el límite de memoria o no es posible acceder a IndexedDB sin crear bases, **NO GO**. La exportación real y su restauración deben probarse con datos ficticios y Safari antes de usar datos reales.
3. \`prepararMigracionLocal\` genera solo una **vista previa inerte**, no modifica storage. Agrega entradas \`activa\` para LP nuevos; preserva por completo las anteriores, incluso LP ausentes del último importador; detecta duplicados y aborta sin cambios.
4. Fase posterior, **solo con autorización específica:** almacenar el ledger de un ámbito de forma atómica en una escritura, comprobar readback/hash y conservar el previo. Recuperación: restaurar bytes exactos del backup, o volver al ledger anterior **solo si** se demuestra ausencia de eventos posteriores; jamás borrar revisiones, PDF o historial.
5. No reactivar \`descartada\` por reimportación. La lógica de recuperación manual y la operación por lotes corresponden a F2/F3; no implementadas aquí.

**No se ha aplicado migración local ni remota.** El código de F1 no contiene llamadas a \`storage.setItem\`, cambios de SQL, ni registro automático de la función.

## Propuesta de modelo remoto Supabase (borrador sin ejecutar)

**No generar todavía una migración ejecutable en \`supabase/migrations\`**. Falta validar con 215: estructura real de \`visura_p3_cargas\`, ámbito de autorización y unicidad LP/almacén; compartir carga entre usuarios exige permisos server-side y no se obtiene de un hash de usuario local.

Si 000/15 aprueban y se confirma esquema real, preferir una tabla aditiva propia **\`visura_prepara_descartes\`** (nombre sujeto a revisión) con:
- Clave autorizada \`(almacen,codigo)\` o clave externa estable comprobada; \`estado_descarte\` text CHECK activa/descartada default activa; \`descartada_en\` timestamptz; \`descartada_por\` uuid; \`motivo_descarte\` varchar limitado; \`progreso_al_descartar\` jsonb; \`version_descarte\` bigint; \`actualizada_en\` timestamptz. Preservar referencia al original y evitar ON DELETE CASCADE.
- Eventos **append-only** con \`operacion_id\` único/idempotente, actor servidor, sello UTC, LP, antes/después, cantidad de lote, motivo y versión. No modificar existencias ni \`kontrola_cargas\` ni BC.
- RLS activada, acceso revocado por defecto, lectura por almacén autorizado y escritura exclusivamente mediante RPC SECURITY DEFINER protegida por \`auth.uid()\`, \`kontrola_es_administrador()\`, \`kontrola_puede_almacen()\` y controles de esquema/propietario ratificados. No usar políticas permisivas; comprobar search_path.
- Para el lote F3: una sola transacción RPC que compruebe **todas** las cargas y versiones (incluidas \`closedAt\` y \`pending=0\`), bloquee filas con orden fijo, aplique todas o ninguna, registre eventos una sola vez. Si hay conflicto o timeout de ACK, consultar recibo antes de reintentar. Retirada/restauración no altera revisión ni su audit.
- Si hay un registro local descartado y la fuente remota aún no existe, **no afirmar sincronización**; resolver migración por conflicto y recibo.

**Regla obligatoria:** no ejecutar DDL, migración de datos, actualización RLS, permisos ni publicaciones sin autorización separada del usuario y copia verificada.

## Fases posteriores (NO autorizadas por esta F1)
- **F2** importación: impedir reactivación por LP; no modificar datos de preparación o BC.
- **F3** operaciones: atomicidad lote, restauración, auditoría, administrador y preservación del progreso.
- **F4** UI: móvil, safe areas, modo oscuro y controles táctiles sin tocar cabecera/tarjetas.
- **F5** pruebas de regresión específicas, iPhone/390x844/375x667, versión visible, SW, entrega/publicación solo con autorización.

## Limitaciones F1
- El módulo de copia **no se ejecuta por sí solo** ni descarga archivos; la UI de exportación/importación real sigue pendiente de diseño/consentimiento.
- \`indexedDB.databases()\` se exige para evitar crear DB accidentalmente al explorar: verificar soporte en Safari real; si no existe, diseñar alternativa de solo lectura.
- No se ha probado restauración real, integridad de exportaciones grandes ni uso en iPhone.
- Los datos remotos Supabase deben respaldarse separadamente por su administrador; esta preparación cubre solo el ámbito local.
- No hay operación real de descarte, cierre ni actualización visual. PWA publicada conserva versión 0.3.48.

**Siguiente paso:** obtener autorización F2 solo tras revisar evidencia y bloqueos; no actuar automáticamente sobre el sistema real.
