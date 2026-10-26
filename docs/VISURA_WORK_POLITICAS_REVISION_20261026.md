# VISURA AUTO-DEV — ampliación de observación de políticas de revisión

**Fecha:** 2026-10-26. **Responsable:** conversación continuadora VISURA AUTO-DEV (origen VISURA WORK).

## Verificación antes del cambio

- Repositorio: `josegude-ux/KONTROLA`. La rama base de código es la PR #44 (`fix/visura-work-review-snapshot-repository-20261026`), commit `b934a2ccf5fbff11de8ced3b2d121a46b7750408`, abierta en borrador sobre #43; #43 abierta sobre #37.
- Se recuperaron de GitHub los cuatro documentos actualizados de continuidad en `docs/visura-work-chat-nuevo-20261026` y la auditoría de recuperación. La nueva rama de código `fix/visura-work-review-policy-flags-20261026` deriva de dicha rama documental para preservar todo el traspaso.
- PR #45 y #46 son de VISURA PREPARA, **no** son continuidad de AUTO-DEV. No modificar sus archivos.
- Sigue sin demostrarse el transporte autenticado del módulo Python fuera de los mocks. La protección clásica dio HTTP 403 por permisos; la comprobación de reglas aplicables por rama no pudo completarse desde esta integración. El ruleset que aparece en el repositorio aplica a `main`, no por ello a la rama objetivo de #43.

## Cambio de código aislado

`scripts/visura_github_policy_probe.py` extrae además de `required_approving_review_count` estos campos de cada regla `pull_request` **realmente devuelta por el endpoint de reglas aplicadas a la rama**:

- `dismiss_stale_reviews_on_push`
- `require_code_owner_review`
- `require_last_push_approval`
- `required_review_thread_resolution`
- `require_extra_approval_for_unattributed_changes`

Cada valor opcional ausente se conserva como `null` (no como `false`), y un valor presente que no sea booleano se rechaza. El campo `active_review_control_fields_complete` solo describe si todos estos campos vinieron informados para las reglas `pull_request` recibidas; **no** verifica que la lista de reglas sea una política global suficiente ni que un revisor haya cumplido los requisitos. Si el endpoint no responde o los parámetros faltan, queda en falso.

Se mantienen en `false` `repository_policy_verified`, `execution_authorized`, `merge_authorized` y `deployment_authorized`. No se crea flujo de ejecución, solicitud de permisos elevados, pagos, conexiones a Business Central o Supabase.

`tests/test_visura_github_policy_probe.py` amplía escenarios de todos los booleanos, `false` real frente a `null` desconocido, 403, respuestas malformadas y solo GET. Las pruebas son **simulaciones del transporte HTTP**; un CI correcto prueba la lógica de código, no autenticación real ni elegibilidad.

## Comprobación y siguientes pasos

- **Pendiente al registrar este documento:** confirmar CI de la rama por SHA exacto y evitar afirmar que el código está probado sin ejecutar los checks. Actualizar aquí cuando exista evidencia.
- **Pendiente independiente:** probar el transporte GitHub GET del **módulo Python**, con origen autenticado y credenciales inyectadas de forma segura por el entorno autorizado; no extraer credenciales del conector ni incluirlas en archivos.
- **Pendiente:** verificar protección clásica, reglas activas que realmente aplican a la rama base de #43, CODEOWNERS, revisores elegibles, políticas de bypass, vigencia de aprobaciones y controles del eventual ejecutor aislado.
- No fusionar, desplegar, publicar ni habilitar escritura autónoma sin revisión y autorización expresa. Esta rama es exclusivamente de código piloto y documentos de continuidad.
