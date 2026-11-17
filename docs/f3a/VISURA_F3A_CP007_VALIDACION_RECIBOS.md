# VISURA PREPARA ALMACÉN · FASE 3A · CP007 — Validación de recibos

Proyecto: VISURA — DESARROLLO Y COORDINACIÓN · Módulo 15 (PRUEBA_3).
Orden vigente: VISURA-15-AUDITORIA-RECUPERACION-001.
Matriz: VISURA-00-AUDITORIA-RECUPERACION-001.
Distribución: VISURA-00-DIST-F2-001.
Predecesor: VISURA-15-CP011-F3A-HOMOLOGACION-PARCIAL-R41-20261117-006.
PR #99, base recuperada HEAD `2de6365ebbc16e9a8d6732a7f1bda6e2ec3c764d`.

## Comprobación de capacidad sin repetir bloqueos

- Se consultó la presencia de binarios en el entorno vigente: `psql`, `postgres`, `pg_ctl`, `pg_isready` e `initdb` ausentes. El motor PostgreSQL aislado sigue no disponible.
- Chromium existe, pero el checkpoint precedente documenta `ERR_BLOCKED_BY_ADMINISTRATOR` en loopback y `file://`. No se repitió navegación ni se atribuyó nueva prueba IndexedDB.
- Ninguna operación SQL R4/R4.1 ni migración realizada. Sin escrituras Supabase.

## Nuevo defecto reproducido

`aceptarRecibo` del módulo `control-cargas-f3a-outbox.mjs` daba por confirmada una operación con UUID/versión correctos pero contadores imposibles (`total=3`, `checked=10`, `pending=20`, `incidents=12`). Reproducción aislada: `BUG_CONFIRMED {"status":"confirmada","version":1}`.

## Corrección limitada

- Exige `total` entero en [1,3000] y `checked`, `pending`, `incidents` enteros seguros no negativos.
- Exige `checked+pending=total` e `incidents<=checked`.
- Exige valores mínimos compatibles con el estado recibido (`ok`, `incident`, `pending`).
- Rechaza recibos incompletos; preserva la operación `incierta` sin confirmar.
- Se actualizó solo el fixture de recibo de la batería Q1-Q14 (NO se ejecutaron de nuevo); se incorpora un test nuevo específico de la zona corregida.

## Pruebas nuevas ejecutadas

- 6/6 tests Node dirigidos únicamente a aceptación de recibos, PASS: recibo válido; campo ausente; sumas incompatibles; incidencias excesivas; tipo/límite erróneo; incidente coherente/incoherente.
- `node --check` de módulo y fixture antiguo adaptado: 2 PASS sintácticos; no constituyen regresión completa.
- NO ejecutadas suites históricas de 14, 16 estáticas, 12, 18 ni 3.
- NO comprobado: PostgreSQL R4.1 real, concurrencia de sesiones, IndexedDB real dos pestañas, Safari iPhone físico, integración en PWA.

## Decisión

Código cliente corregido solo en PR99 draft, sin conectar con interfaz ni desplegar; SQL R4.1 permanece sin aplicar; RPC R3 bloqueadas. Mantener CP012 ABIERTO, FASE 3B excluida y NO GO de activación. El evento aceptado por servidor no prueba verificación física.

Siguiente paso: homologación real PostgreSQL/IndexedDB cuando cambien las capacidades; revisar compatibilidad del usuario autenticado con el actor del recibo al conectar con la PWA. No repetir pruebas bloqueadas ni suites históricas.
