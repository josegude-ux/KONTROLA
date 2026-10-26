> **VISURA AUTO-DEV — hito integrado seguro (26/10/2026)**: [PR #47](https://github.com/josegude-ux/KONTROLA/pull/47), rama `fix/visura-work-review-policy-flags-20261026`, código verificado `885042dbb50bf4bc5a053ce13f888b72e1bb7320`. Se añadió preflight GET **dentro del mismo comando** de auditoría, sin modificar el workflow manual; el informe compara rama y SHA entre consultas y rechaza cambios. +4 tests de integración y +5 de salida legible. CI correcto: Code Review Gate [40334951854](https://github.com/josegude-ux/KONTROLA/actions/runs/40334951854), CSV Pilot Tests [40334951628](https://github.com/josegude-ux/KONTROLA/actions/runs/40334951628), Queue Audit [40334951448](https://github.com/josegude-ux/KONTROLA/actions/runs/40334951448). **No** se ha realizado autenticación Python real ni autorizado ejecución/fusión/despliegue. Véase [VISURA_WORK_PREFLIGHT_UNIFICADO_20261026.md](VISURA_WORK_PREFLIGHT_UNIFICADO_20261026.md).

---

# VISURA AUTO-DEV — diagnóstico de transporte autenticado en modo lectura

**Fecha:** 26/10/2026. **Responsable:** VISURA AUTO-DEV (chat continuador). **Repositorio:** `josegude-ux/KONTROLA`.

## Estado técnico comprobado

- Antes de editar, PR [#47](https://github.com/josegude-ux/KONTROLA/pull/47) estaba abierta en borrador en la rama `fix/visura-work-review-policy-flags-20261026`, HEAD `0867c5d6f71359a6dacfd2c7396557f867822cf3`; PR #44 continúa como antecedente (`b934a2c`). No hubo nuevos desarrollos de AUTO-DEV en otra PR detectada durante esta revisión.
- El módulo nuevo `scripts/visura_github_auth_preflight.py` recibe el token **solo** del entorno `GITHUB_TOKEN`; comprueba nombre de repositorio y número de PR, construye exclusivamente dos posibles GET a `https://api.github.com/repos/{owner}/{repo}` y `.../pulls/{n}`, y valida que los metadatos recuperados correspondan a la solicitud. No ejecuta peticiones de escritura ni muestra token, cabeceras, descripción de PR o datos personales.
- Los resultados diferencian `retrieved`, `unauthorized` (401), `inaccessible` (403), `not_found_or_inaccessible` (404) y `not_queried`. Los errores 429/servidor se propagan: **no** se interpretan como ausencia de permisos. Comprobaciones de entrada antes de contactar la red; sin redirecciones con bearer en transporte predeterminado.
- Nueve pruebas propias, incluidas validaciones de identidad de repositorio/PR, rechazo de parámetros y tokens inválidos, fallos HTTP, no filtración de token y contrato de workflow manual. Las respuestas HTTP son **simuladas** en los tests.
- **Importante:** las respuestas GET incluso con estado 200 **no prueban** identidad del token, sus alcances, protección de rama o permisos de ejecución; esas banderas se mantienen en `false`. Este módulo permite un diagnóstico real cuando lo ejecuta un entorno con credencial segura, pero **aquí no se ejecutó contra GitHub desde Python con token real**.

## Relación con el workflow manual existente

Durante el desarrollo se propuso insertar un segundo paso de prevalidación en `.github/workflows/visura-auto-dev-manual-review-audit.yml`. Las comprobaciones de seguridad preexistentes exigían **un solo comando de auditoría** y un único paso que recibiera el token: Code Review Gate y Queue Audit fallaron en el commit `d330faa5`. Se inspeccionaron los logs reales, se revirtió **exactamente** el archivo del workflow a su contenido original (`blob e2bc705b51af3540d769e3479e01e0cd0ccc0a85`), y se sustituyó la prueba agregada para garantizar que no se vuelva a introducir un segundo comando o paso de token. **No se relajaron las pruebas de seguridad originales**.

Prueba del nuevo código y del workflow original en commit `d598a4b569957fe62cabea6be618cf2a60c10329`:

- [Code Review Gate #40331737445](https://github.com/josegude-ux/KONTROLA/actions/runs/40331737445): `success`.
- [CSV Pilot Tests #40331737471](https://github.com/josegude-ux/KONTROLA/actions/runs/40331737471): `success`.
- [Queue Audit #40331737574](https://github.com/josegude-ux/KONTROLA/actions/runs/40331737574): `success`.

## Uso futuro sin exponer credenciales

En una copia confiable del código con un token limitado a lectura suministrado directamente por el entorno autorizado (no por el chat ni por el conector):

```bash
python3 -m scripts.visura_github_auth_preflight josegude-ux/KONTROLA 47
```

No insertar tokens en comandos, documentación, pantallas ni logs. La utilidad no forma parte del workflow manual existente y **no se ha activado ninguna automatización real**.

## Bloqueos y siguiente hito

- Ejecutar esa comprobación **real**, solo lectura, en un entorno de confianza con `GITHUB_TOKEN` delegado conforme a permisos aprobados; el conector de ChatGPT puede consultar GitHub por su cuenta, pero no transfiere esa credencial a un proceso Python.
- Verificar las protecciones reales (clásica y rulesets efectivos) de la rama de destino de cada PR, CODEOWNERS aplicable, revisión elegible, reglas de bypass y condiciones de ejecución; `403` sigue siendo incertidumbre, no ausencia de protección.
- Mantener el auditor como piloto, con `repository_policy_verified`, `execution_authorized`, `merge_authorized` y `deployment_authorized` en falso.
- **No fusionar, publicar, desplegar, borrar datos ni activar ejecución autónoma** sin autorización expresa. Separar VISURA PREPARA e INVENTA.
