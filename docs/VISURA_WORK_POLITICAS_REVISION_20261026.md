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

- **CI real del commit `12175c09afdcdc539864c83fc72b0c85404ce451` verificada:** Code Review Gate [#40322668294](https://github.com/josegude-ux/KONTROLA/actions/runs/40322668294), CSV Pilot Tests [#40322668145](https://github.com/josegude-ux/KONTROLA/actions/runs/40322668145) y Queue Audit [#40322668326](https://github.com/josegude-ux/KONTROLA/actions/runs/40322668326): las tres ejecuciones terminaron con `success`. Comprobar de nuevo CI para cualquier nuevo SHA de cabecera antes de fusionar; las pruebas siguen siendo simuladas en lo relativo al transporte.
- **Pendiente independiente:** probar el transporte GitHub GET del **módulo Python**, con origen autenticado y credenciales inyectadas de forma segura por el entorno autorizado; no extraer credenciales del conector ni incluirlas en archivos.
- **Pendiente:** verificar protección clásica, reglas activas que realmente aplican a la rama base de #43, CODEOWNERS, revisores elegibles, políticas de bypass, vigencia de aprobaciones y controles del eventual ejecutor aislado.
- No fusionar, desplegar, publicar ni habilitar escritura autónoma sin revisión y autorización expresa. Esta rama es exclusivamente de código piloto y documentos de continuidad.


## Continuación — resumen Actions y corrección de exhaustividad (26/10/2026)

- En `scripts/visura_github_action_summary.py` se representa una tabla **no autorizante** de reglas `pull_request` observadas para la rama de destino y la predeterminada (si son distintas): identificador numérico de ruleset, aprobaciones exigidas y cinco controles. Los booleanos se traducen exclusivamente a **sí/no/desconocido**, sin renderizar texto arbitrario de GitHub o nombres de revisores. Falta de evidencia, respuestas inaccesibles o ausencia de reglas se explicitan y no se convierten en «sin protección».
- En `tests/test_visura_github_action_summary.py` se agregan **seis tests** de renderizado y validación de datos ausentes, malformados y no confiables. Las pruebas no constituyen una llamada HTTP autenticada a GitHub del módulo.
- En `scripts/visura_github_policy_probe.py`, `active_review_control_fields_complete` solo puede ser verdadero si se observó al menos una regla PR completa; sin reglas queda falso. Test de regresión en `tests/test_visura_github_policy_probe.py`.
- **Pruebas GitHub Actions verificadas por SHA de código `65ebdea7de7c1ffcfefaf771ee93aa29397741b3`**: [Code Review Gate #40325209234](https://github.com/josegude-ux/KONTROLA/actions/runs/40325209234), [CSV Pilot Tests #40325209324](https://github.com/josegude-ux/KONTROLA/actions/runs/40325209324), [Queue Audit #40325209274](https://github.com/josegude-ux/KONTROLA/actions/runs/40325209274): todas en `success`.
- No tocar otras ramas, no usar credenciales del conector fuera de su API ni activar ejecución autónoma. **Primera tarea pendiente**: prueba autenticada de solo lectura del módulo Python en entorno aislado con credencial gestionada de forma segura y obtener verificación fiable de políticas efectivas, CODEOWNERS, bypass y elegibilidad de revisión.


## Hito 26/10/2026 — CODEOWNERS por rama de destino real

- Nuevo módulo `scripts/visura_github_codeowners_probe.py`: observa **solo metadatos** con tres consultas GET a las ubicaciones permitidas (`.github/CODEOWNERS`, `CODEOWNERS`, `docs/CODEOWNERS`) usando el nombre de rama verificado en el PR; valida nombre de repositorio, rama, token y metadatos de archivo. Nunca imprime contenido, nombre de responsables ni token.
- `404` y `403` permanecen como desconocidos; un archivo de menor prioridad no demuestra ser el aplicable si la ubicación preferente es inaccesible. `file_absence_verified`, `effective_code_ownership_verified`, `reviewer_eligibility_verified`, `execution_authorized`, `merge_authorized` y `deployment_authorized` siguen en `false`.
- `scripts/visura_github_audit_bundle.py` conecta la observación a la **rama real de destino**; `scripts/visura_github_action_summary.py` refleja archivo visible/desconocido sin autoconceder permisos.
- 7 pruebas del observador, una prueba de vínculo con la rama real del PR y 4 pruebas del resumen (además de los tests anteriores). Todas las llamadas HTTP del módulo se simularon en pruebas; el conector de ChatGPT no suministra token a Python.
- CI real del código `14895aedae0e1106332d97c41c32b7b7c8a3f1a9`: [Code Review Gate #40327500105](https://github.com/josegude-ux/KONTROLA/actions/runs/40327500105), [CSV Pilot Tests #40327500122](https://github.com/josegude-ux/KONTROLA/actions/runs/40327500122), [Queue Audit #40327500165](https://github.com/josegude-ux/KONTROLA/actions/runs/40327500165); las tres con `success`.
- **Pendiente prioritario:** prueba autenticada real de solo lectura del propio módulo Python con token legítimo administrado por entorno confiable; protección efectiva de la rama base #43, reglas de bypass, CODEOWNERS efectivamente aplicable, elegibilidad y revalidación. No introducir credenciales ni activar escritura o merge.
