# VISURA WORK → chat normal / VISURA 0.2

**Documento de recuperación autónomo y verificado (26/10/2026).** La copia más reciente está en `docs/` de la rama `docs/visura-work-traspaso-verificado-20261026` de KONTROLA. El origen es «VISURA WORK», no el desarrollo general del chat «VISURA 0.2».

## TRASPASO VERIFICADO DESDE VISURA WORK — 26/10/2026

**Procedencia:** el chat de origen es «VISURA WORK» (agente virtual VISURA AUTO-DEV); el destino es «VISURA 0.2». Este bloque sustituye como punto de arranque a las secciones históricas inferiores, no las borra. Un nombre de chat no prueba acceso a su historial: estado basado en recuperación de contexto disponible y comprobaciones independientes en GitHub.

**Repositorio de desarrollo:** `josegude-ux/KONTROLA`. **Rama activa de WORK, NO modificada en este traspaso:** `feat/visura-work-reviewer-evidence-20261026`, HEAD comprobado `d3aec336ab24a1c8f3cef485c19b8110cbc1d591`, PR [#43](https://github.com/josegude-ux/KONTROLA/pull/43), abierto y **draft**. Destino de #43: `feat/visura-auto-dev-task-spec` PR #37 (draft), HEAD `0756bad9e17652dc3b77c626700df05ec09bf9ea`; #37 apunta a `chore/visura-auto-dev-guardrails` PR #30 (draft), y #30 a `main`. PR #35 CSV separado permanece abierto/draft, con conflicto comunicado en continuidad. No hay merge autorizado.

**Código verificado:** `9d88d39fb2af0cc06f874bbec0a00c9ac4562640` incorpora `scripts/visura_task_review_packet.py` (especificación de tarea validada, simulación y auditor local de commits), con entradas JSON acotadas, rechazo de claves repetidas, hash de entradas y seis bloqueos conservadores en demostración sintética. `scripts/visura_local_diff_audit.py` revisa metadatos Git sin ejecutar código del PR. `scripts/visura_github_reviewer_permissions.py` observa permisos por identidad en pruebas con transporte HTTP **simulado**; módulos de auditoría de políticas, revisiones, check-runs y estados son **observacionales**, no puertas de autorización. El HEAD `d3aec336ab24a1c8f3cef485c19b8110cbc1d591` contiene documentación posterior. Todas las señales `execution_authorized`, `merge_authorized` y `deployment_authorized` siguen siendo falsas. No existe un ejecutor de escritura real habilitado.

**Pruebas contrastadas con el SHA exacto:** GitHub Actions para `d3aec336ab24a1c8f3cef485c19b8110cbc1d591`: Code Review Gate #178, ejecución [40295588903](https://github.com/josegude-ux/KONTROLA/actions/runs/40295588903), **success**; el log del job `test` muestra **313 pruebas ejecutadas, OK**, más smoke de seguridad. CSV Pilot Tests #185, ejecución 40295588707, **success**; Queue Audit #213, ejecución 40295588719, **success**. Estas pruebas no acreditan permisos efectivos de GitHub, uso real del transporte HTTP ni aprobación de cambios.

**Primera tarea segura realizada por el chat de destino (solo lectura, sin modificar código ni datos):** lectura de PR #43 y revisiones; cero reviews y cero revisores solicitados al consultar. El conector autenticado `get_repo_collaborator_permission` devuelve `admin` para la **cuenta propietaria y autora** `josegude-ux` en KONTROLA. Esto NO acredita un revisor tercero independiente ni autoriza autoaprobación. La consulta de protección efectiva de la rama destino `feat/visura-auto-dev-task-spec` falló con error del filtro de URL del conector (400), por lo que la política de esa rama permanece **no verificada**. El ruleset consultable #25846536 se aplica a `~DEFAULT_BRANCH`, requiere PR pero fija `required_approving_review_count=0`; NO debe atribuirse automáticamente a la rama de destino de #43. No se han obtenido credenciales HTTP para las pruebas de Python ni deben extraerse o copiarse tokens.

**Separación de proyectos/repositorios:** VISURA WORK gestiona solo AUTO-DEV en KONTROLA; `josegude-ux/INVENTA-` contiene INVENTA y el prototipo histórico VISURA/MOVENTA (`moventa/prototipo-lanzador`), sin cambios de WORK. `josegude-ux/control-cargas-movil` es la aplicación histórica, no objetivo de cambios. PREPARA corre en rama KONTROLA `cursor/verificacion-fisica-cargas-8ba0` con `version.json` 0.3.35, HEAD `7bfbb5e0da26eba63b4763b4a88e15aa3393588a` y Pages #60 `40285888125` publicado `success` (comprobación de caché del móvil pendiente). **Riesgo crítico:** ese branch despliega Pages con `push`; issue [#42](https://github.com/josegude-ux/KONTROLA/issues/42). No escribir/fusionar en esa rama sin autorización explícita para desplegar. INVENTA PR #18 importación 0.30.6 y #20 marca VISURA INVENTA están pendientes. El concepto VISURA unificado y Supabase compartido no equivalen a SSO ni base unificada hoy.

**Imagen e identidad (sin confundir con AUTO-DEV):** marca matriz VISURA; nombres comerciales VISURA INVENTA y VISURA PREPARA. INVENTA PR [#20](https://github.com/josegude-ux/INVENTA-/pull/20) contiene en su rama de propuesta los PNG/WebP 3D e iconos derivados de `VISURA_Identidad_3D(1).zip`, aún sin aceptación física de PWA/iPhone. PREPARA PR #28 fue fusionada a la rama operativa (no a main); se exige diseño 3D propio y diferente a INVENTA. Para Centro de Mando, la opción de icono **B** fue aprobada: documentación verificada en `feat/visura-centro-mando-icono-b-20261026/docs/ICONO_CENTRO_DE_MANDO_B_INTEGRACION.md`; el icono maestro `VISURA_CENTRO_DE_MANDO_ICONO_DEFINITIVO.png` consta en la Biblioteca, pero **cinco PNG binarios aún faltan en GitHub**. No publicar esa rama: contiene referencias que quedarían rotas. El paquete gráfico bloqueado en VISURA WORK queda fuera de este traspaso; no declarar publicado ni recuperar archivos no accesibles.

**Decisiones y restricciones permanentes:** no usar Cursor; no reconstruir trabajo; no duplicar ramas entre chats. No fusionar, publicar, elevar privilegios, habilitar ejecutor/autorización de escritura, gastar en proveedores IA ni tocar datos de Supabase/Business Central sin aprobación expresa. El límite local previsto de 10 EUR no es límite garantizado por el proveedor ni equivale a autorización de gasto. Business Central sin conexión/API directa; Excel manual para INVENTA y PDF manual de PREPARA; cuentas individuales y revocación por persona/dispositivo, retención de cargas finalizadas 90 días, proteger pendientes e incidencias. Supabase INVENTA y PREPARA son proyectos separados: no migrar por su cuenta. Archivos de gráficos/portal pertenecen a otras ramas, no al agente WORK. No asumir crédito Work disponible ni ejecución en segundo plano. Los chats no sincronizan automáticamente: comprobar HEAD antes de cualquier cambio.

**Bloqueos y primera tarea pendiente exacta:** ejecutar una prueba extremo a extremo de `scripts/visura_github_reviewer_permissions.py` con transporte **HTTP autenticado y únicamente GET**, mecanismo seguro de credenciales, identidad numérica cotejada e información de permisos real, manteniendo política `fail-closed`. Verificar políticas efectivas de la **rama base real de PR #43**, protección clásica si es accesible, excepciones/bypass y CODEOWNERS con evidencia fiable. Si el conector no permite entregar token al proceso local, NO extraer secretos ni fingir esa prueba: continuar con tests de contrato mock y documentar bloqueo. No habilitar ejecución real hasta revisión humana, sandbox de aislamiento, reglas y presupuesto externo verificables. Antes de actuar releer la PR #43 y el documento de traspaso para evitar colisiones.

**Rama de traspaso documental de este chat:** `docs/visura-work-traspaso-verificado-20261026` (derivada del SHA `d3aec336ab24a1c8f3cef485c19b8110cbc1d591` y sin tocar la rama de WORK). Los tres documentos de la solicitud se actualizan en un mismo commit documental. No se han actualizado `main`, PREPARA, INVENTA, Supabase ni workflows.

---

# Histórico íntegro (conservado, pero subordinado a la cabecera verificada)
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

# Traspaso del agente VISURA AUTO-DEV

Leer primero docs/VISURA_WORK_ESTADO.md en la rama
feat/visura-work-reviewer-evidence-20261026 de josegude-ux/KONTROLA.
Base: https://github.com/josegude-ux/KONTROLA/pull/37
SHA inicial: 0756bad9e17652dc3b77c626700df05ec09bf9ea.
Relación: esta rama -> feat/visura-auto-dev-task-spec (#37) ->
chore/visura-auto-dev-guardrails (#30) -> main. Ningún merge autorizado.

Otros repositorios: https://github.com/josegude-ux/INVENTA- (no modificado).
Rama operativa PREPARA: cursor/verificacion-fisica-cargas-8ba0; no editar.
No confundir el agente con PREPARA 0.3.35 ni con los documentos gráficos locales.

Comprobar git ls-remote, PRs y CI antes de retomar; no asumir que main es lo más
avanzado. Preservar commits posteriores. No forzar push ni tocar ramas compartidas.
Este primer punto de control precede al desarrollo; la disponibilidad remota
solo se confirma tras push y comparación del SHA remoto. Ver estado actualizado.
Observador implementado y conectado; código remoto 203c930527467bc6db1b4f552aef8a63ab93383a.
285 pruebas locales correctas. Primera tarea: prueba autenticada de solo lectura
del observador y verificación de políticas efectivas; después resolver elegibilidad.
Si faltan herramientas en chat normal, entregar cambios revisables sin inventar
commits ni verificaciones. No depender de Work, Cursor o memoria del chat.

PR de referencia: https://github.com/josegude-ux/KONTROLA/pull/43 (borrador, destino #37).


## Verificación adicional — resumen de permisos

Código remoto 15f416576371256395705974bb97bd7a1a3e263b, mismo PR #43.
293 pruebas locales correctas (8 nuevas), compilación, safety smoke y diff check
correctos. El resumen Actions muestra recuentos de permisos, desconocidos y
mismatches, sin nombres ni tokens; rechaza indicadores de autorización y datos
incoherentes. Prueba integrada del transporte GET hasta el informe unificado y
la reconsulta final del PR. CI del nuevo commit pendiente de consulta.
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

CI de 9d88d39f confirmada: Code Review Gate #176, CSV Pilot Tests #183 y Queue Audit #211 correctos. https://github.com/josegude-ux/KONTROLA/actions/runs/40295392197
