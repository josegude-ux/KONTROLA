# VISURA PREPARA ALMACÉN · FASE 3A · Integración inerte y vía de concurrencia real

**Orden:** VISURA-15-AUDITORIA-RECUPERACION-001 · **Matriz:** VISURA-00-AUDITORIA-RECUPERACION-001 · **Distribución:** VISURA-00-DIST-F2-001 · **Variante:** PRUEBA_3 · **Predecesor:** VISURA-15-CP011-F3A-R41-INSTALADA-BLOQUEADA-20261117-014.

## Estado inicial comprobado

PR #99 (KONTROLA) abierto / borrador HEAD `68b9aa80e15ef2ed1bff94d922ff2733fcf93adf`, sin merge. Supabase de pruebas control-cargas-movil conserva R4.1 instalada, dos tablas vacías y RPC sin EXECUTE para `anon`/`authenticated`; R3 descarte/restauración igualmente bloqueadas; 13 cargas P3 existentes sin modificar. No se ejecutó SQL de escritura en esta actuación.

## Concurrencia: mecanismo propuesto, NO ejecutado ni acreditado

El intento CP014 con dos llamadas simultáneas al conector Supabase **no acreditó solapamiento**; no se debe reiterar sin cambiar de transporte. La herramienta de ejecución puede serializar consultas, y `pg_sleep()` dentro de dos llamadas no es una prueba cuando las sesiones no coinciden.

**Ruta técnicamente viable sin credenciales de producción:** reutilizar, previa comprobación de coste/capacidad, el runner de GitHub Actions de KONTROLA ya existente (`.github/workflows/ci.yml` tiene servicio PostgreSQL 16, por lo que su resultado sería de PG16 y no sustituye PG17) o un host local autorizado con PostgreSQL 17. Para homología exacta, elevar explícitamente SOLO el servicio aislado de pruebas a PG17 en un workflow autorizado; no alterar CI vigente sin autorización. Iniciar **dos procesos `psql` distintos**, cada uno con su conexión propia, autenticación ficticia en un esquema de ensayo y datos sintéticos. La base de datos y el esquema se crean solo en el entorno local, nunca en Supabase. No instalar nuevas extensiones ni crear secrets. No ejecutar workflow mientras no se acredite runner gratuito/autorizado y la vía de obtención del paquete privado.

Procedimiento de barrera para evitar falsos positivos:

1. Preparar un clon **ficticio y aislado** de R4.1 + helper functions y un LP con dos líneas. Verificar el `version=0` inicial.
2. Sesión A: `BEGIN`; registrar línea 0 `ok`, CAS=0, UUID-A; **mantener transacción abierta** 3–5 s; publicar `A_WRITTEN` solo tras haber completado el registro.
3. Sesión B: esperar explícitamente `A_WRITTEN` antes de comenzar; iniciar `BEGIN` en una segunda conexión; registrar línea 1 `ok`, CAS=0, UUID-B; medir espera real de bloqueo sobre cabecera LP; al confirmar A, B debe salir con conflicto `40001` y no crear evento.
4. Confirmar únicamente 1 evento, `version=1`, recibo reproducible de UUID-A. En sesión B reintentar CAS=1 con **UUID nuevo**: una inserción, `version=2`, sin duplicados. En otra prueba, mismo UUID y argumentos debe devolver recibo idéntico, sin nuevo evento.
5. Repetir con dos peticiones de **mismo UUID** y con UUID diferentes misma CAS; comprobar actor/almacén/ACL falsos y cierre/PDF cambiado. Verificar auditoría inmutable y `ROLLBACK` o borrar solo esquema ficticio.
6. Registrar evidencia obligatoria: PID de cada conexión (`pg_backend_pid()`), timestamps de barrera A/B, duración de espera B, códigos SQLSTATE, versiones/contadores resultantes y descarte de un proceso QA limpio. Sin PID distintos + solapamiento + bloqueos medidos, resultado **NO ACREDITADO**.

No usar `dblink`/`pg_cron` como atajo: son extensiones no instaladas; instalarlas sería un cambio no autorizado. La existencia de `pg_config` no significa que estén instalados `postgres` y `psql`. En este entorno actual siguen sin esos binarios. No usar la API o credenciales de producción.

## Preparación inerte en PRUEBA_3

Se añade un único punto de referencia a `control-cargas-prueba3.html` después de `VISURA_SCOPE` y antes de la lectura de los datos locales, con **bandera constante `false`**. No activa nada por URL, localStorage o parámetros de usuario. No crea DB, listeners, timers ni botones. La construcción del puente sigue inactiva aun si accidentalmente se evalúa la rama: `enabled:false`.

Nuevo módulo `src/control-cargas-f3a-puente-inerte.mjs` importa exclusivamente `control-cargas-checklist.mjs` y `control-cargas-f3a-outbox.mjs`. Para un futuro ensayo local bajo dependencia inyectada y habilitación explícita: valida LP/PDF/referencias; guarda intención por operación en outbox **antes** de `markLine`/`saveReview`; luego acredita solo el registro local para dejar `status=lista`. No envía eventos a Supabase, no integra servicio de red, no habilita RPC y **nunca convierte el check local en prueba de verificación física ni de aceptación de servidor**.

Persistencia en `localStorage` y IndexedDB no es atómica entre almacenes: si falla alguno de esos pasos, el check queda pendiente de conciliación y ninguna operación se envía automáticamente. Solo existe lógica para pruebas offline; no se afirma IndexedDB real/Safari homologado. No tocar carga/horarios originales, esquema PRUEBA_3, impresión, estadística, otras variantes ni producción.

**Pruebas nuevas específicas:** P01–P09 ejecutadas con Node 22 sobre almacenamiento ficticio; no se ejecutan suites históricas. Falta prueba real del enlace UI, IndexedDB multi-pestaña y PostgreSQL dos sesiones.

## Estado

**R4.1 instalada, RPC bloqueada. Integración en PR #99 exclusivamente inerte, NO GO activación/publicación.** CP012 sigue abierto y FASE 3B no iniciada. Sin cambios Business Central, producción, Supabase (escritura), merges, otras ramas/LAB/proyectos ni gastos. Siguiente paso: obtener capacidad autorizada de dos clientes PostgreSQL reales para la prueba con barrera y después homologar el opt-in de checklist/IndexedDB con navegación real, manteniendo restricciones.
