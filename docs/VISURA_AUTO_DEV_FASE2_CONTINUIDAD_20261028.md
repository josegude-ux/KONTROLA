# VISURA AUTO-DEV 09 — Fase 2: motor configurable, solo fixtures confiables

Fecha: 28/10/2026. Repositorio: `josegude-ux/KONTROLA`.
Origen comprobado: PR #83 (OPEN/DRAFT), HEAD `3bec91441638a82210ceb43c50f629b5801ae173`.
Nueva rama: `feat/visura-auto-dev-configurable-fixtures-20261028`. PR de esta rama: pendiente de emisión mediante integración GitHub, no por AUTO-DEV.
La rama 09 Fase 1 y todas las ramas/PR heredadas quedan intactas.

## Implementación real

- `scripts/visura_auto_dev_configurable.py`: contrato cerrado, reutiliza `validate_task` de la Fase 1. Campos fijos: tarea, fixture, operación, parámetros acotados, rutas permitidas, acciones, pruebas, intentos, timeout, estado inicial y resultado esperado.
- Dos familias configurables: `string_pipeline` combina operaciones `strip`, `upper` y `lower` (hasta tres), y `integer_offset` suma un entero entre -20 y +20. Los valores no son código fuente: un generador construye AST Python con nodos/operaciones permitidos.
- La única zona de trabajo ejecutable es un repositorio Git temporal construido por el programa a partir de **plantillas confiables internas**. No se acepta origen, checkout, test, script, código ni ruta de repositorio del usuario.
- Plan → fuente AST → archivo realmente editado → prueba confiable independiente → reintento acotado → control HEAD y rutas → diff → commit Git temporal → borrado del espacio de trabajo.
- La primera versión de la prueba de cadenas omite deliberadamente el último paso para comprobar el circuito de fallo y reparación. El segundo candidato completa la expresión especificada. **No es diagnóstico creativo por IA**. Para otras combinaciones, la misma gramática genera expresiones nuevas según parámetros.
- `--demo` ejecuta dos tareas; `--task-file ARCHIVO` recibe manifiestos JSON de datos sujetos a esquema cerrado y detección de claves duplicadas.
- No se modificó `scripts/visura_auto_dev_fixture_executor.py` ni los módulos de PREPARA, INVENTA o Centro de Mando.

## Evidencias de ejecución local verificada

Entorno local Python 3.13, Git 2.47; comando `python -m unittest discover -s tests -p 'test_visura_*.py' -v` ejecutado sobre los tests nuevos: **25/25 PASS**, 0 FAIL. `python -m compileall -q scripts tests`: PASS. `python -m scripts.visura_auto_dev_configurable --demo`: PASS con dos repositorios distintos:

| Tarea | Operación | Intentos: tests | Archivo | Resultado |
| --- | --- | --- | --- | --- |
| VISURA-STR-02 | `strip → upper` | 1 FAIL, 2 PASS | `src/strings.py` | diff + commit Git temporal |
| VISURA-NUM-02 | `offset +7` | 1 PASS | `src/numbers.py` | diff + commit Git temporal |

El código demuestra selección de operaciones diferentes y generación de parches a partir de parámetros. No ejecuta código de repositorio externo. Los SHA locales varían por ejecución; el digest del diff y del código final es reproducible.

## Barreras verificadas y limitaciones

- PASS: campos desconocidos, operaciones arbitrarias, rutas externas/traversal, symlinks de directorio/archivo, coste de pago, comandos/acciones ajenas, checks manipulados, límites de intentos/timeout, secretos no heredados a procesos, fallo y límite de reintentos sin commit, rechazo de HEAD local distinto, manifiestos JSON duplicados/grandes, idempotencia del diff/código final, commit y limpieza.
- PASS limitado: subprocess con `shell=False`, entorno allowlist, deadline, `RLIMIT_CPU`, `RLIMIT_AS` 512 MiB, `RLIMIT_FSIZE` 2 MiB y `RLIMIT_NOFILE` 64 en Linux. Los límites en el host de CI deben verificarse por ejecución y no significan contención suficiente.
- **NO IMPLEMENTADO**: usuario separado sin privilegios, contenedor/jail, red realmente bloqueada, aislamiento del sistema de archivos ante código hostil, cuotas globales de procesos, autenticación criptográfica de la autorización humana, política GitHub/CODEOWNERS/CI en el ejecutor local.
- **NO EJECUTADO**: pruebas de código hostil real, repositorios empresariales, credenciales GitHub desde Python, revalidación real de reglas y cambios de CI en el instante de escribir, push GitHub o PR por AUTO-DEV, despliegues, migraciones, proveedores IA.
- Un manifiesto válido **no** otorga autorización para repositorios externos. La evidencia `fixture_policy_eligible` se refiere solo a trabajo transitorio confiable autorizado por esta fase; `human_authorization_verified=False` continúa expresamente.
- Riesgos residuales: carreras de symlink/archivos entre validación y escritura en un host malicioso, ausencia de aislamiento de red, pruebas de fixture generadas por el mismo proceso confiable y ejecución fuera de Linux sin los RLIMIT indicados. No utilizar para código ajeno.

## Próximo paso

Diseñar una frontera de ejecución real con usuario sin privilegios, sandbox contenedorizado sin red, montaje de sistema de archivos de solo lectura fuera del workspace, límites cgroup, y ejecución de tests verdaderamente no confiables. Incorporar una puerta de autorizaciones humana ligada a identidad, tarea, destino, HEAD y vigencia. Después, conectar un generador de parches más amplio y reutilizar auditores existentes para políticas y CI de GitHub.

**Prohibido habilitar trabajo en KONTROLA/INVENTA productivos o por API del agente hasta que esas barreras se prueben. No merge, deploy, pago ni modificación de permisos.**

## Validación real de GitHub Actions — PR #84

Commit de código y documentación inicial comprobado: `7a57ec3bd57fc750e65fd3cf2c0cfa0e0bcd977d`.
- [Code Review Gate #40634307748](https://github.com/josegude-ux/KONTROLA/actions/runs/40634307748): `completed/success` para ese SHA; **422/422 pruebas PASS**, incluidos los 25 tests nuevos de Fase 2. Se verificó también el bloqueo de API de pago.
- [Queue Audit #40634307726](https://github.com/josegude-ux/KONTROLA/actions/runs/40634307726): `completed/success` para ese SHA.
- CSV Pilot Tests: **NO EJECUTADO** en el SHA de esta PR (sin cambio de sus rutas disparadoras).
- El commit de esta actualización final de documentación será diferente del SHA probado. No atribuirle los resultados anteriores sin verificación propia.
- Los workflows de CI ejecutan únicamente fixtures de confianza; **no** prueban aislamiento frente a código hostil ni autorización humana autenticada.
