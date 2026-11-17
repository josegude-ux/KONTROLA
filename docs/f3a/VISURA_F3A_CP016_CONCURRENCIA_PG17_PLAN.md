# VISURA — PREPARA ALMACÉN, FASE 3A · Plan de concurrencia PG17 aislado

- **Orden existente:** `VISURA-15-AUDITORIA-RECUPERACION-001` · matriz `VISURA-00-AUDITORIA-RECUPERACION-001` · distribución `VISURA-00-DIST-F2-001`
- **Predecesor:** `VISURA-15-CP011-F3A-PUENTE-INERTE-20261117-015`
- **PR #99, HEAD de partida:** `ebdf4e9e5429ec91227ce3d53d1a85ba8d5cba9d` (OPEN/DRAFT)
- **Variante:** `PRUEBA_3`; `PRUEBA_2` descartada
- **Estado:** **PREPARADO, NO EJECUTADO, NO GO**. CP012 abierto; FASE 3B excluida.

## Capacidad verificable

El workflow existente `.github/workflows/ci.yml` usa `postgres:16` con servicio local. Se ha utilizado solo como referencia; **no se ha cambiado ni ejecutado CI**, ni servicios, permisos o credenciales. En este entorno no existen `psql`, `postgres`, `pg_ctl` ni `initdb`. No existe homologación PostgreSQL 17 real todavía.

La alternativa preparada usa un servicio **PostgreSQL 17 efímero y aislado**, cuya creación, ejecución y eventual uso de runner necesitan autorización específica posterior y verificación de no generar costes. No se presupone que un runner esté disponible gratuitamente. No usar túneles locales hacia Supabase u otro clúster existente.

## Ficheros propuestos y ejecución futura

- `scripts/ensayo-f3a-r41-dos-psql-pg17.sh`: lanzador manual, no workflow; doble opt-in; preflight PGHOST, PGDATABASE, PGUSER y PG17; sin credenciales embebidas.
- `tests/pg17-concurrency/00_fixture.sql`: **exclusivamente** para una base desechable vacía. Crea roles y ayudas `auth` ficticias en esa instancia, y cargas sintéticas. No ejecutar en clúster con datos. No modifica Business Central, Supabase ni producción.
- `docs/sql-no-ejecutar/VISURA_F3A_R4_1_FUENTE_CHECKS_CORRECCION_NO_EJECUTAR.sql`: copia **byte a byte** del blob Git `68db4e388a99ff8631d0de279879a707807d2b59`, incluida como respaldo del ensayo; en el repositorio ya existe y se conserva sin modificar.
- `10_A_cas.sql` / `11_B_cas.sql`: dos sesiones `psql` de distinto PID, misma LP, UUID distintos y CAS=0; A confirma solo después de mantener bloqueo 7s; B debe esperar y recibir SQLSTATE 40001. No PASS sin espera medida ni `wait_event_type=Lock` observado mediante tercer cliente.
- `20_A_same_uuid.sql` / `21_B_same_uuid.sql`: dos sesiones, mismo UUID y misma CAS; espera comprobada y recibo idéntico, sin evento duplicado.
- `30_assert_and_recovery.sql`: verificar contadores, versiones, idempotencia después del commit, recuperación tras CAS con nuevo UUID, y ausencia de permiso RPC de `anon` y `authenticated`.
- `safety-contract.test.mjs`: **9 pruebas estáticas nuevas** de garantías del ensayo. No son pruebas de dos sesiones.

Al finalizar la ejecución futura solo podría afirmarse homologación de carrera de **SQL R4.1 sobre PostgreSQL 17 aislado** si se documentan PIDs distintos, timestamps de las dos barreras, bloqueo observado, latencia B, SQLSTATE 40001, recibos, conteos y limpieza del entorno desechable. No homologaría Supabase Auth real, IndexedDB/Safari ni activación de PWA.

## Observación remota de solo lectura

Supabase de pruebas `control-cargas-movil` mantiene R4.1 instalada, vacía y sin `EXECUTE` para `anon`/`authenticated`; R3 descarte/restauración revocada, cero cargas descartadas. En esta comprobación se observaron **24 cargas PRUEBA_3**, frente a **13** registradas en CP015; **no se atribuye causa ni se modifica ninguna carga**. No usar sus datos para el ensayo local.

## Siguiente paso y límites

Autorizar específicamente la capacidad PostgreSQL 17 efímera y un procedimiento de lanzamiento manual o runner controlado de coste acreditado; **no basta con autorizar crear scripts**. Hasta entonces no ejecutar CI, ni crear/alterar servicios, roles, permisos, proyectos, LAB, credenciales, Supabase remoto ni desplegar. PR99 debe seguir OPEN/DRAFT, sin merge; R4.1 y R3 bloqueadas; puente F3A inerte; CP012 abierto y FASE 3B excluida.
