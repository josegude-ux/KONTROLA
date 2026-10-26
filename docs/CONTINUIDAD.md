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
