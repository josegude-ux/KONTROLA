# VISURA AUTO-DEV — revalidación de CODEOWNERS por versión de blob

**Fecha:** 27/10/2026. **Repositorio:** `josegude-ux/KONTROLA`. **PR aislada:** [#77](https://github.com/josegude-ux/KONTROLA/pull/77), borrador, rama `fix/visura-auto-dev-recheck-codeowners-sha-20261027`, base `fix/visura-auto-dev-recheck-reviewer-permissions-20261026` (PR #50). Origen inmediato: commit `ad00a76dd7fba82d1ec35be8e5aa6457d99a91ae`. Se respetan las PR #47 y #50, sin modificarlas.

## Riesgo encontrado

El observador de CODEOWNERS ya consultaba por GET las ubicaciones `.github/CODEOWNERS`, `CODEOWNERS` y `docs/CODEOWNERS`, pero **descartaba el SHA del blob devuelto por GitHub**. En consecuencia, un cambio de contenido en un archivo existente podía pasar desapercibido aunque el observador siguiera encontrando la misma ruta. Los cambios de CODEOWNERS en la rama base son independientes del SHA del head de la PR auditada.

## Desarrollo aislado realizado

- `scripts/visura_github_codeowners_probe.py`: conserva el SHA del objeto Git para cada fichero observado; para respuestas 403/404 mantiene `blob_sha: null`. Valida 40 dígitos hexadecimales y normaliza la representación a minúsculas. No obtiene ni muestra el contenido del archivo, el texto de los propietarios, las cabeceras o el token.
- `scripts/visura_github_audit_bundle.py`: relee las tres ubicaciones de CODEOWNERS **después** de la revalidación de políticas, revisiones y permisos y **antes** de la última consulta de metadatos de la PR. Una diferencia de rutas, estados o SHA aborta con `ValueError`. `same_codeowners_metadata_after_audit` indica exclusivamente coincidencia entre dos lecturas, **nunca** propiedad efectiva, aprobación ni permiso de ejecución.
- `scripts/visura_github_action_summary.py`: valida los SHA observados sin imprimirlos, permite informes legados sin SHA como evidencia **desconocida**, impide presentar versiones desconocidas como revalidadas y rechaza flags o metadatos falsificados.
- Se añadieron **9 pruebas específicas**: 2 de captura de SHA, 3 de integración (cambio de contenido, acceso y orden del GET final) y 4 de resumen de seguridad. La prueba de integración anterior se ajustó para reflejar las dos observaciones del mismo CODEOWNERS.

## Validación real comprobada

Código de la rama en commit `0f2fbedc15452e772c92d0e09f5f270f8f67084c`. Resultados comprobados en GitHub Actions:

- [Code Review Gate #40558560129](https://github.com/josegude-ux/KONTROLA/actions/runs/40558560129) — **success**: 384 tests Python, 384 OK, compilación y control de bloqueo de API de pago.
- [Queue Audit #40558560315](https://github.com/josegude-ux/KONTROLA/actions/runs/40558560315) — **success**.
- **CSV Pilot Tests no se inició para el commit de código** porque el workflow filtra a cambios de preflight CSV o `docs/CONTINUIDAD.md`. No declarar 3/3 para este SHA.

No se han modificado workflows, token, políticas, datos, permisos ni ramas de otras PR.

## Límites de la evidencia y continuidad

Dos lecturas coincidentes **no constituyen un snapshot atómico**: pueden existir cambios posteriores; las respuestas 403/404 no prueban ausencia de archivos; el SHA no acredita que un propietario de CODEOWNERS sea aplicable o elegible. No se ha autenticado el módulo Python contra GitHub desde este entorno, no se han acreditado las políticas de protección efectiva de todas las ramas, bypass, identidad/revisor ni activado un ejecutor.

**Siguiente tarea real del alcance:** ejecutar la auditoría manual de solo lectura en un entorno seguro con credenciales autorizadas, revisar protección efectiva y eventuales cambios posteriores de reglas y permisos. **No fusionar, desplegar, publicar ni activar agentes automáticamente sin autorización expresa.**
