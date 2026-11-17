# VISURA PREPARA ALMACÉN · FASE 3A · CP011 (ciclo de vida IndexedDB)

- Proyecto: VISURA — DESARROLLO Y COORDINACIÓN · Módulo 15 · PRUEBA_3.
- Orden existente: `VISURA-15-AUDITORIA-RECUPERACION-001` · matriz `VISURA-00-AUDITORIA-RECUPERACION-001` · distribución `VISURA-00-DIST-F2-001`.
- Predecesor: `VISURA-15-CP011-F3A-IDB-RECUPERACION-20261117-010`.
- PR #99, rama existente `lab/prepara-descarte-fase1-20261117`. HEAD de partida: `137e9a5d85a944fa9dc0c318a4d4c5067b1bae85`.
- SHA Git del módulo predecesor: `f22116733c67943619339457c82abc7bd29fd9f1`.

## Bloqueo de capacidad

No se dispone de `psql`, `postgres`, `pg_ctl`, `pg_isready` ni `initdb` ejecutables. Node 22 y Chromium sí constan, pero el entorno conserva el bloqueo previo de navegación a `localhost` y `file://`, sin capacidad nueva verificada para IndexedDB real. No se reintentó navegación ni se ejecutaron suites históricas. No se aplicó SQL R4.1 ni se modificó Supabase.

## Hallazgo nuevo y reproducción

El adaptador `crearRepositorioIndexedDBChecksF3A` conservaba indefinidamente en `opened` la promesa de una conexión inicialmente abierta, incluso cuando recibía cierre inesperado (`close`) o evento `versionchange`. Tras el cierre, posteriores llamadas `read` usaban una conexión ya cerrada y fallaban con `InvalidStateError`. Además, no respondía a `versionchange` cerrando la conexión obsoleta, potencialmente bloqueando actualizaciones de esquema.

Pruebas NUEVAS L1-L3 ejecutadas **antes del parche**: 0/3 PASS. Error de conexión cerrada o falta de cierre en versionchange (simulador controlado del protocolo IndexedDB).

## Corrección limitada

Se añade referencia `activeDb` y control de eventos `onclose`/`onversionchange` **solo a la conexión del repositorio F3A**. Al cerrar o cambiar versión, se invalida la caché únicamente si el evento corresponde a la conexión activa; `onversionchange` cierra la conexión para desbloquear actualizaciones. Una operación posterior puede reabrirla, sin bucle ni reintentos automáticos. Un evento tardío de una conexión anterior no invalida una conexión posterior.

Se conserva el tratamiento de promesa rechazada inicial de CP010, el nombre de base, el store y el contrato de transacciones. No se añaden llamadas de red ni integración con la PWA.

## Pruebas nuevas ejecutadas

- L1: `onclose` inesperado, primera operación posterior reabre; **PASS**.
- L2: `onversionchange`, conexión anterior cerrada y próxima apertura posible; **PASS**.
- L3: `onclose` tardío de la conexión antigua NO invalida una nueva; **PASS**.

**3/3 PASS** con Node 22 y simulador del protocolo IDB; `node --check` del módulo PASS. NO equivalen a pruebas IndexedDB real/Safari. La reapertura tras actualización a un esquema de versión superior puede requerir migración del cliente (puede fallar con `VersionError`); este parche no pretende actualizar versiones de esquema.

## Restricciones

R3 RPC de descartar/restaurar conservan EXECUTE deshabilitado; SQL R4.1 NO aplicado. Cero cambios de Supabase remoto, BC, producción o interfaz. PR99 sigue draft, sin merges/despliegues, sin nueva rama/LAB/proyecto o gastos. CP012 ABIERTO y F3B EXCLUIDA.

Siguiente paso: cuando se acredite navegador con IndexedDB real, ejecutar SOLO pruebas de ciclo de vida pendientes y de apertura tras versionchange. No repetir suites ni navegación bloqueada sin un cambio real del entorno. No cerrar CP012 por las pruebas simuladas.
