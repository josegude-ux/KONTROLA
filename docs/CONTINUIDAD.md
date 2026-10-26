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
