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

- El PR #56 de la misma aplicación modifica también `src/app.mjs` (funciones A4 y pasillos); **hay solapamiento a reconciliar** antes de fusionar. No integrar ni publicar directamente esta rama sin esa revisión.
- La propuesta SQL parte de las firmas y estructura de la migración histórica `20261026_kontrola_operacion_integral.sql`; revisar en el entorno de PRUEBAS las versiones actualmente instaladas y contratos de permisos/RLS antes de generar una migración incremental formal con CLI. No editar/reaplicar migraciones antiguas.
- La propuesta SQL no crea tablas nuevas ni expone nuevas rutas públicas. Conserva `REVOKE` a `PUBLIC, anon` y `GRANT EXECUTE` a `authenticated`, pero debe someterse a asesores de seguridad y pruebas reales antes de ejecutarla.
- El frontend aún contiene lógica heredada de tiempos de preparación de BC y del flujo de importación; la línea de desarrollo que retira el cronómetro debe reconciliarse con esta rama, sin reintroducir métricas de control.
- El botón de preparación puede mostrar estado de una sesión de VISURA, pero nunca supone que refleja el progreso físico de picking BC.
- Los escenarios de roles «Operario», «Supervisor» y «Administrador» deberán comprobarse contra las políticas realmente vigentes, sin conceder nuevos accesos indirectos.
- Ejecutar pruebas automáticas del repositorio en CI y, después de autorización separada, pruebas integradas con dos operarios distintos y una carga de prueba en Supabase. No hay aquí evidencia de CI ni de piloto real superado.

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
