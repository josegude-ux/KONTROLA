# KONTROLA · MOVENTA

PWA móvil de operaciones de almacén para **preparación, consulta, verificación, historial e incidencias de cargas**.

**Versión de esta rama:** 0.3.15. **Estado:** desarrollo probado parcialmente, **no apto aún para producción**.

- PR de Fase 1: https://github.com/josegude-ux/KONTROLA/pull/1
- PR de operación integral: https://github.com/josegude-ux/KONTROLA/pull/2
- Documento de continuidad: [docs/CONTINUIDAD.md](docs/CONTINUIDAD.md)

La aplicación completa está en la rama de la PR #2, **no en main**.

## Flujo previsto

1. El administrador descarga manualmente los PDF de Business Central.
2. Desde KONTROLA los importa, revisa, corrige y publica.
3. KONTROLA clasifica por almacén: **A Coruña (COR_01_COR)** o **Ferrol (COR_02_NAR)**. Los códigos desconocidos se revisan antes de publicar.
4. El operario consulta la carga sin iniciar ningún reloj; para trabajar pulsa **Iniciar preparación**.
5. La preparación física se registra con la pistola de Business Central, que KONTROLA no sustituye.
6. La preparación se cierra manualmente, al comenzar otra carga o al finalizar la verificación, según proceda.
7. Un segundo operario, distinto del preparador, verifica cantidades físicas línea por línea.
8. Al comprobar todas las líneas se cierra la carga, aunque existan diferencias.
9. El administrador consulta incidencias y registra confirmaciones de regularizaciones hechas **manualmente** en Business Central.

También hay paneles de tiempos, incidencias, seguimiento y documentos por almacén, así como funciones para generar, descargar e imprimir hojas procesadas.

## Arquitectura y seguridad

- **Supabase** con autenticación de usuarios reales y roles `operario` y `administrador`.
- Proyecto de Control de Cargas; **INVENTA es independiente**.
- Tablas, RPC y Storage privado de KONTROLA, distintos de los documentos originales de otras aplicaciones.
- Migraciones propuestas en `supabase/migrations/`.
- Control de concurrencia en preparación, importación y verificación; RLS y políticas para documentos privados.
- PWA para teléfonos móviles. La conectividad, impresión real y recuperación de sesiones requieren pruebas en dispositivos.
- La descarga desde Business Central y las regularizaciones son **manuales**, sin API ni escritura automática.

## Pruebas

```bash
npm ci
npm run check
```

Las pruebas de base de datos requieren un servidor **PostgreSQL local y descartable**, compatible con los scripts del repositorio:

```bash
npm run test:db
```

**ATENCIÓN:** `test:db` elimina y recrea la base `kontrola_test` en el PostgreSQL local. El script se niega a trabajar con bases de otros nombres o con `PGHOST` remoto. Nunca lo ejecutes contra datos que quieras conservar.

GitHub Actions ya ha validado satisfactoriamente pruebas de JavaScript y migraciones, flujo de operaciones y concurrencia en PostgreSQL 16 temporal. Esto **no prueba todavía** el entorno Supabase empresarial completo.

## Límites actuales

- Las migraciones no se han aplicado desde este trabajo al Supabase de producción.
- Faltan pruebas E2E con varias cuentas y móviles reales, comprobaciones del Storage privado y validación con impresoras del almacén.
- Los PDF ficticios de pruebas no sustituyen la verificación con documentos reales autorizados.
- No se han fusionado las PR a `main` ni desplegado una versión productiva.
- Las reglas especiales de totales por pasillos siguen pendientes de definición.

Para detalles del estado comprobado, las decisiones aprobadas y los siguientes pasos consulta [docs/CONTINUIDAD.md](docs/CONTINUIDAD.md).

**No publicar PDF reales en este repositorio público.**

## Navegación e historial v0.3.3

- KONTROLA mantiene Preparación, Verificación y Administración; Control de Cargas es un submenú integrado.
- «Consultar cargas» usa **modo de solo lectura**: no aparecen los botones de iniciar/finalizar y sus manejadores comprueban el modo antes de escribir.
- «Historial y resumen» filtra los registros publicados por el RPC autorizado `kontrola_panel_cargas` según fecha de carga, estado, matrícula, ruta o repartidor; resume cargas, peso, referencias, cerradas e incidencias pendientes.
- El filtro por almacén respeta los permisos concedidos por el servidor. El historial no importa documentos ni altera los datos de Business Central.
- El detalle de un registro del historial es de solo lectura. Las cargas sin fecha quedan al final de la lista.
- Control de Tanques permanece **completamente oculto** hasta que pueda integrarse y probarse.
- No se han creado tablas nuevas para esta función. Queda pendiente probar el comportamiento en Supabase real y dispositivos.

## Informes de Control de Cargas (v0.3.4)

- **Exportar Excel (CSV)**: utiliza el conjunto de cargas ya autorizado por el RPC de cada almacén y aplica exactamente los filtros vigentes. Genera CSV UTF-8 con BOM, delimitador de punto y coma y neutralización de celdas que podrían ser interpretadas como fórmulas.
- **Imprimir resumen**: muestra un informe de lectura con totales, filtros y tabla de cargas; puede imprimirse o guardarse a PDF desde el navegador. No imprime ni altera los PDF originales de Business Central.
- Ambas acciones se deshabilitan hasta que haya terminado la consulta o cuando el filtro no devuelve registros.
- **No se escriben registros ni se requieren migraciones adicionales**. No se ha aplicado ningún cambio a Supabase de producción y sigue pendiente la prueba con cuentas y dispositivos reales.

## Revisión segura de PDF (v0.3.5)

- Al seleccionar un PDF, el administrador consulta primero si ya existe una carga con ese código. Si el contenido es diferente, solicita confirmación explícita antes de reservar la importación.
- Si el documento vigente ya está en preparación, preparado, en verificación o cerrado, la interfaz indica que no se puede sustituir. La regla definitiva se vuelve a comprobar en la base de datos al publicar.
- La importación usa SHA-256 para reconocer documentos idénticos, incluso si se ha cambiado el nombre del archivo.
- Una nueva revisión conserva el PDF y la revisión previos; **no reinicia el reloj de preparación**.
- El servidor impide asociar el mismo hash de PDF a dos números de carga distintos.
- Un PDF de revisión histórica no puede declararse de nuevo vigente mediante la RPC de publicación.
- La migración incremental está en `supabase/migrations/20261027_kontrola_revision_documental_segura.sql`. **No ejecutarla en producción sin aprobación y respaldo verificado**.
- `tests/integration/revisions.sql` comprueba en PostgreSQL descartable las revisiones 1 y 2, PDF renombrado, duplicado entre cargas y bloqueo de la revisión 3 tras iniciar preparación.

Pendiente: pruebas completas con Supabase Auth/Storage real, documentos autorizados y móviles. El resultado de GitHub Actions no implica despliegue.


## Hitos 0.3.6–0.3.8
- **0.3.6:** consulta visual de versiones documentales desde Administración, acceso por URL firmada temporal al PDF original y comparaciones de datos, productos añadidos/eliminados/modificados. Mantiene revisiones históricas sin permitir restaurarlas desde la interfaz.
- **0.3.7:** resumen diario según la fecha real del almacén (Europe/Madrid, incluido horario de verano), descarte de respuestas asíncronas obsoletas cuando cambia el almacén o usuario.
- **0.3.8:** selección de hasta 20 PDF desde Archivos/OneDrive, análisis secuencial y resumen por archivo. Nunca publica automáticamente; cada importación se conserva por separado para revisión. Se rechazan dos PDF del mismo número de carga dentro del mismo lote y se exige confirmar antes de abandonar una revisión abierta.
- **Validación:** ejecución GitHub Actions `40182749152`, commit `11de1cfd161d66d32a4e6c5e32021c820855e7d7`, 81 pruebas JavaScript correctas y 0 fallidas; migraciones y concurrencia sobre PostgreSQL temporal superadas.
- **Documentos de cierre:** [Matriz funcional](docs/MATRIZ_CIERRE_DESARROLLO.md), [pruebas de aceptación](docs/PRUEBAS_ACEPTACION.md) y [borrador de manual](docs/MANUAL_USUARIO_BORRADOR.md).
- **No se ha publicado la app, fusionado la PR ni aplicado migraciones a producción.** Faltan las pruebas de Supabase real, impresoras, dispositivos y migración de datos antiguos, todas sujetas a autorización.


## Hitos 0.3.9–0.3.11

- **v0.3.9 — Estadísticas por operario:** nuevo panel exclusivo de Administración con nombre, preparaciones, verificaciones, duraciones finalizadas y tareas abiertas, filtrado por fecha de inicio (Europe/Madrid) y almacén. La RPC de SQL rechaza las peticiones de operarios. Migración adicional `supabase/migrations/20261028_kontrola_estadisticas_operarios.sql`, **no aplicada a producción**.
- **v0.3.10 — Auditoría local de copias antiguas:** selecciona el backup JSON del antiguo Control de Cargas para identificar duplicados, cargas sin fecha, tiempos incompletos, estados y SHA-256 faltantes. El JSON se procesa **solo en el navegador**, sin subir datos ni restaurarlos. Los originales PDF se conservan en **IndexedDB en cada dispositivo** y NO están incluidos en la copia JSON. Deben inventariarse por separado.
- **v0.3.11 — Lotes de hojas procesadas:** permite marcar un máximo de 10 cargas autorizadas del almacén y preparar un único informe multipágina de hojas **procesadas** para imprimir o guardar como PDF. No es la impresión conjunta de **PDF originales**; esa sigue pendiente de solución, validación de calidad y pruebas reales de iPhone.
- Las migraciones y pruebas SQL siguen únicamente en PostgreSQL temporal. Ninguna funcionalidad publicada para trabajadores ni habilitada en Supabase empresarial.


## Seguridad de sesión compartida (v0.3.12)
- Al cerrar la sesión se eliminan los datos visibles **y los de pantallas ocultas** (estadísticas, historial, PDF en pantalla, documentos en revisión y listados).
- Se invalidan peticiones pendientes y se vacían los datos temporales de Administración, selección de lotes y análisis de copias.
- El botón de cierre **no confirma éxito** cuando Supabase devuelve error. Se solicita reintentar y no se simula que la cuenta haya salido.
- Se limpian la contraseña escrita y los controles de descarga de historial.
- Esta protección del cliente **no sustituye** RLS/Storage de servidor. Para validar de verdad deben probarse dos cuentas en el mismo iPhone y la expulsión de la sesión remota.


## Conciliación de datos antiguos — v0.3.13

- En **Administración → Auditar copia antigua de Control de Cargas**, selecciona el backup JSON y pulsa **Comparar con KONTROLA (solo lectura)**.
- El backup se lee **en el dispositivo**. Solo se consulta por RPC la lista de cargas que el usuario tiene permiso para ver en el almacén seleccionado. El backup antiguo **no se envía** a Supabase.
- Se detectan códigos de carga presentes en ambos sistemas, datos que coinciden, diferencias de fecha/ruta/matrícula/repartidor/peso, duplicados, códigos inválidos y faltantes **en la zona consultada**.
- **No se compara el hash de los PDF**, porque `kontrola_panel_cargas` no lo expone. Coincidencia de datos NO acredita igualdad de documentos, tiempos, cantidades o archivos locales.
- No se migran, fusionan, eliminan, reescriben ni actualizan datos. Los PDF originales continúan en IndexedDB de cada dispositivo antiguo: hay que inventariarlos de manera independiente.
- La ejecución `40188458388` de GitHub Actions verificó **104 pruebas JavaScript, 0 fallidas** y las cinco migraciones/operaciones/concurrencia en PostgreSQL temporal.
- **No hay validación E2E de iPhone/Supabase real**, ni despliegue de producción autorizado.


## Inventario y recuperación local de PDF antiguos (v0.3.14–0.3.15)

- La herramienta de Administración inspecciona, solo si se pulsa el botón, las **claves** de `control_cargas_movil_originales/originales`, según el esquema real del módulo `printing.mjs` del sistema antiguo.
- Consulta con transacción `readonly` y `openKeyCursor`. Si la BD no existe, **aborta su creación**; nunca borra ni escribe nada.
- v0.3.15 ofrece botones para **guardar copias locales PDF una a una** (hasta 25 entradas visibles); solo en respuesta al clic del administrador. Se valida cabecera PDF y SHA-256; las revisiones con `LP..::hash` se rechazan si el contenido no coincide con la huella.
- La operación no se conecta a Supabase, no transmite documentos y **no modifica los originales**. Los archivos recuperados van al mecanismo de descarga/Archivos del navegador utilizado.
- Limitación fundamental: IndexedDB está aislada por **origen y contenedor de almacenamiento**, no se puede leer un contenedor diferente de una PWA de inicio de iOS desde Safari/otra PWA. Si no aparecen documentos, **no significa que estén perdidos**. No borrar ni desinstalar el sistema antiguo.
- **Sin validación real de iPhone, Safari ni recuperación de PDF empresariales**. El uso con documentos reales requiere una autorización específica.
