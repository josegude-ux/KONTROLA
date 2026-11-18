# VISURA PREPARA ALMACÉN — FASE 3A · Fuente mínima de checks · propuesta R4

**Orden existente:** `VISURA-15-AUDITORIA-RECUPERACION-001` · matriz `VISURA-00-AUDITORIA-RECUPERACION-001` · distribución `VISURA-00-DIST-F2-001`.  
**Punto de partida:** `VISURA-15-CP011-F3A-CONTENCION-EVIDENCIAS-20261117-004`. PR #99 permanece `draft`; Supabase R3 existe con RPC de descarte/restauración **revocadas**.

## Decisión de arquitectura: registro de acciones, no copia de revisiones

La fuente independiente es el registro **que mantiene PostgreSQL**, al recibir *una única transición de check* autenticada en el momento de su realización. El servidor determina actor, reloj, orden y conteos a partir de sus eventos inmutables. Esto **acredita la recepción y registro de la acción**, no que se haya inspeccionado físicamente la mercancía. El cliente nunca puede marcar un check como “verificación física certificada”.

**Datos enviados por toque:** `p_almacen`, `p_lp`, `p_pdf_hash`, `p_linea` (índice 0..referencias−1), `p_estado` (`pending|ok|incident`), `p_version_esperada`, `p_operacion` (UUID único). Ni snapshot global, ni notas, ni cantidades, ni SKU, ni audit completo, ni hora/actor aportados por el cliente.

**Dos tablas, propuestas y aún NO instaladas:** `visura_f3a_check_cargas` (LP/PDF/total adquirido del registro PRUEBA_3, versión CAS de check) y `visura_f3a_check_eventos` (append-only: una transición/operación, índice, estado, actor y hora de servidor, versión y recibo). No alterar `visura_p3_cargas`, `kontrola_*`, TANQUES, BC ni las tres tablas F3A R3.

**RPC propuesta:** `visura_f3a_registrar_check`. `SECURITY DEFINER` con autorización explícita de sesión activa, almacén activo, administrador u operario con asignación, y fuente PRUEBA_3 no finalizada; `REVOKE EXECUTE` a `PUBLIC`, `anon` y `authenticated` al instalar, hasta homologar. Sin DML directo de cliente; RLS activado. Guardar operación y recibo atómicamente; UUID repetido e idéntico devuelve mismo recibo; UUID reutilizado con contenido diferente falla; versión obsoleta falla con `40001`; no se permite duplicar transiciones idénticas con otro UUID. Se requiere probar **en PostgreSQL real** antes de aplicar el SQL candidato.

## Ejecución segura en PWA (todavía NO integrada)

1. Al pulsar un check: `markLine` + persistencia local existente, validar firma de revisión/PDF y generar **una** petición por cambio, no un resumen acumulado.
2. Cuando la red confirme el recibo autenticado: actualizar únicamente contador/versión acreditados por servidor. Mantener mismo ID en reintentos; no deducir éxito de un timeout.
3. Si no hay red o falla el envío: el check permanece local como **pendiente de acreditar**. No enviar la revisión histórica en lote ni llamarlo confirmado; impedir descarte hasta recibir las confirmaciones necesarias y reconciliar versiones.
4. Reimportación o cambio de hash: bloquear conciliación automática del LP hasta resolver conflicto; conservar las dos copias y el historial existentes.
5. Antes de un descarte futuro: la RPC R4 deberá reconstruir la última transición de cada línea bajo bloqueo, obtener `checked`, `pending`, `incidents` y comparar contra `visura_p3_cargas` (total y PDF) **en la misma transacción**. Rechazar si `checked=0`, `pending=0`, carga cerrada o versión/huella incompatible; jamás aceptar `checked` enviados por cliente.

## Bloqueos / pruebas pendientes

- El SQL se conserva como **propuesta no ejecutada**. Antes de su instalación: ensayo de sintaxis, permisos, idempotencia, carreras de dos sesiones, cambios de PDF, cierre de PRUEBA_3, RLS y retención de auditoría. Un conjunto de tests JS no valida SQL.
- Dos pestañas / IndexedDB: protocolo de cola única y locking local en Safari requiere ensayos nuevos específicos; si no se demuestra exclusividad, exigir actualización de versión servidor y recuperación segura.
- Inspección real de iPhone: auditor sólo lectura preparado pero no ejecutado. No inventar resultados.
- Check registrado por servidor **no** prueba realización física; si se necesita prueba de inspección externa, añadir corroboración independiente (p. ej. segundo usuario o escaneo físico), con aprobación de alcance.
- La RPC R3 instalada sigue bloqueada; **no reactivar** hasta sustituir su fuente del snapshot por un agregado transaccional R4 y completar homologación.

**No cambios de producción, BC, UI, despliegues, merges, nuevas ramas/proyectos ni costes. FASE 3B excluida. CP012 abierto.**
