# Implementación propuesta — dos flujos simultáneos en VISURA PREPARA

**Fecha:** 26/10/2026  
**Origen funcional:** decisión del usuario y PR documental #57.  
**Estado:** código y SQL preparados en rama AISLADA; **validación integrada superada en PostgreSQL efímero de GitHub Actions**. Ninguna migración aplicada al Supabase conectado, ningún despliegue ni alteración de cargas reales.

## Qué cambia

Al publicar una carga válida, el mismo registro de carga queda accesible de forma independiente en:
1. Preparación/consulta operativa (picking realmente gestionado en las pistolas de Business Central).
2. Verificación física (operario distinto que comprueba palés ya disponibles).

No se inicia un cronómetro ni se registra automáticamente «preparación iniciada» o «verificación iniciada» al publicar: ambos **procesos están disponibles** y la verificación comienza mediante la acción expresa del verificador, con auditabilidad. No existe integración directa a BC; no se pueden inferir palés preparados.

## Archivos de esta rama

- `src/parallel-workflows.mjs`: selección de cargas verificables y estado de cada proceso, independientes de una única columna global.
- `src/app.mjs`: permite consultar/verificar `publicada` sin `preparador_id`, mantiene segregación por usuario y refleja los estados de verificación y preparación por separado; refresca listas al finalizar.
- `supabase/proposals/kontrola_prepara_verificacion_paralelas.sql`: **BORRADOR NO APLICADO** de cinco funciones RPC existentes; misma firma y retorno, con la restricción de sustitución por revisión, bloqueo de doble asignación, eliminación del requisito de preparación previa y cierre no invasivo.
- `tests/parallel-workflows.test.mjs`: diez pruebas Node previstas sobre disponibilidad, segregación, concurrencia, cierre desacoplado, no regresión del estado al cambiar de carga y permisos previstos del SQL.

## Modelo de cierre propuesto

- Si la verificación termina y **no hay una sesión de preparación en VISURA**, la carga puede marcarse cerrada al haber comprobado todas sus líneas (el picking de BC no se infiere).
- Si la verificación termina con una preparación en VISURA aún abierta, **NO se cierra automáticamente la preparación**; el resumen de carga permanece `preparacion_en_curso` y `verificacion_fin` indica por separado que Verificación sí terminó.
- Cuando ese preparador finaliza manualmente su sesión, y Verificación ya terminó, se marca la carga cerrada. Si Verificación sigue abierta, la sesión de Preparación finaliza sin interrumpirla.
- Cada función emplea permisos de usuario/almacén y bloqueos por carga; los permisos se aplican realmente en RPC, nunca solo por filtros JavaScript.
- Es una transición propuesta para el esquema existente. No sustituye confirmación operativa de carga final ni inventa estados de picking en BC.

## Seguridad / trabajo pendiente

- **Reconciliación realizada:** el PR #56 fue fusionado en la rama de desarrollo `cursor/verificacion-fisica-cargas-8ba0` (merge `fb2d0e6`). El código de los flujos paralelos se integró mediante commit de reconciliación de dos padres `c7b9317`, conservando la función de matriz por pasillos `renderAisleMatrix` y la generación del listado A4 `crearListadoPasillosA4`. No se ha fusionado este PR a la rama de destino ni desplegado.
- **SQL actualizado desde funciones instaladas:** se inspeccionó en modo solo lectura el proyecto Supabase `control-cargas-movil` (ID `oevetnszmfxeukcncwji`) y se reconstruyó el borrador de las cinco RPC a partir de `pg_get_functiondef`, conservando en particular la protección de revisiones PDF mediante `c.documento_hash=v_i.documento_hash`. **No se ejecutó SQL de modificación**. Falta comprobar RLS, permisos efectivos y ejecutar el borrador en un entorno de pruebas aislado con autorización expresa; esta ejecución ya se ha realizado en el PostgreSQL temporal de CI, sin despliegue. No editar/reaplicar migraciones históricas.
- La propuesta SQL no crea tablas nuevas ni expone nuevas rutas públicas. Conserva `REVOKE` a `PUBLIC, anon` y `GRANT EXECUTE` a `authenticated`, pero debe someterse a asesores de seguridad y pruebas reales antes de ejecutarla.
- El frontend aún contiene lógica heredada de tiempos de preparación de BC y del flujo de importación; la línea de desarrollo que retira el cronómetro debe reconciliarse con esta rama, sin reintroducir métricas de control.
- El botón de preparación puede mostrar estado de una sesión de VISURA, pero nunca supone que refleja el progreso físico de picking BC.
- Los escenarios de roles «Operario», «Supervisor» y «Administrador» deberán comprobarse contra las políticas realmente vigentes, sin conceder nuevos accesos indirectos.
- **Pruebas evaluadas:** 10 casos de `tests/parallel-workflows.test.mjs` ejecutados en un intérprete JavaScript aislado con adaptadores para `node:test`, `assert` y lectura del SQL: 10/10 correctos. El código `src/app.mjs` y el módulo auxiliar superaron una comprobación de sintaxis JS. **CI superado** con las pruebas nativas de Node y PostgreSQL temporal; pendiente ensayo físico con dos dispositivos, revisión avanzada de seguridad y eventual prueba autorizada en un entorno de staging independiente. No existe evidencia de piloto real superado.

## Criterios de aceptación

1. Publicar carga válida -> aparece en ambas vistas sin `preparador_id`.
2. Dos usuarios en dispositivos distintos -> preparación documental y verificación accesibles al mismo tiempo.
3. Inicio de verificación sin sesión de preparación -> no falla en RPC.
4. No se permite que el mismo usuario registrado prepare y verifique; otro verificador no puede apropiarse de una sesión ya asignada.
5. Inicio de preparación no oculta una verificación ya iniciada.
6. Terminar una verificación no edita `kontrola_preparaciones.fin` de otro usuario.
7. Estados de ambas fases quedan visibles y actualizables incluso con respuestas concurrentes.
8. Reimportar misma carga con verificación empezada, aunque no exista preparación, debe estar bloqueado.
9. Sin cambios en `main`, Supabase, datos o despliegue hasta autorización específica.

## Verificación realizada durante esta fase

- Evaluaciones JavaScript de 10 escenarios de estado: resultados correctos.
- Auditoría estática de 5 RPC y filtros de interfaz: requisitos principales presentes.
- Archivo `tests/parallel-workflows.test.mjs` incluido en la rama: **ejecución de Node/CI aún pendiente** por ausencia de repositorio ejecutable en el entorno de estas herramientas.
- **No** se han validado SQL ni concurrencia en una base real. El borrador no se ha aplicado.

## Estado tras la reconciliación (26/10/2026)

- Rama de desarrollo combinada: `feat/visura-prepara-flujos-paralelos-implementacion-20261026`.
- Base actual para revisión: `cursor/verificacion-fisica-cargas-8ba0` después del merge del PR #56.
- El PR #57 sigue siendo un registro documental; el PR #58 incluye la especificación y el código en un solo diff contra la base actualizada.
- La cola de Verificación se habilita desde `publicada`; su inicio se registra cuando un verificador realiza la acción. No se inventa inicio de picking de BC ni se garantiza conocimiento de palés terminados.
- Advertencia: la aplicación contiene un cronómetro legado y otros módulos cuyo reemplazo pertenece a trabajos distintos. No se ha reintroducido ni aumentado su uso como parte de esta implementación.

## Auditoría de seguridad de Supabase (solo lectura)

Se consultó el asesor de seguridad de `control-cargas-movil` el 26/10/2026 sin modificar configuración ni registros.

- Aviso **WARN** preexistente: `public.kontrola_finalizar_preparacion(p_codigo text)` figura ejecutable por `anon` siendo `SECURITY DEFINER`. El SQL propuesto incluye explícitamente `REVOKE ALL ... FROM PUBLIC, anon` y `GRANT EXECUTE ... TO authenticated`, pero **NO se ha aplicado** y por tanto el riesgo actual requiere revisión prioritaria.
- El asesor también devuelve avisos de otras funciones `SECURITY DEFINER` accesibles por `anon` y de funciones con privilegios de `authenticated`; no atribuirlos a estos cambios ni corregirlos a ciegas.
- Dos tablas `kontrola_archivo_eventos` y `kontrola_impresiones` aparecen con RLS habilitado sin políticas, nivel informativo; revisar su exposición y uso real antes de cambiar políticas.

Referencias oficiales: [SECURITY DEFINER ejecutable por anónimo](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [RLS habilitado sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

**Pendiente antes de una migración:** revisar los grants efectivos, pruebas de acceso no autenticado y roles de Supervisor/Operario/Administrador, probar las cinco RPC con una base de ensayo separada e inspeccionar el resultado del asesor de seguridad después de la prueba. El usuario aún no ha autorizado modificar la base conectada.

## Revisión adicional de esquema y regresiones (26/10/2026)

Se consultaron exclusivamente metadatos de `pg_catalog` del proyecto conectado (sin leer las cargas ni los datos de los trabajadores y sin escribir SQL). Evidencia comprobada:

- `kontrola_verificaciones` tiene `UNIQUE(codigo)`, por lo que solo permite una sesión de verificación por carga.
- `kontrola_preparaciones` tiene `PRIMARY KEY(codigo)` y el índice único parcial `kontrola_una_preparacion_activa_por_usuario`, que evita dos preparaciones VISURA abiertas simultáneamente por operario.
- `kontrola_cargas` conserva el CHECK de estados válidos y la obligación de que `cerrada_en` y `cerrada_por` estén ambos presentes o ambos vacíos.
- Comprobación de grants **actuales**, no simulados: `anon` puede ejecutar `kontrola_finalizar_preparacion` y no las otras cuatro RPC del borrador. El script propone revocarlo, pero **sigue pendiente de aplicación**.
- **Regresión detectada y corregida solo en el SQL de propuesta:** el inicio de una nueva preparación cierra la anterior del mismo usuario por el comportamiento heredado. Antes actualizaba el estado anterior a `preparada` si la verificación ya estaba finalizada. Ahora respeta `cerrada` y conserva los campos de cierre, sin escribir nada en la base.
- Nueva cobertura: 2 pruebas de invariantes SQL añadidas; total **10/10 pruebas de lógica en intérprete**, sin afirmar ejecución nativa de `node --test` ni pruebas de PostgreSQL.

**Cruce con otras ramas:** el PR #49 (piloto sin cronómetro) también modifica `src/app.mjs`, incluida la misma zona de la lista de verificación. Sigue abierto. Debe reconciliarse antes de unir ambas evoluciones; eliminar el reloj no debe restaurar la dependencia de preparación para verificar. No modificar el PR #49 desde esta rama ni sobrescribir su trabajo. PR #51 y PR #52 están encadenados a la línea del piloto/importación y también requieren revisión antes de despliegue.

**Límite material restante:** no se dispone de un PostgreSQL de ensayo aislado y aprobado ni hay ejecuciones CI asociadas a esta rama. No se ha probado el comportamiento de RLS, concurrencia real o permisos entre dos dispositivos. El proyecto Supabase conectado podría estar siendo utilizado por la aplicación actual y queda expresamente fuera de las pruebas con escritura.

**Plan de validación siguiente, sin producción:** establecer una base clonada y sanitizada o un Postgres local con roles y fixtures no reales; ejecutar migraciones existentes y el borrador mediante transacción controlada; probar dos usuarios autenticados, doble apertura, finalización en ambos órdenes, revisiones de carga bloqueadas tras iniciar verificación y grants; comprobar las advertencias de seguridad. Solo después plantear autorización independiente para migración o despliegue.

## CI integrada de flujos paralelos — VALIDADA (26/10/2026)

**Ejecución verificada:** [GitHub Actions «Verificar KONTROLA» #527](https://github.com/josegude-ux/KONTROLA/actions/runs/40384602491), commit de código/test `2e145bee9876a206ce23d7b57c556f4ac96882f8`. Resultado **success** en el job `test`. No se ha ejecutado esta prueba en el Supabase conectado.

- **Node nativo:** 285 pruebas, 285 aprobadas, 0 fallidas.
- **PostgreSQL 16 temporal:** migraciones históricas y pruebas existentes de RLS, revisión documental, archivo seguro y concurrencia: correctas.
- **SQL de esta evolución aplicado solo al Postgres efímero:** `supabase/proposals/kontrola_prepara_verificacion_paralelas.sql` después de las pruebas de regresión históricas.
- **Escenarios nuevos:** `tests/integration/parallel.sql` superado. Dos operarios autenticados con sesiones diferenciadas pueden preparar y verificar la misma carga; la verificación arranca sin preparador; el cierre de verificación no finaliza la preparación ajena; ambos órdenes de terminación funcionan; al finalizar la verificación sin preparación registrada la carga puede cerrarse; el rol anónimo no conserva `EXECUTE` en la RPC privilegiada dentro del ensayo.
- **Concurrencia real entre dos conexiones PostgreSQL:** `tests/integration/parallel-concurrency.sh`, marcador de log `KONTROLA_PARALLEL_RACE_OK one_reviewer=1 events=1 fabricated_preparations=0`. Solo un verificador obtiene la sesión para la carga ficticia; queda un único evento de inicio y cero preparaciones creadas automáticamente.
- El script `tests/integration/run.sh` mantiene **dos protecciones independientes** antes de crear la base de pruebas: nombre permitido `kontrola_test*` y `PGHOST` local. Se trata de un entorno efímero creado y destruido por CI. Nunca ejecutar contra datos reales.
- Se detectaron y corrigieron incidencias del **fixture del test** (ruta del PDF, delimitador del bloque PL/pgSQL y consulta de preparación bajo el rol adecuado por RLS). No se modificó la política real de seguridad para conseguir el resultado.
- **No equivalencia con piloto real:** faltan prueba física con dos terminales, flujos de importación Excel de jornada, usuarios/roles reales autorizados y confirmación de la interfaz desplegada. No se han fusionado ramas, desplegado frontend, aplicado SQL a Supabase conectado ni borrado cargas.

**Fase siguiente:** revisión del PR #49 (eliminación del cronómetro y cambios compartidos en `src/app.mjs`) y de la línea de importación, evitando sobrescribir sus mejoras. Después, validación en un entorno staging independiente que no contenga datos operativos, y autorización separada de migración/despliegue. No aplicar la propuesta SQL a la base conectada por el simple hecho de haber pasado CI.
