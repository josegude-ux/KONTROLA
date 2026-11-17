# VISURA PREPARA ALMACÉN · FASE 3A — continuidad CP010

- Proyecto: VISURA — DESARROLLO Y COORDINACIÓN.
- Módulo: 15 · PREPARA ALMACÉN · PRUEBA_3.
- Orden existente: VISURA-15-AUDITORIA-RECUPERACION-001.
- Matriz: VISURA-00-AUDITORIA-RECUPERACION-001.
- Distribución: VISURA-00-DIST-F2-001.
- Predecesor: VISURA-15-CP011-F3A-LEASE-20261117-009.
- PR #99 en rama existente `lab/prepara-descarte-fase1-20261117`; HEAD previo comprobado: `1d16edfc30d7fee84b9423a4aea25c92eef939c7`.

## Nuevo defecto reproducido
`crearRepositorioIndexedDBChecksF3A` cacheaba indefinidamente la Promise fallida de su primera llamada `indexedDB.open`. Una apertura posterior sin recargar seguía rechazándose, incluso cuando el fallo inicial era transitorio. Reproducción inicial con simulador del protocolo de apertura: I1 e I2 FAIL, I3 PASS.

## Corrección mínima
Se añade `.catch(err=>{opened=null;throw err})` a la Promise de apertura. No se reintenta automáticamente, no se modifican los datos ni los métodos de lectura y escritura, y una apertura válida se sigue reutilizando. Se conserva el contrato local, sin conexión a PWA ni solicitudes remotas.

## Pruebas nuevas
I1 rechazo asíncrono `onerror`, posterior reapertura PASS.
I2 excepción sincrónica en `idb.open`, posterior reapertura PASS.
I3 apertura correcta compartida por llamadas concurrentes y posteriores PASS.
Resultado: 3/3 PASS Node 22 (simulador, NO IndexedDB real). `node --check` PASS.
No se repitieron las suites anteriores ni los intentos bloqueados de Chromium. Sin ejecutables `postgres`, `psql`, `pg_ctl`, `pg_isready` o `initdb`; sin capacidad nueva acreditada. No se ejecutó PostgreSQL, IndexedDB de navegador ni Safari.

## Restricciones
Mantener las RPC R3 sin EXECUTE, SQL R4.1 sin aplicar, PR99 draft sin merge, CP012 ABIERTO y F3B EXCLUIDA. Sin escrituras a Supabase, BC, PWA publicada, otros proyectos o production; sin nuevos proyectos/LAB/ramas ni gastos. Cuando exista navegador real, ensayar fallo de apertura y recuperación con IndexedDB nativo, no extrapolar pruebas simuladas.
