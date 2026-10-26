# VISURA AUTO-DEV — auditoría manual de revisiones GitHub

**Estado:** implementación de lectura y pruebas simuladas completadas; **no activada en la rama predeterminada**. La PR #37 sigue en borrador. Ninguna salida de este mecanismo autoriza ejecutar, fusionar o desplegar.

## Qué hace

- Consulta por HTTPS la API de GitHub con **GET** para leer un PR y sus revisiones.
- Usa el ID numérico de la cuenta del revisor para distinguirla del autor.
- Rechaza datos malformados, revisiones duplicadas y respuestas truncadas.
- Comprueba que los metadatos principales del PR no cambian mientras se leen sus revisiones.
- Añade a la respuesta JSON el campo `review_audit`, con observaciones separadas:
  - `observed_current_commit_approvals`: registros de aprobación que mencionan el SHA actual, **no aprobaciones efectivas verificadas**.
  - `observed_current_commit_changes_requested`: solicitudes de cambios observadas para ese SHA.
  - `observed_stale_review_ids`: revisiones de otros commits.
  - `observed_self_review_ids`: revisiones de la misma cuenta numérica que el autor.
  - `observed_dismissed_review_ids` y `observed_pending_review_ids`: registros descartados y pendientes observados.
  - `observed_latest_decisive_reviews_by_account`: última decisión observada por ID numérico de cuenta entre `APPROVED`, `CHANGES_REQUESTED` y `DISMISSED`, ordenada según el ID numérico de la revisión. Es una vista orientativa, **no una prueba de que GitHub considere esa decisión vigente**.
  - `observed_latest_approval_records`: entradas de esa vista cuya última decisión observada es `APPROVED`; no se conceden permisos por aparecer aquí.
  - `observed_superseded_decisive_review_ids`: decisiones anteriores de la misma cuenta sustituidas por otra observación, aunque sigan presentes en `observed_current_commit_approvals`.
  - Los registros `COMMENTED` y `PENDING` no sustituyen decisiones enviadas; los registros de otro SHA y las auto-revisiones quedan excluidos de la vista de últimas decisiones.
- Señala `effective_approval_verification: false`, `repository_policy_verified: false`, `execution_authorized: false`, `merge_authorized: false` y `deployment_authorized: false`.

## Uso previsto

Una vez que la definición del workflow haya sido **revisada y fusionada explícitamente** a la rama predeterminada, un usuario autorizado podrá abrir **GitHub → Actions → VISURA AUTO-DEV - Manual PR Review Audit → Run workflow**, e introducir un número de PR.

La definición preparada usa exclusivamente `contents: read`, `pull-requests: read` y `checks: read`; hace checkout de la rama predeterminada, no del código del PR inspeccionado. No ejecuta código del PR objetivo.

Para una prueba local en una copia de código confiable, configurar `GITHUB_TOKEN` mediante un mecanismo seguro y ejecutar:

```bash
python3 -m scripts.visura_github_audit_bundle josegude-ux/KONTROLA 37 main
```

Nunca pegar el token en el comando, los logs o el chat. No se requiere ni se permite ninguna clave de proveedor de IA.

## Observación adicional de protección de ramas

El workflow manual preparado usa **un solo comando de auditoría unificada** (`scripts.visura_github_audit_bundle`). Lee primero el PR y obtiene de GitHub su rama de destino verdadera (`base.ref`) y SHA base, sin aceptar que la tarea elija la rama. Después consulta las políticas de **esa rama de destino** y, si es distinta, también las de `main` (rama predeterminada del repositorio). Finalmente vuelve a leer el PR y falla si ha cambiado su base, SHA, autor, repositorio o estado durante la auditoría.

Por ejemplo, el PR #37 apunta a `chore/visura-auto-dev-guardrails`, **no** a `main`. El nuevo informe `target_branch_policy` inspeccionaría guardrails; `default_branch_policy` ofrecería contexto sobre `main`. El campo `target_differs_from_default` señala la diferencia y `report_is_atomic` permanece `false` porque la API no ofrece un snapshot transaccional.

Ambas políticas se leen con `scripts.visura_github_policy_probe`. Su informe distingue explícitamente:

- `classic_protection.lookup: retrieved`: obtuvo una respuesta de configuración clásica, incluyendo número de aprobaciones exigidas y estado de ciertas comprobaciones, sin interpretar que sean suficientes.
- `classic_protection.lookup: not_found_or_inaccessible`: respuesta HTTP 404; **no significa** que la rama esté desprotegida.
- `classic_protection.lookup: inaccessible`: respuesta HTTP 403, sin permisos de lectura suficientes.
- `rulesets.listed_count` y `listed_active_count`: reglas listadas, sin comprobar si se aplican a `main`. Si la lista no se puede consultar, los valores son `null`.

**Limitación de permisos:** GitHub exige normalmente `Administration: read` para consultar la protección clásica (https://docs.github.com/en/rest/branches/branch-protection). El `GITHUB_TOKEN` del workflow está restringido a `contents: read`, `pull-requests: read` y `checks: read`, por lo que no se espera que pueda verificar esa protección clásica. El flujo **no eleva privilegios ni solicita tokens de administrador**: informa de la falta de acceso y mantiene `repository_policy_verified: false`.

La existencia de un ruleset no significa necesariamente que proteja la rama inspeccionada; pueden intervenir condiciones, excepciones y *bypass*. Ninguna de estas consultas de lectura es una puerta de autorización para ejecutar o fusionar código.

### Reglas activas aplicables específicamente a la rama

Se incorporó la consulta oficial `GET /repos/{owner}/{repo}/rules/branches/{branch}`, que devuelve las reglas **activas de rulesets aplicables a esa rama**, incluidas las heredadas de la organización. GitHub ofrece este endpoint con permiso `Metadata: read`, también para repositorios públicos sin autenticación. Esta consulta no sustituye la protección clásica ni demuestra que no existan usuarios con excepciones.

El resultado `effective_ruleset_rules` distingue:

- `lookup: retrieved`: respuesta completa; `observed_rule_count` y `observed_rule_types` describen solo las reglas devueltas, sin certificar seguridad suficiente.
- `lookup: inaccessible` o `not_found_or_inaccessible`: respuesta 403/404; conteos `null`, no se infiere ausencia de protección.
- `applied_ruleset_api_responded`: indica una consulta completada, **no** que la política sea suficiente ni una aprobación vigente.
- `includes_classic_branch_protection: false`: recuerda que las reglas clásicas se consultan por separado.

La respuesta completa de la auditoría sigue fijando `repository_policy_verified: false`, `execution_authorized: false`, `merge_authorized: false` y `deployment_authorized: false`. El workflow manual ya preparado utiliza este lector, aunque **sigue sin estar activado**.

Documentación oficial: https://docs.github.com/en/rest/repos/rules#get-rules-for-a-branch.

## Vigilancia automática de permisos del workflow

Se han añadido ocho pruebas de contrato en `tests/test_visura_manual_audit_workflow.py` que inspeccionan el YAML de la auditoría manual. Comprueban que:

- La única activación prevista es `workflow_dispatch` y existe un único trabajo de auditoría.
- Los únicos permisos declarados son `contents: read`, `pull-requests: read` y `checks: read`; no se conceden permisos de escritura.
- Se hace checkout de la **rama predeterminada** con `persist-credentials: false`, sin ejecutar código del PR inspeccionado.
- El **único comando autorizado** llama a `scripts.visura_github_audit_bundle`, que consulta el PR y ambas políticas mediante componentes de solo lectura.
- El token procede del `GITHUB_TOKEN` facilitado por Actions, sin secretos adicionales.
- El workflow de revisión de código incluye la definición de auditoría manual entre los archivos que provocan su ejecución.

Estas son pruebas de regresión sobre los archivos del PR, **no una prueba de autenticidad del runner ni sustituyen las políticas y aprobaciones humanas de GitHub**.

## Resumen visible en GitHub Actions

El comando de auditoría unificada crea ahora un **resumen Markdown** directamente
en la pestaña **Summary** del trabajo, cuando GitHub Actions proporciona
`GITHUB_STEP_SUMMARY`. Esto evita tener que leer el JSON completo desde el
móvil. El JSON técnico sigue apareciendo en la salida del comando.

La vista presenta la identificación del repositorio y del PR, su commit, la
rama de destino real, la rama principal, recuentos de revisiones observadas
una tabla que distingue tres consultas por rama: protección clásica,
rulesets aplicables y rulesets listados, más un recuento separado de checks de CI
observados para el SHA exacto del PR.

Se muestran los estados `retrieved`, `inaccessible` y
`not_found_or_inaccessible`; la ausencia de datos se presenta como
**desconocido**, nunca como "sin protección". El texto de nombres de revisores,
comentarios y cuerpos de PR **no** se copia al resumen. Los campos de identidad
del PR se validan antes de representarlos, y se rechazan separadores
Markdown como `|` para impedir que una rama altere las tablas. Toda la vista advierte que **no
autoriza ejecución, merge ni despliegue**.

Módulo: `scripts/visura_github_action_summary.py`. La escritura se realiza
únicamente en el archivo de resumen temporal suministrado por GitHub Actions;
no modifica archivos del repositorio ni datos de las aplicaciones. En un
entorno local sin `GITHUB_STEP_SUMMARY` se mantiene la salida JSON habitual.

Este resumen es un instrumento informativo. Las reglas de rama pueden cambiar
después de la consulta, y una autorización real requiere verificaciones externas
y aprobación humana.

## Evidencia de CI ligada al commit exacto

El lector de solo lectura `scripts/visura_github_commit_checks.py` consulta
`GET /repos/{owner}/{repo}/commits/{sha}/check-runs` con `filter=latest` y
paginación controlada. Los checks que devuelva GitHub han de corresponder al
`head_sha` del PR inspeccionado. Se rechazan respuestas incompletas,
identificadores repetidos y checks vinculados a un commit diferente. Un 403/404
se registra como `inaccessible_or_not_found`, nunca como éxito de las pruebas.

El informe JSON unificado añade `head_check_runs`, y la vista de GitHub
Actions muestra los **recuentos observados**: checks encontrados, conclusiones
`success`, conclusiones negativas y checks todavía sin completar. No copia
nombres arbitrarios de checks ni comentarios a las tablas Markdown.

**Importante:** `success` significa un resultado observado de la API; no
demuestra que todas las comprobaciones *obligatorias* de la rama sean esas,
que sus editores sean confiables, ni que las revisiones humanas estén vigentes.
Los campos `required_checks_verified`, `execution_authorized`,
`merge_authorized` y `deployment_authorized` permanecen siempre en `false`.
Una lista vacía de checks tampoco autoriza nada.

El permiso adicional `checks: read` es exclusivamente de lectura, está
fijado por pruebas de contrato del workflow y no concede privilegios de
escritura. Esta integración se ha probado con respuestas REST simuladas;
**no** se ha ejecutado todavía el workflow manual en la rama predeterminada.

## Qué NO demuestra

La vista de últimas decisiones presupone que los IDs numéricos de las revisiones reflejan su orden de creación; **no comprueba marcas de tiempo, reglas de dismiss ni la última decisión efectiva en GitHub**. La API puede devolver una aprobación aunque esta no sea válida para las reglas vigentes de la rama. Puede existir una revisión posterior, un cambio de política, una eliminación de permisos o un cambio del PR después de la consulta. El informe clasifica **registros observados**, no toma decisiones de seguridad.

Antes de habilitar cualquier automatización con escritura será imprescindible verificar, fuera de este módulo, las reglas de protección y permisos de GitHub, revalidar el estado inmediatamente antes de actuar y exigir aprobación humana de merge/despliegue.

## Validación

Code Review Gate #135: **200 de 200 pruebas correctas** para el primer flujo unificado. Se añadió después una prueba integrada adicional con respuestas REST simuladas; su CI queda pendiente. El workflow manual sigue sin activarse. La consulta de producción y las reglas de protección de rama siguen pendientes de validación independiente.
