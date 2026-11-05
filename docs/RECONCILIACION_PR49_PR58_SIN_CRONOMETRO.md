# VISURA PREPARA — conciliación segura PR #49 + PR #58

**Fecha:** 26/10/2026.
**Responsabilidad:** rama aislada `feat/visura-prepara-integracion-pr49-pr58-20261026`, derivada del último estado verificado del PR #58.
**Estado:** integración **parcial**; no confundirla con fusión/publicación de PR #49, PR #58, PR #51 o PR #52.

## Petición vigente

- En VISURA, Preparación y Verificación están disponibles **simultáneamente desde la publicación** de la carga. El avance del picking pertenece a las pistolas de Business Central y no se conoce automáticamente en VISURA.
- El usuario confirmó que **hoy no se harán pruebas físicas con dos dispositivos**. No programarlas ni darlas por superadas.
- No introducir cronómetros, mensajes de medición de tiempos ni un supuesto bloqueo de verificación por picking incompleto.
- No fusionar, desplegar, actualizar Supabase, borrar cargas ni alterar datos operativos sin autorización explícita específica.

## Fuentes contrastadas

- PR #58 `feat/visura-prepara-flujos-paralelos-implementacion-20261026`: código paralelo + SQL pendiente de despliegue, 285 pruebas Node y PostgreSQL temporal, escenario concurrente superado. [PR #58](https://github.com/josegude-ux/KONTROLA/pull/58).
- PR #49 `feat/visura-prepara-piloto-usuarios-sin-cronometro-20261026`: cronómetro, menú/piloto, roles, datos de cabecera, huecos y panel. [PR #49](https://github.com/josegude-ux/KONTROLA/pull/49).
- PR #51: acceso a importación administrativa sobre PR #49. PR #52: importación de archivos F/C sobre PR #51. Son ramas apiladas pendientes, no se han incluido aquí.
- Base de PR #49: commit `e453c6e9...`; base de PR #58: rama `cursor/verificacion-fisica-cargas-8ba0` posterior a PR #56 de matriz de pasillos y listado A4. **No sustituir archivos de la rama moderna por archivos completos de la antigua.**

## Cambios reconciliados en esta rama (solo PR #49: cronómetro)

1. `src/app.mjs`: se retira el temporizador visual local, el intervalo periódico, las funciones de cómputo de duración y las llamadas relacionadas. **Se mantienen** las RPC y estados de preparación, el cálculo de palés, la vista de verificación paralela y el listado A4.
2. `index.html`: se elimina únicamente el elemento `#prepClock`. No se reordenan menús ni se copian interfaces históricas.
3. `tests/navigation.test.mjs`: se modifica la prueba antigua que exigía el reloj para comprobar ahora su ausencia, sin suprimir verificaciones de preparación y consulta.
4. `.github/workflows/visura-parallel-integration-ci.yml`: ejecución aislada del mismo conjunto de pruebas nativas Node y PostgreSQL de CI, dirigida únicamente a esta rama. La base de ensayos utiliza `kontrola_test` local con las salvaguardas de `tests/integration/run.sh`.

**No cambia** la recopilación de datos en BC ni se añade integración directa. Las marcas de inicio/fin que ya existen en Supabase para rastrear acciones explícitas de VISURA son distintas de un cronómetro visible; no inferir métricas de picking real.

## Qué queda pendiente del PR #49

No se afirma que PR #49 esté integrado completamente. El diff contiene además elementos de cabecera/observaciones, reglas de huecos (incluidos 6 G / 1 E), mejoras de carga, pilotos/usuarios, permisos, administración, versiones, service worker y varias pruebas. Entre ellos hay solapamientos con archivos que avanzaron después del punto de partida del PR #49.

**Siguiente secuencia independiente, sin pruebas físicas hoy:**
1. Revisar las partes de PR #49 no relacionadas con el reloj y las decisiones posteriores en ramas PR #48, #51 y #52. Separar lo ya incorporado, lo aún necesario y lo incompatible.
2. Portar solamente los cambios vigentes sobre la rama de integración, uno por uno, conservando los avances de PR #56 y PR #58. No duplicar implementaciones ni introducir datos de prueba reales.
3. Validar mediante CI aislada; mantener PR #49 y PR #58 sin fusionar hasta completar esa conciliación.
4. Preparar checklist manual para otro día: dos usuarios y dispositivos independientes, carga ficticia importada, inicio de verificación con preparación pendiente, revisión parcial de palés, cambios de almacén/permisos y cierre en ambos órdenes.

## Estado operativo y cautelas

La aplicación instalada aún puede mostrar la versión anterior. Los commits aquí no prueban despliegue ni actualización del usuario. La revisión de seguridad vigente advierte una RPC `SECURITY DEFINER` ejecutable por `anon` en Supabase conectado; el borrador SQL del PR #58 incluye la propuesta de revocación, **sin aplicar**.

**No declarar trabajo finalizado antes del resultado de CI;** distinguir validación automática de cualquier ensayo físico o despliegue.
