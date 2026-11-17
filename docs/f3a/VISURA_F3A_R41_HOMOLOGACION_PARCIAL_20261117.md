# VISURA PREPARA ALMACÉN — FASE 3A · R4.1 y cola de checks (CP incremental)

**Orden existente** `VISURA-15-AUDITORIA-RECUPERACION-001` · **Matriz** `VISURA-00-AUDITORIA-RECUPERACION-001` · **Distribución** `VISURA-00-DIST-F2-001`.

**Checkpoint precedente** `VISURA-15-CP011-F3A-FUENTE-CHECKS-R4-20261117-005`. Mantener **CP012 ABIERTO**. Solo PRUEBA_3; no PRUEBA_2. No iniciar FASE 3B. No fusionar PR #99, desplegar PWA, crear LAB/proyecto/rama, generar gastos, escribir BC ni alterar producción.

## Estado verificable inicial

- PR #99 `josegude-ux/KONTROLA` era OPEN/DRAFT HEAD `76d2e7c515e755dc53382c816476eb841c194c64` antes de cambios de esta entrega.
- R3 permanece instalado, con `visura_f3a_descartar_lote` y `visura_f3a_restaurar` sin EXECUTE para `authenticated`.
- Dos tablas de checks propuestas R4 no aparecen instaladas en Supabase. Sin descartes activos; dos eventos F3A históricos existentes.
- El SQL original R4 se conserva **sin ejecutar** y no ha sido reemplazado.

## Hallazgo técnico y corrección propuesta R4.1

En el SQL R4 original, la comprobación del `operacion_id` ya confirmado ocurría **después** de validar la fuente PRUEBA_3. Un reintento idéntico tras el cierre de esa carga o el reemplazo del PDF perdía la posibilidad de recuperar su recibo, pese a que la operación anterior podía haber sido confirmada. En R4.1 el ID se verifica tras autorización y validación de campos, **antes** de consultar la fuente, para devolver el recibo histórico solo a su actor y con los mismos siete argumentos. La comprobación se mantiene también **después del bloqueo de la cabeza LP**, para capturar la carrera entre dos sesiones. Un nuevo UUID siempre debe validar que la carga sigue activa.

**R4.1 es PROPUESTA NO EJECUTADA.** No se ha certificado su compilación ni sus transacciones en PostgreSQL. No activar ninguna RPC R4 ni reactivar R3.

## Cola aislada de operaciones (todavía no integrada en PWA)

- Implementado módulo puro `src/control-cargas-f3a-outbox.mjs` con adaptador IndexedDB por scope de usuario y transacciones readwrite por LP; no hace peticiones de red ni modifica revisiones existentes al importarse.
- `guardarIntencion` debe preceder a `markLine`/`saveReview`; después `acreditarRegistroLocal` contrasta el evento con la revisión local. Un corte entre ambas fases deja una intención **bloqueada para envío**, no un check acreditado. La UI aún no usa estas funciones.
- `reservarEnvio` obtiene un lease local entre pestañas. El lease solo coordina: **la autoridad es CAS + idempotencia en PostgreSQL**, no el dispositivo. Si caduca, se reintenta el mismo UUID y misma versión, sin inferir confirmación.
- Las peticiones contienen únicamente almacén, LP, SHA PDF, índice, nuevo estado, versión esperada y operación UUID. Sin PDF, notas, SKU, cantidades o revisión completa.
- Un recibo debe coincidir con la operación y aportar actor/hora de servidor, `procedencia=evento_registrado_en_servidor`, `verificacion_fisica_acreditada=false`. El conflicto CAS bloquea la cola para conciliación, nunca hace rebasing automático.
- Versiones y cola no se cruzan entre usuarios; divergencias de PDF, cierres o cambios de origen exigen revisión manual. La cola requiere pruebas reales de IndexedDB/Safari y protocolo de reconciliación antes de conectarla a la PWA.

## Pruebas NUEVAS, sin repetir las 12+18+3 históricas

1. **14/14 PASS** Node 22 con repositorio transaccional simulado: intención ante corte, auditoría local, offline, dos pestañas en modelo, timeout, recibo, CAS, cola FIFO, cambio PDF, scope, lease caducado, revisión incorrecta, versión desfasada.
2. **16/16 PASS** controles estáticos nuevos del SQL R4.1: orden de idempotencia, doble replay check, RLS, GRANT/REVOKE, locks, CAS y DML permitido. Son inspecciones de texto, **NO equivalen a ejecutar SQL**.
3. `bash -n` del ejecutor PostgreSQL local: PASS. La conexión a `PGHOST=project.supabase.co` se rechazó antes de ejecutar (salida 13); con `127.0.0.1` sin motor PostgreSQL terminó en 14 sin SQL ejecutado.
4. Preparado `tests/bootstrap_r41_pg_local.sql` y `tests/regresion_r41_pg_local.sql`, encapsulados por el ejecutor en `BEGIN`/`ROLLBACK`, para PostgreSQL local ya disponible y base de nombre `visura_f3a_test_*`. **NO EJECUTADOS**: binarios `psql`, `postgres` y `pg_ctl` ausentes; descarga de paquetes sin DNS.
5. Prueba Chromium/IndexedDB en dos pestañas **BLOQUEADA**, no contada como PASS: `net::ERR_BLOCKED_BY_ADMINISTRATOR` tanto en loopback `http://127.0.0.1` como en un archivo `file://`. No repetir intentos sin un cambio de entorno. Safari físico NO probado.

## BLOQUEOS PARA HOMOLOGAR

- Instalación de PostgreSQL local autorizada y accesible, o mecanismo de pruebas aislado equivalente sin gastos y sin tocar Supabase: compilar R4.1, verificar RLS real, dos sesiones concurrentes, idempotencia tras cierre/reimportación, rollback y ausencia de privilegios para `anon`/`authenticated`.
- IndexedDB en dos pestañas REALES y Safari/iPhone físico; el lease local no demuestra exclusividad entre dispositivos. Resolver cola de recuperación tras cierre de pestaña.
- Revisión de compatibilidad del flujo `markLine`/`saveReview` con la escritura previa de intención: no son transaccionales entre localStorage e IndexedDB; el diseño es fail-closed, no atómico entre almacenes web.
- R3 todavía aceptaría un snapshot autodeclarado si se reactivase: solo reemplazarlo por un agregado derivado de eventos en el servidor dentro de la transacción de descarte. Ni siquiera eso acredita el trabajo físico, solo el evento recibido.

**Conclusión:** diseño R4.1/cola y pruebas de lógica listos, **NO GO de ejecución/activación**, CP012 abierto, FASE 3B excluida. Sin cambios remotos de Supabase durante esta fase de trabajo.
