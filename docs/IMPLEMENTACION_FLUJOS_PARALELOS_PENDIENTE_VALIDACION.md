# Implementación propuesta — dos flujos simultáneos en VISURA PREPARA

**Fecha:** 26/10/2026  
**Origen funcional:** decisión del usuario y PR documental #57.  
**Estado:** código y SQL preparados en rama AISLADA; **ninguna migración aplicada, ningún despliegue ni cambio en Supabase**.

## Qué cambia

Al publicar una carga válida, el mismo registro de carga queda accesible de forma independiente en:
1. Preparación/consulta operativa (picking realmente gestionado en las pistolas de Business Central).
2. Verificación física (operario distinto que comprueba palés ya disponibles).

No se inicia un cronómetro ni se registra automáticamente «preparación iniciada» o «verificación iniciada» al publicar: ambos **procesos están disponibles** y la verificación comienza mediante la acción expresa del verificador, con auditabilidad. No existe integración directa a BC; no se pueden inferir palés preparados.

## Archivos de esta rama

- `src/parallel-workflows.mjs`: selección de cargas verificables y estado de cada proceso, independientes de una única columna global.
- `src/app.mjs`: permite consultar/verificar `publicada` sin `preparador_id`, mantiene segregación por usuario y refleja los estados de verificación y preparación por separado; refresca listas al finalizar.
- `supabase/proposals/kontrola_prepara_verificacion_paralelas.sql`: **BORRADOR NO APLICADO** de cinco funciones RPC existentes; misma firma y retorno, con la restricción de sustitución por revisión, bloqueo de doble asignación, eliminación del requisito de preparación previa y cierre no invasivo.
- `tests/parallel-workflows.test.mjs`: ocho pruebas Node sobre disponibilidad, segregación, concurrencia, cierre desacoplado y invariantes del SQL.

## Modelo de cierre propuesto

- Si la verificación termina y **no hay una sesión de preparación en VISURA**, la carga puede marcarse cerrada al haber comprobado todas sus líneas (el picking de BC no se infiere).
- Si la verificación termina con una preparación en VISURA aún abierta, **NO se cierra automáticamente la preparación**; el resumen de carga permanece `preparacion_en_curso` y `verificacion_fin` indica por separado que Verificación sí terminó.
- Cuando ese preparador finaliza manualmente su sesión, y Verificación ya terminó, se marca la carga cerrada. Si Verificación sigue abierta, la sesión de Preparación finaliza sin interrumpirla.
- Cada función emplea permisos de usuario/almacén y bloqueos por carga; los permisos se aplican realmente en RPC, nunca solo por filtros JavaScript.
- Es una transición propuesta para el esquema existente. No sustituye confirmación operativa de carga final ni inventa estados de picking en BC.

## Seguridad / trabajo pendiente

- **Reconciliación realizada:** el PR #56 fue fusionado en la rama de desarrollo `cursor/verificacion-fisica-cargas-8ba0` (merge `fb2d0e6`). El código de los flujos paralelos se integró mediante commit de reconciliación de dos padres `c7b9317`, conservando la función de matriz por pasillos `renderAisleMatrix` y la generación del listado A4 `crearListadoPasillosA4`. No se ha fusionado este PR a la rama de destino ni desplegado.
- **SQL actualizado desde funciones instaladas:** se inspeccionó en modo solo lectura el proyecto Supabase `control-cargas-movil` (ID `oevetnszmfxeukcncwji`) y se reconstruyó el borrador de las cinco RPC a partir de `pg_get_functiondef`, conservando en particular la protección de revisiones PDF mediante `c.documento_hash=v_i.documento_hash`. **No se ejecutó SQL de modificación**. Falta comprobar RLS, permisos efectivos y ejecutar el borrador en un entorno de pruebas aislado con autorización expresa. No editar/reaplicar migraciones históricas.
- La propuesta SQL no crea tablas nuevas ni expone nuevas rutas públicas. Conserva `REVOKE` a `PUBLIC, anon` y `GRANT EXECUTE` a `authenticated`, pero debe someterse a asesores de seguridad y pruebas reales antes de ejecutarla.
- El frontend aún contiene lógica heredada de tiempos de preparación de BC y del flujo de importación; la línea de desarrollo que retira el cronómetro debe reconciliarse con esta rama, sin reintroducir métricas de control.
- El botón de preparación puede mostrar estado de una sesión de VISURA, pero nunca supone que refleja el progreso físico de picking BC.
- Los escenarios de roles «Operario», «Supervisor» y «Administrador» deberán comprobarse contra las políticas realmente vigentes, sin conceder nuevos accesos indirectos.
- **Pruebas evaluadas:** 8 casos de `tests/parallel-workflows.test.mjs` ejecutados en un intérprete JavaScript aislado con adaptadores para `node:test`, `assert` y lectura del SQL: 8/8 correctos. El código `src/app.mjs` y el módulo auxiliar superaron una comprobación de sintaxis JS. **Pendiente** ejecución nativa de `npm test` y CI, revisión estática avanzada del SQL, y ensayo real con dos operarios y carga de prueba. No existe evidencia de piloto real superado.

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
