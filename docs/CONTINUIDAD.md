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


## VISURA AUTO-DEV — piloto documental aislado (26/10/2026)

- Rama de trabajo: `chore/visura-auto-dev-pilot-31`, derivada de `chore/visura-auto-dev-guardrails`.
- PR #32 (borrador) hacia la rama de guardrails, **no** hacia `main`: https://github.com/josegude-ux/KONTROLA/pull/32
- Documento: `docs/VISURA_AUTO_DEV_PILOTO_31.md`; issue de seguimiento #31.
- Realizado mediante integración GitHub de ChatGPT, **no por agente autónomo**.
- Pruebas: confirmado por API que PR #32 cambia solo el documento del piloto antes de esta actualización; no hay estados de CI publicados en el commit inicial (no implica pruebas superadas).
- Sin llamadas a OpenRouter, migraciones SQL, acceso a Supabase, fusiones o despliegues en este piloto.
- Pendiente: verificar CI, revisar PR y configurar ejecutor de IA de mínimos privilegios con corte presupuestario verificable antes de automatizar.
- Esta anotación no sustituye ni modifica el plan de desarrollo de la Fase 1 operativa anterior.
