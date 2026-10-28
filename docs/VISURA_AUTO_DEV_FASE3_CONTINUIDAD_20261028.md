# VISURA AUTO-DEV 09 — Fase 3: frontera denegatoria y verificación de concesiones

Fecha: 28/10/2026. Repositorio: `josegude-ux/KONTROLA`. Continuidad sobre **PR #84**; la PR #83 y toda la infraestructura previa quedan intactas.

## Estado inicial comprobado

- PR #83: OPEN/DRAFT, HEAD `3bec91441638a82210ceb43c50f629b5801ae173`; base PR #78.
- PR #84: OPEN/DRAFT, HEAD `3a6c0275738d22464ce6ae03827ef1a09aa4ee21`; base PR #83.
- CI del HEAD #84 observado: Code Review Gate y Queue Audit `completed/success`; el detalle histórico de código `7a57ec3` informa **422/422 PASS**. El HEAD `3a6c027` es documental posterior; no atribuirle retroactivamente la ejecución de 422 tests.
- Se conserva `scripts/visura_auto_dev_configurable.py` con dos operaciones AST y fixtures confiables, y `scripts/visura_auto_dev_fixture_executor.py` de Fase 1, sin alterarlos.

## Implementación Fase 3

Archivo nuevo `scripts/visura_auto_dev_phase3_security.py`:

1. `task_digest`: SHA-256 canónico de la tarea validada de la Fase 2. Los datos nunca constituyen instrucciones ejecutables.
2. `verify_signed_grant`: verifica criptográficamente una firma **Ed25519** mediante `openssl pkeyutl` (solo clave pública), con firma creada por un emisor **externo**. Vincula identidad declarada, identificador y hash íntegro de tarea, repositorio, HEAD de 40 hex, rutas, acciones, pruebas, límites, ventana UTC de máximo 15 minutos, identificador de clave, nonce y estado de revocación. Exige observaciones de HEAD y revocación de menos de 30 segundos desde un snapshot suministrado por un supervisor de confianza. Rechaza claves desconocidas, firma falsa, cambios posteriores a firma, expiración, revocación o cambios de HEAD/scope. **No hay claves privadas ni operación de firma en el ejecutor.**
3. `ExternalTrustSnapshot`: contrato de datos para entrega de pruebas del supervisor. El propio agente todavía no puede obtener ni verificar la autenticidad de dicho supervisor. `signature_verified` significa exclusivamente integridad bajo la clave pública proporcionada; **no prueba identidad humana real**. 
4. `isolation_requirements`: contrato que exige usuario sin privilegios, namespace, red apagada, root FS RO, workspace separado, no credenciales, límites de cgroup/PID/CPU/memoria/tiempo, protección de rutas, no-new-privileges, desmontaje y limpieza.
5. `assess_isolation`: rechaza ejecución de código no confiable incluso cuando un cliente declara falsamente que todos los controles están activos. No existe lanzador validado ni atestación externa en Fase 3.
6. `host_capability_inventory`: lectura informativa de posibles herramientas del host, no prueba aislamiento ni activa ejecución.

**Toda respuesta del módulo mantiene `execution_authorized=False`, `human_identity_verified=False`, `github_write_authorized=False`, `merge_authorized=False`.** La comprobación de firma no se conecta al motor de Fase 2 como puerta que permita nuevos trabajos: no hay autorización humana real, verificación de políticas de GitHub, ni contención ejecutable independiente.

## Evidencia de pruebas locales

Código nuevo: `tests/test_visura_auto_dev_phase3_security.py`, con casos positivos de firma Ed25519 **creada con claves efímeras exclusivamente en los tests**; negativos de suplantación y alteraciones, expiración, revocación, binding de HEAD, tarea, límites, rutas, identidad y contexto, falta de OpenSSL, observaciones obsoletas, falsas declaraciones de aislamiento, y compatibilidad de los dos pilotos de la Fase 2.

- `python -m unittest discover -s tests -p 'test_visura_*.py' -q` en workspace que contiene los 25 tests completos de Fase 2 y 33 de Fase 3: **58/58 PASS**.
- `python -m compileall -q scripts tests`: PASS.
- `python -m scripts.visura_auto_dev_configurable --demo`: PASS con ambos pilotos previos (string: fallo/corrección/éxito; integer: éxito al primer intento).
- Los tests de Fase 1 no están incluidos en este **workspace local reducido**, y deben ejecutarse en GitHub Actions con la suite heredada completa.
- Si `openssl` falta, los tests de firma son SKIP (no aprobación) y `verify_signed_grant` falla en modo seguro. El despliegue necesitaría controlar la versión y procedencia del binario.
- **NO EJECUTADO**: ataques de escape contenedor, código hostil, `podman run`, `bwrap`, namespaces/cgroups operativos, acceso GitHub Python autenticado, PR creada por el propio AUTO-DEV, pruebas de políticas del repositorio de destino.

## Riesgos y bloqueos

- No existe aún el supervisor de confianza que custodie la clave privada, valide la identidad del autorizante, haga revalidación online y emita snapshots de confianza. Cualquier código en manos del propio agente que inyectase su propia clave o snapshot podría autorizar una *simulación*, no una autorización real. Por eso ninguna autorización habilita ejecución.
- La verificación de firma y snapshots no es transaccional respecto a cambios concurrentes del repositorio o del estado de revocación. Deben revalidarse al momento de ejecución, en componente separado.
- No existe aún lanzador rootless blindado con namespace, seccomp, red deshabilitada, root FS RO, cuotas cgroup y pruebas de escape realizadas por una entidad separada. `TemporaryDirectory`, RLIMIT o simple presencia de `podman` NO prueban aislamiento.
- Se preservan límites y capacidades de Fases 1 y 2: únicamente código confiable y generado por la gramática interna, sin repositiorios o código arbitrario.
- No se cambian `docs/CONTINUIDAD.md`, workflows, RLS, Supabase, Business Central, PREPARA, INVENTA o Centro de Mando.

## Siguiente fase

1. Crear el **supervisor externo** de autorización, con claves no accesibles al agente, identidad humana autenticada, registros y revocación online, y vinculación a HEAD/CI/CODEOWNERS reales (el verificador actual solo prepara el contrato).
2. Construir lanzador realmente aislado, fuera del proceso que genera parches, con `network=none`, UID no privilegiado, mounts estrictos, cgroups y atestación confiable. Probarlo bajo controles del propio host y en CI, sin ejecutar código hostil hasta que estos controles estén demostrados.
3. Integrar con AUTO-DEV solamente después de comprobar la autenticidad de supervisor y aislamiento, con un único punto de decisión y rechazo por defecto. Nunca convertir `signature_verified` ni un indicador JSON en permiso directo de ejecución.

**Sin merge, deploy, secretos, IA de pago ni permisos de escritura nuevos.**

## CI de código confirmada (SHA inicial de PR #85)

- Commit con código y pruebas: `9582614e7bbf5a81af4e78036da894dbef59b1a0`.
- [Code Review Gate run 40637754319](https://github.com/josegude-ux/KONTROLA/actions/runs/40637754319): `completed/success`, **455/455 tests** en GitHub Actions; firma Ed25519 de fixture y aislamiento denegatorio incluidos. `compileall` y prohibición de API de pago completados correctamente.
- [Queue Audit run 40637754305](https://github.com/josegude-ux/KONTROLA/actions/runs/40637754305): `completed/success`.
- **El commit que añade esta nota es únicamente documental**; los resultados anteriores aplican al SHA de código indicado, no al futuro HEAD documental.
- Riesgo adicional: el nonce de concesión todavía no se consume de forma atómica en ningún registro de autorización. La detección de replay y de revocación entre la lectura y la acción corresponde al supervisor externo aún no implementado.
- El CLI OpenSSL debe suministrarse por una imagen de ejecución de confianza, con versión y procedencia verificadas; su existencia en CI no basta para acreditar seguridad del host.
