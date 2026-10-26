# VISURA AUTO-DEV — detección de cambios en políticas durante auditoría

**Fecha:** 26/10/2026. **PR:** [#47](https://github.com/josegude-ux/KONTROLA/pull/47), borrador. **Rama:** `fix/visura-work-review-policy-flags-20261026`.

## Punto de partida y evidencia

El último estado confirmado era `4c9f6010c8d447fb610d60d6fa95eec0286e5a23` con tres checks verdes, sin novedades posteriores del agente en GitHub, no equivalente a `main`. No se reconstruye desde ramas antiguas ni se modifica ninguna PR de PREPARA o INVENTA.

## Implementación

El auditor unificado `scripts/visura_github_audit_bundle.py` ya comprobaba PR al inicio y al final, consulta de revisiones, permisos, checks y CODEOWNERS. Existía un hueco: **las reglas de protección de la rama pueden cambiar aunque el SHA de la PR permanezca igual**.

Ahora realiza una **segunda observación de las políticas de la rama real de destino** después de obtener el resto de evidencias y antes de la comprobación final de metadatos de la PR. Compara las observaciones normalizadas y aborta con `ValueError` si difieren. Permite detectar cambios entre consultas (incluida pérdida de acceso). No consulta políticas de otra rama indicada en una tarea, y la rama predeterminada sigue siendo contexto, no criterio de autorización.

En el informe se añade `same_target_policy_after_audit = true` solo cuando hubo coincidencia. El resumen de Actions muestra `Política de destino releída | coincidente al releer (no autorización)`. Informes antiguos carecen de este campo y se presentan como `desconocido`; falsos, tipos erróneos y banderas que simulen revalidación se rechazan.

El control es **no atómico**; cambios inmediatamente después del último GET siguen siendo posibles y se requiere revalidar al actuar. Una coincidencia **no** demuestra la suficiencia de la política, elegibilidad de revisores, ausencia de bypass o permiso de merge.

## Pruebas y CI

Se añadieron tres pruebas para detectar alteración de política, cambio de accesibilidad, y orden de consultas antes del GET final de PR; se actualizaron las expectativas de lecturas y se añadieron tres pruebas de salida legible, valor ausente y falsificación.

Commit del código **`5632ff14992ee464a95036e6381e8b6e0fd79431`** comprobado en GitHub:

- [Code Review Gate #40337533409](https://github.com/josegude-ux/KONTROLA/actions/runs/40337533409): `success`.
- [CSV Pilot Tests #40337533369](https://github.com/josegude-ux/KONTROLA/actions/runs/40337533369): `success`.
- [Queue Audit #40337534097](https://github.com/josegude-ux/KONTROLA/actions/runs/40337534097): `success`.

No se ha modificado ningún archivo de GitHub Actions ni ejecutado el módulo Python con credencial real; estos checks son pruebas de lógica y mocks. El acceso real a protección clásica ha permanecido limitado para esta conexión.

## Pendientes

La autenticación efectiva del ejecutor, las políticas completas de ramas, bypass, CODEOWNERS aplicable, elegibilidad de revisores, presupuesto externo y aprobación humana siguen sin estar acreditados. No se habilita ejecución, merge ni despliegue. No hay operaciones sobre datos empresariales.
