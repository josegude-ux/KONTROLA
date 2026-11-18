# VISURA PREPARA ALMACÉN · FASE 3A · CP009 (revisión acotada)

- Proyecto: VISURA — DESARROLLO Y COORDINACIÓN; módulo 15; variante PRUEBA_3.
- Orden: `VISURA-15-AUDITORIA-RECUPERACION-001`; matriz `VISURA-00-AUDITORIA-RECUPERACION-001`; distribución `VISURA-00-DIST-F2-001`.
- Predecesor: `VISURA-15-CP011-F3A-ACTOR-RECIBO-20261117-008`.
- PR99 existente, HEAD precedente `896ccb585236a4d916ee97576bb8436d885eac94`. Sin merge ni despliegue.

## Capacidad revisada (sin reintentos cerrados)

- Binarios `psql`, `postgres`, `pg_ctl`, `pg_isready`, `initdb`: no presentes en contenedor; Node 22 y Chromium presentes.
- No se ejecutó Chromium: el bloqueo administrativo para loopback/file está documentado y no hay cambio acreditado. No se han realizado pruebas PostgreSQL, IndexedDB real ni Safari.
- No se ha escrito en Supabase ni BC.

## Hallazgo nuevo reproducible

El coordinador R4.1 permitía devolver **dos reservas simultáneas** desde una misma pestaña (mismo `tabId`) mientras el lease seguía vigente, cada una con el mismo UUID, versión y payload. Los dos callbacks podían iniciar peticiones de red redundantes. La idempotencia RPC es autoridad, pero no justifica duplicar envíos. Reproducción aislada previa al parche: `reservada` + `reservada`.

## Corrección limitada

En `reservarEnvio`, todo lease vigente impide una segunda reserva. La misma pestaña recibe `en_curso`; otra pestaña, `otra_pestana`. Una caducidad del lease o la liberación explícita tras timeout permiten nuevo intento con el **mismo** UUID y la misma versión, sin rebase automático ni autoridad local.

No se cambia el adaptador IndexedDB, SQL R4.1, RPC R3, identidad del actor, proceso `markLine`/`saveReview`, PWA ni su publicación. La interfaz no está conectada al módulo.

## Pruebas nuevas y estado

`tests/control-cargas-f3a-same-tab-lease.test.mjs`: **4/4 PASS** (Node 22). N1 duplicidad misma pestaña; N2 bloqueo otra pestaña; N3 recuperación tras timeout; N4 lease caducado. Prueba con repositorio transaccional simulado: **no** homologación de IndexedDB Safari ni concurrencia PostgreSQL real. `node --check` módulo: PASS. Suites históricas no reejecutadas.

**NO GO activación. CP012 ABIERTO. FASE 3B NO INICIADA.** RPC R3 deben seguir bloqueadas; SQL R4.1 no se aplica.
