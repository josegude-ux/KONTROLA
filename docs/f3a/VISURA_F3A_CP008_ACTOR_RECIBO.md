# VISURA PREPARA ALMACÉN · FASE 3A · CP008 — actor del recibo

**Proyecto:** VISURA — DESARROLLO Y COORDINACIÓN · **Módulo:** 15 · PREPARA ALMACÉN · variante **PRUEBA_3**.

**Orden existente:** VISURA-15-AUDITORIA-RECUPERACION-001 · matriz VISURA-00-AUDITORIA-RECUPERACION-001 · distribución VISURA-00-DIST-F2-001.

**Predecesor:** VISURA-15-CP011-F3A-RECIBOS-20261117-007 · PR #99 draft HEAD inicial `04a2f4dde9f184ffcb3e2f5d1344ae58ae21105d`.

## Capacidad

No hay binarios `psql`, `postgres`, `pg_ctl`, `pg_isready` ni `initdb` disponibles. `pg_config` instalado no proporciona un servidor ejecutable. Chromium existe, pero sin cambio demostrado del bloqueo de navegación anterior; **no se repitieron intentos**. No se han probado PostgreSQL real ni IndexedDB real/Safari/iPhone.

## Hallazgo demostrado

La función `aceptarRecibo` comprobaba que `recibo.actor` tuviese forma UUID, pero no lo vinculaba a la identidad de la sesión autenticada. En una reproducción con datos ficticios, un recibo con actor distinto al de sesión fue aceptado como confirmado.

## Corrección limitada

`aceptarRecibo` requiere ahora `actorSesion`, que **debe obtenerse de la sesión autenticada comprobada**, nunca del recibo remoto ni de una propiedad local arbitraria. Ambos deben ser UUID válidos y coincidir de manera insensible a mayúsculas. Su ausencia o discrepancia deja la operación en estado `incierta` y no acredita el check. No hay llamadas de red en el módulo. Antes de conectar a la PWA debe revisarse el uso de Supabase Auth y la protección frente a cambios de sesión.

Se actualizaron solo los parámetros ficticios de los tests anteriores Q1–Q14 y R1–R6 para reflejar el nuevo argumento; **NO se ejecutaron esas suites**, por instrucción del usuario. La modificación cambia la firma de una API no integrada aún en la PWA.

## Pruebas NUEVAS ejecutadas

- A1: actor diferente → rechazado, estado incierto.
- A2: identidad de sesión ausente → rechazado, incierto.
- A3: actor correcto → confirmado.
- A4: UUID con letras en mayúsculas → misma identidad, confirmado.
- A5: cambio de usuario entre envío y recibo → rechazado, versión sin acreditar.
- A6: actor de sesión no UUID → rechazado, incierto.

**6/6 PASS** (Node 22) de la nueva batería exclusiva. `node --check` del módulo y de los dos fixtures adaptados: PASS. Ninguna prueba de PostgreSQL ni IndexedDB real.

## Restricciones y siguiente paso

SQL R4.1 sigue como propuesta **NO EJECUTAR**. Mantener RPC R3 sin EXECUTE, no hacer merges, no iniciar FASE 3B, no cerrar CP012, no tocar BC, Supabase remoto, producción ni desplegar la interfaz. Futuro: vincular `actorSesion` a un usuario Supabase Auth verificado e introducir regresión dirigida cuando la integración sea autorizada; homologar R4.1 en PostgreSQL aislado e IndexedDB real únicamente con nueva capacidad técnica.
