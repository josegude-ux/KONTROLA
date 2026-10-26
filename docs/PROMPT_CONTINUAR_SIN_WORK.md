> **VISURA AUTO-DEV — avance aislado de seguridad (26/10/2026, chat continuador)**: rama `fix/visura-work-review-policy-flags-20261026`, derivada de `docs/visura-work-chat-nuevo-20261026` (que incorpora PR #44, `b934a2c`). Nuevo análisis en [VISURA_WORK_POLITICAS_REVISION_20261026.md](VISURA_WORK_POLITICAS_REVISION_20261026.md). El auditor de reglas aplicadas distingue cinco controles de revisión con valores ausentes `null` y rechaza tipos erróneos; cuatro nuevas pruebas HTTP simuladas. **CI de código verificado para el commit `12175c09`**: Code Review Gate #40322668294, CSV Pilot Tests #40322668145 y Queue Audit #40322668326 = `success`. La comprobación no acredita autenticación HTTP real ni políticas efectivas del repositorio. No hay autenticación real del módulo, veredicto de políticas efectivas ni autorización de ejecución, fusión o despliegue. No modificar otras ramas ni reiniciar desde main.

---

> **VISURA WORK — recuperación verificada 26/10/2026 (CHAT NUEVO)**: véase [auditoría del traspaso](VISURA_WORK_AUDITORIA_RECUPERACION_20261026.md) en la rama `docs/visura-work-chat-nuevo-20261026`, basada en PR #44 HEAD `b934a2ccf5fbff11de8ced3b2d121a46b7750408`. PRs #37/#43/#44 siguen abiertas en borrador; CI #44: tres flujos correctos. Ruleset activo solo acreditado para main, protección clásica 403, CODEOWNERS no encontrado; transporte Python auténtico y elegibilidad sin verificar. Ninguna autorización de ejecución, fusión o despliegue. No usar la ficha de main para reiniciar el agente.

---

ACTUALIZACIÓN DE CONTINUIDAD DESDE CHAT NORMAL (26/10/2026): Hay una mejora aislada de seguridad de origen de snapshots en `fix/visura-work-review-snapshot-repository-20261026`, derivada del HEAD `d3aec336ab24a1c8f3cef485c19b8110cbc1d591` de PR #43. Ver `docs/CONTINUIDAD.md` en dicha rama antes de iniciar trabajo duplicado. El objetivo de la mejora es impedir consultar revisores de un snapshot que no declare el mismo repositorio exacto. No confundirla con prueba real de autenticación de HTTP; esa validación y las políticas efectivas siguen pendientes. No fusionar ni publicar sin autorización.

---

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



ACTUALIZACIÓN PARA CONTINUAR:
## Punto actual — tarea e informe local unidos (2026-10-26)

Código: 9d88d39fb2af0cc06f874bbec0a00c9ac4562640. Mismo PR #43 y rama
feat/visura-work-reviewer-evidence-20261026; base #37 sin cambios.
313 pruebas locales correctas, compilación, safety smoke y diff check correctos.
Se comprobó igualdad entre los dos archivos remotos y los probados.

scripts/visura_task_review_packet.py conecta validate_task, preview_task y el
auditor Git local. Lee JSON limitado a 16384 caracteres por stdin, rechaza claves
duplicadas y campos desconocidos, genera huellas SHA256 de la tarea y los commits.
Las huellas identifican entradas, NO son firmas ni aprobaciones. No ejecuta checks
ni comandos propuestos por la tarea. Los checks quedan como not_executed.
Prueba real con commits 0756bad9 -> 01b9a391: 12 archivos dentro del alcance,
seis bloqueos explícitos y autorización falsa. La tarea de demostración es
sintética: no se afirma que exista aprobación autenticada para ejecutarla.

Uso: python -m scripts.visura_task_review_packet . BASE_SHA HEAD_SHA < tarea.json
Esquema JSON: task_id, title, scope, checks (lista de textos), max_cost_eur.
Código de salida 0 significa informe generado, NO permiso de ejecución.

Componente diseñado, programado y probado localmente con Git real. No conectado
a un ejecutor ni autorizado para crear/fusionar PR automáticamente. El módulo
HTTP conserva pruebas simuladas; no existe credencial accesible para Python.
Pendientes: transporte autenticado, políticas efectivas, revisión de contenido,
pruebas aisladas y aprobación externa. No presentar los informes como agente
operativo ni resolver el bloqueo exponiendo tokens. Centro de Mando tiene cambios
en docs/visura-centro-de-mando-20261026, solo panel HTML; no se tocó esa rama.

---


CI de 9d88d39f confirmada: Code Review Gate #176, CSV Pilot Tests #183 y Queue Audit #211 correctos. https://github.com/josegude-ux/KONTROLA/actions/runs/40295392197
