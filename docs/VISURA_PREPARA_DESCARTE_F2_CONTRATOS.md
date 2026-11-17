# VISURA PREPARA · Fase 2 — Protección frente a reimportación

Proyecto VISURA — DESARROLLO Y COORDINACIÓN. Módulo 200 coordinación; módulo 15 ALMACÉN responsable funcional.
Orden existente VISURA-15-AUDITORIA-RECUPERACION-001. Matriz VISURA-00-AUDITORIA-RECUPERACION-001. Distribución VISURA-00-DIST-F2-001.
Checkpoint anterior CP010 https://drive.google.com/file/d/1-J5-htWCy-jS5fja8f5GWed9kHy0GI-o/view.
Base 46c78ee74f98a1f1f65a9aafb639be576c54454b. Solo rama lab/prepara-descarte-fase1-20261117. No aplicación real ni publicación.

## Contrato de identidad LP y auditoría

Única función normalizarLP en src/control-cargas-lp.mjs para importación, proyección del descarte y futuro contrato de restauración. Regla: pasar a mayúsculas, eliminar espacios ASCII, aceptar año de DOS cifras, guion opcional, número de 4 a 6 cifras, eliminar solo ceros redundantes del número y mantener al menos cuatro cifras. No inferir otros formatos. Si hay colisiones o formato desconocido, detener la operación.

Entrada => salida:
- LP26-21230 => LP26-21230
- lp 26 - 021230 => LP26-21230
- LP26-000123 => LP26-0123
- LP26-0000 => LP26-0000
- LP2621230 => LP26-21230
- LP2026-21230, LP26-123, LP26-1234567 => ERROR.

Consulta exclusivamente de LECTURA en proyecto Supabase existente control-cargas-movil, sobre las columnas codigo de kontrola_cargas y visura_p3_cargas, 17/11/2026: 45 LP; 45 códigos distintos; 45 canónicos distintos; 0 colisiones; un formato observado, LP26 con guion y cinco cifras; 0 desconocidos. No se pudo acceder a los registros EXCLUSIVAMENTE guardados en los móviles: alcance de verificación parcial.

## Protección implementada (solo código en rama sin publicación)

El importador PDF de PRUEBA_3 llama al adaptador local ANTES de la deduplicación por SHA-256, comparación de versiones y actualización de la carga. El adaptador usa el ledger de F1 separado del array de cargas. Si LP descartado y mismo hash del original o una versión posterior ya registrada: no toca cargas, revisiones, audit o PDF activo. Si cambia el SHA: guarda una COPIA adicional del PDF bajo LP::hash; registra huella y hora informativa del dispositivo como versión posterior pendiente de restauración; no reescribe la clave LP del PDF activo ni el snapshot/progreso anterior, y NO reactiva la carga. Si LP activo: conserva después del guard normal el comportamiento previo de importación.

Corrección aceptada tras CP011: un LP NUEVO sin registro ni copia puede importarse con AVISO e incidencia local; no se bloquea la importación entera. Solo se bloquea reactivación de LP ya existentes o afectados por divergencia entre copias, además de colisiones/formatos inválidos de su propio LP. Una divergencia en LP A no bloquea LP B. Copia del ledger en visura_prepara_descarte_cache_v1 + scope; incidencias locales en visura_prepara_descarte_incidencias_v1 + scope. Cuando el estado de descarte existe en una carga local, prevalece ante la indisponibilidad de copia. Si no se puede persistir la incidencia, el importador sigue bloqueando y devuelve el error.

La Fase 2 NO implementa la orden de DESCARTAR ni de RESTAURAR, los cambios de interfaz o el almacenamiento SQL. No se ejecuta sincronización Supabase desde el adaptador; no altera preparación/tiempos, verificación, cierre, recepción o Business Central. El preparador de backup de F1 incluye las nuevas claves de F2, pero la exportación real sigue pendiente y NO se ha ejecutado sobre datos del usuario.

## Corrección del modelo de F1 — autoridad y fotografía

F1 había diseñado descartada_en, descartada_por y progreso_al_descartar sin ejecución ni autoridad de servidor: esos campos NO acreditaban una identidad ni hora real. F2 documenta y formaliza el requisito de servidor: actor = auth.uid() y fecha = clock_timestamp() asignados por PostgreSQL; el dispositivo es un campo opcional informativo. Se añade el nombre explícito snapshot_progreso_al_descartar. La revisión viva no se altera al descartar ni restaurar.

Cambio específico de criterio solicitado por el usuario para F3: tanto OPERARIO como ADMINISTRADOR activos (y autorizados para el almacén) podrán descartar y restaurar. Esto sustituye la hipótesis inicial de F1 de administrador exclusivo. El cliente nunca tendrá autoridad por sí mismo: se comprueba de nuevo por RPC/RLS.

## Contrato remoto F3 — NO IMPLEMENTADO

Métodos previstos: consultarEstado(almacen, LP, version), registrarVersionPosterior(almacen, LP, sha, operacion), descartarLote(almacen, LP[], versiones, operacion, motivo) y restaurar(almacen, LP, version, operacion). Estado y comprobaciones requieren previamente sincronización autoritativa. Sin ella, la RPC rechaza el descarte.

SQL F2 con sincronización completa RETIRADO de la propuesta activa y conservado exclusivamente como histórico en docs/sql-no-ejecutar/HISTORICO_F2_REVISION_COMPLETA_NO_APROBADO.sql. F3A requiere solo snapshot resumen al descartar, sin RPC de subida de revisiones. Revisión de SQL completa y aprobación expresa pendientes.
Cinco tablas propias: verificacion_cargas_revisiones, verificacion_cargas_descartes, verificacion_cargas_operaciones, verificacion_cargas_eventos, verificacion_cargas_versiones_posteriores. Contiene RLS por almacén, RPC de revisión, descartar_lote, restaurar y registrar_version_posterior; actor y reloj de servidor, versionado CAS, auditoría append-only, idempotencia y transacción todo-o-nada. Es PROPUESTA sin aplicación ni comprobación de SQL sobre PostgreSQL de ensayo.

## Tabla comparativa de reglas

| Regla | Archivo KONTROLA existente | Descarte Verificación física |
| --- | --- | --- |
| Fuente | kontrola_cargas.archivado | verificacion_cargas_descartes |
| Estado requerido | CERRADA, verificación finalizada | NO CERRADA y con pendientes |
| Plazo | 90 días y sin dependencias/incidencias activas | Sin antigüedad obligatoria para la operación; UI futura sugiere días anteriores |
| Roles | Solo administrador | Operario y administrador activos y autorizados por almacén |
| Efecto | Archiva registro operativo KONTROLA | Oculta de la lista de verificación; no cambia operación/stock/BC |
| Lotes | RPC individual | RPC todo o nada, con versiones e idempotencia |
| Historial | Eventos de archivo/restauración | Eventos append-only con actor servidor, tiempo y snapshot |
| PDF/reimportación | Archivo operativo existente | LP descartado persiste, original inmutable y versiones posteriores aparte |
| Restauración | Revierte archivo operativo | Reactiva la lista, conserva progreso y revisión exactos |

Referencia existente: supabase/migrations/20261031_kontrola_archivo_logico_seguro.sql. NO reutilizar kontrola_cambiar_archivo ni modificar su contrato de 90 días.

## Proyecto de pruebas y puertas de seguridad

Proyectos Supabase accesibles a lectura: control-cargas-movil (operativo), INVENTA (otro proyecto), control-tanques-staging (TANQUES, inactivo). NO EXISTE PROYECTO DE ENSAYO CONTROL DE CARGAS acreditado: no aplicar SQL allí ni en cualquier otro por similitud. La CI actual utiliza PostgreSQL efímero para pruebas, no equivale a migrar datos reales.

Pruebas DB de permisos PREPARADAS para F3 y NO ejecutadas sobre la propuesta SQL: anónimo sin sesión NO; operario activo autorizado SÍ; administrador activo autorizado SÍ; usuario inactivo/no autorizado NO; identidad/fecha inyectadas NO; UPDATE/DELETE del audit NO; lote con una cerrada/totalmente comprobada -> rollback TODO; concurrencia CAS; retry mismo operation_id -> mismo recibo, ID con payload diferente -> error; restauración sin mutación de progreso; PDF nuevo no reactiva.

## Orden y alcance

Se conserva VISURA-15-AUDITORIA-RECUPERACION-001 porque es la orden técnica vigente de PREPARA ALMACÉN. El descarte es una subactuación dentro de su alcance, no una nueva orden funcional aprobada; CP010 y CP011 son checkpoints, NO IDs de órdenes. Crear otra orden sin decisión 000 duplicaría el trabajo. Los criterios del delta documental previo D26-D29 se conservan como antecedente.

Siguiente paso: detenerse antes de F3. Se requiere autorización separada, revisión de SQL en PostgreSQL efímero, respaldo y diseño de sincronización de revisiones (hoy locales); sin eso, no activar descarte real.
