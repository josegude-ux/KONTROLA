# VISURA PREPARA — preparación y verificación en paralelo (regla operativa confirmada)

**Decisión del usuario:** 26/10/2026.
**Estado del trabajo:** regla de negocio documentada; implementación y pruebas del aplicativo PENDIENTES.
**Rama de referencia funcional examinada:** `cursor/verificacion-fisica-cargas-8ba0` (HEAD al iniciar esta revisión: `8ab1ee8415813de53e7c0f9ea39efe1c7f6ad0a7`).
**Prioridad:** corregir la dependencia errónea entre preparación y verificación, sin afectar producción ni datos existentes.

## 1. Regla de negocio que sustituye a la anterior

Al **publicar/importar una carga validada**, VISURA debe poner disponibles **en paralelo** sus dos procesos operativos:

1. **Preparación:** documentación y consulta operativa de la carga para los preparadores.
2. **Control de Cargas / Verificación:** comprobación física de los productos/palés disponibles, con registro de lo realmente comprobado.

**Ambos se habilitan desde la creación/publicación de la carga.** La verificación NO espera a que se inicie, se asigne, se marque terminada o se cierre una preparación en VISURA.

### Hecho externo que determina esta regla

El picking físico y su seguimiento pertenecen a **Business Central (BC)** y se realizan con **pistolas de BC**. VISURA no recibe automáticamente los eventos de picking ni conoce cuánto lleva preparado cada operario. No existe una conexión directa BC–VISURA; se mantiene la actualización manual por archivos Excel/PDF conforme al flujo de importación autorizado.

Un preparador deposita los palés terminados en la zona física habilitada. Otro operario puede verificarlos en cuanto estén físicamente disponibles, aunque la carga siga preparándose en BC. **No es necesario ni fiable que el preparador notifique en VISURA que terminó un palé** para que el verificador pueda empezar.

## 2. Interpretación técnica de «crear los dos procesos a la vez»

- La publicación de una carga válida debe crear o hacer accesibles **dos colas/vistas de trabajo independientes para el mismo código de carga y almacén**. Deben existir y poder abrirse sin asignar todavía un usuario ni simular un inicio de picking o de verificación.
- Cada flujo mantiene **su propio estado**: documentos/consulta de preparación por un lado y registro de verificación por otro. Un único campo global `cargas.estado` no debe actuar como dependencia para impedir la operación paralela.
- Registrar el inicio de la verificación se hace explícitamente por el verificador autenticado, solo cuando comienza la comprobación real; nunca registrar automáticamente una verificación o cantidades como comprobadas al importar.
- El verificador no tiene que introducir un avance ficticio de preparación para desbloquear su panel.
- La terminación de la verificación NO debe cerrar ni registrar como terminada una sesión de preparación de otro operario o una tarea de picking en BC.
- El cierre de verificación se permite cuando las líneas/cantidades exigidas se hayan comprobado y el propio proceso cumpla sus reglas de aceptación. Si faltan productos, se conservan como pendientes/incidencias y NO se declara todo comprobado por el hecho de cerrar otra vista.
- No se crea un supuesto estado «palé preparado» dentro de VISURA; un palé se verifica cuando físicamente llega a la zona, sin rastrear su preparación por pistola en este sistema.
- Debe mantenerse identificación única de carga, almacén, usuarios responsables, auditoría, control de permisos, independencia de operarios y prevención de escrituras concurrentes duplicadas.

## 3. Dependencias actuales comprobadas que hay que retirar

**Código consultado, no modificado:**

- `src/app.mjs`, `refreshReviewLoads()`: filtra por `load.preparador_id` y excluye cargas publicadas sin preparador; por eso el verificador no las ve desde el principio.
- `src/app.mjs`, `updateWarehouseLabels()` y mensajes de menú: describen «cargas preparadas por otro operario», reforzando un requisito inexistente.
- `supabase/migrations/20261026_kontrola_operacion_integral.sql`, `kontrola_iniciar_verificacion`: exige una fila de `kontrola_preparaciones`, aunque el picking real no está registrado allí.
- La misma migración, `kontrola_finalizar_verificacion`: termina automáticamente la fila `kontrola_preparaciones`, lo que puede representar falsamente la terminación de picking.
- `kontrola_cargas.estado` incluye `publicada`, `preparacion_en_curso`, `preparada`, `verificacion_en_curso` y `cerrada`; revisar su semántica para que las dos dimensiones sean simultáneas.
- `docs/CONTINUIDAD.md` tiene reglas históricas de preparación y verificación vinculadas que QUEDAN SUPERADAS por este documento para este flujo.

**Atención:** estos hallazgos corresponden a la rama inspeccionada, NO confirman la versión desplegada. Contrastar ramas/PR recientes antes de escribir código, especialmente ramas de importaciones, roles y nuevas pantallas. No sustituir migraciones ya aplicadas: proponer migraciones incrementales y reversibles después de verificar la estructura real.

## 4. Criterios de aceptación / pruebas imprescindibles

1. Al publicar una carga válida, aparece simultáneamente en **Preparación** y **Control de Cargas**, en el almacén correspondiente, aun sin `preparador_id`.
2. Un segundo operario puede abrir la verificación e iniciarla expresamente con productos físicos a comprobar sin que exista una sesión de preparación registrada en VISURA.
3. El primer operario puede continuar el picking en BC mientras el segundo verifica físicamente. Ninguna acción de verificación bloquea, cierra ni falsifica la preparación.
4. Al registrar comprobaciones parciales, la carga sigue disponible para continuar la verificación y conserva cantidades pendientes. No marcar como completa por el mero hecho de que haya un palé revisado.
5. Dos verificadores no deben poder adjudicarse simultáneamente la misma sesión; conservar reintentos idempotentes y control de permisos.
6. Iniciar/cerrar la verificación no debe crear/cerrar sesiones de preparación de otro usuario; las trazas deben identificar qué acción se realizó realmente.
7. Eliminar el requerimiento de preparador previo sin debilitar segregación de funciones donde haya datos fiables: un usuario que haya registrado formalmente preparación en VISURA no verificará su propia carga, pero la ausencia de ese dato no bloquea a los demás.
8. Controlar revisión documental, importación, datos incompletos, almacén incorrecto y cargas previas; no publicar documentos no validados.
9. Reproducción con al menos dos operarios autenticados, dispositivos separados y una carga de PRUEBA, sin alteración ni borrado de cargas reales.
10. Validar con pruebas automáticas y piloto real antes de cualquier decisión de despliegue.

## 5. Secuencia segura de implementación pendiente

1. Auditar HEAD de la rama real de VISURA PREPARA, PR/commits y últimas funciones RPC activas en entorno de pruebas; detectar solapamientos.
2. Preparar una **migración SQL incremental no aplicada** para desacoplar autorización de verificación respecto a `kontrola_preparaciones`, revisar estados y cierre; nunca editar directamente la migración histórica como si no hubiera sido desplegada.
3. Cambiar filtros y etiquetas de verificación en app sin introducir falsos estados de picking.
4. Ajustar semántica de vista/resumen/historial para visualizar estados independientes de preparación documental y verificación.
5. Escribir pruebas automáticas y escenario de concurrencia; ejecutar simulación local cuando sea posible.
6. Guardar código en rama propia, abrir PR **sin fusionar** y documentar resultados.
7. Solicitar autorización separada para aplicar migraciones, pruebas que escriban datos, despliegue o borrados.

**Restricciones:** no tocar main ni ramas de otros chats; no fusionar, desplegar, escribir datos reales, cambiar contraseñas o eliminar cargas sin autorización. Esta documentación no constituye una implementación funcional ni una migración ejecutada.
