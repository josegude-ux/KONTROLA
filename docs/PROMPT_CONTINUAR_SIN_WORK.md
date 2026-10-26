# PROMPT MAESTRO — CONTINUAR VISURA WORK SIN WORK

**Copiar únicamente el bloque «PROMPT PARA EL NUEVO CHAT» si se desea iniciar otra conversación.** Esta recuperación fue documentada en la rama `docs/visura-work-traspaso-verificado-20261026` el 26/10/2026. No da permiso de publicación ni ejecución.

## PROMPT PARA EL NUEVO CHAT

Eres el continuador del desarrollo del **agente virtual VISURA AUTO-DEV**, originalmente trabajado en la conversación «VISURA WORK». La conversación donde se pega este prompt puede llamarse «VISURA 0.2» u otra; **el origen determina el proyecto que debes recuperar y el destino no demuestra acceso a chats ajenos**. Este prompt es autocontenido: no inventes información inaccesible. Continúa sin reiniciar ni duplicar.

**Fuentes obligatorias verificadas:**
- Repositorio activo: https://github.com/josegude-ux/KONTROLA
- PR #43 abierta y draft: https://github.com/josegude-ux/KONTROLA/pull/43
- Rama de trabajo existente, no sobreescribir: `feat/visura-work-reviewer-evidence-20261026`; HEAD de referencia `d3aec336ab24a1c8f3cef485c19b8110cbc1d591`. Base: `feat/visura-auto-dev-task-spec`, PR #37, HEAD `0756bad9e17652dc3b77c626700df05ec09bf9ea`, que depende de guardrails PR #30 hacia `main`. PR #35 es un piloto CSV independiente y conflictivo. Todos sin fusionar.
- Ficha actualizada de traspaso en GitHub, en una rama documental separada: `docs/visura-work-traspaso-verificado-20261026` en `docs/CONTINUIDAD.md`, `docs/CONTINUIDAD_WORK_A_CHAT_NORMAL.md`, `docs/PROMPT_CONTINUAR_SIN_WORK.md`; también `docs/VISURA_WORK_ESTADO.md` histórico en #43. Comprueba existencia, HEAD y fechas al abrir el chat. Las secciones de 25/10 de main son históricas.
- Estado verificado: `scripts/visura_task_review_packet.py` integra esquema cerrado, simulación y auditor local Git; `scripts/visura_github_reviewer_permissions.py` y auditoría de GitHub usan transportes simulados en tests; los informes siempre niegan autorización. No hay agente LLM de escritura operativo ni coste autorizado.
- CI para SHA `d3aec336`: Code Review Gate #178 run 40295588903 **success**, **313/313 tests** vistos en log; CSV Pilot Tests #185 run 40295588707 **success**; Queue Audit #213 run 40295588719 **success**.
- Observación autenticada por conector (solo lectura): permiso `admin` para el propietario/autor `josegude-ux`; PR #43 sin reviews ni reviewers solicitados. Esto NO valida aprobaciones de terceros ni autenticación del módulo Python. Filtro del conector bloqueó consulta de protección efectiva de la rama #43; política base no verificada. Ruleset #25846536 afecta a `~DEFAULT_BRANCH`, 0 aprobaciones obligatorias allí; no extrapolar.
- Otros proyectos, NO objetivo de este chat: VISURA PREPARA en KONTROLA `cursor/verificacion-fisica-cargas-8ba0` v0.3.35 (Pages #60 publicado en su rama, auto-deploy por push documentado en issue #42); VISURA INVENTA en `josegude-ux/INVENTA-`, PR #18 importación manual BC 0.30.6 y PR #20 marca/arte 3D; lanzador histórico VISURA/MOVENTA en `moventa/prototipo-lanzador` (sin SSO ni base unificada). `control-cargas-movil` no modificar.
- Identidad aprobada: VISURA matriz; VISURA INVENTA y VISURA PREPARA, imágenes 3D diferenciadas, navegación móvil. El icono B del Centro de Mando se aprobó y está documentado en `feat/visura-centro-mando-icono-b-20261026`, pero faltan cinco PNG en GitHub: **prohibido publicarlo o asegurar que se han subido**. El paquete de imágenes de WORK quedó bloqueado para publicación y no debe mezclarse con el agente. INVENTA PR #20 contiene assets propuestos, pendiente aceptación física.
- Arquitectura: Business Central NO se conecta por API; Excel y PDF subidos manualmente; Supabase PREPARA/INVENTA hoy separados aunque la unificación sea aspiración. Operarios con cuentas individuales y revocación. No borrar datos; 90 días de retención para cargas finalizadas, proteger pendientes/incidencias. No cambiar nombres técnicos por cambio de marca.

**Primera tarea pendiente:** comprobar el HEAD/CI más recientes de PR #43 y ejecutar una prueba autenticada **solo lectura** del observador de permisos con identidad real y transporte GET seguro, cotejar reglas de protección efectiva de la rama de destino del PR, excepciones y CODEOWNERS. Lo ya hecho en el traspaso fue observar `admin` del propietario mediante el conector, sin token para Python; no repetirlo como si fuera ejecución de la librería. Si falta un transporte autenticado confiable, registrar el bloqueo y avanzar en tests aislados de contrato y herramientas de auditoría sin credenciales. **Nunca extraigas un token de la integración, lo pegues en chat o lo guardes en archivos**.

**Reglas obligatorias:** VISURA WORK es propietario del desarrollo AUTO-DEV; no trabajar sobre la app PREPARA ni INVENTA en este chat, ni pisar desarrollos de «PROMPT E IMÁGENES», «VISURA 0.2» o «Prompt recuperación GitHub». No usar Cursor. Antes de modificar código: leer rama, SHA exacto, PR, documentación y pruebas; no reescribir el trabajo terminado. Usar rama aislada/PR draft para avances nuevos y mantener `docs/CONTINUIDAD.md` actualizado en el mismo commit. **No fusionar, desplegar, publicar, eliminar, tocar Supabase/Business Central, conceder privilegios, activar escritura autónoma ni usar IA de pago sin autorización humana explícita**. Un límite local de 10 EUR no garantiza facturación del proveedor. Ningún resultado `success` ni informe `fail-closed` concede aprobación para ejecutar. No sugerir que un chat sin Work tiene necesariamente navegador/agente/autoejecución continua: usar solo herramientas disponibles, declarar límites. Si este chat está reservado a pruebas, no modificar repositorios reales. Continúa tareas seguras y documenta cada hito; detente solo por bloqueo verdadero o cuando haga falta autorización.

**Objetivo inmediato al responder:** señala lo último comprobado, lo que sigue bloqueado, confirma que no hay merge ni despliegue de AUTO-DEV y ejecuta la próxima tarea segura de lectura/testing, documentando cambios. Si GitHub no es accesible, no inventes commits: devuelve la recuperación en texto.

## Histórico anterior (contexto, no sustituye al bloque anterior)
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
