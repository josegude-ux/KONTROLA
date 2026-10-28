# VISURA AUTO-DEV — continuidad 09: primer motor de programación ejecutable

Fecha: 28/10/2026. Repositorio: `josegude-ux/KONTROLA`.

## Base y aislamiento
- Rama exclusiva: `feat/visura-auto-dev-fixture-executor-20261028`.
- Base exacta: `a9c0effc8e6f11a7faf790217dcb8aa64a86338f`, HEAD observado de PR #78, que se apila sobre #77 y #50.
- No se editan las ramas de #30, #37, #43, #44, #47, #50, #77, #78, PREPARA, INVENTA o Centro de Mando.
- No se tocan workflows, Supabase, RLS, Business Central, producción, secretos ni permisos.
- Se reutiliza `scripts.visura_task_spec.validate_task` sin ampliar su autoridad (sigue marcando la tarea como NO autorizada).

## Capacidad nueva implementada
`scripts/visura_auto_dev_fixture_executor.py` ejecuta un piloto **determinista** de programación sobre un repositorio Git recién creado dentro de `tempfile.TemporaryDirectory`, con código y tests de fixture que el propio módulo proporciona. El único comando externo disponible al usuario es `python3 -m scripts.visura_auto_dev_fixture_executor --pilot`.

Flujo real: validación de un manifiesto fijo → creación de repositorio y commit base → rama temporal → edición de `src/reference.py` → prueba de unittest real → fallo en primer intento → segunda corrección predefinida → tests superados → `git diff --check` → auditoría de rutas → diff → commit local y limpieza.

No acepta repositorios, archivos, scripts, comandos ni cambios de tarea enviados desde el exterior. Los comandos se construyen internamente como argumentos fijos sin shell. Se usa un entorno de subprocess con variables permitidas expresamente, sin heredar tokens ni Git config global, y límites de tiempo de 8 segundos por proceso. Los tests ejecutados son de confianza y definidos dentro del propio programa: **NO es aislamiento suficiente para código arbitrario**. No hay llamadas IA ni servicios de pago.

Pruebas añadidas en `tests/test_visura_auto_dev_fixture_executor.py`: reparación tras error, diff y commit real, rechazo de tarea alterada, campos extra, coste no nulo y campos ausentes.

## Evidencia local de esta fase
- Comando: `python -m unittest discover -s tests -p test_visura_*.py -v` sobre paquete de pruebas del nuevo módulo: **5/5 OK**.
- Comando: `python -m scripts.visura_auto_dev_fixture_executor --pilot`: ejecución completa **OK**.
- Resultado de la ejecución: intentos de test `[1 (fallo), 0 (éxito)]`, edición solo de `src/reference.py`, commit temporal creado y worktree limpia.
- Diff: `return text` → `return text.strip().upper()`.
- Los SHA del repositorio temporal varían entre ejecuciones; no equivalen a commits en GitHub.
- Pendiente: verificar **CI sobre el SHA exacto** de esta rama/PR. No proclamar éxito de CI basándose únicamente en pruebas locales.

## Límites expresos
Esta fase demuestra automatización de **una tarea de código predefinida**. No implementa todavía generación inteligente de parches, elección autónoma de archivos, infraestructura de contenedores sin red, ejecución sobre KONTROLA/INVENTA, firma de autorizaciones, transporte Python autenticado, verificación de políticas de GitHub ni creación autónoma de PR. Tampoco prueba el rechazo de symlinks o contención de código hostil en un workspace ajeno.

La PR de esta rama, si existe, es para **revisar la implementación del piloto**, creada mediante integración GitHub del asistente, no por el ejecutor del piloto. No interpretar una PR creada por el asistente como creación autónoma por AUTO-DEV.

## Próxima iteración independiente
1. Diseñar contrato cerrado de tarea ejecutable separado de `visura_task_spec` y una puerta de autorización autenticada y verificable; no confiar en texto libre.
2. Implantar aislamiento de proceso/FS/red y cuotas reales para código no fiable, sin tokens dentro del contenedor.
3. Conectar un generador de parches que produzca candidatos revisables y restringidos; reutilizar los auditores locales ya existentes y preservar controles de PR.
4. Probar un pequeño cambio no prefijado en un repositorio sandbox **expresamente autorizado** con CI y revisión; no modificar ramas de módulos propietarios sin asignación.
5. Integrar en el futuro el contrato de estado/tarea con Centro de Mando, coordinado con el chat 03.1.

Esta nota es la **continuidad de la rama 09**. No se modifica `docs/CONTINUIDAD.md` compartido para evitar solapamientos con VISURA WORK y las PR apiladas.

## Verificación posterior de GitHub Actions (28/10/2026)
- SHA verificado de la PR #83: `64e25f8ad0d0b55ca2a159ae4d3779db4c7824cc` (código y documento de fase).
- Code Review Gate: [run 40614992025](https://github.com/josegude-ux/KONTROLA/actions/runs/40614992025), `completed/success`, **397/397 tests**; incluye los cinco tests nuevos y la comprobación de bloqueo de API de pago.
- Queue Audit: [run 40614991870](https://github.com/josegude-ux/KONTROLA/actions/runs/40614991870), `completed/success`.
- La actualización de este documento es un commit **solo documental** posterior a esos runs; no afirmar que esos runs pertenecen al nuevo SHA documental. Revalidar si se producen cambios futuros de código.
- PR #83 permanece OPEN/DRAFT y apilada sobre PR #78. Sin merge, deploy, permisos adicionales ni IA de pago.
