# KONTROLA — Ficha maestra de continuidad

**Actualizada:** 2026-10-25
**Visibilidad confirmada:** público (GitHub, 25/10/2026).
**Repositorio público:** `josegude-ux/KONTROLA`
**Alcance:** únicamente KONTROLA; no confundir con INVENTA, MOVENTA, Control de Cargas ni Control de Tanques.

> **Regla de continuidad:** antes de proponer nuevos desarrollos, inspeccionar **la PR #1 y su rama**. `main` solo tiene README y documentación: **no concluir que KONTROLA no está programada** al mirar únicamente `main`. Verificar código, pruebas y migraciones. No publicar, fusionar ni alterar producción sin autorización.

## Estado real verificado en GitHub (25/10/2026)

- **Fase 1: desarrollada parcialmente en código, NO desplegada ni validada con operarios reales.**
- **Pull Request abierta, borrador:** https://github.com/josegude-ux/KONTROLA/pull/1
- **Rama:** `desarrollo/fase-1-operario`
- **Commit de referencia:** `05eda2f9b4340de001f17e58d9cbc7b093b656f3`
- **Versión que indica su configuración:** `0.1.0`
- **19 archivos modificados** respecto a `main`: PWA con interfaz, motor PDF reutilizado, autenticación, lógica de lectura, SQL, tests y CI.
- **GitHub Actions:** última ejecución de «Verificar KONTROLA» en la rama con resultado correcto; las pruebas automatizadas NO equivalen a validación en móvil ni a pruebas reales de seguridad RLS.
- **Migración SQL NO aplicada:** `supabase/migrations/20261024_kontrola_preparacion.sql`. No asumir tablas/funciones desplegadas, cuentas creadas, PDF compartidos, permisos revisados ni conectividad operativa.
- **Documentos técnicos de la PR:** `docs/FASE_1.md` y `docs/REVISION_CURSOR.md`, disponibles en la rama. LEERLOS antes de escribir nuevo código.

## Qué contiene la Fase 1 (código todavía pendiente de aceptación)

1. Acceso con cuentas Supabase (`usuarios_app` y `auth.users`) y roles operario/administrador, usando el proyecto de Control de Cargas, separado de INVENTA.
2. Lista de cargas y consulta por pasillos/ubicaciones, descripción, cantidad, unidad y PDF original, sin marcar picking.
3. Motor lector PDF `src/core.mjs` adaptado desde Control de Cargas móvil v0.5.26.
4. Publicación administrativa individual de PDFs a un bucket privado propuesto `kontrola-pdfs`; **los PDF locales de Control de Cargas todavía NO se comparten automáticamente**.
5. Función SQL `kontrola_abrir_carga` para iniciar una preparación al abrir carga y cerrar la anterior del mismo operario; impide dos preparadores simultáneos sobre una carga.
6. **La pantalla de revisión/verificación aparece deshabilitada**. Notificaciones, incidencias y cierre global aún NO están implementados.
7. No hay modo offline fiable. No afirmar que la Fase 1 funciona con datos reales sin migración y pruebas con dos cuentas/dispositivos.
8. Revisión de seguridad de SQL `SECURITY DEFINER`, RLS y Storage sigue pendiente. No aplicar SQL hasta aprobación explícita.

## Lógica operativa aprobada en las conversaciones anteriores

- KONTROLA **sustituirá funcionalmente Control de Cargas**, pero **no debe modificar ni interrumpir la aplicación Control de Cargas actual**. Reutilizar su motor de PDFs, listados, pasillos y formatos ya resueltos, especialmente v0.5.26.
- **Cada trabajador tiene usuario/contraseña**; todos los trabajadores autorizados pueden preparar y verificar cargas, **pero nadie puede verificar una carga preparada por él mismo**. En preparación: una persona, una carga activa.
- **Picking real por pistolas conectadas a Business Central**: KONTROLA solo aporta PDF, consulta de referencias/ubicaciones/pasillos y seguimiento de preparación; no debe convertir la consulta en una lista con checks de picking.
- Abrir una carga registra el inicio. Cambiar de carga finaliza automáticamente la fase de preparación anterior, pero NO su verificación.
- **Verificación física independiente, línea por línea**, por una segunda persona. No confundir lectura del PDF con verificación física.
- Una diferencia entre lo esperado y lo comprobado genera **incidencia** y aviso inmediato **agrupado por carga** a un responsable/administrador designado, accesible desde móvil y ordenador.
- **Regularización en Business Central manual y por una única persona autorizada**. KONTROLA registra los datos, **no escribe en BC**.
- **Cierre automático de la carga al completar todas las verificaciones**, aun si hay incidencias pendientes de regularizar; la carga permanece cerrada y no se reabre por esa incidencia.
- Operario inicial: solo ve sus PDFs/cargas, consulta de pasillos y sus actividades; **no genera PDFs ni modifica estados de forma arbitraria**.
- Diseño y navegación coherentes con INVENTA, pero repositorios, datos e implementación separados.
- Prueba inicial de una carga con un usuario de operario real (cuando el backend esté preparado de forma autorizada).

## Próximo paso exacto

**Retomar la rama `desarrollo/fase-1-operario` y la PR #1 existente, NO generar una segunda Fase 1.**

1. Verificar que el agente Cursor esté abierto en **`josegude-ux/KONTROLA` y rama `desarrollo/fase-1-operario`**, no en INVENTA ni en `main`.
2. Leer `docs/FASE_1.md`, `docs/REVISION_CURSOR.md`, `src/app.mjs`, `src/logic.mjs` y la migración SQL.
3. Revisar problemas concretos de roles, RLS/Storage, idempotencia/concurrencia de la apertura de cargas y subida de PDFs. Corregir los defectos reproducibles con pruebas, **sin tocar Supabase real**.
4. Completar la Fase 1 sin rehacer los módulos ya presentes; mantener PR en borrador hasta revisión y prueba real.
5. **Después** desarrollar verificación independiente, incidencias/notificaciones agrupadas, cierre automático con incidencias pendientes y proceso de regularización manual BC.
6. No aplicar migraciones, publicar PDFs reales, crear cuentas, fusionar PR ni desplegar sin autorización.

## Protocolo al cambiar de chat

«Continuamos KONTROLA. Lee la ficha `docs/CONTINUIDAD.md` de `josegude-ux/KONTROLA` y **la PR #1 en `desarrollo/fase-1-operario`**. Recupera la lógica operativa ya aprobada y continúa la Fase 1; no la reconstruyas ni mezcles con INVENTA».

Al terminar cada avance actualizar **fecha, rama y commit, qué está programado y probado, qué NO está listo, pendientes y siguiente paso**, y consultar el estado real del repositorio antes de actuar.

## MOVENTA

La idea de un portal común se documentó separadamente en `docs/MOVENTA_CONCEPTO.md`. No integrar ni modificar MOVENTA en esta fase.


## VISURA AUTO-DEV — piloto determinista de PR (26/10/2026)

- Se añadió `.github/workflows/visura-auto-dev-zero-cost-pr.yml` en la rama `chore/visura-auto-dev-guardrails` (PR #30, sin fusionar).
- Activación **manual** (`workflow_dispatch`), nunca programada ni basada en el contenido de issues.
- Tras verificar las pruebas y los metadatos de la issue #31 abierta, el workflow intenta crear `chore/visura-auto-dev-generated-31` y un PR **draft** hacia la rama de guardrails; no modifica `main`.
- No llama a IA ni accede a Supabase/Business Central; puede requerir que GitHub permita a Actions crear PRs.
- **No consta todavía una ejecución satisfactoria de este nuevo piloto**. El workflow de auditoría previo sí verificó 18 pruebas superadas en run 40257686523.
- Siguiente acción: verificar el nuevo workflow en Actions y sus permisos antes de afirmar que el agente genera PRs autónomamente.

- Actualización posterior: el piloto admite también disparo por **push limitado a su propio workflow** en la rama de guardrails; se intentó disparar mediante commit `275cd0a`. Aún **no se ha confirmado** la creación de la rama `chore/visura-auto-dev-generated-31` ni de un PR automático. No asumir éxito hasta verificarlo.

- Verificación posterior: GitHub Actions **sí creó** `chore/visura-auto-dev-generated-31` y `docs/VISURA_AUTO_DEV_GENERADO_31.md` (contenido determinista, 7 líneas). La creación automática del PR **no quedó confirmada**; el PR **#33** fue creado mediante la integración de ChatGPT como recuperación, en borrador, base guardrails, sin fusionar. Investigar permisos de Actions para creación de PR y registrar fallo exacto antes de declarar el flujo completamente autónomo.

- Corrección del workflow de piloto en commit `9f95311`: una rama ya existente no provoca salida prematura; se comprueba por API si hay un PR (abierto o cerrado) antes de intentar crearlo, sin sobrescribir archivos. El PR #33 sigue siendo **creación manual vía integración**, no prueba de PR creado por Actions. Se debe verificar ejecución del workflow corregido y permisos de creación de PR en un nuevo piloto aislado.


## VISURA AUTO-DEV — primer PR autónomo verificado (26/10/2026)

- Tras habilitar en GitHub Actions el permiso para crear PR, el workflow determinista sin IA de pago generó automáticamente el **PR #34**: https://github.com/josegude-ux/KONTROLA/pull/34
- Rama de salida: `chore/visura-auto-dev-generated-34`; documento `docs/VISURA_AUTO_DEV_GENERADO_34.md`. PR hacia `chore/visura-auto-dev-guardrails`, no hacia `main`.
- Verificado mediante consulta de los PR existentes en GitHub. No fue creado manualmente desde ChatGPT, a diferencia del PR #33.
- Esto valida **un piloto documental autónomo sin IA**, no un agente de programación con LLM ni un límite de facturación real de 10 €/mes. Sin fusiones, despliegues ni cambios de datos.
- Próximo objetivo: automatizar tareas reales y acotadas con pruebas y revisión humana; no activar API de pago hasta verificar límite externo y ledger compartido.


## VISURA AUTO-DEV — revisión automática de código (26/10/2026)

- Nuevo workflow `.github/workflows/visura-auto-dev-code-review.yml` en rama de guardrails (commit `84012b4`). Ejecuta compilación, tests Python `test_visura_*.py` y smoke test de bloqueo de IA de pago en PR con cambios relevantes.
- Permisos GitHub mínimos `contents: read`; checkout sin credenciales persistidas; sin llamadas a OpenRouter ni acceso a datos.
- **Pendiente de confirmar su primera ejecución**. Es una puerta de validación, no un ejecutor autónomo de programación. No fusionar ni publicar sin revisión humana.

- Verificación Code Review Gate: run #4, ID `40259530585`, conclusión `success`; compilación correcta, 18 pruebas `OK` y smoke test confirma llamadas de pago bloqueadas y límite local de 10 €. Evidencia: https://github.com/josegude-ux/KONTROLA/actions/runs/40259530585. Este run corresponde al workflow de guardrails; **no confirma por sí mismo las pruebas CSV adicionales del PR #35**, cuyo workflow dedicado aún no aparece en las consultas.

- Seguimiento autónomo 26/10: se añadió la prueba `test_multiline_quoted_data_row` (commit `94500a5`), que verifica que un registro con salto de línea entre comillas cuenta como una sola fila. El total esperado ahora es **14 pruebas CSV**. Como la consulta de Actions no devolvió runs para `33ad648`, `6b29d2b` ni `94500a5`, se amplió el filtro del workflow CSV para que cambios en esta documentación disparen una nueva comprobación (commit `341092c3`). Pendiente confirmar run verde antes de integrar.

- Iteración autónoma 26/10: se ha endurecido el detector CSV para cabeceras largas (más de 4096 bytes) y registros lógicos multilínea; commits `4968461`, `f412028` y `edead73` en la rama del piloto. Total esperado: **16 pruebas CSV**. CI de estos cambios pendiente; PR #35 permanece en borrador.


## Piloto 2 — validador de especificaciones de tarea (26/10/2026)

- Rama aislada `feat/visura-auto-dev-task-spec`.
- `scripts/visura_task_spec.py` valida campos permitidos, identificador, límites de texto, lista de comprobaciones y coste máximo declarado de 10 €. Rechaza campos desconocidos como `shell_command`.
- El resultado siempre establece `execution_authorized=False` y `requires_human_approval=True`: validar una especificación **no ejecuta** la tarea ni demuestra que el proveedor respete un límite real de facturación.
- Pruebas en `tests/test_visura_task_spec.py`; pendientes de CI y revisión. Sin llamadas de IA, sin shell, sin escritura en aplicaciones, sin despliegue.

- Refuerzo del validador de tareas: se detectó que `NaN` podía superar comparaciones normales de presupuesto. `scripts/visura_task_spec.py` ahora exige coste finito con `math.isfinite` (commit `6cc8ab7`). Añadidas pruebas para `NaN`, infinito y alcance demasiado largo (commit `121a414`). El PR #37 sigue en borrador; CI de estos últimos cambios pendiente de confirmar.

- CI detectó un error de sintaxis en `visura_task_spec.py` (literal `\\n` insertado en una condición). Corregido en commit `31dd33c`; la ejecución posterior aún no está confirmada.
- Siguiente componente de diseño: `scripts/visura_review_plan.py` genera una lista fija de revisión a partir de una tarea válida, sin ejecutar comandos ni autorizar ejecución/merge. Pruebas en `tests/test_visura_review_plan.py` (commits `12cd4de`, `3560057`); pendiente CI.

- CI detectó que el intento anterior de corregir el presupuesto dejó un literal `\\n` en la condición. Corrección aplicada de nuevo en `aebf0f0` con salto de línea real. La ejecución de CI para este commit está pendiente; no considerar el validador ni el planificador aprobados hasta que el Code Review Gate termine en verde.

- **CI recuperada y superada**: Code Review Gate run #25 (`40261288526`) terminó `success`: compilación correcta, **32 pruebas OK** y smoke test confirma llamadas de pago bloqueadas y límite local de reservas de 10 €. Evidencia: https://github.com/josegude-ux/KONTROLA/actions/runs/40261288526. Se añadieron cinco pruebas más de validación de esquema en `e458ae6`; la nueva revisión de estas pruebas está pendiente.

- **CI verificada tras ampliación del esquema**: Code Review Gate run #27 (`40261375843`) `success`, compilación correcta, **37 pruebas OK**, smoke test confirma bloqueo de llamadas de pago y reserva local máxima de 10 €. Evidencia: https://github.com/josegude-ux/KONTROLA/actions/runs/40261375843. Después se añadieron en `cb1aaf5` una lista explícita de acciones permitidas/prohibidas al plan de revisión y pruebas en `f81dc19`; CI para estos dos commits aún pendiente.

- Code Review Gate #30 (`40261499014`) superó 37/37 pruebas y compilación; Queue Audit #65 y CSV Pilot #38 también `success`. https://github.com/josegude-ux/KONTROLA/actions/runs/40261499014
- Nueva fase de simulación: `scripts/visura_task_preview.py` devuelve un plan `dry_run` determinista, con cero llamadas al proveedor y sin autorización de ejecución o merge; pruebas en `tests/test_visura_task_preview.py` (commits `ae35bf7`, `0dcafc3`). **No es un ejecutor real** y su CI aún no se ha verificado.

- Code Review Gate #33 (`40261606455`) terminó `success`: compilación correcta, **39 pruebas OK**, bloqueo de llamadas de pago y límite de reserva local verificados. https://github.com/josegude-ux/KONTROLA/actions/runs/40261606455. Después se añadió `budget_enforced_by_provider=False` al simulador (commit `82cd83d`) y una aserción de prueba (commit `91e4287`) para evitar confundir el límite local con una garantía real de facturación. CI de esta última revisión pendiente.

- Code Review Gate #36 (`40261714890`) `success`, **39/39 pruebas OK**, compilación y bloqueo de pagos correctos: https://github.com/josegude-ux/KONTROLA/actions/runs/40261714890.
- Fase de autorización no ejecutora: `scripts/visura_execution_authorization.py` evalúa un registro de revisión externo, exige coincidencia de ID y marca de identidad verificada, pero devuelve siempre `execution_authorized=False` porque no puede autenticar por sí mismo al revisor ni ejecutar nada. Pruebas en `tests/test_visura_execution_authorization.py` (commits `4e5bf18`, `b1d7c61`); CI aún pendiente. La marca de identidad es dato de entrada no confiable: **no constituye prueba de identidad** sin un servicio externo confiable.

- Code Review Gate #39 (`40261808566`) **success: 44/44 pruebas OK** y bloqueo de pagos: https://github.com/josegude-ux/KONTROLA/actions/runs/40261808566.
- Endurecimiento de autorización: rechazo explícito de decisiones no textuales (`19e59d4`) y tres pruebas de datos malformados y permisos falsificados (`7c1815e`). La revisión externa real aún no está integrada; el módulo **nunca autoriza ejecutar**. CI de estos cambios pendiente.

- Code Review Gate #42 (`40261921585`) `success`, **47/47 pruebas OK**, compilación y smoke de bloqueo de pagos: https://github.com/josegude-ux/KONTROLA/actions/runs/40261921585.
- Proyección conservadora de revisiones GitHub en `scripts/visura_github_review_projection.py`: solo acepta estados conocidos, filtra revisiones de un SHA anterior y jamás autoriza ejecución ni merge; 4 pruebas en `tests/test_visura_github_review_projection.py` (commits `7cf72ac`, `23c8851`). **No autentica los datos ni consulta GitHub**, por lo que no debe utilizarse como control de acceso. Pendiente CI.

- Code Review Gate #45 (`40262000611`) **success, 51/51 pruebas OK** y smoke de pagos bloqueados: https://github.com/josegude-ux/KONTROLA/actions/runs/40262000611.
- La proyección de revisiones valida ahora el SHA de cada revisión antes de compararlo, y permite diferencias de mayúsculas/minúsculas hexadecimales (`af90e6e`); dos pruebas nuevas (`59cc574`). Pendiente CI. No se ha conectado ninguna API ni concedido permisos.

- Code Review Gate #48 (`40262080409`) `success`, **53/53 pruebas OK** y pagos bloqueados: https://github.com/josegude-ux/KONTROLA/actions/runs/40262080409.
- Consulta real de revisiones del PR #37 vía conector GitHub: `reviews=[]` en el momento de la comprobación; no hay aprobación que pueda usarse como evidencia. Se añadió adaptador **offline no autenticador** de respuesta REST (`scripts/visura_github_review_adapter.py`) y tres pruebas (`tests/test_visura_github_review_adapter.py`), commits `a110e44` y `e269986`. No autoriza ejecutar, no conecta por sí mismo y está pendiente CI.

- Code Review Gate #51 (`40262163192`) `success`, **56/56 pruebas OK** y pagos bloqueados: https://github.com/josegude-ux/KONTROLA/actions/runs/40262163192.
- Nuevo resumen **solo orientativo** de revisiones (`scripts/visura_review_status.py`), que ignora aprobaciones de otros commits y sustituye la decisión anterior de un revisor cuando recibe una revisión posterior. Cuatro pruebas en `tests/test_visura_review_status.py` (commits `8d268e2`, `c322c48`). El orden depende del llamante y no valida autenticidad ni reglas reales de protección de rama; nunca concede ejecución/merge. Pendiente CI.

- Code Review Gate #54 (`40262299261`) `success`, **60/60 pruebas OK** y llamadas de pago bloqueadas: https://github.com/josegude-ux/KONTROLA/actions/runs/40262299261.
- Se documentaron los controles externos necesarios antes de permitir un ejecutor real en `docs/VISURA_AUTO_DEV_EXECUTION_GATE.md` (commit `d32c812`). **La protección de ramas no está verificada** con las herramientas disponibles; no se ha activado ejecución automática ni gasto de IA.

- Code Review Gate #56 (`40262422865`) **success, 60/60 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40262422865.
- Se incorporó `scripts/visura_activation_gate.py` como **evaluador inerte fail-closed**, más cinco pruebas en `tests/test_visura_activation_gate.py` (commits `ba7d75c`, `069fda5`). Incluso si un payload declara todas las comprobaciones externas como verdaderas, **no se autentica la evidencia ni se concede ejecución, merge o despliegue**. No es un sistema de autorización real; CI de estas pruebas pendiente.

- Code Review Gate #59 (`40262517292`) **success, 65/65 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40262517292.
- Nuevo comprobador inerte de vinculación entre tarea, commit, autor y revisor (`scripts/visura_review_binding.py`, commit `8b03a95`) con cinco pruebas (`tests/test_visura_review_binding.py`, commit `434fb60`). Detecta SHA distinto, auto-revisión y campos de autorización inyectados. La elegibilidad es una **declaración no autenticada** y jamás autoriza ejecución o merge. Pendiente CI.

- Code Review Gate #62 (`40262589532`) **success, 70/70 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40262589532.
- Nuevo informe consolidado de bloqueos `scripts/visura_readiness_report.py` (commit `b234e86`), con cuatro pruebas `tests/test_visura_readiness_report.py` (commit `75bf987`). Incluso con todas las declaraciones en `True`, la ejecución, el merge y el despliegue siguen bloqueados porque no existe autorización externa autenticada. Pendiente CI.

- Code Review Gate #65 (`40262803031`) **success, 74/74 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40262803031.
- Comprobador de contexto de revisión inerte `scripts/visura_review_context.py` (commit `6a6c0ff`), con cinco pruebas `tests/test_visura_review_context.py` (commit `42a64af`). Exige coincidencia de repositorio, PR, tarea y SHA, detecta auto-revisión, pero **no autentica fuentes ni autoriza acciones**. Pendiente CI.

- Code Review Gate #68 (`40263039956`) **success, 79/79 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40263039956.
- Adaptador GitHub endurecido: valida la sintaxis del login del revisor (longitud 1-39, alfanuméricos/guiones, sin guiones al inicio/final ni dobles) en `scripts/visura_github_review_adapter.py` (commit `775002b`), con tres pruebas nuevas (commit `19ca268`). No autentica la identidad; CI pendiente.

- Code Review Gate #71 (`40263164862`) **success, 82/82 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40263164862.
- Comprobación inerte de identidad GitHub por ID numérico estable en `scripts/visura_github_identity_binding.py` (commit `5a0cf1e`), con cuatro pruebas (`00f239e`). Detecta el mismo usuario aunque cambie su login, pero no autentica los IDs suministrados ni concede permisos. Pendiente CI.

- Code Review Gate #74 (`40263271010`) **success, 86/86 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40263271010.
- Se añadió un cliente de lectura real de GitHub REST, aislado y sin permisos de escritura, `scripts/visura_github_readonly_snapshot.py` (commit `61dea03`): consulta PR y revisiones con GET HTTPS fijo a `api.github.com`, valida identidad numérica/commit/estado y falla si hay más de cinco páginas de revisiones (no entrega información truncada). Nueve pruebas de respuestas simuladas y ataques de formato en `tests/test_visura_github_readonly_snapshot.py` (commit `ec095ee`). **No se ha configurado token de producción, no se ha puesto en marcha workflow para ejecutar este cliente, no se han verificado reglas de rama y jamás autoriza acciones.** CI pendiente.

- Code Review Gate #77 (`40263774092`) **success, 95/95 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40263774092.
- Preparado el comando `python3 -m scripts.visura_github_readonly_snapshot OWNER/REPO NUMERO_PR` (token solo en variable `GITHUB_TOKEN`) para auditoría de lectura; commit `515f268`. Preparado workflow **manual, no activado** `.github/workflows/visura-auto-dev-manual-review-audit.yml` (commit `27853be`) con permisos `contents:read`, `pull-requests:read`, checkout de rama predeterminada confiable y `persist-credentials:false`. **El workflow no es utilizable desde el branch de este PR hasta que su definición sea aprobada y fusionada en la rama predeterminada; no fusionar sin aprobación expresa.** Dos pruebas CLI adicionales (commit `377c926`) pendientes de CI. No permite ejecutar, fusionar o desplegar cambios.

- Code Review Gate #81 (`40263984781`) **success, 97/97 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40263984781. CSV Pilot Tests #89 y Queue Audit #116 también completaron con éxito para el mismo commit `7fcea82`.
- Descripción y título del PR #37 actualizados para reflejar fielmente el alcance del piloto, las restricciones de seguridad y las limitaciones. El PR continúa **draft**, con base `chore/visura-auto-dev-guardrails`; sin merge y sin despliegue.

- Code Review Gate #84 (`40265037721`) **success, 101/101 pruebas OK**: https://github.com/josegude-ux/KONTROLA/actions/runs/40265037721. CSV Pilot Tests #92 y Queue Audit #119 también `success` para commit `983b259`.
- Endurecimiento del cliente REST `scripts/visura_github_readonly_snapshot.py` (commit `523ee3e`): no sigue redirecciones HTTP con el token de GitHub; lee los metadatos del PR de nuevo tras paginar revisiones y **rechaza el snapshot si han cambiado SHA, autor numérico, repositorio de destino o estado**. Cuatro pruebas añadidas en `tests/test_visura_github_readonly_snapshot.py` (commit `983b259`). Esta segunda lectura no garantiza que las revisiones sigan vigentes tras devolver el informe: **ningún resultado autoriza ejecución, merge o despliegue**.

- **Auditoría observacional integrada** en el lector REST: `scripts/visura_github_review_audit.py` (commit `3c9b2f1`) clasifica registros de aprobación observados para el SHA actual, solicitudes de cambios, revisiones de commits anteriores, auto-revisiones, descartadas y pendientes. Doce pruebas propias (`115c83d`), integración automática dentro de `fetch_readonly_review_snapshot()` (`95dddf3`) y tres pruebas de integración más (`14c0373`). Ninguna observación verifica derechos de revisor ni autoriza ejecución, merge o despliegue.
- Code Review Gate #89 (`40265533838`) **success: 116/116 pruebas OK**, smoke de bloqueo de IA de pago; CSV Pilot Tests #97 y Queue Audit #124 también `success`: https://github.com/josegude-ux/KONTROLA/actions/runs/40265533838.
- Guía operativa creada en `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` (commit `177df59`): describe el workflow manual aún no activado, su futuro uso en GitHub Actions y las limitaciones de las aprobaciones meramente observadas. La protección efectiva de ramas y de permisos de revisor sigue sin verificarse. No fusionar sin autorización.

- Code Review Gate #93 (`40265983912`) **success: 121/121 pruebas OK**, CSV Pilot Tests #101 y Queue Audit #128 también `success`: https://github.com/josegude-ux/KONTROLA/actions/runs/40265983912.
- Auditoría de revisiones ampliada en `scripts/visura_github_review_audit.py` (commit `2fbe0a1`) con una vista orientativa por ID numérico de cuenta: `observed_latest_decisive_reviews_by_account`, `observed_latest_approval_records` y `observed_superseded_decisive_review_ids`. Cinco pruebas (`4f5a5bf`) comprueban aprobaciones seguidas de solicitudes de cambio o descartes, decisiones sin ordenar y cuentas diferenciadas. La vista ordena por ID numérico de revisión, **no prueba la última aprobación efectiva según GitHub** y jamás autoriza acciones. Guía actualizada en commit `ffc1597`. PR #37 aún en borrador, sin reviews registradas al consultar; la cuenta propietaria figura como administradora, pero **protección de ramas no verificada**.

- **Auditoría de políticas GitHub, solo lectura:** `scripts/visura_github_policy_probe.py` (commit `b4297d9`) consulta la protección clásica de una rama y los rulesets del repositorio/padres; 404 se registra `not_found_or_inaccessible` (NO prueba ausencia de protección), 403 `inaccessible`, reglas listadas no suponen aplicación efectiva. Siempre `repository_policy_verified=false` y prohibidas ejecución/merge/deploy. Doce pruebas simuladas en `tests/test_visura_github_policy_probe.py` (commit `5cb4621`). Code Review Gate #97 (`40266458471`) **success: 133/133 pruebas OK**; Queue Audit #132 y CSV Pilot Tests #105 también `success`: https://github.com/josegude-ux/KONTROLA/actions/runs/40266458471.
- Workflow **manual, todavía no activado** `.github/workflows/visura-auto-dev-manual-review-audit.yml` actualizado (commit `dee4c28`) para añadir segundo paso de inspección de políticas usando solo lectura. La cuenta de GitHub Actions mantiene `contents:read` y `pull-requests:read`; GitHub suele exigir `Administration:read` para protección clásica: un 403/404 permanecerá `no verificado`, sin elevación de permisos. Guía `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` actualizada en `439673e`. **No se ha consultado ni probado la protección real de main; no fusionar sin autorización humana**.

- **Consulta de reglas realmente aplicables a rama** en `scripts/visura_github_policy_probe.py` (commit `19e411e`): incorpora `GET /repos/{owner}/{repo}/rules/branches/{branch}` y reporta los rulesets activos correspondientes, independientemente de los listados generales. Sigue sin certificar protección clásica, bypasses, identidad ni suficiencia de políticas. Si recibe 403/404 informa `no verificado`; si hay paginación incompleta falla cerrado. Ocho nuevas pruebas en `tests/test_visura_github_policy_probe.py` (commit `250b181`). Code Review Gate #102 (`40282682444`) **success: 141/141 pruebas OK**; CSV Pilot Tests #110 y Queue Audit #137 también `success`: https://github.com/josegude-ux/KONTROLA/actions/runs/40282682444. Guía actualizada en `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` (commit `d936744`). El workflow manual preparado consume el mismo lector; no activado ni probado contra la política real de `main`. No se han incrementado permisos ni autorizado merges/despliegues.

- **Regresión de seguridad del workflow manual:** ocho pruebas nuevas `tests/test_visura_manual_audit_workflow.py` (commit `d1e2400`) verifican activación solo por `workflow_dispatch`, permisos exclusivamente de lectura, checkout de la rama predeterminada sin credenciales persistentes y dos comandos de consulta permitidos. `.github/workflows/visura-auto-dev-code-review.yml` actualizado (commit `8c9d840`) para incluir modificaciones del workflow manual en la revisión automática. Code Review Gate #111 (`40283492960`) **success, 161/161 pruebas OK**, bloqueo de IA de pago comprobado; Queue Audit #146 y CSV Pilot Tests #119 también `success`: https://github.com/josegude-ux/KONTROLA/actions/runs/40283492960. Guía actualizada en `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` (commit `e893c1b`). Se intentó consultar directamente los endpoints públicos de protección y reglas de `main`, pero la sesión no dispone de conectividad pública para ello; **protección efectiva de main no verificada**. Estas pruebas son comprobaciones estáticas de regresión, no autenticación de GitHub ni autorización de merge. PR #37 permanece borrador y sin fusiones ni despliegues.

- **Auditoría unificada de destino real del PR + rama predeterminada** (26/10/2026): `scripts/visura_github_readonly_snapshot.py` ahora obtiene y comprueba `base.ref` y `base.sha` antes/después de leer revisiones (commit `ed89f2c`, tres pruebas de retarget/drift en `5ebc095`). El informe observacional `scripts/visura_github_review_audit.py` incluye esos campos (`5c7689a`, prueba `ba0a2c8`). Nuevo `scripts/visura_github_audit_bundle.py` (commit `8e3d0c5`) consulta políticas de la rama **base del PR** obtenida de GitHub (en PR #37, `chore/visura-auto-dev-guardrails`) y de `main` como contexto; comprueba el estado del PR de nuevo después de ambas lecturas, pero la auditoría no es atómica ni autoriza acciones. Pruebas unitarias en `tests/test_visura_github_audit_bundle.py` (commits `1ddb20a`, `fc3f0c4`), incluida consulta REST completa simulada. Workflow manual reducido a un único comando de solo lectura (commit `74307c8`), pruebas de contrato actualizadas (`c81f482`) sin relajar permisos. Code Review Gate #112 detectó y rechazó tres expectativas obsoletas, corregidas y verificadas con #113 (**161/161 pruebas OK**). Ejecución **#117 (`40283798257`) success, 162/162 pruebas OK**; CSV #125 y Queue Audit #152 también `success`: https://github.com/josegude-ux/KONTROLA/actions/runs/40283798257. Guía actualizada en `b6fff21`. El workflow manual **NO** está activado y no se ha comprobado la protección real del repositorio con credenciales.

- **Resumen legible para GitHub Actions**: nuevo `scripts/visura_github_action_summary.py` (commit `afe1e10`) con formato Markdown para PR, ramas, recuentos orientativos de revisiones y estados de protección, sin presentar aprobaciones como permisos efectivos. La CLI unificada `scripts/visura_github_audit_bundle.py` lo escribe únicamente cuando GitHub proporciona `GITHUB_STEP_SUMMARY` (commit `0f7e9ac`), conservando JSON en logs y sin exponer token ni modificar datos de las apps. Pruebas de resumen (`02e2722`) e integración CLI (`a2d4131`); bloqueo de inyección en tablas Markdown (`9aa8f3b`) y prueba adicional (`1c4f707`). Code Review Gate #125 (`40284781578`) **success: 176/176 pruebas OK** y pagos bloqueados: https://github.com/josegude-ux/KONTROLA/actions/runs/40284781578. La guía `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` explica el Summary y sus límites (`57a4da6`). El workflow de auditoría manual sigue **sin activar** porque el PR permanece en borrador. No hay autorización real de ejecución/fusión/despliegue ni verificación efectiva de la protección de `main`.

- **Evidencias observadas de CI sobre el SHA exacto del PR:** módulo de lectura `scripts/visura_github_commit_checks.py` (`9710c96`) consulta los GitHub check-runs con `filter=latest`, valida SHA, estados, paginación y rechaza respuestas truncadas, duplicadas o de otro commit. Dieciséis pruebas (`9bc213f`). La auditoría unificada añade `head_check_runs` (`fd5d845`) con dos pruebas de vinculación e inaccesibilidad (`fe8a878`). El informe legible de GitHub Actions incluye recuentos de successes, fallos y pendientes (`a17f458`) con seis pruebas nuevas (`72f3572`). Workflow manual añade **solo** `checks: read` (`8fd673e`) y su prueba de contrato exige exactamente los tres permisos de lectura (`ff19608`). GitHub Actions Code Review Gate #135 (`40285639178`) **success: 200/200 pruebas OK**, CSV Pilot #143 y Queue Audit #170 también en verde: https://github.com/josegude-ux/KONTROLA/actions/runs/40285639178. La guía `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` (commit `706eae2`) y los requisitos externos `docs/VISURA_AUTO_DEV_EXECUTION_GATE.md` (`c702683`) aclaran que los checks observados **no son prueba de checks obligatorios satisfechos ni autorización efectiva**. No se ha ejecutado el workflow manual con credenciales reales ni comprobado la protección real de las ramas. PR #37 sigue en borrador, sin fusión, despliegue ni gasto de IA.

## VISURA 0.2 — verificación de continuidad y guardrails (26/10/2026)

- Continuación de `VISURA 0.1` sin reconstruir módulos ni utilizar Cursor.
- PR #37 `feat/visura-auto-dev-task-spec` sigue **borrador**, contra `chore/visura-auto-dev-guardrails`, no contra `main`. Sin autorización de ejecución/merge/despliegue.
- Auditoría real de GitHub (lectura) muestra ruleset ID `25846536` activo para `~DEFAULT_BRANCH`; bloquea borrado y actualización no-fast-forward y requiere PR, pero su regla de PR contiene **cero aprobaciones exigidas**. No incluye reglas de CI obligatorias en el ruleset inspeccionado. La protección clásica devolvió HTTP 403: política completa **no verificada**.
- Esta iteración añade observación explícita de `required_approving_review_count` por regla `pull_request` en el endpoint de reglas aplicadas: distingue `0` de ausente/inaccesible. No concede autoridad; `repository_policy_verified`, `execution_authorized`, `merge_authorized` y `deployment_authorized` siguen `false`. Pruebas de regresión incluidas en el mismo commit.
- Supabase **solo lectura**: INVENTA y Control de Cargas/PREPARA siguen en proyectos distintos y activos. INVENTA: 1853 productos y 794 ubicaciones. PREPARA: 14 cargas y 3 registros de preparación. No confundir con certificación de sincronización entre dispositivos.
- Avisos del Security Advisor, pendientes de análisis antes de modificar permisos: en PREPARA/Cargas, 5 funciones SECURITY DEFINER invocables como `anon`; en INVENTA, 3 invocables como `authenticated`; ambas bases indican protección de contraseñas filtradas deshabilitada. La presencia de avisos no demuestra por sí sola escalada de privilegios.
- VISURA PREPARA PR #28 aparece fusionada a una **rama de desarrollo**, no acredita publicación a `main`; VISURA INVENTA PR #20 continúa abierta en borrador.
- **Validación pendiente**: CI del commit de esta iteración y lectura de resultados de Actions. Ninguna comprobación sustituye revisión humana o prueba móvil.
- **Siguiente tarea exacta**: verificar CI sobre SHA final; auditar elegibilidad de revisores/protección clásica mediante un contexto autorizado, sin inferir que HTTP 403 significa ausencia de protección. Revisar SECURITY DEFINER de Supabase en modo solo lectura antes de diseñar permisos/correcciones. Mantener fuera de alcance migraciones, publicación y fusiones.


## VISURA AUTO-DEV — Cruce orientativo de checks exigidos (26/10/2026)

- Se amplió `scripts/visura_github_policy_probe.py` para extraer contextos de checks exigidos observados tanto en protección clásica (`checks/context/app_id` o `contexts`) como en reglas activas de rulesets (`required_status_checks/context/integration_id`), conservando el estado `desconocido` si falta información (commit `59c31da`, ocho pruebas `69aa1c3`).
- `scripts/visura_github_commit_checks.py` recoge nombres de check-runs y IDs de aplicación del SHA exacto del PR (commit `5812cc1`, pruebas `b3f84ad`) y calcula **solo coincidencias candidatas**, nunca una aprobación real de los checks requeridos (commit `6b152f7`, trece pruebas `50453cd`). Una prueba contenía un escape incorrecto y provocó fallo de CI; se corrigió en `7080c99` y se verificó posteriormente.
- El `scripts/visura_github_audit_bundle.py` añade `required_check_observations`, siempre contra la rama de destino obtenida de GitHub (commit `cdb665f`, prueba `18fab02`). La vista del Summary muestra coincidencias, ausencias y datos desconocidos con advertencias explícitas de que **NO autoriza** ejecución/merge/despliegue (commit `7f7dc3f`, pruebas `a41989b`).
- Prueba integral de auditoría REST simulada añadida en `tests/test_visura_github_audit_bundle.py` (commit `49f02fb`): incluye PR, protección de rama, contexto exigido, ID de aplicación, check-run del SHA correcto y resumen final. **Code Review Gate #154 (`40287652592`) success: 237/237 pruebas OK**; CSV Pilot Tests #162 y Queue Audit #189 también `success`: https://github.com/josegude-ux/KONTROLA/actions/runs/40287652592.
- Guía `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` y bloqueo externo `docs/VISURA_AUTO_DEV_EXECUTION_GATE.md` actualizados. La comparación **no incluye commit statuses heredados, merge queue ni permisos efectivos de revisores/apps**, y la protección clásica puede seguir inaccesible. La comprobación de 237 pruebas corresponde a código y APIs simuladas, no verifica la configuración real de GitHub. No activar ejecutor, IA de pago, fusiones ni despliegues sin autorización humana y controles reales.


## VISURA AUTO-DEV — Estados heredados de commit (26/10/2026)

- Implementado `scripts/visura_github_legacy_statuses.py` (commit `67f7f65`): consulta **solo lectura** del endpoint de estados heredados `/commits/{sha}/statuses`, valida el SHA exacto y paginación, conserva el último estado observado por contexto y falla cerrado con datos incompletos, duplicados o respuesta 403/404. Incluye comparación **orientativa** de los contextos requeridos, sin dar por verificables requisitos fijados a una aplicación. Pruebas unitarias e integridad `tests/test_visura_github_legacy_statuses.py` (commit `857009b`).
- `scripts/visura_github_audit_bundle.py` ahora devuelve `legacy_commit_statuses` y `legacy_status_observations` como fuentes separadas de los `check-runs` (commit `1c5cf93`); pruebas end-to-end de API REST simulada y rama de destino en `tests/test_visura_github_audit_bundle.py` (commit `6c9cf46`). `scripts/visura_github_action_summary.py` muestra sus recuentos separados y señala origen no verificable (commit `02ce005`), con pruebas `bade9d5`.
- **Code Review Gate #161** (`40288785299`) **success: 269/269 pruebas OK**; Queue Audit #196 y CSV Pilot Tests #169 también en verde: https://github.com/josegude-ux/KONTROLA/actions/runs/40288785299.
- La consulta real a GitHub mediante `get_commit_combined_status` del SHA `bade9d53f38f15024096f0ef9697fa5cea59c850` del PR #37 devolvió `statuses: []` en el instante consultado. **No equivale a ausencia de check-runs ni a prueba de política CI cumplida**; los checks de Actions están en otro endpoint.
- Documentos `docs/VISURA_AUTO_DEV_REVIEW_AUDIT.md` y `docs/VISURA_AUTO_DEV_EXECUTION_GATE.md` actualizados para reflejar ambas fuentes y las restricciones; ninguna consulta valida protección clásica inaccesible, elegibilidad de revisores, *merge queue*, excepciones ni permisos de aplicación. El workflow manual sigue inactivo al permanecer el PR en borrador. No fusionar, desplegar, activar IA de pago ni modificar Business Central, PREPARA o INVENTA.


## VISURA WORK — rama aislada de permisos (2026-10-26)

Base #37 0756bad9; rama feat/visura-work-reviewer-evidence-20261026.
Código 203c9305: observador de permisos numéricos integrado, 285 pruebas locales
correctas; sin activación ni integración en ramas operativas.
Ver VISURA_WORK_ESTADO.md y CONTINUIDAD_WORK_A_CHAT_NORMAL.md en esta rama.

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
