Continúa VISURA AUTO-DEV desde https://github.com/josegude-ux/KONTROLA,
rama feat/visura-work-reviewer-evidence-20261026. Lee docs/VISURA_WORK_ESTADO.md,
docs/CONTINUIDAD_WORK_A_CHAT_NORMAL.md y docs/CONTINUIDAD.md en esa rama.
Comprueba su SHA remoto, PR y pruebas actuales. La base de recuperación es
PR #37, feat/visura-auto-dev-task-spec, 0756bad9e17652dc3b77c626700df05ec09bf9ea;
#37 apunta a chore/visura-auto-dev-guardrails (#30), no a la rama operativa.
PR #35 es piloto CSV y presenta conflicto; no resolver sobrescribiendo avances.
El otro repositorio es josegude-ux/INVENTA-; no necesita cambios para esta tarea.

No reinicies ni repitas trabajo verificado. Continúa la primera tarea pendiente
que indique VISURA_WORK_ESTADO.md. Distingue código, pruebas simuladas, consultas
reales y autorización: una auditoría favorable nunca autoriza ejecución.
VISURA WORK lidera AUTO-DEV; VISURA 0.2 recibe la continuidad; PROMPT E IMÁGENES
se ocupa de gráficos; Prompt recuperación GitHub audita. No hay sincronización
automática entre chats: comprueba cambios remotos y usa ramas aisladas.

No fusionar, desplegar, activar automatización de escritura, pagar IA ni alterar
Supabase/Business Central sin autorización expresa. Excel siempre manual;
usuarios individuales y revocación. Mantén funciones, datos e identidad VISURA.
No publiques el paquete gráfico cuya subida se bloqueó. No uses Cursor.
Utiliza las herramientas disponibles sin requerir Work, no inventes resultados,
preserva cambios y actualiza continuidad tras cada bloque. Continúa las tareas
seguras sin pedir «Sigue». Si hay bloqueo, identifica la causa exacta y sigue
con tareas independientes. No afirmes conocer créditos restantes.


ESTADO ACTUAL PARA RETOMAR:
## Punto actual — auditor local de cambios (2026-10-26)

PR #43, rama feat/visura-work-reviewer-evidence-20261026, base #37.
Código verificado: 4e0d2a5fdca6b216a4411915a9df459c0da560bd.
306 pruebas locales correctas; compilación, bloqueo de IA de pago y diff check correctos.
CI verde: Code Review Gate #174, CSV Pilot Tests #181, Queue Audit #209.
https://github.com/josegude-ux/KONTROLA/actions/runs/40294529499

Nueva función: scripts/visura_local_diff_audit.py inspecciona metadatos de dos
commits completos con Git local. No hace checkout ni ejecuta código del PR,
textconv o diff externo. Solo admite archivos normales no ejecutables del piloto
(scripts/visura_*.py, tests/test_visura_*.py, docs/*.md). Bloquea borrados, enlaces,
submódulos, rutas fuera de alcance, diff vacío y más de 50 archivos.
No revisa contenido, secretos, pruebas ni cambios sin commit; no es un sandbox.
Sus indicadores de autorización permanecen falsos incluso si el alcance es válido.

Prueba real ejecutada: comparación 0756bad9e17652dc3b77c626700df05ec09bf9ea ->
4e0d2a5fdca6b216a4411915a9df459c0da560bd: 12 archivos, sin bloqueos de alcance.
Uso desde la raíz: python -m scripts.visura_local_diff_audit . BASE_SHA HEAD_SHA
Salida JSON y código 0 si el alcance encaja, 2 si hay bloqueos; nunca permiso de ejecución.

Pendientes: transporte autenticado real para el auditor GitHub, políticas efectivas,
CODEOWNERS y autorización externa; después ejecutar tareas únicamente en aislamiento
real. No habilitar ejecución basándose en este auditor ni introducir tokens en archivos.
La siguiente sesión debe verificar SHAs y evaluar ese transporte antes de activar nada.
PREPARA, INVENTA, Supabase, Business Central y workflows no modificados.

---

