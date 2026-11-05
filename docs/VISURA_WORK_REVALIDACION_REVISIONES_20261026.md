# VISURA AUTO-DEV — Revalidación de revisiones de GitHub

**Fecha:** 26/10/2026. **Repositorio:** `josegude-ux/KONTROLA`. **PR:** [#47](https://github.com/josegude-ux/KONTROLA/pull/47), abierta en borrador, rama `fix/visura-work-review-policy-flags-20261026`.

## Estado verificado antes del cambio

El commit anterior era `b3e6114b401f7c822dff97a96e355d5be0be8adb`, con Code Review Gate, CSV Pilot Tests y Queue Audit terminados correctamente. Las PR anteriores #44, #43 y #37 permanecían independientes; no se identificó una PR posterior de AUTO-DEV que sustituyera la #47. La documentación actual de la rama de desarrollo tiene prioridad sobre los archivos antiguos de `main`.

## Problema y solución aislada

La lectura final de metadatos de PR y la relectura de las políticas de rama ya estaban implementadas. Sin embargo, GitHub permite revocar una aprobación, presentar una solicitud de cambios o incorporar otra revisión **sin cambiar el SHA de la PR**. Un informe que solo verificaba los metadatos del PR no detectaba necesariamente esas variaciones.

El auditor `scripts/visura_github_audit_bundle.py` recupera de nuevo el snapshot de PR y revisiones mediante el mismo cliente HTTPS de solo lectura y el token entregado por un entorno de confianza. Compara los metadatos vinculantes (repositorio, PR, rama/base, SHA, autor, estado) y cada revisión por identificador numérico, cuenta, login, estado y commit. Normaliza el orden por identificador para tolerar diferencias inocuas de paginación.

Si aparece una revisión nueva, se retira una aprobación, se modifica el estado o cambia algún registro, se rechaza la auditoría con `ValueError` antes del último GET de la PR. Un resultado coincidente deja `same_review_records_after_audit = true` **solo como observación**, no como evidencia de aprobación elegible ni de autenticación o permiso. La relectura de política de rama ya implementada se conserva.

`scripts/visura_github_action_summary.py` muestra «Revisiones releídas | coincidentes al releer (no aprobación)» o «desconocido» en informes anteriores; rechaza reclamaciones malformadas o falsificadas.

## Validación

Se añadieron **cuatro pruebas** al auditor: revocación sin cambio de SHA, nueva solicitud de cambios, paginación reordenada sin alteraciones y vinculación estricta de la segunda consulta al repositorio, PR y token. Se añadieron **tres pruebas** de visualización y rechazo de reclamaciones falsificadas. Dos tests iniciales fallaron por transportes simulados de permisos de revisor que no estaban aislados; los logs CI mostraron el error, y se corrigieron exclusivamente esos mocks, no la lógica protectora.

**Código final probado:** `e92effb54965e2055247bef9841f41d56ba1ba6e`.

- [Code Review Gate #40340744201](https://github.com/josegude-ux/KONTROLA/actions/runs/40340744201): `success`.
- [CSV Pilot Tests #40340744017](https://github.com/josegude-ux/KONTROLA/actions/runs/40340744017): `success`.
- [Queue Audit #40340744828](https://github.com/josegude-ux/KONTROLA/actions/runs/40340744828): `success`.

El workflow manual conserva exactamente su contenido anterior, blob `e2bc705b51af3540d769e3479e01e0cd0ccc0a85`. No se ha fusionado, desplegado, emitido un coste de IA ni tocado Supabase, Business Central, PREPARA o INVENTA.

## Limitaciones y siguiente fase

La auditoría sigue siendo **no atómica**: revisiones, permisos, reglas y checks pueden cambiar después del último GET. Se mantienen `repository_policy_verified`, `execution_authorized`, `merge_authorized` y `deployment_authorized` en falso. Los tests HTTP simulados y la CI verde no acreditan una ejecución real autenticada del módulo Python.

Prioridades: ejecutar el auditor de lectura desde código de confianza con token legítimo gestionado por entorno autorizado; obtener evidencias de reglas efectivas de la rama, CODEOWNERS realmente aplicable, bypass y elegibilidad de revisores; diseñar revalidación de permisos de revisores si esos datos llegaran a intervenir en decisiones. No activar un ejecutor, fusionar ni desplegar sin autorización expresa.
