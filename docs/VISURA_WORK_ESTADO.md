> **VISURA AUTO-DEV — 26/10/2026, siguiente hito verificado**: PR [#47](https://github.com/josegude-ux/KONTROLA/pull/47), rama `fix/visura-work-review-policy-flags-20261026`, HEAD de código `65ebdea7de7c1ffcfefaf771ee93aa29397741b3`. El resumen legible de Actions ahora expone los controles de revisión aplicados (sí/no/desconocido) sin mostrar identidades; seis pruebas nuevas de visualización y prueba de no declarar completos controles sin reglas PR. GitHub Actions de ese SHA: Code Review Gate [40325209234](https://github.com/josegude-ux/KONTROLA/actions/runs/40325209234), CSV Pilot Tests [40325209324](https://github.com/josegude-ux/KONTROLA/actions/runs/40325209324), Queue Audit [40325209274](https://github.com/josegude-ux/KONTROLA/actions/runs/40325209274): **success**. Es código piloto con HTTP simulado; **NO** autentica el módulo Python real ni acredita protección efectiva, CODEOWNERS o autorización de escritura. No fusionar/desplegar. Detalles en [VISURA_WORK_POLITICAS_REVISION_20261026.md](VISURA_WORK_POLITICAS_REVISION_20261026.md).

---

> **VISURA AUTO-DEV — avance aislado de seguridad (26/10/2026, chat continuador)**: rama `fix/visura-work-review-policy-flags-20261026`, derivada de `docs/visura-work-chat-nuevo-20261026` (que incorpora PR #44, `b934a2c`). Nuevo análisis en [VISURA_WORK_POLITICAS_REVISION_20261026.md](VISURA_WORK_POLITICAS_REVISION_20261026.md). El auditor de reglas aplicadas distingue cinco controles de revisión con valores ausentes `null` y rechaza tipos erróneos; cuatro nuevas pruebas HTTP simuladas. **CI de código verificado para el commit `12175c09`**: Code Review Gate #40322668294, CSV Pilot Tests #40322668145 y Queue Audit #40322668326 = `success`. La comprobación no acredita autenticación HTTP real ni políticas efectivas del repositorio. No hay autenticación real del módulo, veredicto de políticas efectivas ni autorización de ejecución, fusión o despliegue. No modificar otras ramas ni reiniciar desde main.

---

> **VISURA WORK — recuperación verificada 26/10/2026 (CHAT NUEVO)**: véase [auditoría del traspaso](VISURA_WORK_AUDITORIA_RECUPERACION_20261026.md) en la rama `docs/visura-work-chat-nuevo-20261026`, basada en PR #44 HEAD `b934a2ccf5fbff11de8ced3b2d121a46b7750408`. PRs #37/#43/#44 siguen abiertas en borrador; CI #44: tres flujos correctos. Ruleset activo solo acreditado para main, protección clásica 403, CODEOWNERS no encontrado; transporte Python auténtico y elegibilidad sin verificar. Ninguna autorización de ejecución, fusión o despliegue. No usar la ficha de main para reiniciar el agente.

---

## VISURA WORK — endurecimiento aislado del origen de revisiones (26/10/2026)

**Origen comprobado:** PR #43 sigue abierta/draft en `feat/visura-work-reviewer-evidence-20261026`, HEAD `d3aec336ab24a1c8f3cef485c19b8110cbc1d591`; CI original Code Review Gate #178 (`40295588903`) **313 pruebas OK**; CSV #185 y Queue Audit #213 correctos. No se han observado commits posteriores en la comprobación de este turno.

**Tarea segura:** en rama independiente `fix/visura-work-review-snapshot-repository-20261026` basada en el mismo HEAD, `observe_snapshot_reviewer_permissions` rechaza un lote de identidades de revisión si falta `snapshot.repository` o no coincide **exactamente** con el repositorio consultado; la validación es previa a cualquier GET. Se agregan pruebas negativas con identidades de otro repositorio, ausencia, tipos inválidos y lotes vacíos; y se ajustan los fixtures de pruebas. El origen del snapshot debe seguir siendo una respuesta REST recuperada de forma confiable: el nombre del repositorio dentro de un objeto **no autentica** la procedencia por sí mismo. El informe nunca autoriza ejecución, merge o publicación.

**Separación:** esta rama no modifica la PR #43, la rama operativa de PREPARA, INVENTA, el Centro de Mando, Supabase, los workflows ni los presupuestos. No se ha activado un agente autónomo, fusionado ni desplegado. La primera tarea pendiente continúa siendo validar el transporte GET autenticado real, las políticas efectivas de la rama base de #43, excepciones y CODEOWNERS; no introducir ni extraer tokens. Las pruebas de este cambio requieren CI del SHA nuevo.

**Traspaso anterior intacto:** `docs/visura-work-traspaso-verificado-20261026`, commit `4d83772170f2152cacda3c9114bdaba749fd48aa`. Antes de integrar esta rama aislada, confirmar los nuevos HEAD y revisar si otro chat ha modificado la PR #43.

---

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

# VISURA WORK — AUTO-DEV

Punto de control 2026-10-26. Responsable del agente: VISURA WORK.
Base verificada: PR #37 abierto/borrador, feat/visura-auto-dev-task-spec,
0756bad9e17652dc3b77c626700df05ec09bf9ea. PR #30 abierto/borrador,
chore/visura-auto-dev-guardrails, 29ba116e87937f0bf8b95caed000dc5e2bcc7977.
PR #35 abierto/borrador, edead73f4fba2652fa9ed8d4b8ccb01896299456; GitHub indica conflicto.

Existe validador de tareas, plan simulado, auditoría REST de revisiones,
protección de ramas, check-runs y estados heredados, y resumen Actions.
No hay autorización de escritura automática ni agente autónomo operativo.
285 pruebas locales correctas (269 existentes + 16 nuevas), compilación y bloqueo de IA de pago correctos. CI confirmada en b390b89e239967da5c861ecb8d89f7105e09918e: Code Review Gate #166, CSV Pilot Tests #173 y Queue Audit #201 correctos.

Trabajo aislado: feat/visura-work-reviewer-evidence-20261026, basado en #37.
Objetivo inmediato: observar permisos de repositorio vinculados a la identidad
numérica de un revisor sin convertirlos en elegibilidad ni autorización.
Pendientes: políticas efectivas, excepciones, CODEOWNERS, derechos efectivos,
revalidación y ciclo vertical aislado antes de habilitar cualquier ejecución.

No merge, despliegue, cambios de datos, proveedores de pago ni activación de
workflows de escritura. No Cursor. Excel manual desde Business Central;
Supabase previsto y credenciales individuales con revocación.

VISURA 0.2 coordina y recibe traspaso; PROMPT E IMÁGENES gestiona gráficos;
Prompt recuperación GitHub audita documentación. No se puede observar la
actividad interna en tiempo real de esos chats; revalidar SHAs antes de integrar.
Paquete gráfico bloqueado anteriormente: excluido de esta rama y su publicación.

## Hito implementado

Commit remoto de código: 203c930527467bc6db1b4f552aef8a63ab93383a.
Observador scripts/visura_github_reviewer_permissions.py conectado al informe
scripts/visura_github_audit_bundle.py. Deduplica revisores, máximo 50 consultas,
verifica ID numérico y login, trata 403/404 como desconocidos, rechaza respuestas
malformadas. Ningún resultado concede permisos de ejecución.

Las pruebas del módulo usan transporte simulado. Consulta independiente por
conector de GitHub devuelve admin para el propietario; no acredita identidad
completa del revisor ni prueba ejecución del módulo con token real.
Fuente API: https://docs.github.com/en/rest/collaborators/collaborators#get-repository-permissions-for-a-user

INVENTA: PRs #18, #19, #20 y #21 siguen abiertos sin fusionar (consulta 2026-10-26).
No se modifican sus ramas. #37 conservaba 0756bad9 al enviar estos cambios.
Los tres documentos de traspaso ya están en GitHub desde 9c0673fc.
El push por Git carecía de credenciales; se guardó por la integración GitHub.

Próximo trabajo: probar el módulo con transporte autenticado de solo lectura,
identidades completas y políticas de rama efectivas. Este entorno no proporciona
un token al proceso Python; no extraer credenciales de la integración.
Después: CODEOWNERS, excepciones y revalidación antes de cualquier ejecución.
El ciclo vertical de escritura sigue sin implementarse ni activarse.

PR: https://github.com/josegude-ux/KONTROLA/pull/43 (borrador).
CI: https://github.com/josegude-ux/KONTROLA/actions/runs/40292164475
Última comprobación: código remoto idéntico a los tres archivos probados localmente.


## Verificación adicional — resumen de permisos

Código remoto 15f416576371256395705974bb97bd7a1a3e263b, mismo PR #43.
293 pruebas locales correctas (8 nuevas), compilación, safety smoke y diff check
correctos. El resumen Actions muestra recuentos de permisos, desconocidos y
mismatches, sin nombres ni tokens; rechaza indicadores de autorización y datos
incoherentes. Prueba integrada del transporte GET hasta el informe unificado y
la reconsulta final del PR. CI del código 15f41657 confirmada: Code Review Gate #168, CSV Pilot Tests #175 y Queue Audit #203 correctos. https://github.com/josegude-ux/KONTROLA/actions/runs/40292662615
La autenticación real del módulo sigue pendiente: este avance usa pruebas
simuladas y no resuelve elegibilidad, CODEOWNERS ni políticas efectivas.
Primera tarea de continuación: verificar CI del último SHA de #43 y realizar
prueba autenticada de solo lectura cuando exista transporte confiable disponible.


## Corrección de validación completa del lote

Código 27941f4d05403a2f7db381c20a9088f8ff3b3c96, PR #43.
298 pruebas locales correctas; compileall, safety smoke y diff check correctos.
Se validan token y todas las identidades antes de cualquier llamada de red.
Un login asociado a dos IDs se rechaza; variaciones de mayúsculas del mismo ID
se deduplican. Un registro inválido al final ya no provoca consultas parciales.
La prueba autenticada real y las políticas efectivas continúan pendientes.
Siguiente paso: comprobar CI del último SHA y validar con un transporte de
solo lectura autorizado; no habilitar escritura ni ampliar permisos por defecto.

CI verificada para 27941f4d: Code Review Gate #171, Queue Audit #206 y CSV Pilot Tests #178 correctos. https://github.com/josegude-ux/KONTROLA/actions/runs/40293152708

CI de 9d88d39f confirmada: Code Review Gate #176, CSV Pilot Tests #183 y Queue Audit #211 correctos. https://github.com/josegude-ux/KONTROLA/actions/runs/40295392197
