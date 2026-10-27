# VISURA PREPARA · Bloque 01 — Compatibilidad SQL de contratos paralelos y revisión documental

**Fecha:** 27/10/2026. **Alcance:** prueba automatizada en PostgreSQL 16 efímero, no integración ni despliegue.

## Fuentes inmovilizadas y protegidas

- Cadena documental PR #69: `13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf`.
- Contrato de Preparación/Verificación paralelas PR #60: `18c46b0c742bae9321f08603da40dfd1e7d76323`.
- Diseño responsive PR #61: `d66ecad37a13c3af6dafe2463236a1e2b874f77a` (inspección de presencia, NO mezcla de HTML/CSS).
- Rama **solo pruebas**: `audit/visura-prepara-b01-preflight-cruces-20261027` (PR #70).
- Ninguna rama de origen se ha actualizado ni se ha ejecutado merge, rebase, cherry-pick, despliegue o SQL contra el proyecto Supabase conectado.

## Prueba reproducible

**Archivos añadidos sin alterar las propuestas originales:**

- `tests/integration/preflight-cross-contract.sql`: datos ficticios `LP26-94001`, dos archivos PDF inventados por hash, revisión BC con cantidad final cuatro y origen PDF dos; inicio real de RPC Verificación por cuenta de pruebas separada; inicio de Preparación por otra; reserva y aprobación de revisión nueva; bloqueo de publicación; comprobación de conservación de versión, sesiones y eventos; cierre manual de ambas sesiones.
- `scripts/preflight-b01-cross-db.sh`: exige `GITHUB_ACTIONS=true`, `CI=true`, host PostgreSQL local y nombre único `kontrola_test_cross_b01`, además de SHA fijados. Lee `git show` sin aplicar cambios Git y superpone los SQL exclusivamente en una base temporal existente. Rechaza ramas actualizadas.
- `.github/workflows/visura-prepara-b01-preflight-ci.yml`: segundo job SQL aislado, PostgreSQL 16 fijado por digest, con opt-in a auditoría reintentos, provisionales, hash cruzado y total BC; ejecuta el runner de regresiones documental y después el conjunto paralelo/concurrencia/contratos cruzados. El primer job sigue siendo la auditoría de ramas Node.

**Regla SQL verificada:** si se aplica la propuesta `kontrola_prepara_verificacion_paralelas.sql` DESPUÉS de `kontrola_total_bc_documentado_b01.sql`, la primera redefine `public.kontrola_publicar_importacion(uuid)` usando la condición antigua `actual_total = declared_total`. Esa sobreescritura pierde la excepción BC documentada y el guard explícito de Verificación iniciada. **Esto constituye un riesgo de integración real.**

La comprobación de CI detecta que el contrato documental ha desaparecido de la función instalada después de aplicar la propuesta paralela y reestablece la definición desde **el archivo original de PR #69, usando el SHA exacto**, solo dentro de la base temporal. Valida con `pg_get_functiondef` que la función resultante recupera tanto `kontrola_total_bc_documentado` como la referencia a `kontrola_verificaciones`. Posteriormente ejecuta los ensayos paralelos y el escenario BC/Verificación/Preparación simultáneo.

El orden de ensayo reproducible es:
1. Migraciones históricas y propuestas documentales de PR #69; suite original completa.
2. Propuesta de flujos paralelos de PR #60 leída de Git, con detector de sobreescritura.
3. **Reaplicación documental PR #69** sobre la misma base efímera.
4. Regresiones SQL de flujos paralelos y carrera de verificadores de PR #60.
5. Escenario nuevo con carga corregida por BC, Verificación iniciada antes de Preparación, revisión material rechazada y cierre correcto.

**Importante:** este orden probado **no equivale a una migración aprobada para Supabase** y no soluciona aún las divergencias de frontend. El plan de integración posterior deberá fijar un único contrato de publicación y ensayar el orden final autorizado, en lugar de copiar ciegamente las dos propuestas.

## Historial de diagnóstico real

| GitHub Actions | Resultado | Evidencia |
|---|---|---|
| [40499729039](https://github.com/josegude-ux/KONTROLA/actions/runs/40499729039) | **FAIL** | En base conjunta, publicación BC corregida bloqueada tras aplicar SQL paralelo sobre documental; se identificó sobreescritura de RPC. |
| [40499943882](https://github.com/josegude-ux/KONTROLA/actions/runs/40499943882) | **FAIL** | Corregido orden de propuestas; una aserción de la nueva prueba consultaba una Verificación ajena desde el preparador y RLS ocultaba la fila. Error de test, no fallo probado de función de Preparación. |
| [40500100793](https://github.com/josegude-ux/KONTROLA/actions/runs/40500100793) | **SUCCESS** | Ambas jobs exitosas. Suite documental histórica, concurrente y suite paralela, escenario BC cruzado, control de orden y respeto de RLS completados. |

Los tests de integridad entre dos usuarios consultan las filas cruzadas con `reset role` **solo en la base ficticia**. Ningún permiso de producción ni policy RLS se modifica.


## Refuerzo posterior — Verificación iniciada sin Preparación

La suite también ensaya una segunda carga ficticia `LP26-94002` que se publica normalmente, cuyo verificador (usuario de prueba distinto de administración) inicia **solo** Verificación mediante `kontrola_iniciar_verificacion`, sin registro en `kontrola_preparaciones`. Administración puede revisar un segundo PDF, pero `kontrola_publicar_importacion` debe rechazar su sustitución. Se valida que el PDF publicado, su hash, revisión y ausencia de Preparación permanezcan invariables. No se cambian permisos del operario.

El primer intento del test nuevo [40500594013](https://github.com/josegude-ux/KONTROLA/actions/runs/40500594013) **falló por un delimitador PL/pgSQL mal formado en el test**; se corrigió exclusivamente el archivo de prueba, sin tocar funciones productivas. La ejecución posterior [40500715130](https://github.com/josegude-ux/KONTROLA/actions/runs/40500715130) **SUCCESS** confirmó ambos jobs y el bloqueo de sustitución en caso de Verificación exclusiva.

Este escenario refuerza que el bloqueo de publicación es válido cuando Preparación y Verificación no han empezado simultáneamente. **No implica que el frontend esté integrado.**

## Pendientes autorizables y límites

- **No integrado:** PR #60, PR #61, PR #69 y PR #70 continúan independientes y sin fusionar.
- Una futura integración deberá preservar `index.html`, `src/app.mjs`, `src/admin.mjs`, `styles.css`, `tests/integration/run.sh`, `sw.js`, y todos los invariantes listados en `docs/BLOQUE_01_MATRIZ_CONSERVACION_17_ARCHIVOS.md`.
- Pruebas reales con perfiles autenticados y carga de archivos autorizados todavía no realizadas; ningún porcentaje funcional de avance debe deducirse del CI.
- Bloque 02, Business Central API, picking, operaciones físicas o despliegue fuera de alcance.
- No adoptar los SQL conjuntos en ambiente real sin revisión de permisos, RLS, seguridad y autorización.
- **Siguiente tarea segura:** registrar resultados en continuidad, verificar última CI del HEAD y mantener propuestas independientes. La combinación efectiva de frontend/DB requiere autorización específica, sin hacer merge automático de PR.
