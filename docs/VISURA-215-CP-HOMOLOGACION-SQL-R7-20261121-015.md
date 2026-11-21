# VISURA · CP015 — Preparación de homologación SQL R7

- Proyecto: VISURA — DESARROLLO Y COORDINACIÓN
- Módulo: 15 PREPARA ALMACÉN / 215 Impresión; coordinación 00/000
- Orden existente: VISURA-15-AUDITORIA-RECUPERACION-001
- Matriz: VISURA-00-AUDITORIA-RECUPERACION-001
- Distribución: VISURA-00-DIST-F2-001
- Checkpoint: VISURA-215-CP-HOMOLOGACION-SQL-R7-20261121-015
- Hora real de España verificada: 21/11/2026 · 03:24:30 CET
- Variante: integración R7 original + puente compartido LAB. App base 0.3.53
- Rama: lab/visura15-impresion-r7-ux-integracion-20261120
- Base main protegida: 30e9c87b429c8d20f951edba251c081d3beb2447
- Estado: LAB PARCIAL; NO GO producción. Sin merge, publicación, ni cambios en Supabase.

## Cambios verificables CP014 → CP015

1. Corrección de fecha: el contrato R7 nuevo usa **publicado_en** en Europe/Madrid, en vez de `c.fecha` de Business Central. Los documentos BC de otro día publicados hoy quedan permitidos; cargas publicadas otros días, bloqueadas. La RPC histórica sigue intacta.
2. La propuesta `docs/sql/PROPUESTA-LAB-REGISTRO-IDEMPOTENTE-R7-20261121.sql` continúa **NO APLICADA** en producción; añade hash al historial existente, comprueba que el documento actual coincida y utiliza bloqueo de LP, índice único por LP+hash y verificación de `ROW_COUNT`.
3. Conciliación y preflight actualizados: bloquean marcas locales anteriores a publicación y permiten reconocimiento por hash solo con futura RPC versionada; `CONSULTA_VERSIONADA_R7=false`, `ESCRITURA_R7_HABILITADA=false`.
4. Nuevos tests de fecha y versión: `tests/visura15-r7-fecha-publicacion.test.mjs` y `tests/visura15-r7-versionado.test.mjs`; tests anteriores ajustados.
5. Se incorporaron los tests `tests/integration/r7-sync.sql` y `tests/integration/r7-concurrency.sh` a `tests/integration/run.sh`. Este runner limita la base a `kontrola_test` / `kontrola_test_*` y localhost; aplica el borrador exclusivamente en esa base efímera. Comprueba histórico ambiguo, permisos y dos sesiones concurrentes, cuando se ejecute.
6. Comprobación de RLS en el test SQL: recuentos directos bajo el propietario de la base temporal, nunca ampliación de acceso para usuarios de la app.

## Pruebas y limitaciones

- 8/8 pruebas aisladas de fecha Madrid, hash, registros antiguos, publicación vs. fecha BC y flags bloqueados.
- 13/13 comprobaciones focalizadas del último estado de código, preflight, SQL y suites preparadas.
- **NO EJECUTADOS** todavía: `node --test` íntegro, `tests/integration/run.sh` PostgreSQL real, concurrencia real, Chromium integrado y prueba dúplex física.
- Una única prueba de Chromium local falló por timeout de entorno; sin resultado E2E, no repetir sin cambiar entorno.
- `main` inalterado: rama LAB 103 commits delante, cero detrás, 40 archivos diferenciados al checkpoint. No se afirma homologación integral.
- No se creó Supabase branch con coste ni se disparó GitHub Actions. No se usan credenciales ni PDF reales.
- La duplicidad en otros chats no puede verificarse automáticamente; búsqueda de este ID en Drive sin coincidencias antes de crear el registro.

## Siguiente paso

Ejecutar una sola vez la suite R7 en PostgreSQL temporal aislado y homologar dos sesiones con PDF autorizado y navegador real. Corregir únicamente fallos nuevos. Si todas las pruebas pasan y se autoriza una migración revisada, aplicar contrato compartido y habilitar consultas por revisión y escritura de forma controlada. No reconstruir PRUEBA_3 R7; no modificar producción ni TANQUES.
