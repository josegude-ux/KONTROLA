# VISURA AUTO-DEV — Revalidación de resultados de CI sin cambiar el SHA

**Fecha:** 27/10/2026. **Repositorio:** `josegude-ux/KONTROLA`. **PR propia:** [#78](https://github.com/josegude-ux/KONTROLA/pull/78) (borrador), rama `fix/visura-auto-dev-recheck-ci-evidence-20261027`. **Base:** rama de [PR #77](https://github.com/josegude-ux/KONTROLA/pull/77), SHA `62963cda228e06b0d26dffb64412c7cc348ff8d9`, no alterada.

## Motivo

Las PR #47, #50 y #77 ya detectan cambios de metadatos de PR, reglas de revisión, votos, permisos y CODEOWNERS. Los **check-runs y estados heredados de commit pueden cambiar sin que el head SHA del PR cambie**: un job puede terminar, fallar o volver a ejecutarse; un contexto de status puede actualizarse. El auditor inspeccionaba esos resultados una sola vez.

## Cambio aislado

- `scripts/visura_github_audit_bundle.py` vuelve a solicitar check-runs y legacy statuses **después** de la revalidación de otras pruebas y **antes del último GET** de metadatos del PR. Si los resultados materiales difieren, el informe se rechaza con `ValueError`. Ambas peticiones utilizan exclusivamente el repositorio y SHA real del snapshot validado y el mismo transporte HTTPS de solo lectura.
- Normaliza el orden de registros nominados de check-run por nombre, ID de app, estado y conclusión; así un orden distinto en páginas no se confunde con un cambio. La comparación usa recuentos por estado y conclusión, completitud, nombre y app, estado y conclusión. Los legacy statuses se comparan por la salida validada que ya ordena contextos.
- Añade `same_commit_checks_after_audit` y `same_legacy_statuses_after_audit`, que solo significan **observaciones coincidentes**. `scripts/visura_github_action_summary.py` muestra ambos estados como «coincidentes al releer (no aprobación de CI)» o «desconocido» para informes anteriores; rechaza valores falsos o malformados.
- Se añaden **ocho tests** (cinco del auditor y tres del resumen): conclusión que cambia con SHA igual, legacy status que cambia, acceso que deja de estar disponible, cambios inocuos de orden, llamadas acotadas al SHA/PR, visualización no autorizante, informes antiguos y falsificación.

## Validación y alcance

Primer commit con código de esta PR: `8b074a59066e311cd96996d011eb1511b1e84851`. GitHub Actions:

- [Code Review Gate #40563126071](https://github.com/josegude-ux/KONTROLA/actions/runs/40563126071): **success**, 392 pruebas Python, 392 OK.
- [Queue Audit #40563126252](https://github.com/josegude-ux/KONTROLA/actions/runs/40563126252): **success**.
- CSV Pilot Tests no se inició en ese SHA porque el workflow filtra rutas; actualizar `docs/CONTINUIDAD.md` permite validarlo en el commit documental posterior. El informe final debe registrar la CI **del SHA exacto** cuando termine, sin inventar resultados.

El workflow manual, permisos, secreto, ramas de PR #47/#50/#77 y datos de PREPARA, INVENTA, Centro de Mando, Supabase o Business Central **no se modifican**. Las pruebas HTTP son simuladas. No se ha probado autenticación efectiva del módulo Python desde este entorno.

## Bloqueos y siguiente fase

No hay snapshot atómico multi-GET: puede haber mutaciones posteriores al cierre. Tampoco se ha acreditado la política efectiva de todos los destinos, bypass, elegibilidad de revisores, ni que los check-runs observados satisfagan requisitos de GitHub. **No autorizar ejecución autónoma, merge, despliegue ni pago externo**. La siguiente fase efectiva requiere auditoría autenticada real desde código y credenciales de un entorno de confianza y acceso autorizado a políticas; no copiar credenciales al chat o documentación.
