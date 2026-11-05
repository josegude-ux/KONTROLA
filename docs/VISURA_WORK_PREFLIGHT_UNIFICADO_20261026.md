# VISURA AUTO-DEV — preflight GET integrado en auditoría unificada

**Fecha:** 26/10/2026. **Repositorio:** `josegude-ux/KONTROLA`. **Rama:** `fix/visura-work-review-policy-flags-20261026`. **PR:** [#47](https://github.com/josegude-ux/KONTROLA/pull/47), en borrador.

## Estado de origen comprobado

La PR #47 tenía commit `b7d21f56949f1e8429146f27638728f09226a812`, tres workflows correctos y documentación actualizada. La PR #44 (`b934a2c`) se mantiene como antecedente, sin reemplazar este avance. No se identificó una PR posterior específica de AUTO-DEV que desplazara la #47. `main` no es fuente de verdad de este trabajo.

## Cambios realizados

1. En `scripts/visura_github_audit_bundle.py`, la comprobación de transporte `inspect_readonly_auth_preflight` se realiza dentro del **mismo comando Python existente**, utilizando el mismo `opener`, repositorio, PR y token entregado por el entorno autorizado. No se ha añadido un segundo paso a GitHub Actions ni habilitado un permiso de escritura.
2. Las respuestas de GET de metadatos del repositorio y la PR se almacenan en el campo `github_transport_preflight`. Los valores `retrieved` / `unauthorized` / `inaccessible` / `not_found_or_inaccessible` no acreditan alcances de token ni derecho a fusionar. No se muestra ni registra ninguna credencial.
3. Si la rama base o el SHA de la PR obtenidos en la lectura de transporte difieren de los obtenidos en `fetch_readonly_review_snapshot`, se genera `ValueError` **antes** de inspeccionar políticas. La comprobación final posterior del PR existente también se conserva, sin pretender atomicidad.
4. En `scripts/visura_github_action_summary.py` se presenta un apartado de **diagnóstico, no autenticación**, con estados fijos y verificados. La salida rechaza los informes con contexto, rama, SHA o banderas de autorización falsificados, sin procesar texto arbitrario de GitHub.
5. `tests/test_visura_github_audit_bundle.py`: cuatro pruebas sobre el paso integrado, discrepancias de rama/SHA y acceso desconocido. `tests/test_visura_github_action_summary.py`: cinco nuevas pruebas para el resumen seguro.

## CI y corrección de prueba

Una prueba anterior simulaba deliberadamente la rama base `main`, pero conservaba un preflight simulado de otra rama. El nuevo control la rechazó. Se inspeccionaron logs de Code Review Gate y Queue Audit y se corrigió **el dato de prueba**, no la comprobación. El commit de código final `885042dbb50bf4bc5a053ce13f888b72e1bb7320` pasó:

- [Code Review Gate #40334951854](https://github.com/josegude-ux/KONTROLA/actions/runs/40334951854) — `success`.
- [CSV Pilot Tests #40334951628](https://github.com/josegude-ux/KONTROLA/actions/runs/40334951628) — `success`.
- [Queue Audit #40334951448](https://github.com/josegude-ux/KONTROLA/actions/runs/40334951448) — `success`.

El workflow manual `.github/workflows/visura-auto-dev-manual-review-audit.yml` mantiene el blob original `e2bc705b51af3540d769e3479e01e0cd0ccc0a85`; sigue siendo despacho manual, con un solo comando y `contents/pull-requests/checks: read`. GitHub Actions comprueba el código en la PR, **pero no equivale a haber ejecutado la auditoría manual con un token real**. La auditabilidad de políticas de ramas continúa sin acreditarse.

## Próximos pasos y límites

- **Pendiente real:** ejecutar la auditoría manual unificada desde código de confianza y una credencial autorizada del entorno, una vez que el workflow esté revisado y autorizado para incorporarse a la rama predeterminada. No introducir tokens en el chat, commits ni comandos.
- **Pendiente:** verificar protección clásica (consulta 403 desde el conector), rulesets aplicados a la rama destino, CODEOWNERS efectivo, revisores elegibles, bypass y condiciones de un eventual agente autónomo.
- Todo el componente sigue en modo **diagnóstico de solo lectura**. `repository_policy_verified`, `execution_authorized`, `merge_authorized` y `deployment_authorized` permanecen falsos. No fusionar, desplegar, publicar ni modificar datos empresariales sin permiso expreso.
