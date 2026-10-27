# KONTROLA — Ficha maestra de continuidad

> **DECISIÓN DE PRIORIDAD ALTA (25/10/2026):** se inicia KONTROLA desde cero **en datos de operación y PDF nuevos**, no en código. Se renuncia a migrar, conciliar o recuperar los PDF y registros antiguos de Control de Cargas. NO borrar datos históricos; simplemente quedan fuera del alcance de implantación. A partir del arranque, los PDF que genere KONTROLA se moverán **periódicamente y manualmente** a una carpeta OneDrive de empresa; nombre y frecuencia aún no indicados. Ver [PLAN_ARCHIVO_ONEDRIVE.md](PLAN_ARCHIVO_ONEDRIVE.md). Esta decisión prevalece sobre las secciones históricas de migración/reconciliación de esta ficha.

**Actualización:** 25 de octubre de 2026
**Repositorio:** https://github.com/josegude-ux/KONTROLA
**Rama principal del desarrollo en curso:** cursor/verificacion-fisica-cargas-8ba0
**PR de trabajo:** https://github.com/josegude-ux/KONTROLA/pull/2
**PR de Fase 1:** https://github.com/josegude-ux/KONTROLA/pull/1
**Versión del código de esta rama:** 0.3.19

> La aplicación funcional vive en ramas de desarrollo: main no debe tomarse como punto de partida para rehacerla. No fusionar a main ni aplicar migraciones a producción sin autorización.

## Decisiones de negocio consolidadas

- Perfiles OPERARIO y ADMINISTRADOR, autenticados de forma individual.
- KONTROLA comparte el proyecto Supabase de Control de Cargas, pero utiliza tablas y un bucket propios. INVENTA dispone de otra base independiente.
- Business Central es externo: los PDF se descargan manualmente, la preparación física se registra con las pistolas de BC y las regularizaciones se realizan manualmente en BC. KONTROLA no escribe allí.
- La vista de consulta de una carga NO debe iniciar el reloj; solo el botón explícito de iniciar preparación.
- Una preparación se cierra manualmente, por cambio a otra carga, o al finalizar la verificación de la misma carga si sigue abierta.
- El preparador nunca puede verificar su propia carga. La verificación guarda cantidades por línea, diferencias y auditoría.
- Al completar todas las líneas, la verificación cierra la carga incluso si hay incidencias por regularizar.
- El administrador importa/revisa los PDF, genera la hoja procesada, la imprime y publica la carga para los operarios.
- El PDF original se conserva; la impresión operativa corresponde al documento calculado/modificado.
- El panel separa Coruña (COR_01_COR) de Ferrol (COR_02_NAR), sin mezclar cargas. Un almacén desconocido queda pendiente de clasificación.
- El diseño visual existente es el estándar obligatorio. No rediseñar pantallas ni romper coherencia; las propuestas futuras se distinguen de las reales.
- Queda pendiente definir con el usuario un rediseño específico de los totales/listados por pasillos: NO inventarlo ni desplegarlo unilateralmente.

## Componentes ya presentes en código de la PR #2

- Inicio de sesión, perfil servidor y control de roles; PWA para uso móvil.
- Consulta documental por pasillos y búsqueda de productos y cargas.
- Inicio explícito de preparación, finalización manual y por cambio de carga.
- Verificación física independiente con registro de cantidades, progreso, incidencias, cierre y regularización administrativa.
- Clasificación Coruña/Ferrol y permisos de almacén configurables.
- Módulo de revisión documental y hallazgos para la importación administrativa.
- Motor de lectura PDF, generación de hoja procesada y funciones de impresión/descarga en navegador.
- Paneles administrativos de actividad, incidencias, documentos pendientes y resumen por zona.
- Tres migraciones SQL que crean/extienden tablas, funciones, restricciones y permisos específicos de KONTROLA.
- Pruebas unitarias y pruebas de integración PostgreSQL con concurrencia.

El código disponible NO implica que se haya comprobado todavía el funcionamiento completo sobre el Supabase real ni con impresoras y dispositivos empresariales.

## Reparaciones realizadas directamente desde GitHub (25/10/2026)

- Se eliminó la dependencia no disponible de ripgrep en los scripts de integración, usando grep estándar.
- Se corrigió la carrera entre dos reservas simultáneas de un mismo PDF en la función kontrola_reservar_importacion: ON CONFLICT DO NOTHING cubre tanto la restricción única de hash como la de ruta.
- Se restauró y corrigió el script de concurrencia después de revisar los registros de CI.
- Se añadió un bloqueo de seguridad al ejecutor test:db: solo acepta bases llamadas kontrola_test o kontrola_test_* y rechaza servidores remotos definidos mediante PGHOST.
- Todo se realizó en la rama de la PR #2, sin fusionar ni tocar producción.

## Pruebas verificadas en GitHub Actions

- Antes de los arreglos: las 48 pruebas de JavaScript pasaban, pero el job de integración fallaba por la utilidad ausente y posteriormente se reprodujo una colisión real de importación concurrente.
- Tras la corrección y restauración de los scripts, el workflow de GitHub para el commit 0d581bb4460a26c8eb842af26df8a5bf8969d583 finalizó con resultado SUCCESS.
- Tras añadir la barrera contra uso accidental en bases no aisladas, el workflow del commit d9c296feb2d3d94e43c6df3fcfc1189acd83a9b5 también terminó SUCCESS.
- El pipeline ejecuta npm ci, comprobaciones de sintaxis, pruebas JavaScript, migraciones reales sobre un PostgreSQL 16 temporal, flujo SQL y pruebas de concurrencia.
- La ejecución en CI utiliza únicamente datos ficticios y un contenedor temporal. NO equivale a instalar migraciones en el proyecto Supabase empresarial ni a un E2E con móviles reales.

## Limitaciones y trabajo pendiente

1. Verificar y aplicar las migraciones en un Supabase de pruebas autorizado o rama aislada que no afecte a producción; comprobar diferencias entre PostgreSQL temporal y servicios completos de Supabase.
2. Probar con credenciales de pruebas y dos operarios diferentes la matriz completa de roles, acceso a almacenes, seguridad RLS, Storage privado, preparación y verificación.
3. Verificar importación con PDF reales autorizados de ambas zonas. En CI se usan PDF generados de prueba, no se deben publicar documentos reales en este repositorio público.
4. Probar impresión desde iPhone/Android/Windows con impresoras del almacén y confirmar los ajustes específicos necesarios.
5. Verificar que el procesamiento documental corresponde exactamente a las reglas del motor de Control de Cargas y que INVENTA/Control de Cargas permanecen intactos.
6. Confirmar compatibilidad de actualizaciones PWA y recuperación de tareas frente a cortes de red en dispositivos reales.
7. No presentar la versión 0.3.1 como lista para producción hasta estas pruebas.
8. Mantener la separación estricta entre proyectos y no introducir ninguna automatización de Business Central.

## Continuación recomendada

Continuar trabajando directamente en GitHub sobre la PR #2, priorizando correcciones verificables y usando GitHub Actions como sistema de pruebas. No duplicar trabajo ni pedir a Cursor que reconstruya la aplicación. Documentar en esta ficha cada hito. Cualquier cambio o coste en Supabase debe autorizarse separadamente, especialmente si se trata de una rama de desarrollo que genere cargos.


## Decisión posterior sobre navegación (25/10/2026)

El usuario ha definido **KONTROLA como aplicación principal de operarios**: **Control de Cargas** y **Control de Tanques** serán submenús de KONTROLA, no accesos separados. INVENTA mantiene interfaz propia aunque se estudie un Supabase y autenticación comunes. Tanques sigue en pausa; no se activa ni se migra todavía. **Decisión expresa del usuario: ocultar completamente Control de Tanques en la interfaz y en los menús, sin siquiera mostrar «Próximamente», hasta que esté operativo y se apruebe su incorporación.** Antes de implementar menús hay que revisar el detalle de las pantallas, y conservar el diseño y lógica existentes.

Plan acordado y siguientes fases: [PLAN_NAVEGACION_MODULAR.md](PLAN_NAVEGACION_MODULAR.md). Ninguna base real se modifica por esta decisión.

## Hito de desarrollo v0.3.3 (25/10/2026)

- Control de Cargas añade un **Historial y resumen** en el submenú, utilizando el RPC de lectura `kontrola_panel_cargas` y los permisos de almacén vigentes.
- Filtros por fecha, estado, búsqueda de ruta/repartidor/matrícula/código. Orden por fecha de carga descendente, peso y código; fechas ausentes en último lugar.
- Resumen de cargas, peso, referencias, cargas cerradas e incidencias pendientes, siempre calculado sobre los resultados filtrados.
- «Consultar cargas» y detalles desde el historial quedan en **modo de solo lectura**, sin botones de iniciar/finalizar preparación y con salvaguardas en los manejadores del cliente. Las operaciones de preparación siguen en su acceso específico.
- El submenú de Tanques continúa **completamente oculto**.
- Se añadieron `src/history.mjs`, pruebas unitarias, controles de navegación y recursos al caché PWA. Versión prevista 0.3.3.
- **GitHub Actions validado** en ejecución `40178757357`, commit `22c3e106def7863a547bd90cd4e47fb6beb87dc2`: **58 pruebas JavaScript correctas y 0 fallidas**; migraciones SQL aisladas y prueba de concurrencia completadas. No sustituye pruebas E2E móviles/Supabase real.
- **No fusionado a `main` ni desplegado en Supabase.** El modo de consulta es una protección de interfaz, no sustituye RLS y validaciones de servidor.

### Seguridad de selección de almacén (v0.3.3)

- Se descartan respuestas asíncronas obsoletas en listas de preparación, listas de verificación, resumen del operario e historial si cambia almacén o usuario durante la solicitud.
- La CI incluye un test de regresión para evitar que los resultados de una zona se muestren después de pasar a otra.

## Hito v0.3.4 — Exportar e imprimir resúmenes de Control de Cargas

- Se han comparado funciones de Control de Cargas original v0.5.26 con KONTROLA. Se mantiene el motor documental y KONTROLA no incorpora controles manuales de picking ni cambios de estado desde las consultas.
- En **Historial y resumen**, el operario puede descargar un CSV para Excel con las cargas filtradas del almacén autorizado; codificación UTF-8 con BOM, separador punto y coma, comillas escapadas y neutralización de fórmulas de celdas. No incluye los PDF originales.
- Puede abrir un informe imprimible con totales, filtros y filas autorizadas; impresión mediante el navegador o guardar PDF, sin editar los documentos originales.
- Exportación e impresión desactivadas hasta concluir la lectura y cuando el filtro no devuelve resultados.
- No se han creado tablas nuevas ni se han ejecutado migraciones en producción.
- **Prueba confirmada**: GitHub Actions `40179638638` en commit `d649da8e34e87f5d8e80f9f72af3a2878ce3fbe1`: **62 pruebas JavaScript correctas, 0 fallidas**, migraciones SQL en entorno descartable y concurrencia verificadas. Las pruebas sobre PostgreSQL temporal no sustituyen pruebas reales con Supabase Auth, Storage ni impresoras iPhone.
- La versión 0.3.4 está guardada en la rama de PR #2; **no se ha fusionado ni publicado como actualización de la aplicación instalada**.

## Revisión documental v0.3.5 (25/10/2026)

- En la importación desde administración, KONTROLA consulta la carga vigente y pide confirmación antes de reservar un PDF distinto para el mismo código si la carga aún no ha comenzado; la carga en curso, preparada, verificada o cerrada no se ofrece como sustituible.
- Un SHA-256 de PDF previamente reservado para otro código se rechaza directamente en la nueva migración `20261027_kontrola_revision_documental_segura.sql`.
- Reutilizar una importación de un documento histórico no puede anunciarlo como revisión vigente; la publicación de revisión nueva conserva la revisión anterior en `kontrola_carga_revisiones`.
- Mantiene la validación en la función servidor contra sustituciones con preparación iniciada, independientemente del navegador.
- El módulo `src/import-policy.mjs` está precargado en el Service Worker, con caché nuevo `kontrola-integral-v036`.
- Pruebas añadidas: `tests/integration/revisions.sql` (revisiones 1 y 2, archivo renombrado, documento cruzado y bloqueo al comenzar preparación) y `tests/import-policy.test.mjs`.
- **No se ha desplegado ninguna migración en Supabase empresarial**, ni se ha fusionado a `main`. Todavía faltan pruebas sobre Auth, Storage y dispositivos reales.


## Continuación integral: versiones 0.3.6–0.3.8 (25/10/2026)
- **v0.3.6:** `src/admin-revisions.mjs` y `src/revision-diff.mjs`; historial visual de revisiones, comparación de datos de transporte y referencias incluso duplicadas, PDF históricos mediante enlaces privados de duración limitada.
- **v0.3.7:** `src/business-date.mjs`; informes de zona según fecha local Europe/Madrid, evitando desfases UTC y contemplando el horario de verano. Las peticiones de Administración ignoran resultados obsoletos tras cambiar de almacén o sesión.
- **v0.3.8:** `src/import-batch.mjs` e importación secuencial de hasta 20 documentos PDF; cada resultado se informa, los duplicados SHA siguen protegidos por RPC, las revisiones quedan pendientes y no hay publicación automática. Un mismo código repetido dentro de un lote se rechaza para revisión individual. Debe validarse la experiencia iPhone y los límites de memoria reales.
- **CI verificada:** run `40182749152`, commit `11de1cfd161d66d32a4e6c5e32021c820855e7d7`, **81 tests JS correctos, 0 fallidos**, cuatro migraciones en PostgreSQL temporal, workflow documental y concurrencia aprobados.
- Se elaboraron [24+ casos de aceptación](PRUEBAS_ACEPTACION.md), [matriz de cierre](MATRIZ_CIERRE_DESARROLLO.md) y [borrador de manual para operarios](MANUAL_USUARIO_BORRADOR.md).
- **Límites no resueltos:** estadísticas por operario con perfiles, impresión por lotes de PDF originales, planificación/ejecución autorizada de migración de historiales locales y datos en OneDrive, pruebas auténticas de Supabase Auth/Storage, validación AirPrint e iPhone y manual PDF con capturas reales. No afirmar fin integral hasta cerrarlos.
- Las cuatro migraciones siguen exclusivamente en control de versiones; **no se aplicaron a Supabase de producción**. Se mantienen sin cambios INVENTA, Control de Cargas original y Tanques, que permanece oculto.


## Fase integral: v0.3.9–0.3.11 (25/10/2026)

- **v0.3.9:** estadísticas por trabajador mediante la nueva RPC `kontrola_estadisticas_operarios(text,date)`, `src/admin-stats.mjs` y panel Administración. Solo el rol administrador consulta nombres y tiempos; el servidor valida roles, fecha local Europe/Madrid y almacén. Tareas abiertas se muestran sin agregar segundos no confirmados. Probadas cinco migraciones SQL y permiso denegado a operarios.
- **v0.3.10:** `src/legacy-audit.mjs` y `src/admin-legacy.mjs` permiten analizar un backup JSON original de Control de Cargas **exclusivamente en navegador** y sin mutar bases. Detectan duplicados de código/hash, ausencias de fecha, tiempos incompletos y comprobaciones pendientes. Los PDF originales NO van incluidos en el backup y permanecen localmente en IndexedDB; no se autoriza ninguna migración todavía.
- **v0.3.11:** `src/admin-print-batch.mjs` imprime en un solo documento hasta diez **hojas de preparación procesadas** autorizadas por almacén, sin alterar PDF originales ni iniciar relojes. La **impresión conjunta de PDF originales** permanece pendiente: no confundir ambos resultados.
- **Pruebas verificadas:** v0.3.9 run `40185693214` con 84 tests JS y cinco migraciones aprobadas; v0.3.10 run `40186172545` con 89 tests JS y cinco migraciones aprobadas. Comprobar la CI final de v0.3.11 antes de declararla validada.
- **Pendientes de finalización:** impresiones vectoriales de PDF originales por lote, inventario y comparación con los historiales del teléfono/OneDrive, verificación Supabase Auth/Storage en entorno autorizado, AirPrint real, manual PDF con capturas reales y aceptación funcional.
- **Inviolables:** no tocar Supabase de producción, no fusionar `main`, no generar servicios de pago, no activar Tanques, no editar INVENTA ni Control de Cargas original. Las nuevas migraciones se quedan en la PR hasta aprobación expresa.


## Seguridad de cierre de sesión — v0.3.12
- Se vacían también vistas ocultas al salir: datos de operarios, actividad, detalle, productos, resultados de verificación, estados, formularios e informe mostrado.
- `createAdminController().clearSensitive()` limpia revisión documental, historial de versiones, estadísticas, impresión por lotes y auditoría de JSON. Invalida solicitudes asíncronas de esos módulos.
- Se bloquea la salida manual durante importaciones en curso; el cierre de Supabase se comprueba por `error` antes de comunicar éxito. Si falla, se mantiene la sesión y se muestra el error.
- `tests/session-cleanup.test.mjs` incluye regresiones de limpieza de datos e incidencias de cierre.
- GitHub Actions validó **97 pruebas correctas y 0 fallidas** en la ejecución `40187723603` (commit `bda5f2df7b01ac71cbef496e9ce13aaa4f677d74`), incluidas cinco migraciones aisladas y concurrencia. Son pruebas de CI, no validación de Safari/Supabase reales.
- **Pendiente:** prueba con dos cuentas distintas en el mismo iPhone y sesión invalidada remotamente; no se ha desplegado la rama ni cambiado datos empresariales.


## Conciliación legacy sin escritura — v0.3.13

- `src/legacy-reconcile.mjs`: comparador puro por códigos del backup antiguo con metadatos del panel actual; clasifica duplicados, ausencias en almacén, coincidencias parciales, campos diferentes e información incompleta.
- `src/admin-reconcile.mjs`: botón de Administración que lee el JSON local (12 MB máximo), valida el formato con el auditor preexistente y consulta **solo** `kontrola_panel_cargas` con `p_almacen` seleccionado y autorización RLS/RPC. Invalida resultados si cambia usuario o almacén. El JSON no se envía al backend ni se guarda automáticamente en KONTROLA.
- **Prohibido asumir identidad de PDF por coincidencia de código y metadatos**: el panel no devuelve SHA-256. Faltan además datos de historiales horarios y PDF en IndexedDB de cada móvil. Los códigos no encontrados pueden existir en otro almacén no consultado.
- La nueva interfaz es de consulta y no ofrece botones de migración, restauración ni sobrescritura. La auditoría de copias preexistente continúa igual.
- Pruebas `tests/legacy-reconcile.test.mjs` incluidas. **CI confirmada**: ejecución `40188458388`, commit `17c2d732bea75275d7996fea30bfe3c6f200e553`; 104 pruebas JS correctas, 0 fallidas, cinco migraciones en PostgreSQL temporal y prueba de concurrencia aprobada.
- Pendientes: cotejo con una copia autorizada real, inventario del contenido local de cada dispositivo, pruebas con Supabase Auth/Storage y plan de restauración/migración con autorización y reversión. La PR #2 permanece sin fusionar; **no se tocó producción**.


## Recuperación local y voluntaria de PDF — v0.3.14 y v0.3.15
- Inspección de esquema histórico confirmado en Control de Cargas original `printing.mjs`: IndexedDB `control_cargas_movil_originales`, object store `originales`, claves `LPyy-nnnnn` (activa) y `LPyy-nnnnn::SHA256` (revisión).
- v0.3.14: `src/legacy-originals.mjs` inventaría únicamente **claves**, sin abrir los blobs, con `readonly/openKeyCursor`. Si el almacén no existe, un upgrade sería abortado. No hay consultas de red.
- v0.3.15: `recuperarPdfOriginalLocal` lee solo un archivo elegido explícitamente y comprueba su cabecera PDF y SHA-256; rechaza revisiones históricas si su huella no coincide. `src/admin-originals.mjs` ofrece botones individuales para guardar copia mediante enlace temporal de descarga, sin eliminar o transmitir datos.
- **Limitación iPhone:** origen/partición de almacenamiento distinta entre Safari y PWA instalada; un escaneo vacío no acredita pérdida de originales. Quedan pendientes pruebas físicas y copia independiente desde el contenedor del Control de Cargas original.
- Los PDF siguen sin trasladarse automáticamente a KONTROLA y **no hay migraciones de datos ni aplicaciones desplegadas**. Cualquier recuperación real requiere intervención/consentimiento explícito del administrador.

## Cambio de alcance vigente — KONTROLA 0.3.16

- Se inicia con documentos y operaciones **nuevos**. No se arrastra el historial antiguo ni se exige migrarlo o conciliarlo.
- El panel legacy de migración y recuperación queda **oculto en la interfaz**; los módulos anteriores permanecen en control de versiones, sin utilizar para el nuevo arranque.
- Los PDF nuevos generados por KONTROLA se archivarán **periódicamente** en la carpeta de OneDrive que la empresa elija. Por ahora el movimiento es manual desde Archivos del iPhone tras **Imprimir / Guardar PDF**; no hay integración automática ni eliminaciones de documentos.
- La impresión conjunta de hojas procesadas seguirá disponible para preparar lotes de PDF, sin confundirlos con originales BC.
- El documento normativo es `docs/PLAN_ARCHIVO_ONEDRIVE.md`. El protocolo de aceptación se ha ajustado para dejar fuera migraciones y exigir pruebas del archivo OneDrive.
- No se modificó ninguna base ni se ejecutaron migraciones de producción.


## Hito operativo — v0.3.17: archivo periódico de PDF nuevos

- `src/archive-period.mjs` aplica filtros opcionales por fecha, valida periodos y crea la carátula de relación de cargas con textos escapados. No guarda archivos ni marca un traslado a OneDrive como efectuado.
- `src/admin-print-batch.mjs` incorpora selección de periodo, nombre propuesto, selección rápida de diez cargas y carátula como primera página antes de las hojas procesadas; impresión manual a PDF.
- La descarga alternativa de la barra se etiqueta **Descargar HTML** para no confundirla con un PDF real.
- Se eliminó el panel legacy del HTML y sus inicializadores del controlador activo, así como los seis módulos obsoletos del precaché. Las implementaciones antiguas se conservan en el repositorio, sin activación desde la app.
- Las pruebas históricas ahora verifican que esas pantallas NO se puedan abrir desde la app.
- **CI validada:** GitHub Actions `40191583046` (commit `d81d88403b27e698e9c9d9cbb2d1d57c00548000`): **123 tests, 123 OK, 0 fallidos**; cinco migraciones PostgreSQL de prueba y concurrencia superadas.
- **Sin cambios en Supabase real, OneDrive real, INVENTA, Control de Cargas original, Tanques o rama main.** El archivado por iPhone/Archivos/OneDrive necesita validación física.


## Ampliación del archivo por lotes — v0.3.18

- Petición expresa: **grupos de al menos veinte** hojas cuando existan suficientes cargas. Se establece capacidad de **hasta 20 por PDF**, generando tantos grupos consecutivos como haga falta. El último puede tener menos.
- `MAX_HOJAS_ARCHIVO=20` centraliza los límites de la carátula, el nombre de archivo y los botones.
- `admin-print-batch.mjs`: al pulsar varias veces «Seleccionar siguiente grupo de hasta 20 cargas», avanza 20 posiciones en la lista filtrada y luego vuelve al principio; **no registra que se hayan archivado**.
- `archive-period.mjs`: los nombres codifican de forma reversible todos los números de carga del grupo sin el prefijo `LP` ni el guion. Se ordenan, se validan y caben dentro de los 255 caracteres.
- Los PDF son informes de **hojas procesadas**, no el original de Business Central. Los archivos aún deben guardarse manualmente en Archivos y trasladarse a la carpeta OneDrive autorizada, sin borrado automático.
- Riesgo pendiente de prueba física: la impresión de 20 hojas con muchos productos podría ocupar más páginas o memoria en Safari. No declarar garantizada la impresión real hasta comprobarlo.


## Protección del PDF frente a cambios concurrentes — v0.3.19

- `src/archive-snapshot.mjs`: verificación pura de hasta veinte cargas antes de imprimir. Bloquea ausencias, códigos repetidos, almacenes distintos, ausencia de cantidades positivas y discrepancias entre datos seleccionados y datos recién recibidos.
- `src/admin-print-batch.mjs`: **segunda RPC `kontrola_panel_cargas`** al pulsar preparar impresión; comprueba usuario/almacén/filtro/selección tras la respuesta y utiliza filas actuales para carátula y hojas. Si hay cambios, informa y obliga a actualizar.
- Mejora de impresión en `index.html`: cabecera repetida en tablas multipágina, líneas de productos sin cortes intencionados.
- `tests/archive-snapshot.test.mjs`: regresiones de lote vigente, cantidades, transporte, desaparición, almacenes, cero mercancía y formato de impresión.
- No se cambia ni escribe información empresarial; el origen de los datos sigue siendo una RPC con comprobación de permisos. No se autoriza ninguna migración o despliegue.
- Validar físicamente en iPhone tras la publicación autorizada de una versión de prueba, especialmente rendimiento con 20 cargas extensas y correcto archivado en OneDrive.


## Protocolo obligatorio de actualización continua de esta ficha (25/10/2026)

**Decisión expresa del responsable:** cada modificación de KONTROLA debe dejar esta ficha maestra actualizada **en el mismo cambio de GitHub**, sin esperar al final de una fase, sesión o conversación.

1. Antes de modificar código, SQL, configuración, interfaz, pruebas o documentación funcional, leer esta ficha en la rama de trabajo y comprobar el último commit, PR y estado de CI. Respetar las decisiones vigentes, incluidas las posteriores que prevalezcan sobre notas históricas.
2. Por **cada modificación**, actualizar `docs/CONTINUIDAD.md` en el **mismo commit** que los archivos afectados, o en una operación inseparable de la misma PR antes de darla por terminada. No declarar completado un cambio sin ficha actualizada y comprobada en GitHub.
3. Añadir una entrada cronológica con: fecha; versión si cambia; rama y PR; objetivo y decisión de negocio; archivos/componentes alterados; comportamiento anterior y nuevo; pruebas realizadas y resultado (distinguiendo CI de pruebas reales); riesgos y limitaciones; lo pendiente y siguiente paso. Incorporar el SHA final del commit mediante enlace o referencia posterior si no puede conocerse dentro del propio commit.
4. Si un intento falla, se revierte o queda incompleto, documentarlo también claramente, indicando qué se ha revertido, qué permanece y cómo recuperarlo. Nunca presentar pruebas pendientes como superadas.
5. Si se modifica el alcance o una decisión aprobada, registrar explícitamente qué regla sustituye, desde cuándo y por qué. Conservar la trazabilidad; no sobrescribir silenciosamente acuerdos anteriores.
6. Al cerrar cada intervención, comprobar en GitHub que el código y la ficha están sincronizados y comunicar el commit, el resultado de pruebas y los pendientes. Si falla la actualización de la ficha, el trabajo no se considera cerrado.
7. Mantener la ficha **solo en KONTROLA**, en la rama/PR de desarrollo correspondiente. No alterar INVENTA, Control de Cargas, Tanques, Business Central, `main` ni producción sin autorización específica. No introducir secretos, PDF empresariales ni datos personales en la ficha pública.

**Aplicación inmediata:** este protocolo rige para todas las modificaciones posteriores a su incorporación, incluyendo las realizadas por agentes Cursor u otros asistentes. La ficha no sustituye las pruebas ni la revisión humana.


## Preparación de publicación gratuita para pruebas en iPhone (25/10/2026)

- **Decisión:** priorizar pruebas de KONTROLA en Safari/iPhone sin contratar Cursor ni servicios de pago. La unificación futura de las bases de Supabase se mantiene como objetivo, pero se pospone su ejecución. Los datos existentes son de prueba según el responsable; no se han borrado ni modificado.
- **Rama y PR:** `cursor/verificacion-fisica-cargas-8ba0`, PR #2. **Versión de aplicación:** 0.3.19, sin cambio funcional.
- **Archivos modificados en el mismo commit:** `.github/workflows/pages.yml` (nuevo) y esta ficha `docs/CONTINUIDAD.md`.
- **Antes:** no existía una automatización de publicación de la versión avanzada en GitHub Pages. **Después:** un workflow prepara exclusivamente `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js`, `version.json`, `src/`, `assets/` y `vendor/` y solicita su despliegue en Pages cuando se actualice esta rama o se lance manualmente. Ejecuta `npm ci`, `npm run check` y comprobación de dependencias antes de publicar.
- **Seguridad:** el sitio web será público como recurso estático; no contiene claves privadas y la aplicación conserva su inicio de sesión. Esto **no sustituye** RLS/Storage/Auth ni valida permisos de la base. No publicar PDF reales en GitHub. La configuración de cliente existente apunta al proyecto Supabase compartido con Control de Cargas, sin alterarlo.
- **Estado de pruebas:** workflow añadido; ejecución de GitHub Actions, URL final, habilitación de Pages en Settings, autenticación real, importación de PDF y uso en Safari/iPhone **pendientes de comprobar**. No declarar despliegue exitoso hasta ver un run exitoso y abrir la URL.
- **Condición externa:** el administrador del repositorio debe seleccionar `Settings → Pages → Build and deployment → Source: GitHub Actions` si todavía no está configurado. La publicación puede fallar hasta entonces.
- **Sin cambios:** no se ha fusionado `main`, ni ejecutado migraciones, ni modificado INVENTA, Control de Cargas, Tanques o Business Central.
- **Siguiente paso:** comprobar ejecución de Pages, obtener URL real, abrir en Safari, añadir a pantalla de inicio y verificar primero navegación; después revisar cuentas, esquema KONTROLA y cargas PDF de prueba antes de ejecutar operaciones persistentes.


## Diagnóstico de GitHub Pages (25/10/2026)

- **Rama/PR:** `cursor/verificacion-fisica-cargas-8ba0`, PR #2. **Versión:** 0.3.19 (sin cambios de aplicación).
- **Motivo:** workflow Pages `40195392936` falló dos veces antes de ejecutar pasos; CI `40195396194` terminó correctamente. GitHub informa cero pasos ejecutados, sin aprobaciones de despliegue pendientes. No hay causa raíz confirmada.
- **Cambio:** `.github/workflows/pages.yml` divide el trabajo original en `build` (sin entorno protegido: checkout, npm ci, check, vendor, dist, artefacto) y `deploy` (dependiente de build, entorno `github-pages`, deploy-pages). Se elimina `configure-pages`, que requiere acceso de configuración y no es imprescindible cuando Pages ya está habilitado.
- **Validación:** pendiente del nuevo run de Actions; verificar que `build` arranca y si `deploy` falla por protección de entorno, rama autorizada o permisos.
- **Límites:** no se tocan Supabase, datos, otras aplicaciones, ni ramas base; no hay migraciones ni publicación confirmada.

## 2026-10-25 — Corrección de pendientes de atención (GitHub Pages)
- Rama: `cursor/verificacion-fisica-cargas-8ba0`; versión de interfaz: 0.3.19.
- Error observado en iPhone, Administración: `invalid UNION/INTERSECT/EXCEPT ORDER BY clause`.
- Antes: RPC `kontrola_necesitan_atencion` ordenaba un UNION ALL por `creado_en` (nombre de columna no admitido en ese contexto).
- Después: migración incremental `20261029_kontrola_fix_orden_atencion.sql` sustituye únicamente la RPC, ordenando por la posición de salida `ORDER BY 6`.
- Validación pendiente: aplicar migración a Supabase compartido y comprobar RPC desde sesión autenticada; no se modifica ningún dato de otras aplicaciones.

## 2026-10-25 — Impresión diaria sin fechas manuales
- Rama `cursor/verificacion-fisica-cargas-8ba0`, versión UI 0.3.19.
- Solicitud: imprimir solo cargas del mismo día; eliminar filtros Desde/Hasta de impresión por lotes.
- Antes: impresión por periodos arbitrarios y archivo OneDrive mezclados en un mismo formulario.
- Después: `src/admin-print-batch.mjs` filtra estrictamente por fecha del almacén (`Europe/Madrid`) tanto al mostrar como al verificar antes de imprimir; `index.html` elimina filtros; conserva selección máxima de 20, validación del servidor y PDF procesado. Archivo OneDrive sigue siendo manual e independiente.
- Prueba añadida en `tests/admin-print-batch.test.mjs`; ejecución CI pendiente.
- No se modifica Supabase, INVENTA ni Control de Cargas.

## 2026-10-25 — Control automático de generación y reimpresión
- Rama `cursor/verificacion-fisica-cargas-8ba0`; sin alterar versión 0.3.19.
- Nuevo `supabase/migrations/20261030_kontrola_impresiones.sql`: historial por carga/usuario/almacén/fecha, RPC de estado y registro atómico con bloqueo de concurrencia; solo administradores; sin acceso directo a la tabla.
- `src/admin-print-batch.mjs` excluye de la impresión normal las cargas ya generadas y ofrece Reimprimir sin confirmación adicional; registra el intento justo antes de abrir la vista imprimible. `index.html` incorpora el control.
- Limitación: Safari no informa del éxito físico de la impresora; se registra intento de generación, no impresión efectiva. Si falla, reimprimir. Si la vista no abre tras registrar, se puede reimprimir.
- No modifica tablas ni datos de INVENTA o Control de Cargas. Pendiente: aplicar migración y verificar CI y despliegue.

## 2026-10-25 — Actualización de pruebas de impresión
- Ajustados tests obsoletos de filtros Desde/Hasta a impresión exclusivamente del día; comprobación del control Reimprimir y agrupación máxima 20.
- Antes: CI fallaba por expectativas antiguas y escapes erróneos en expresiones regulares; después: pruebas actualizadas. Pendiente resultado CI.

## 2026-10-25 — Prueba de fecha de impresión robusta
- Sustituidas dos expresiones regulares mal escapadas por verificaciones literales `includes` en test de impresión diaria; sin cambios funcionales.

## 2026-10-25 — Corrección de lectura de PDF en Safari
- Error real reportado con 18 PDFs: `pdf.destroy is not a function`.
- `src/pdf.mjs`: conservar `PDFDocumentLoadingTask` de PDF.js y destruir el loading task en `finally` en lugar del documento proxy. Evita transformar una lectura correcta en fallo al liberar recursos.
- No se importan automáticamente documentos ni se publican cargas; datos existentes sin cambios. Pruebas de GitHub pendientes.

## 2026-10-25 — CI: última expectativa obsoleta
- `tests/archive-period.test.mjs` comprobaba `from,to` aunque la impresión ahora usa `today,today`. Actualizada aserción literal sin modificar la lógica de producción.

## 2026-10-25 — 0.3.20: renovación de caché Safari
- El usuario continúa viendo `pdf.destroy is not a function` tras publicar corrección. No está confirmado si es error histórico en pantalla o módulo antiguo cacheado.
- `sw.js` cambia clave de caché v050 a v051 y pasa a network-first con fallback offline para recursos de mismo origen, incluidos módulos dinámicos; antes era cache-first y conservaba módulos antiguos indefinidamente.
- Actualizados `src/config.mjs`, `version.json`, `index.html` a 0.3.20 para distinguir despliegue nuevo. Sin cambios de base de datos.
- Pendiente CI y prueba manual en Safari de importación de un PDF.

## 2026-10-25 — Orden operativo de Administración
- Solicitud: importación de PDF como primera acción visible al entrar a Administración, y paneles ordenados según flujo de trabajo.
- `index.html`: se reordena únicamente el DOM de las ocho secciones, sin cambiar IDs, botones, funciones ni datos. Orden: Importar/procesar/revisar/publicar, Resumen y almacén, Necesitan atención, Archivo periódico, Imprimir hojas, Actividad operario, Incidencias, Historial revisiones. Los controles de importación aparecen primero.
- Pruebas CI y despliegue pendientes.

- Ajuste final de orden: Importación primero, Resumen segundo, Necesitan atención tercero, Impresión cuarto, Actividad quinto, Incidencias sexto, Historial séptimo y Archivo OneDrive al final.

## 2026-10-25 — Administración compacta por botones
- `index.html`: navegación con ocho botones, Importar PDF seleccionado por defecto; cada panel mantiene IDs y funciones, los demás quedan ocultos.
- `src/admin.mjs`: conmutación de pestañas y restablecimiento a Importar PDF al entrar; no altera datos.
- `styles.css`: diseño compacto responsive con dos columnas de botones en iPhone.
- Pendiente CI, despliegue y comprobación visual en Safari.

## 2026-10-25 — Desbloqueo de publicación 0.3.20
- Sincronizadas versiones `package.json`, `package-lock.json` y pruebas de navegación con `src/config.mjs`, `version.json` y caché v051.
- El fallo previo de CI era la versión desincronizada, no el menú compacto. Pendiente verificación final.

## 2026-10-25 — Botones operativos de Administración
- `src/admin.mjs`: cada botón de menú ahora inicia su acción: Importar abre selector de archivos iPhone; Pendientes, Impresión, Operarios, Incidencias y Resumen actualizan datos; Historial enfoca búsqueda. Archivo OneDrive muestra instrucciones, sin conexión automática.
- Seguridad: no se importa sin selección y pulsar Procesar, no se publica ni imprime automáticamente; preserva autorizaciones y revisión.
- Pendiente CI y publicación.

## 2026-10-25 — Diagnóstico de errores de importación y visualización móvil
- Confirmado en la función Supabase `kontrola_reservar_importacion`: el mensaje «Metadatos de importación inválidos» se produce por código LP, SHA-256 o tamaño fuera de límites. El parser puede devolver el nombre del archivo cuando no detecta LP.
- `src/admin.mjs`: comprobación explícita del formato LP antes de reservar, con mensaje útil y sin modificar registros existentes; evita errores genéricos en PDFs no identificables.
- `styles.css`: cabecera de revisión flexible, evita desbordamiento de almacén/estado en iPhone.
- `assets/kontrola.svg`: reduce el espacio excesivo antes de la A final.
- No se rellenan ubicaciones ni se publican cargas automáticamente. Pruebas y despliegue pendientes.

## 2026-10-25 — Extracción de ubicaciones PDF.js
- `src/core.mjs`: reconoce ubicaciones fragmentadas en varios textos PDF.js, admite sufijos de más de un dígito y conserva la regla de buscar solo en la misma fila, a la izquierda del SKU. No asigna ubicaciones de otras filas.
- `tests/core-warehouse.test.mjs`: pruebas para ubicación fragmentada y prevención de asignación de otra fila.
- Las cargas existentes no se alteran automáticamente. Pendiente CI y despliegue.

## 2026-10-25 — Pendientes abre revisión real
- `src/admin.mjs`: al pulsar una importación pendiente, cambia automáticamente a Importar PDF, carga la revisión seleccionada y desplaza la pantalla a ella. Antes se cargaba en un panel oculto, sin feedback visible.
- No publica ni aprueba documentos. Pendiente CI/despliegue.

## 2026-10-25 — Revisión compacta e informe BC bajo demanda
- Se eliminan las fichas y campos de edición de líneas en la pantalla de revisión. Se muestra un resumen de referencias, ubicaciones pendientes y otros avisos.
- Avisos de ubicaciones agrupados en una única confirmación; se conservan todos los hallazgos originales para trazabilidad y la validación de publicación.
- Nuevo botón «Informe ubicaciones BC»: tabla imprimible y descargable en HTML con línea, SKU, descripción, cantidad, unidad y espacio para anotaciones. Corrección exclusivamente manual en Business Central.
- No se modifica BC, ni se publican cargas, ni se alteran datos ya guardados. Pruebas/despliegue pendientes.

## 2026-10-25 — Informe BC imprimible
- Tabla de incidencias con bordes, columnas legibles, encabezados repetidos y filas no partidas al imprimir varias páginas.
- Se oculta el aviso de archivado OneDrive de hojas operativas cuando se muestra el informe de correcciones de BC; se restaura para hojas de preparación.
- Sin cambios en datos ni publicación. Pendiente validación CI.

## 2026-10-25 — Estado vacío de impresión en iPhone
- Confirmado en Supabase que hay cero cargas publicadas; la lista vacía es correcta y no implica pérdida de PDF pendientes.
- `src/admin-print-batch.mjs`: estado vacío explicativo y ocultación de botones de selección, impresión y reimpresión sin cargas disponibles.
- `index.html`: explicación abreviada, con referencia al apartado Pendientes.
- Sin saltar revisión ni publicar automáticamente. Pendiente CI y despliegue.

## 2026-10-25 — Corrección de prueba CI
- `tests/archive-period.test.mjs`: se actualiza la expectativa del texto de ayuda de impresión («Máximo 20 hojas por grupo»), conservando las comprobaciones funcionales de agrupación.
- La prueba de despliegue fallaba por el texto antiguo tras compactar la interfaz; sin cambios de lógica de negocio.

## 2026-10-25 — Identificación de códigos LP fragmentados
- `src/core.mjs`: admite códigos LP que PDF.js divide en fragmentos, guiones y espacios; para archivos solo numéricos exige fecha de carga y número explícito en el contenido antes de reconstruir el código.
- `tests/core-warehouse.test.mjs`: pruebas para LP fragmentado y rechazo de identificadores deducidos sin evidencia.
- No se importan datos automáticamente ni se alteran registros existentes. Pendiente CI.

- Ajuste adicional: prioridad de año de cuatro cifras en fecha BC para evitar interpretar 2026 como 20.

## 2026-10-25 — Resultado de importación compacto
- `src/admin.mjs` e `index.html`: tras procesar varios PDF, el resumen queda visible y los mensajes completos de error se muestran bajo demanda en un desplegable, con nombre de archivo y motivo.
- Evita listas rojas enormes en Safari iPhone, sin ocultar información ni modificar validaciones o datos.
- Pendiente CI y despliegue.

## 2026-10-25 — Avisos no bloqueantes y matrícula destacada
- La revisión ya no exige confirmar ubicaciones ni advertencias una por una: solo muestra errores graves y conserva el resto de hallazgos en el registro/informe BC.
- `src/admin.mjs`: guardar revisión confirma administrativamente los avisos no críticos para cumplir el contrato RPC, sin afirmar que estén corregidos en BC; los errores graves siguen bloqueando.
- `src/app.mjs`: matrícula destacada y campo Bultos; muestra guion cuando no existe cifra explícita fiable, sin confundir referencias ni unidades con bultos.
- Pendiente añadir extracción fiable de bultos a la cadena PDF→Supabase→panel; no inventar cantidades.

- `styles.css`: matrícula en pastilla de alto contraste y bultos como dato secundario en las tarjetas.

## 2026-10-25 — Siguiente acción inmediatamente después de publicar
- `index.html`: «Publicar carga» deja paso, justo debajo, a «Generar hoja de preparación» y «Imprimir varias cargas», sin desplazarse a otro menú.
- `src/admin.mjs`: el bloque posterior solo se muestra cuando la carga está publicada; no permite generar la hoja antes de publicar. El acceso a lotes abre directamente la pestaña de impresión y actualiza las cargas.
- Se ocultan los botones de guardar/publicar ya ejecutados para evitar confusión. Sin publicación automática ni cambios en BC.
- Pendiente CI y despliegue.

## 2026-10-25 — Bultos de Business Central (extracción y persistencia)
- Analizados diez PDF reales de BC. El total de bultos es la primera cifra del renglón «TOTAL:» de MERCANCÍA, excluyendo las columnas de devoluciones y los bloques CONTROL ENVASES/PALETS. Un PDF puede tener varios almacenes, por lo que se conserva el desglose por almacén.
- Migración aplicada a Supabase `kontrola_bultos_bc_total_mercancia`: campo `kontrola_cargas.bultos`, restricción no negativo, recuperación segura de cargas ya publicadas mediante importación vigente verificada y hash coincidente, trigger para nuevas publicaciones, RPC compatible `kontrola_panel_cargas_v2` (la original permanece).
- `src/core.mjs`: `bultos` explícitos a partir de `declaredTotal` calculado por coordenadas en el bloque MERCANCÍA; `src/admin.mjs`: se transporta al JSON de importación; `src/app.mjs` y `src/admin-print-batch.mjs`: consulta de RPC v2, con bultos visibles en tarjetas.
- No se cambian PDF originales, cantidades, revisiones, estados ni procesos de otras aplicaciones. Sin datos contrastados se muestra «—».
- Verificar CI y publicación GitHub Pages.

## 2026-10-25 — Orden de productos por pasillo y formato
- En la consulta de preparación, cada pasillo ordena primero CAJA/CJ y después BOTELLA/BOT, con cantidad de bultos descendente dentro de cada formato. Otros formatos aparecen a continuación. En empates, ubicación y referencia para estabilidad.
- `src/logic.mjs`: función compartida `ordenarLineasPasillo` y aplicación en `agruparPasillos`; `src/report.mjs`: el informe impreso aplica exactamente el mismo orden.
- Pruebas en `tests/logic.test.mjs` y `tests/report.test.mjs`. No se alteran cantidades, pasillos, estados, BC ni Supabase.
- Pendiente CI y despliegue.

## 2026-10-25 — Selector directo de revisiones en Importar PDF
- Se añade un selector compacto «Cambiar de carga pendiente» sobre la revisión, con actualización manual. Carga directamente revisiones pendientes o aprobadas del almacén activo, sin volver al listado ni cambiar de pestaña.
- Los cambios sin guardar se advierten antes de abandonar una revisión. La selección nunca publica ni guarda automáticamente. Solo carga el registro elegido y mantiene el resto de flujos.
- `src/admin.mjs`, `index.html`; selector refrescado al abrir administración y cambiar almacén. No hay cambios en Supabase ni otras aplicaciones.
- Pendiente CI y despliegue.

## 2026-10-25 — Impresión por día de publicación, no por fecha documental BC
- Problema confirmado: cargas publicadas el 25/10 tenían fechas BC del 23/10 y 26/10 y la lista de impresión estaba vacía.
- Migración `kontrola_impresion_por_fecha_publicacion`: RPC `kontrola_panel_cargas_impresion` con `publicado_en`, respetando permisos por almacén, estado publicada y RPC anteriores.
- `src/admin-print-batch.mjs`: filtra por día de publicación Europe/Madrid, mantiene máximo 20, no duplica impresiones, valida nuevamente la carga en servidor antes de generar hojas procesadas; fecha documental BC sigue visible como dato informativo.
- Sin modificación de cargas ni otros proyectos. Pendiente CI y despliegue.

## 2026-10-25 — Selección y publicación manual de cargas pendientes de cualquier fecha
- En Administración → Pendientes se consultan todas las importaciones en revisión/aprobadas del almacén, independientemente de la fecha BC. Contador, selección de aprobadas, selección total y publicación explícita tras confirmación.
- Cada carga con errores permanece sin publicar y ofrece acceso a revisión. Publicación individual mediante RPC existente, errores por carga no bloquean las demás. Aviso con acceso directo desde Impresión.
- Archivos: `src/admin.mjs`, `index.html`; sin cambios en otras aplicaciones ni publicación automática. Pendiente CI.

## 2026-10-25 — Corrección aislada de regresión CI de impresión
- Actualizadas únicamente las pruebas `tests/admin-print-batch.test.mjs`, `tests/archive-period.test.mjs` y `tests/archive-snapshot.test.mjs` para reconocer la RPC `kontrola_panel_cargas_impresion` y el filtro de cargas publicadas por `publicado_en` en `Europe/Madrid`.
- Se mantienen las comprobaciones de autorización, almacén, límite de 20 hojas, revalidación de lotes y ausencia de escrituras sobre documentos originales.
- No se modifica código de aplicación, Supabase, INVENTA, MOVENTA ni despliegue. Rama aislada de corrección; CI pendiente de verificar después del commit.

## 2026-10-25 — Activación de CI para PR de corrección en rama de desarrollo
- El workflow `.github/workflows/ci.yml` solo escuchaba PR hacia `main` y `desarrollo/fase-1-operario`; por ello el PR #3 dirigido a `cursor/verificacion-fisica-cargas-8ba0` no generaba ejecución.
- Se añade exclusivamente la rama activa a los destinos `pull_request`, preservando los anteriores y sin ampliar los disparadores `push`.
- Cambio de infraestructura de pruebas sin alteraciones de lógica operativa, Supabase, INVENTA ni MOVENTA. Pendiente comprobar ejecución y resultado de GitHub Actions.

## 2026-10-25 — CI de pushes en rama operativa
- Se incorpora `cursor/verificacion-fisica-cargas-8ba0` al disparador `push` de `.github/workflows/ci.yml`, además del disparador de PR ya existente. Se conserva la rama `desarrollo/fase-1-operario`.
- Objetivo: verificar cada nuevo commit directo o integración posterior en la rama operativa; no modifica aplicación, datos, despliegues ni permisos.
- Cambio aislado en PR; pendiente validación de CI y aprobación de integración.

## 2026-10-25 — Corrección de acceso a reimpresión cuando no hay hojas nuevas
- Hallazgo por inspección: el control Reimprimir se ocultaba si la lista normal estaba vacía, incluso cuando había cargas publicadas hoy con intentos de impresión registrados.
- Se muestra Reimprimir cuando existe al menos una carga publicada hoy con intentos previos; se mantiene oculta cuando no hay ninguna.
- Se añade prueba de regresión; sin migraciones, cambios de permisos, despliegue ni alteración de documentos originales. Pendiente CI y revisión del PR.

## 2026-10-25 — Propuesta de conservación de cargas finalizadas durante 90 días
- Se documenta en `docs/POLITICA_RETENCION_CARGAS.md` una propuesta de archivo lógico y elegibilidad para revisión de eliminación solo tras 90 días completos desde la finalización verificable.
- Se protegen cargas no finalizadas, incidencias, bloqueos y dependencias; no se habilita borrado automático ni manual.
- Cambio documental aislado sin migraciones, despliegues ni modificaciones de Supabase, INVENTA o MOVENTA. Pendiente revisión y autorización de cualquier implementación.

### 2026-10-25 — Inventario de dependencias para retención
- Se amplía `docs/POLITICA_RETENCION_CARGAS.md` con relaciones verificadas en migraciones y tests: carga cerrada con incidencias pendientes, verificaciones, eventos, preparación, historial documental, impresión y Storage.
- No se ha acreditado una marca de cierre definitivo: bloquear elegibilidad hasta auditar el esquema real y la RPC de finalización. Sin cambios SQL, datos ni borrados.

### 2026-10-25 — Evaluador conservador aislado (propuesta sin activar)
- `src/archive-eligibility.mjs`: función pura sin acceso a Supabase que solo evalúa criterios acreditados y 90 días exactos en UTC; ante datos ausentes o ambiguos deniega.
- `tests/archive-eligibility.test.mjs`: casos de borde, incidencias, fecha ausente/futura/sin zona y dependencias.
- NO conectado a interfaz, backend ni borrado; los campos de entrada son contrato propuesto, NO columnas verificadas del esquema. No activa archivo ni elimina datos.

### 2026-10-25 — Selector de presentación para futuro archivo lógico (no conectado)
- `src/archive-view.mjs`: selector puro para vistas activas, archivadas y todas, sin llamadas de red ni escritura. Solo `archivado === true` acredita archivo; campo ausente permanece visible en activas para evitar ocultaciones accidentales.
- `tests/archive-view.test.mjs`: seis pruebas de filtros, valores ambiguos, vista inválida y ausencia de mutación.
- `archivado` es un contrato de presentación propuesto, NO una columna de Supabase acreditada. Sin conexión a RPC, interfaz, migraciones, eliminación ni despliegue. El filtrado de permisos debe continuar en el servidor.

### 2026-10-25 — Integración conservadora del selector en lecturas (pendiente revisión)
- `src/app.mjs`: conecta `filtrarArchivoLogico` a las respuestas de los RPC ya existentes: cargas operativas usa `activas`; historial usa `todas`.
- Sin columna `archivado` confirmada, las cargas existentes mantienen la misma visibilidad; solo `archivado === true` en respuesta autorizada excluye una carga del listado activo.
- No crea selector visual de archivadas ni escribe en Supabase; el historial sigue sujeto al RPC y permisos existentes. No equivale a archivo lógico operativo completo.

### 2026-10-25 — UI administrativa para archivo (pendiente de backend)
- Pestaña Archivo de cargas: código, archivar y restaurar, confirmación, errores y bloqueo durante la solicitud.
- Llama a RPC `kontrola_cambiar_archivo` solo cuando el administrador actúa; si falta la RPC, muestra error sin afirmar éxito.
- Backend de PR #11 sigue siendo propuesta sin aplicar. Pendiente consulta de archivadas, pruebas y despliegue.

### 2026-10-25 — Rama de integración de archivo (sin despliegue)
- Se ha consolidado `src/admin.mjs` e `index.html` de `feat/admin-archivo-ui-20261025`, backend SQL propuesto y las pruebas de `feat/archivo-rpc-segura-20261025`.
- Corrección preventiva: no archivar antes de 90 días desde la última actualización de una incidencia, aunque `cerrada_en` sea anterior. Este criterio conservador protege regularizaciones posteriores.
- La migración sigue en `supabase/proposals/` y NO se aplica automáticamente en CI ni Supabase; pendiente validar SQL real, RPC de panel y autorización.
- No realizar borrado automático, no modificar INVENTA ni MOVENTA.

### Pruebas reales del archivo lógico en PostgreSQL aislado
- `tests/integration/archive.sql` crea casos de archivo temprano rechazado, archivo tras 92 días simulados en BD aislada, listado, idempotencia, restauración, auditoría y denegación a operario.
- `tests/integration/run.sh` aplica exclusivamente en su BD efímera de pruebas la propuesta de `supabase/proposals/` después de las pruebas existentes. No despliega en Supabase.
- Pendiente comprobar que esta nueva ejecución de GitHub Actions pase; ninguna migración real aplicada.

### CI archivo — corrección de permisos ejecutables
- GitHub Actions del commit `b384f8e` falló con salida 126 al iniciar pruebas de base de datos: el archivo `tests/integration/run.sh` fue reemplazado con modo no ejecutable `100644`.
- Restaurado modo ejecutable `100755`. Aún no se considera validada la integración hasta ejecución CI correcta.

### Corrección del test de auditoría
- CI detectó denegación de lectura directa de `kontrola_archivo_eventos` bajo rol `authenticated`, que es la restricción buscada. El test pasa a `reset role` únicamente para comprobar la auditoría con privilegios del runner local, y vuelve al rol autenticado antes de probar la API. No se conceden permisos nuevos.

### CI archivo — confirmación de modo ejecutable
- El commit de test reintrodujo accidentalmente `100644` en `tests/integration/run.sh` por utilizar una base de árbol antigua; se vuelve a forzar `100755` junto con el test y documentación actuales.

### Ampliación de pruebas integradas de retención
- Tras CI real favorable con 171 pruebas y `archive=passed`, se incorporan dos escenarios adicionales de PostgreSQL aislado: rechazar incidencia regularizada muy recientemente y rechazar incidencia aún pendiente aun con carga antigua.
- Ningún cambio de datos en Supabase. Pendiente validar el CI de esta ampliación.

### Corrección del test de incidencias (PL/pgSQL)
- La ejecución de GitHub Actions detectó dos bloques DO escritos con delimitadores `$` en vez de `$$`. Se han corregido en `tests/integration/archive.sql`. Pendiente CI del nuevo commit.

### Corrección definitiva de delimitadores SQL del test
- El reemplazo JavaScript anterior interpretó `$$` en la cadena de sustitución como un solo `$`. Ahora el reemplazo se realiza mediante función para conservar los dos caracteres literales. Pendiente CI.

### 2026-10-25 — Integración de estados archivados en listados
- La RPC propuesta `kontrola_codigos_archivados(p_almacen)` devuelve solo códigos archivados del almacén permitido a usuario autenticado. Se revoca a anon y PUBLIC.
- `src/app.mjs` consulta este estado junto con las RPC de panel existentes, superpone `archivado` por código y filtra cargas activas. Historial conserva todas y marca cuáles están archivadas.
- Si falla alguna RPC, los listados fallan de forma segura, evitando mostrar cargas archivadas como activas. Requiere aplicar backend antes de fusionar desplegar esta interfaz.
- Pendiente CI aislado; Supabase real sin modificar.

### Pruebas SQL de visibilidad por archivo
- `tests/integration/archive.sql` comprueba la RPC `kontrola_codigos_archivados` en los estados archivado y restaurado de una carga real dentro de la base temporal.
- No hay cambios en Supabase real. Pendiente validación CI del último commit.

### Archivo lógico — Migración desplegada y canonizada (25/10/2026)
- Aplicada con éxito mediante el conector de Supabase al proyecto de pruebas `control-cargas-movil` (`oevetnszmfxeukcncwji`). Se verificaron 13 cargas existentes, 0 archivadas y 0 eventos de archivo tras la aplicación. Los cinco campos nuevos y las tres RPC están presentes.
- Se incorpora copia canónica del SQL aplicado en `supabase/migrations/20261031_kontrola_archivo_logico_seguro.sql`, y el runner CI pasa a ejecutarlo dentro de las migraciones normales (seis en total), sin ejecución duplicada desde `supabase/proposals`.
- Pruebas de PostgreSQL real aislado completadas previamente en PR #14; tras cambiar la ruta canónica se requiere CI nuevo. Operaciones autenticadas contra Supabase real no comprobadas aún.
- No hay eliminación automática ni migración a INVENTA/MOVENTA.

### 2026-10-25 — Archivo lógico integrado y migración aplicada (estado verificado)
- PR #14 **fusionado** en rama operativa `cursor/verificacion-fisica-cargas-8ba0`; merge `a5920ed5a51b216b249c1516ffbe3f73a2f8737c`. La interfaz de archivo/restauración, consulta de archivadas, estado de archivo en paneles, migración canónica y pruebas SQL están integrados.
- GitHub Actions sobre el merge: **173/173 pruebas correctas**, cero fallos; `KONTROLA_DATABASE_OK migrations=6 ... archive=passed`.
- Migración aplicada a Supabase de pruebas `control-cargas-movil` (`oevetnszmfxeukcncwji`), verificada la existencia de las 3 RPC y los 5 campos de archivo. Datos conservados: **13 cargas**, **0 archivadas**, **0 eventos de archivo** tras migrar.
- Las 3 RPC permiten ejecución a `authenticated` y no a `anon` según la inspección de permisos. Las operaciones de escritura comprueban administrador y almacén dentro de `SECURITY DEFINER`.
- PR #11 y #13 cerrados sin fusionar al estar sustituidos por PR #14 (sin borrar ramas ni datos). PR #10 continúa independiente pendiente de valorar.
- **Pendiente de validación manual:** abrir la PWA con una sesión real de administrador y de operario para comprobar experiencia de usuario, despliegue de frontend y autorización del endpoint. No se ha archivado ninguna carga real.
- Política: nunca eliminar automáticamente, 90 días mínimos de cierre definitivo y actividad de incidencia, conservar eventos y permitir restauración administrada.

### 2026-10-25 — Mejora del listado tras archivo/restauración
- Al completar `kontrola_cambiar_archivo`, se ejecuta `refreshArchivedLoads()` para reflejar el nuevo estado del listado sin pulsar Actualizar.
- No se modifica el backend ni la política de 90 días. Pendiente comprobar CI y prueba visual manual autenticada.

### 2026-10-25 — Protección de datos archivados al cerrar sesión
- `src/admin.mjs` limpia código, mensajes y tabla de archivadas en `clearSensitive()`.
- `archiveGeneration` invalida los resultados de RPC iniciadas antes del cierre; el callback tardío no puede reinsertar datos en la interfaz.
- Sin cambios de Supabase o datos de cargas. Pendiente CI y revisión manual.

### Pruebas de purga del archivo administrativo
- `tests/archive-session.test.mjs`: verifica mediante contrato estático que `clearSensitive()` purga el archivo y que las respuestas tardías de RPC se invalidan. CI las ejecuta con `node --test tests/*.test.mjs`.

### 2026-10-25 — Versión 0.3.21 preparada para publicación PWA
- Sin modificaciones de base de datos: actualiza `package.json`, `version.json`, los indicadores de versión de `index.html` y el identificador de caché de `sw.js` a `kontrola-integral-v052` para invalidar recursos antiguos.
- Objetivo: que la instalación PWA del **mismo origen de GitHub Pages** pueda recibir la interfaz de archivo y sus correcciones. Despliegue controlado por `.github/workflows/pages.yml` en la rama operativa, sujeto a configuración de GitHub Pages y a validación de la URL real.
- No se cambia el alcance ni la política del archivo, no se realiza borrado ni se despliega a `main`.

### 2026-10-25 — Alineación versión 0.3.21
- Actualizado `src/config.mjs` y test `tests/navigation.test.mjs` para que versión interna, manifiesto, package y caché SW coincidan. CI inicial del PR #18 detectó inconsistencia; se corrige antes de publicar.
\n### 2026-10-25 — Marcador ? de recogida no es incidencia\n- Confirmación de negocio: `?` en los productos de Business Central identifica **recogida**, no anomalía.\n- `analyzeDocument()` deja de generar advertencias `special_marker`; preserva `sourceContext` y cantidades.\n- Al abrir una importación anterior se excluyen únicamente los avisos heredados `special_marker` de la vista; guardar la revisión reescribe los hallazgos sin esos falsos avisos. Las demás incidencias siguen activas.\n- Pruebas cubren mercancía con recogida y filtrado selectivo de hallazgos antiguos. Sin eliminación de importaciones ni alteraciones directas en Supabase.\n
### 2026-10-25 — Publicación v0.3.22 de recogidas
- Versión de aplicación y caché PWA elevados a 0.3.22 y `kontrola-integral-v053`, incluyendo lockfile y prueba de navegación, para distribuir la corrección del marcador `?` a los dispositivos existentes sin reinstalar.

### 2026-10-25 — Totalización de hojas de preparación por pasillos
- `src/report.mjs` agrega una fila **TOTAL PASILLO** después de cada grupo, con número de referencias y suma de cantidades separada por unidad (CAJA, BOTELLA, etc.), sin mezclar unidades incompatibles.
- Mantiene el orden de mercancía, el filtro de cantidades positivas y el detalle original. La fila se imprime en iPhone/Android/Windows con `styles.css`, sin alterar PDFs BC ni datos persistidos.
- Pruebas en `tests/report.test.mjs` para varios pasillos, unidades mixtas, decimales, cero y escape HTML.

### 2026-10-25 — Mi actividad sin detalle de eventos y PWA 0.3.23
- Se elimina del inicio el detalle con fecha, hora y código de las últimas operaciones bajo «Mi actividad»; permanecen los cuatro contadores de disponibles, en preparación, por verificar y cerradas.
- `refreshOperatorDashboard` deja de consultar `kontrola_actividad` en esa pantalla. No se borra ni altera ningún evento almacenado ni el historial administrativo.
- `tests/navigation.test.mjs` comprueba que solo queda el resumen y se eliminó la consulta de eventos del inicio.
- Versión 0.3.23 y caché v054 para publicar la mejora, junto a los subtotales ya integrados, en los dispositivos instalados.

### 2026-10-25 — Portada KONTROLA visualmente alineada con INVENTA (v0.3.24)
- Estilo inspirado en la portada actual de INVENTA (`josegude-ux/INVENTA-`), con tarjetas amplias apiladas, fondos pastel, ilustraciones grandes basadas en símbolos del sistema, flechas circulares y bienvenida clara. No se copian recursos externos ni se modifica INVENTA.
- Solo modifica la estructura visual de `#homeView`: conserva IDs y eventos de Preparación, Verificación, Control de Cargas y Administración, sus permisos, selección de almacén y estadísticas. Otras pantallas operativas no se alteran.
- `styles.css` añade reglas confinadas a `#homeView`, accesibilidad de foco y responsive; prueba de contrato nueva para navegación y permisos.
- Publicación de PWA v0.3.24 mediante actualización de versión y caché v055; sin migraciones de Supabase ni pérdida de datos.

### 2026-10-25 — Ilustraciones tridimensionales en la portada v0.3.25
- Se reemplazan los cuatro emojis de Preparación, Verificación, Control de Cargas y Administración por ilustraciones 3D propias de mercancías/palet y lector, checklist, documentos y almacén, respectivamente.
- SVG locales en `assets/home/*-3d.svg`, incluidos en la precaché PWA para uso sin conexión. Conservan los cuatro IDs, los manejadores, los permisos por perfil y el diseño responsive.
- Versionado 0.3.25 y caché v056 con pruebas de existencia y de rutas de imágenes. Sin tocar INVENTA, Supabase, lógica de mercancías ni documentación original de Business Central.

### 2026-10-25 — Portada con recursos 3D reales de INVENTA (v0.3.26)
- Decisión del usuario: usar exactamente los recursos gráficos diseñados previamente en INVENTA, no recreaciones SVG. Fuente verificada en `josegude-ux/INVENTA-/main/assets/menu/{inventory-3d,consult-3d,management-3d,settings-3d}.webp`.
- KONTROLA referencia esos archivos públicos directamente sin modificarlos: Preparación inventario, Verificación consulta, Control de Cargas gestión de almacén y Administración gestión más engranaje. El código de INVENTA no se modifica.
- CSS replica la proporción de las tarjetas de INVENTA. La caché SW v057 intenta conservar los recursos externos para uso sin conexión después de la primera carga; si la red impide precargarlos, no bloquea la instalación. NOTA: las ilustraciones dependen de su URL pública original; pendiente de copia binaria local si se requiere independencia total.
- Preservados los ID, funciones, permisos y datos. PWA v0.3.26, pruebas y documentación actualizadas en mismo commit.

### 2026-10-25 — Ilustraciones 3D exclusivas KONTROLA v0.3.27
- Por decisión del usuario, no se reutilizan imágenes de INVENTA ni se repite la misma ilustración en diferentes tarjetas: se han creado cuatro escenas 3D nuevas y distintas.
- Nuevas ilustraciones WebP con transparencia en `assets/home/kontrola-{preparacion,verificacion,control-cargas,administracion}-3d.webp`: picking con escáner, inspección de mercancía, expedición con camión y panel administrativo.
- Se elimina del HTML toda referencia a los recursos WebP remotos de INVENTA; en la PWA se sustituye la precarga remota por precarga local en la caché `kontrola-integral-v058`. Las cuatro imágenes se sirven sin conexión tras la instalación.
- Se conservan identificadores de botones, control de permisos, selección de almacén, rutas y operaciones. Tests exigen cuatro archivos WebP reales con contenido diferente y precarga en el Service Worker.
- Actualización v0.3.27 de `version.json`, `src/config.mjs`, `index.html`, `package.json` y `package-lock.json` y documentación en el mismo commit. Supabase e INVENTA no se modifican.

- Ajuste de prueba: la ausencia de referencias externas de INVENTA se comprueba con cadena literal para evitar interpretaciones ambiguas de la barra `/` en expresiones regulares.

### 2026-10-25 — Recuperación de Preparación, visibilidad de datos y Volver uniforme (0.3.28)
- Incidencia comunicada: el usuario ve todos los contadores a cero y Preparación abre una interfaz diferente de la acordada. Consulta **solo lectura** de Supabase confirmó 14 cargas existentes (13 publicadas y 1 preparada), todas en COR_01_COR; no hubo borrado general ni se modifica la base de datos.
- Se restaura la regla de fase 1: al **seleccionar una carga publicada para Preparación**, `kontrola_iniciar_preparacion` registra automáticamente la apertura en el servidor y cierra la preparación anterior del mismo operario, conforme a la función SQL existente. Al abrir cargas finalizadas, cerradas, asignadas a otra persona o desde **Consultar cargas / Historial** no se inicia reloj ni se escribe nada.
- Cronómetro visual calculado desde `preparacion_inicio` confirmado por Supabase; el tiempo se mantiene en el servidor al navegar, se actualiza mientras se ve el detalle y se detiene visualmente al finalizar. En caso de error se muestra aviso claro y botón de reintento; no se simula un inicio exitoso.
- Se conserva filtrado por pasillos, referencias, unidades, PDF Business Central original y hoja procesada; nunca se marcan líneas de picking en KONTROLA.
- `Mi actividad` especifica siempre el almacén consultado, expone errores de RPC en lugar de enseñar falsos ceros, avisa cuando el almacén seleccionado no tiene cargas y añade control para actualizar. Sin acceso legítimo a un almacén no se muestran sus datos.
- Se crea un solo botón **«← Volver»** fijo arriba a la izquierda en `topbar`, visible en todas las vistas operativas salvo inicio. Conserva las rutas de retorno existentes: cargas, detalle, verificación, historial, administración (padre correcto) y ajustes. Los botones anteriores se mantienen internamente, ocultos para evitar duplicación. El visor de hoja procesada mantiene su propio Volver, ahora sticky.
- Sin SQL ni migraciones ni modificaciones a INVENTA o Business Central. `docs/CONTINUIDAD.md` y pruebas de contrato se actualizan en el mismo commit; release coherente v0.3.28, SW v059. Pendiente validación manual en Android/iOS de navegación, reloj y cambio de almacén.

### 2026-10-26 — Corregir confusión de almacenes y Preparación (v0.3.29)
- Fotos recibidas: Ferrol seleccionado en Preparación y Verificación; comprobación SQL confirma 14 cargas de A Coruña y ninguna de Ferrol. No se perdió la base de datos.
- Ambas pantallas muestran el almacén activo, distinguen un almacén vacío de una búsqueda sin coincidencias y reinician filtros antiguos al reabrir.
- El texto de Preparación indica el inicio automático del reloj al seleccionar una carga publicada; Consulta sigue sin mutaciones.
- Actualización PWA 0.3.29, caché v060, pruebas y continuidad en el mismo commit. Sin modificaciones de Supabase ni INVENTA.


## 2026-10-26 — Identidad comercial VISURA PREPARA (propuesta en rama independiente)

- La marca matriz definida por el usuario es VISURA. KONTROLA pasa a denominarse comercialmente **VISURA PREPARA**; INVENTA pasa a **VISURA INVENTA**. Los nombres internos de código, RPC, base de datos, repositorio y URL permanecen intactos.
- Esta rama cambia exclusivamente textos e identidad vectorial provisional de interfaz, favicon/manifest y versión de caché PWA; conserva las ilustraciones 3D propias de las funciones y todas las pantallas operativas. No modifica Supabase ni Business Central ni MOVENTA.
- **Pendiente de integración de activos oficiales**: el usuario facilitó `VISURA_Identidad_3D(1).zip` con imágenes tridimensionales definitivas de VISURA MATRIZ, INVENTA y PREPARA. Las imágenes binarias aprobadas no están incorporadas a este commit; no presentar la migración visual como terminada hasta copiarlas, referenciarlas y verificar formato PWA.
- Verificación ejecutada antes de commit: comprobaciones de cadenas y preservación de rutas técnicas; pendiente CI completa y revisión móvil. Este avance no autoriza fusionar ni desplegar.
- Próximo paso: incorporar PNG/WebP aprobados (uno exclusivo por producto), comprobar instalación/actualización PWA y revisión en iPhone/Android/Windows.

- Corrección de coherencia: v0.3.30 sincronizada entre package/lock/config/interfaz y test de navegación; caché independiente `kontrola-integral-visura-v061` para actualizar PWA. CI de PR pendiente tras el commit.

- Prueba adicional: referencias regex con puntos escapados en `tests/navigation.test.mjs` también sincronizadas con 0.3.30; queda pendiente confirmación de CI de GitHub.


### 2026-10-26 — Recursos 3D aprobados incorporados a la rama VISURA PREPARA
- Incorporada **la imagen exclusiva VISURA PREPARA**, derivada del paquete visual aprobado por el usuario, en `assets/brand/visura-prepara-3d.webp` (768 px). Aparece en la pantalla de acceso sin alterar botones ni funcionalidad.
- Iconos PNG 192/512 integrados y enlazados al manifest; iPhone usa apple-touch-icon PNG. La imagen de VISURA MATRIZ se conserva por separado en `assets/brand/visura-matriz-3d.webp` como recurso reservado: **no se muestra ni comparte imagen principal con PREPARA**.
- Caché actualizado a `kontrola-integral-visura-v062` para asegurar disponibilidad de los nuevos archivos en PWA. Continúan intactos los módulos de operario, administración, Supabase y BC.
- Pendientes: confirmar CI de este commit, instalación/actualización iPhone y Android, validación visual real. No fusionado ni desplegado.


### 2026-10-26 — Menú oficial VISURA PREPARA, PR #29 (parcial, NO desplegar)
- Rama `feature/visura-prepara-menu-oficial-20261026`, basada en `branding/visura-prepara-20261026`. PR borrador #29 sin fusionar.
- Modificados **solo textos visibles** de dos tarjetas: `openReview` pasa a «Control de Cargas» (mantiene verificación física); `openCargas` pasa a «Operaciones» (mantiene menú completo). `openPreparation` y `openAdmin` no cambian.
- Añadidas pruebas estáticas `tests/visura-menu.test.mjs` de IDs, títulos, imágenes de respaldo y precarga existente; pendiente confirmar ejecución en CI. No se han modificado los controladores de navegación.
- **Pendiente**: subir al repositorio los 4 WEBP aprobados y 4 originales del ZIP, sustituir las cuatro rutas de imagen, actualizar caché PWA y pruebas para los recursos definitivos, capturas reales y validación en dispositivos. No declarar completado. Los WEBP antiguos siguen visibles hasta integrar los oficiales.
- Sin cambios en Supabase, Business Central, roles, usuarios o datos. Los commits parciales de etiquetas/pruebas se han hecho por separado; esta actualización de continuidad documenta el conjunto. En el commit final de integración se debe incluir también esta ficha.


### 2026-10-26 — Directiva maestra y continuación autónoma
- Registrada la orden del propietario en `docs/DIRECTIVA_DESARROLLO.md`: desarrollo autónomo dentro de límites de seguridad, sin Cursor, sin reiniciar, sin pedir permiso entre fases, sin merges/despliegues/borrados no autorizados.
- Test `tests/visura-menu.test.mjs` reforzado para verificar existencia de recursos y precarga PWA; ejecución CI aún no verificada. La PR #29 sigue en borrador.
- Estado de la integración visual: títulos y IDs conservados en el código; WEBP oficiales aún no subidos. No cambiar rutas antes de incorporar los recursos.
- Último commit de documentación de directiva anterior a esta actualización: `37fc7b2752a7eabc6511f77ddf2e5a6310a9dcc8`. Reversión: cerrar PR #29 sin fusionar; ninguna versión instalada ha sido modificada.


### 2026-10-26 — Comprobación del cableado de navegación (PR #29)
- Revisado `src/app.mjs` en la rama: `openPreparation` ejecuta `openLoadsMenu()`, `openReview` ejecuta `openReviewMenu()`, `openCargas` muestra `cargasMenuView` y `openAdmin` ejecuta `openAdminMenu("homeView")`. No se cambió ninguno de esos controladores.
- Ampliada la prueba `tests/visura-menu.test.mjs` para detectar cambios involuntarios en esos cuatro manejadores. **Pendiente ejecución de la prueba y CI**; lectura del código no equivale a prueba funcional.
- Se confirmó que el ZIP de imágenes oficial está disponible localmente y contiene los cuatro WEBP y originales. El bloqueo es transferir binarios del contenedor local al conector GitHub, que no comparte acceso a archivos; no hay acceso Git de red desde el contenedor. No sustituir rutas ni precarga hasta resolverlo.
- Último commit de prueba antes de esta nota: `10187dcc4be816e3b874b285932ecfeffea16129`. Reversión: descartar PR #29 sin fusionar.


### 2026-10-26 — Validación adicional y sincronización de ficha de menú
- Se evaluaron directamente sobre el contenido de `src/app.mjs` los cuatro patrones de controladores de navegación que usa el test de menú; los cuatro coincidieron. Esta comprobación de patrones **no equivale a ejecutar** `npm test` ni a una prueba de navegación real.
- Corregida la ficha `docs/VISURA_PREPARA_MENU_OFICIAL_PENDIENTE.md` para reflejar que los títulos visibles ya están implementados; no repetir trabajo.
- Pendientes sin cambio: subida de ocho imágenes binarias, actualización de cuatro rutas y caché PWA, ejecución CI, capturas y validación real en dispositivos. Último commit anterior a esta entrada: `ba11aa144583f291614fa5683cef121d97d9cadc`. PR #29 en borrador, sin fusionar.


### 2026-10-26 — CI específica para menú oficial (sin despliegue)
- Se detectó que el workflow general `.github/workflows/ci.yml` no incluye ni la rama `feature/visura-prepara-menu-oficial-20261026` ni PR con base `branding/visura-prepara-20261026`; por eso no había ejecuciones asociadas a los commits de la PR #29.
- Creado `.github/workflows/visura-menu-ci.yml`, activado por push a la rama aislada y PR hacia la rama de branding, con permisos mínimos de lectura. Comprueba sintaxis de `src/app.mjs`, sintaxis de la prueba y ejecuta `node --test tests/visura-menu.test.mjs`. **No contiene pasos de publicación ni cambios de datos.**
- Commit del workflow: `7c6e79bb81253783a56f89f94261b02260f3f5d1`. A la hora de comprobar, la API todavía devolvía cero ejecuciones asociadas al commit; no declarar pruebas aprobadas.
- Pendiente: observar CI, corregir fallos, incorporar recursos oficiales binarios y validar en dispositivo. Reversión: no fusionar PR #29.


### 2026-10-26 — CI menú verificada
- GitHub Actions confirmó **success** en la ejecución `40254280063` (número 4), commit `aeea32a2ae545170b8b6d706fa99e4cd01be0ad3`, job `menu` completado satisfactoriamente, incluido paso «Verificar sintaxis y menu sin despliegue».
- La prueba comprueba tarjetas y recursos de respaldo actuales; **no verifica las imágenes oficiales todavía ausentes**, ni navegación real en dispositivos, ni el conjunto completo de pruebas de integración.
- Enlace de ejecución: https://github.com/josegude-ux/KONTROLA/actions/runs/40254280063
- Pendientes: transferencia segura de binarios oficiales, cambio de rutas y caché PWA, actualización de pruebas para nombres definitivos, CI final, revisión visual en dispositivos y fusión únicamente tras autorización. Reversión: PR #29 sigue aislada.


### 2026-10-26 — Ampliación de regresión en CI de PR #29
- El workflow aislado ahora ejecuta `node --test tests/*.test.mjs` en lugar de solo el test de menú; conserva `node --check src/app.mjs` y `node --check tests/visura-menu.test.mjs`. No ejecuta tests de integración PostgreSQL/Supabase y no despliega.
- Commit de ampliación: `0b343ba6476d9ff6986f8c3194a8746d61ebdc58`. La ejecución previa `40254280063` solo cubría el test de menú; **pendiente comprobar el resultado del nuevo workflow ampliado**.


### 2026-10-26 — Fallo de suite completa diagnosticado y corregido en CI
- La ejecución `40254682111` del workflow ampliado **falló**: 192 pruebas, 191 correctas, una fallida por `ERR_MODULE_NOT_FOUND: Cannot find package 'pdf-lib'` en `tests/pdf-real.test.mjs`. Las seis comprobaciones nuevas del menú pasaron.
- Causa: al ampliar la suite se omitió instalar dependencias; el workflow aislado solo configuraba Node. Se añadió `npm ci` antes de ejecutar pruebas, sin tocar lógica de la aplicación.
- Commit de corrección `632879bedbcb3c525a445161a2bcc034f61b752e`. **Pendiente comprobar nueva ejecución**; no declarar superada la suite hasta confirmarlo.


### 2026-10-26 — Suite unitaria completa superada (PR #29)
- GitHub Actions `40255277404` (ejecución #14) **success** para commit `ddf277c350d870b624787c33212965fca7808968`; job `menu`, instalación `npm ci` y paso de sintaxis/pruebas completados correctamente.
- Log revisado: **193 pruebas, 193 aprobadas, 0 fallidas, 0 omitidas**. Enlace: https://github.com/josegude-ux/KONTROLA/actions/runs/40255277404
- Alcance: suite Node de `tests/*.test.mjs` con dependencias instaladas; **no incluye integración PostgreSQL/Supabase**, recursos oficiales aún pendientes ni validación manual iPhone/Android/Windows.
- Reversión sin riesgo: no fusionar PR #29. La rama y caché de producción no se han modificado.


### 2026-10-26 — Comando de verificación estándar en CI
- El workflow de la rama aislada ahora usa `npm run check` (sintaxis de todos los `src/*.mjs` y suite completa `tests/*.test.mjs`), además de verificar la sintaxis del test específico. Sustituye comprobaciones parciales por el comando oficial del proyecto.
- Commit del cambio `3eab3dbcc3ac339dd0aa99965efea5261dc009f0`. La suite previa de 193 pruebas está aprobada; **la nueva ejecución de `npm run check` aún requiere confirmación**.


### 2026-10-26 — Endurecimiento de pruebas de menú
- GitHub Actions `40257146159` confirmó `npm run check` **success**: 193 pruebas aprobadas, cero fallidas, sintaxis de módulos superada. https://github.com/josegude-ux/KONTROLA/actions/runs/40257146159
- Se añadieron tres regresiones en `tests/visura-menu.test.mjs`: administración oculta por defecto, cuatro imágenes WEBP distintas y precarga offline explícita de las cuatro imágenes en `sw.js`.
- Commit funcional `3274d135754aef43b611e5bcc2b2a9cfc30339c8`. **Pendiente verificar CI tras añadir las tres pruebas.** No se han sustituido imágenes ni cambiado roles o datos.


### 2026-10-26 - CI de regresion de menu confirmada
- Ejecucion GitHub Actions 40257289902 (#26), commit 0a069a5fd3411539dfed7bc0ed8fbd1fb1928d2a: SUCCESS.
- Log verificado: 196 pruebas aprobadas, cero fallidas, cero omitidas. Paso de sintaxis y regresion completo.
- Se corrigieron dos patrones regex defectuosos en los tests nuevos; no hubo cambios funcionales de aplicacion en ese commit.
- Permanecen pendientes la incorporacion de las cuatro imagenes oficiales, pruebas visuales en dispositivos y pruebas de integracion de base de datos. No fusionar ni desplegar sin autorizacion.


### 2026-10-26 - Nuevas regresiones de accesibilidad
- Se añadieron dos tests: las cuatro tarjetas son botones de tipo button (sin submit accidental), y las ilustraciones decorativas permanecen ocultas a lectores de pantalla con alt vacio.
- Commit 7f7db9f59ea9c746c1fa7e1adfab4b262f73e9f0. Requiere nuevo resultado CI; la ejecucion #26 valida los 196 tests anteriores, no estos dos adicionales.


### 2026-10-26 - Integracion visual empaquetada y verificada localmente
- CI run 40257410504, commit f0e11dfeef4fc5759428a63a31512a34c15ecff6: 198/198 pruebas aprobadas, 0 fallidas.
- Paquete local VISURA_PREPARA_INTEGRACION_MENU_LISTA.zip verificado: cuatro WEBP oficiales, cuatro originales y script aplicar_menu_visura_prepara.py.
- Script probado contra un checkout de prueba con cuatro tarjetas, sw.js y tests: termino correctamente y reemplazo referencias, cache v062 a v063 y copio recursos. No equivale a ejecutar la suite completa sobre el repositorio real.
- PENDIENTE: transferir binarios a la rama de GitHub y ejecutar pruebas y revision visual sobre el resultado real. No se han subido los recursos ni fusionado PR.


### 2026-10-26 - Integrador oficial versionado en rama de trabajo
- Commit 898754396099fd3613e97a9824005318fa47aa91: nuevo scripts/integrar_menu_oficial.py. Lee el ZIP oficial local, valida cabeceras WEBP y cuatro tarjetas, conserva los controladores y sustituye solo imagenes, precarga y version de cache v063. Incluye originales sin tocar imagenes anteriores ni base de datos.
- Commit a9fdbd40b8720c3fbd24ea113e91407066cf9c40: el CI verifica sintaxis del integrador Python ademas de npm run check.
- La transferencia de binarios desde el ZIP local a GitHub aun no se ha realizado. El script requiere el ZIP en el equipo donde se ejecute y no hace commits ni despliegues. Pendiente CI de estos cambios.


### 2026-10-26 - CI #42 y validacion de originales
- GitHub Actions run 40257649349: SUCCESS, 198 pruebas aprobadas, cero fallidas, integrador Python sin errores de sintaxis.
- El integrador ahora exige exactamente cuatro imagenes originales y formatos JPEG/PNG antes de modificar archivos (commit 9a2b7dd0a753815a1d682840c0ba833110216346).
- Las imagenes oficiales siguen pendientes de transferencia a la rama. Ningun despliegue ni merge realizado.


### 2026-10-26 - Pruebas aisladas del ZIP superadas
- Ejecucion GitHub Actions #52 (run 40258056434): paso de pruebas completado correctamente. 3 pruebas Python de integracion ZIP (correcta, idempotencia, rechazo de originales incompletos o WEBP corruptos) y 198 pruebas Node: 201 comprobaciones, 0 fallidas.
- El integrador y los tests estan versionados en la rama de PR #29. Los archivos binarios oficiales todavia NO estan incorporados a GitHub; la comprobacion de la interfaz real queda pendiente.
- No se ha fusionado ni desplegado.


### 2026-10-26 - Integracion oficial del menu confirmada en rama de desarrollo
- GitHub Actions run 40259310736 (#79) finalizo SUCCESS. Logs confirman 198 pruebas Node aprobadas, cero fallidas y paso de guardado de recursos completado.
- Verificacion directa de GitHub API: existen los cuatro WEBP (preparacion 155418 bytes, control-cargas 150310, operaciones 146572, administracion 159802) y las cuatro imagenes originales en assets/home/originales/.
- Verificacion directa de index.html y sw.js: las cuatro tarjetas referencian sus WEBP oficiales y las cuatro estan en precarga PWA. Cache actual kontrola-integral-visura-v063.
- Estado: integracion visual en rama de desarrollo verificada y pruebas automatizadas superadas. No se ha fusionado ni desplegado. Pendiente revision visual real en iPhone/Android/Windows y revisar destino/estado de PR antes de preparar version candidata.
- Esta entrada sustituye las notas anteriores que decian que los binarios seguian pendientes: esos datos quedaron desactualizados antes de la ejecucion #79.


### 2026-10-26 - Revalidacion posterior a la actualizacion de PR
- GitHub Actions run 40259434611 (#81) SUCCESS en el HEAD dca81657ae921a7a1588692e6d3271a8c081f894. Los siete pasos principales, incluida integracion, regresion y guardado, terminaron correctamente.
- `npm run check`: 198 pruebas aprobadas, 0 fallidas.
- PR #29 sigue abierta en borrador; titulo y descripcion actualizados para reflejar el estado real y los pendientes.
- Revision de controladores: `openPreparation` -> `openLoadsMenu()`, `openReview` -> `openReviewMenu()`, `openCargas` -> `switchView("cargasMenuView")`, `openAdmin` -> `openAdminMenu("homeView")`; la tarjeta de Administracion sigue oculta por defecto hasta validar rol, como exige la prueba existente.
- Pendiente externo: capturas visuales reales y prueba manual de interaccion en iPhone, Android y Windows. No se han hecho merge ni despliegue.


### 2026-10-26 - Checklist de aceptación visual multidispositivo
- Añadido `docs/REVISION_VISUAL_MENU.md` (commit d1def38a4c57916a757235591d1a49ac8eb5df5b) con comprobaciones manuales para imágenes, acciones, visibilidad por rol, PWA sin conexión y dispositivos iPhone/Android/Windows.
- No se ha afirmado que la validación visual esté realizada: requiere probar la app en dispositivos reales y registrar capturas/evidencias.
- No merge ni despliegue.


### 2026-10-26 - Pruebas de integridad de imagenes oficiales
- Commit 1f25ac2477f09e12c32c90ab0d88b38bbec4ba80: añadidas dos pruebas automatizadas para verificar cabeceras RIFF/WEBP y tamaño razonable de las cuatro imágenes referenciadas, además de exigir la versión de caché PWA v063.
- La ejecución de GitHub Actions para este commit todavía no aparece; no se declara superada esta ampliación hasta disponer del resultado.
- La validación visual manual en dispositivos reales sigue pendiente. Sin merge ni despliegue.


### 2026-10-26 - Añadida prueba visual automatizada en Chromium
- Se añadió `tests/visual-menu.spec.mjs` y un paso CI para probar el menú en Chromium con viewport de escritorio (1440x1000) y móvil (390x844), verificar visibilidad de las tarjetas operativas, carga real de las imágenes, ausencia de desbordamiento horizontal y guardar capturas como artefacto de Actions.
- La prueba de navegador es complementaria a los 200 tests Node; no equivale a una prueba en iPhone/Android físicos.
- Últimos cambios CI/tests: 4318f36, 6e1b1ea, 5395288. Pendiente resultado de Actions antes de afirmar que la prueba visual automatizada pasa.
- No merge ni despliegue.


### Correccion del smoke visual Chromium
- Ejecuciones #100/#101 detectaron que la vista del menú permanece oculta sin una sesión autenticada, como corresponde al control de acceso. La prueba visual no debe iniciar sesión ni llamar a Supabase; se ajustó para mostrar la vista solo en el DOM del navegador de prueba, sin modificar backend ni saltarse autenticación en la aplicación real.
- Commit de la corrección: 52d79bc7d13e13c6adf81875d69b8ea88e9261dc. Pendiente CI.


### 2026-10-26 - Correccion del smoke visual Playwright
- Las ejecuciones #105-#107 fallaron porque `tests/visual-menu.spec.mjs` no llegaba a mostrar `#homeView`; la correccion anterior se habia documentado pero no se habia aplicado realmente al archivo de prueba.
- Aplicada la correccion en una rama nueva por las reglas de proteccion de GitHub: `fix/visura-menu-playwright-auth-20261026`, commit 65947fef90012ddcd46cc8b8b9da3ca2b66f19c1.
- La prueba quita el login y muestra el shell/home exclusivamente dentro del DOM del navegador de test; no autentica contra Supabase ni cambia la aplicacion de produccion.
- Pendiente ejecutar CI en PR; no merge ni despliegue.


### Ajuste de CI para PR #36
- Se detectó que la PR #36 no disparaba Actions: el workflow solo aceptaba PR con base `branding/visura-prepara-20261026`, y además forzaba checkout de la rama principal de feature, ignorando el head de la PR. Se corrigió el destino del trigger para `feature/visura-prepara-menu-oficial-20261026`, se dejó checkout del commit de PR predeterminado y se eliminó el paso que hacía push automático desde el workflow.
- Commit: 4f14275bc0f30684ecef2285495407b1b605e5a2. Pendiente CI de PR #36.


### 2026-10-26 - Smoke visual Chromium superado
- GitHub Actions #109, run 40260656625, commit `fc359a8ce6593699258a2e2aebd540220126ceaf`: SUCCESS. Los pasos de regresión y `Prueba visual Chromium en escritorio y móvil` terminaron correctamente.
- La ejecución #108 también terminó SUCCESS, pero no había artefactos de capturas porque el paso de subida se había retirado al corregir el YAML. Se ha añadido de nuevo la publicación de `artifacts/*.png` con retención de 7 días (commit `ea300efb06360a7a4b3e5982543af287790b1f2c`); falta confirmar las capturas en la siguiente ejecución.
- Esta comprobación se ejecuta en Chromium emulado con viewports de 1440x1000 y 390x844; no sustituye validación física en iPhone/Android.
- PR #36 permanece abierta y en borrador. No merge ni despliegue.


### 2026-10-26 — Revisión de capturas de la ejecución #112
- La ejecución #112 terminó en SUCCESS y produjo el artefacto `visura-prepara-menu-visual` (ID 12624117728).
- Capturas revisadas: escritorio 1440×1184 y móvil 390×1134. La corrección CSS elimina el solapamiento visual observado en la ejecución #110: el texto queda en una columna izquierda y las ilustraciones en una zona separada a la derecha.
- La regresión y el smoke visual de Chromium pasan. Administración no se muestra sin rol en esta vista de prueba, conforme al estado inicial de la tarjeta.
- La prueba usa viewports emulados; siguen pendientes las pruebas manuales en iPhone, Android y Windows físicos, así como la validación de navegación de cada acción en una sesión de prueba real.
- Sin merge ni despliegue. Rama activa: `fix/visura-menu-playwright-auth-20261026`.

- Añadida además una aserción geométrica a `tests/visual-menu.spec.mjs` para fallar si el área de texto se extiende sobre el área de la ilustración en cualquiera de los dos viewports (commit `b6526c323e7ce3181db1544576602592e9b120a7`). Pendiente resultado de CI para esta nueva aserción.

- La ejecución #114 detectó un falso positivo de la aserción geométrica en escritorio: la estructura de columnas de escritorio permite cajas DOM que se solapan geométricamente aunque la captura no muestre solapamiento visible. Se limitó esa aserción específica al layout móvil, donde se había observado el defecto real. Commit `cc49100a3abe5570df226b5e9ff1deceb5575b0d`; pendiente CI.


### 2026-10-26 — Preparación de revisión física con la base de datos actual
- El propietario ha indicado usar la base de datos Supabase actual para la revisión física; no crear una base paralela ni cambiar la conexión configurada.
- Añadido `docs/PRUEBA_FISICA_BASE_ACTUAL.md` (commit `e25b945343607fafa0399f90725c983001b065e5`) con el protocolo para iPhone, Android y Windows, límites para evitar operaciones destructivas y evidencias a registrar.
- CI más reciente #118 (`1867f8d47f1d30bff49b63ee3ba7d93f13d898ce`) SUCCESS: regresión, Chromium escritorio/móvil y subida de capturas completadas. Artefacto disponible en Actions.
- Bloqueo para probar físicamente la rama: `pages.yml` despliega al mismo GitHub Pages público; ejecutar ese workflow con la rama de corrección podría sustituir la app publicada. No se ha desplegado. Hace falta un alojamiento/URL de preview aislada o un método temporal seguro.
- No se han hecho cambios ni escrituras en Supabase durante esta preparación; sin merge ni despliegue.


### 2026-10-26 — Estrategia de validación acordada con el propietario
- El propietario prefiere actualizar la aplicación ya instalada y no mantener una segunda PWA de prueba.
- Mantener la app publicada actual intacta mientras se completan las validaciones automatizadas y se prepara un paquete de actualización reversible. No crear una PWA paralela como requisito del flujo.
- Antes de publicar la actualización en la misma URL, verificar que se conserva el proyecto Supabase configurado, que no hay migraciones ni operaciones destructivas y que el service worker/cache versiona los recursos correctamente. Mantener disponible el commit de la versión actual para revertir el código si fuera necesario.
- La publicación definitiva sigue requiriendo autorización expresa según la directiva permanente; la preferencia por actualizar la misma aplicación no autoriza por sí sola a desplegar producción.


### 2026-10-26 — Auditoría previa a actualizar la PWA instalada
- Configuración verificada en rama: `src/config.mjs` apunta al proyecto Supabase actual de KONTROLA (`oevetnszmfxeukcncwji`), con clave publicable, bucket `kontrola-pdfs` y versión `0.3.30`. No se cambió la configuración.
- `sw.js` usa caché `kontrola-integral-visura-v063` y `manifest.webmanifest` conserva `start_url: ./`, `display: standalone` y marca VISURA PREPARA. La actualización sobre la misma URL conserva la identidad de la PWA instalada, sujeto al comportamiento del navegador.
- La configuración declara expresamente que INVENTA usa otro backend independiente: NO afirmar que ambas aplicaciones ya comparten base Supabase.
- CI #120 SUCCESS. CI #121 estaba en curso al realizar esta auditoría.
- Antes del despliegue definitivo: revisar que el workflow Pages use la rama candidata, obtener SHA de la versión publicada para reversión, verificar ausencia de migraciones/destrucción y pedir aprobación explícita de publicación.


### 2026-10-26 — Regresiones automáticas para actualización sobre la PWA instalada
- Añadido `tests/pwa-update-safety.test.mjs` (commit `0395a584f0cc0d1ee130bb4771096e322e253d22`), integrado automáticamente en `npm run check` por el patrón `tests/*.test.mjs`.
- Pruebas nuevas: mantener el proyecto Supabase y bucket actuales; rechazar claves secretas en configuración pública; conservar identidad `start_url` y `display` de la PWA; precarga de cuatro imágenes; coherencia entre `package.json`, `version.json` y `APP_VERSION`.
- Estas pruebas no hacen peticiones a Supabase ni modifican datos. Pendiente confirmar resultado del CI del commit.


### 2026-10-26 — CI #125 verde; preparación de actualización instalada
- Ejecución #125, run `40261784658`, commit `c3f3ddc7f80d0c4b8716ab31def5f4c2cecdccdf`: SUCCESS. Pasaron regresión completa, prueba visual Chromium escritorio/móvil y publicación de capturas.
- La prueba nueva de seguridad de PWA ya verifica la clave publicable real, sin falsos positivos por comentarios.
- Rama de despliegue actual configurada en `pages.yml`: `cursor/verificacion-fisica-cargas-8ba0`, SHA `980fd9df854ce6accc59f569657661601f8c096e` al consultar GitHub. El SHA de la rama no prueba por sí solo cuál es el despliegue activo; verificarlo antes de publicar.
- La actualización de la misma PWA requiere una publicación deliberada y controlada sobre la URL actual. No se ha lanzado `pages.yml`, ni merge, ni cambios de Supabase. Próximo control: establecer SHA del despliegue publicado, estrategia de reversión y autorización explícita de despliegue.


### 2026-10-26 — Referencia de reversión identificada
- GitHub Actions `Publicar KONTROLA de pruebas (GitHub Pages)` run `40244107243` (25/10/2026) terminó SUCCESS en build y deploy, con commit `980fd9df854ce6accc59f569657661601f8c096e` de rama `cursor/verificacion-fisica-cargas-8ba0`.
- Este commit es una referencia verificada de una publicación exitosa, no una prueba independiente de que el navegador de cada dispositivo siga sirviendo esa versión en este instante.
- CI candidato #126, commit `c7bc7e82b89d9fd1ad0d39a9e9a5a7adc33e99cc`, SUCCESS. No se ha ejecutado publicación desde rama candidata.
- Plan de reversión: conservar el SHA anterior, comprobar que el código puede volver a desplegarse mediante el workflow existente, y validar versión/actualización de caché en dispositivos tras una publicación autorizada. Revertir código no revierte automáticamente cambios de datos, por lo que no introducir migraciones en esta actualización visual.


### 2026-10-26 — Versión candidata de actualización sobre instalación existente
- Se ha preparado la candidata `0.3.31` en `src/config.mjs`, `package.json`, `version.json` e `index.html` para que el botón «Buscar actualizaciones» distinga la candidata de `0.3.30`.
- Se ha incrementado la caché de `sw.js` de `v063` a `v064` para evitar mezclar imágenes/recursos de la versión anterior; se ha ajustado la prueba correspondiente en `tests/visura-menu.test.mjs`.
- La URL y clave publicable de Supabase, el bucket y las RPC permanecen sin cambios; no hay migraciones ni operaciones sobre datos.
- Estos cambios son solo de rama candidata: no desplegar hasta aprobar expresamente la actualización de la misma PWA. Confirmar CI verde del HEAD final antes de publicar.


### 2026-10-26 — Prueba visual sin espera de red externa
- La ejecución CI #131 superó las regresiones pero permaneció largo tiempo en la etapa visual. Se ha sustituido `waitUntil: networkidle` por `domcontentloaded` en `tests/visual-menu.spec.mjs`; la prueba ya verifica expresamente que cada imagen esté cargada y tenga ancho natural positivo, por lo que no necesita esperar a que queden inactivas todas las conexiones de la aplicación.
- Añadido `timeout-minutes: 20` al job visual para evitar ejecuciones indefinidas.
- Cambio limitado a pruebas/CI, sin alterar comportamiento de producción ni Supabase. Confirmar CI de la rama tras estos commits.

- CI #134: las regresiones pasaron y la prueba móvil pasó; la prueba visual de escritorio falló porque `#openPreparation` quedó oculto tras mostrar el menú, compatible con una redirección asíncrona de autenticación. Se ha aislado `src/app.mjs` solo en el test visual (Playwright `page.route`), manteniendo DOM, CSS e imágenes reales, para que la verificación de maquetación no dependa del estado de sesión. Pendiente validar en CI. No afecta al código desplegable.


### 2026-10-26 — Tarjetas de Preparación: desglose de bultos y matrícula (rama de trabajo)
- Solicitud recibida a partir de una captura de la pantalla «Preparación de cargas»: el valor mostrado como «Bultos» debe ser el **desglose calculado**, no el total simple del documento; destacar visualmente la matrícula del camión.
- Rama `feature/visura-prepara-desglose-bultos-matricula-20261026`, creada desde la versión publicada `abd86aaf9db700494a4be8bcb54a8cf21fc0738d`. **No desplegar ni integrar a producción sin revisión y validación.**
- `src/report.mjs` exporta `desglosarBultos(productos)`, reutilizada por el informe de totales por pasillo y la tarjeta; suma solo cantidades positivas y finitas **por unidad**, sin añadir cajas a botellas. La tarjeta lee `r.productos` del panel de cargas ya consultado; no añade llamadas ni cambios en Supabase.
- Si no existen líneas válidas, se muestra «Sin desglose disponible», sin reutilizar `r.bultos` o inventar totales. La matrícula destaca como placa tipográfica en `#loadsList`; la modificación de estilos queda acotada a la vista de preparación.
- Incluidas pruebas unitarias y comprobaciones de integración de UI. Pendiente confirmar CI sobre PR y aceptación visual en dispositivo, antes de considerar actualización de versión/caché y publicación.

- Validación: en CI de PR #38, sintaxis, regresión JS y dependencias pasan; el test SQL `tests/integration/workflow.sql` fallaba también en la rama publicada, porque esperaba cierres en la fecha fija `2026-10-25` pero `kontrola_resumen_zona` cuenta cierres por `cerrada_en::date` (fecha efectiva de ejecución). Se sustituyeron **solo** las dos fechas del test por `current_date`, conservando intactas las migraciones SQL y la lógica de cierre. Pendiente verificar CI completo tras la corrección.

- CI PR #38: ejecuciones #438 y #439 completas **SUCCESS** después de corregir la fecha fija de las pruebas SQL; el producto no ha cambiado su lógica de cierre. Se prepara candidata **0.3.32** actualizando conjuntamente `src/config.mjs`, `package.json`, `package-lock.json`, `index.html`, `version.json`, `sw.js` (caché `kontrola-integral-visura-v065`) y expectativas de pruebas. Solo rama de desarrollo: no modificar rama publicada, no desplegar Pages ni alterar Supabase. Pendiente confirmar nueva CI de candidata y revisión en móvil.


### 2026-10-26 — Total de bultos y zona de palés en tarjetas de preparación
- Petición: mostrar el **número total de bultos encima del peso**, mismo peso y tamaño tipográfico, conservando el desglose a la izquierda. Mostrar **palés necesarios para la carga junto a la matrícula**.
- Rama `feature/visura-prepara-total-bultos-palets-20261026` creada desde la rama publicada, commit `f158776528026cc1531d02697ccb3410589453b4`. Sin despliegue ni cambios en Supabase.
- `src/report.mjs` incorpora `totalBultosDelDesglose`: suma cantidades positivas ya totalizadas por unidad, o devuelve `null` si no hay datos; evita confundir ausencia con cero. `src/app.mjs` muestra `N bultos` encima de `N kg`, con estilo de 16px/800 en escritorio y 15px/800 en móvil, sin modificar la lógica de preparación.
- Zona visual de palés adyacente a matrícula en tarjetas de preparación. Se muestra un número únicamente cuando el panel aporte un campo explícito, entero y no negativo `palets_para_carga`; en otro caso muestra «—». **No convertir `palletsLarge`/`palletsSmall` del PDF (huecos del camión) en palés necesarios**: esa fuente representa capacidad, no unidades de palés realmente requeridas.
- **Pendiente indispensable**: confirmar con el usuario si desea huecos para palés del camión o palés realmente necesarios; la versión actual no expone un campo `palets_para_carga` en el RPC, por lo que no debe anunciarse como completado el dato numérico. No publicar hasta definir su fuente y validación.
- Añadidas pruebas del total, la ausencia de datos, el posicionamiento visual y la prohibición de derivar palés desde huecos del camión. Pendiente CI de PR.


### 2026-10-26 — Observaciones de cabecera y huecos del camión (candidata 0.3.33)
- Petición confirmada: los palés de la tarjeta son **huecos del camión**, NO palés ya preparados. Mostrar G (grandes) y P (pequeños) junto a matrícula. Admitir un total simple **solo si el campo Huecos plts. camión del PDF trae ese número explícito**. Nunca inferir pequeños si solo consta 8G.
- Leer **Observaciones** exclusivamente de la cabecera del PDF, con textos fragmentados o en líneas consecutivas; cortar al encontrar otros campos y no capturar descripciones de mercancía. Mostrar «LPxx-xxxxx - observación» mediante `textContent` (sin HTML dinámico). Si no hay observaciones, mostrar solo código.
- `src/core.mjs`: lectura de Observaciones y preferencia por el campo explícito «Huecos plts. camión» frente al código del camión. `src/admin.mjs`: persistir `observaciones`, `huecos_palets_grandes`, `huecos_palets_pequenos`, `huecos_palets_total` en `carga_datos`, incluso tras reabrir una revisión. `src/app.mjs`: leer exclusivamente los campos opcionales de la revisión documental **vigente** mediante consulta Supabase bajo RLS por almacén y código; no cambiar RPC ni tablas. En caso de fallo de consulta, mantener las cargas visibles y avisar del dato opcional no disponible.
- **Limitación temporal y de datos previos:** los PDF publicados ANTES de incorporar este lector no guardaron observaciones ni huecos en `carga_datos` y mostrarán «—» o solo código. No modificar revisiones existentes, ni sustituir archivos de cargas iniciadas, ni backfill sin procedimiento seguro y autorización.
- Las pruebas nuevas incluyen casos sintéticos de cabecera, campo de huecos sin clases, prioridad de la etiqueta explícita, ausencia de datos y PDFs realmente generados y procesados por PDF.js. CI de código previa a bump satisfactoria: #455. Pendiente CI de candidata completa y revisión visual en móvil.
- Preparada candidata **0.3.33**, caché PWA `kontrola-integral-visura-v066`, con coherencia en configuración, interfaz, paquete, version.json, service worker y tests. **No se ha fusionado ni publicado**; no cambios en SQL/Supabase. Referencia publicada anterior: `f158776528026cc1531d02697ccb3410589453b4` (0.3.32).


### 2026-10-26 — Recuperación opcional de cabeceras antiguas (sin escritura)
- Captura de Ajustes de la app instalada confirma VISURA PREPARA **0.3.33** en línea. El usuario indica «Sigue» y se abre una mejora segura: recuperar observaciones y huecos de palés desde PDF originales **ya almacenados** de cargas anteriores a 0.3.33, sin modificar ningún registro de Supabase y sin reimportar ni publicar los PDF.
- Rama `feature/visura-prepara-lectura-cabeceras-antiguas-20261026`, basada en producción `550fffe318ad688c2e7fa13870a7473bfa99ebdc`. El usuario sigue usando 0.3.33, no hay despliegue de esta rama.
- Botón **«Leer cabeceras antiguas (máx. 5)»** visible en Preparación y Consulta. Ejecuta una lectura estrictamente voluntaria, secuencial, de hasta cinco PDF para los registros del almacén autorizado que coincidan con el filtro activo. Las tarjetas existentes mantienen su selección normal, sin botones anidados ni inicio inadvertido de preparación.
- `src/legacy-header.mjs`: candidatos limitados a rutas documentales vinculadas al código LP y a cargas carentes de los metadatos nuevos; valida coincidencia exacta de código y almacén al leer; rechaza cantidades no enteras e inválidas. La descarga usa `client.storage.from(PDF_BUCKET).download` con permisos Supabase (RLS), seguida de lectura local con `parsePdfFile`. Nunca ejecuta escrituras, RPC de edición, cambios de revisión ni desplazamientos de cronómetro.
- Los valores se muestran solo en la memoria del dispositivo actual; caché temporal en memoria mientras dura la sesión, borrada al cerrar sesión. El mecanismo respeta cambios de usuario/almacén y cancela resultados de cargas si cambia el ciclo de lectura. Fallos individuales no ocultan las cargas, se informa del número de procesados y errores. No descargar masivamente: máximo cinco por clic.
- El helper nuevo se añade al precache PWA. Pruebas de selección limitada, rutas válidas, filtrado, pertenencia a almacén, integridad, ausencia de escrituras y no interferencia con la preparación. Pendiente CI y aceptación visual; **no se ha modificado Supabase, su esquema ni sus datos**.

- Candidata **0.3.34**: versión sincronizada en paquete, app, interfaz, version.json y caché PWA `kontrola-integral-visura-v067`; el helper `src/legacy-header.mjs` queda precargado también sin conexión. PR #40 en borrador. La primera prueba CI falló por sintaxis de un test recién añadido, ya corregida; ejecución posterior #468 en verde. Pendiente validación completa de la candidata antes de fusionar o publicar.


### 2026-10-26 — Diseño responsivo tras capturas reales de iPhone (candidata 0.3.35)
- Capturas en dispositivo: bultos y peso coinciden con el desglose de mercancía (ejemplo 379 = 12 BARRIL + 131 BOTELLA + 228 CAJA + 7 PACK + 1 UD); la matrícula y los huecos aparecían **apilados** por competir con el peso en la primera fila. Las hojas de preparación con cinco columnas resultaban muy comprimidas en el iPhone.
- Rama `feature/visura-prepara-responsive-cargas-hoja-20261026`, desde producción `57e23ce03521124e36a0a05c24cde7518cee9d96` (0.3.34), sin alterar datos, cálculos, backend, RLS ni tiempos de preparación.
- En `src/app.mjs`, los cuatro elementos de tarjeta `info, summary, vehicle, bundles` son hermanos bajo el botón original. En `styles.css` se ordenan como grid: primera fila código/metadatos + total/peso; segunda fila a **ancho completo** matrícula y huecos en **dos columnas**, tercera fila desglose. Mantener toda la tarjeta como el botón original.
- La hoja `buildPreparationReport` mantiene idénticos tabla semántica, líneas, orden y subtotales; **solo `@media screen` y ancho máximo 700px** la presenta por fichas legibles (referencia + cantidad/unidad, descripción completa y ubicación). La impresión y PDF conservan el formato tabular existente.
- Los huecos «—» en capturas corresponden a cargas antiguas sin metadatos guardados. La opción manual «Leer cabeceras antiguas (máx. 5)» debe verificarse por el usuario; la mejora de diseño no inventa valores ni hace lecturas automáticas.
- Candidata **0.3.35**, caché `kontrola-integral-visura-v068`, misma URL/PWA/bucket Supabase, pruebas adicionales `tests/responsive-preparation.test.mjs`. Pendiente CI/PR y publicación controlada. Punto de recuperación versión 0.3.34: `57e23ce03521124e36a0a05c24cde7518cee9d96`.


### 2026-10-26 — Imprimir/Guardar PDF en iOS 27, candidata 0.3.36 aislada
- Incidencia de usuario en hoja procesada LP26-19519: botón sin respuesta en PWA iPhone; 0.3.35 llamaba a `window.print()` y existe una regresión reportada en iOS 27 standalone.
- Rama `fix/visura-prepara-ios27-pdf-compartir-20261026` aislada desde `7bfbb5e0da26eba63b4763b4a88e15aa3393588a` (última publicación 0.3.35). NO modificar la rama desplegada, no publicar sin consentimiento explícito.
- Se añade `src/print-pdf.mjs`: PDF A4 verdadero generado en memoria, con referencias, cantidades, pasillos, ubicación, cabecera y portada de lotes. La PWA de iOS comparte el archivo como PDF mediante la hoja nativa. Safari/otros navegadores mantienen `window.print()` y la maquetación anterior.
- Diferencia conocida: el PDF generado localmente para iOS tiene formato legible por fichas, NO reproduce píxel a píxel el diseño tabular impreso por Safari. Requiere aceptación real en iPhone, 107 líneas y lote de 20, incluido guardado en Archivos/OneDrive.
- Versión candidata 0.3.36, caché v069, módulo precargado, nuevas pruebas de PDF. El acceso actual a Supabase, los PDF antiguos y los datos no cambian. No borrar, migrar, fusionar ni publicar sin autorización. Verificar CI en la PR.

- CI candidata 0.3.36 PR #45, run `40319026072`: 1 regresión de aserción fija de versión (`navigation.test.mjs` esperaba 0.3.35). Se corrige expectativa de versión/caché y etiqueta visible `appVersion` en un segundo commit; no se ha modificado ningún dato ni rama operativa. Comprobar CI de nueva HEAD antes de considerar validada.


### 2026-10-26 — Casuística de palés ya cargados y capacidad pendiente, 0.3.37 candidata
- La revisión vigente de LP26-19519 (23/10) carece de los tres campos de huecos; dato ausente, no un fallo de posición.
- Preguntar al abrir la carga si el camión lleva cargas anteriores. El operario indica su ocupación y los palés requeridos ahora. El cálculo resta ambas cantidades a la capacidad, diferenciando grandes (G) y pequeños (P) cuando el PDF declara sus formatos. No se inventan equivalencias ni se convierten bultos en palés.
- En una carga nueva publicada la preparación y su reloj se inician solo tras confirmar que el resultado es viable por huecos. El mensaje no certifica peso, estabilidad, distribución, seguridad ni cargas por eje.
- Si faltan metadatos, se intenta descargar en modo solo lectura un PDF autorizado y recuperar su cabecera. Si no contiene huecos, el operario los teclea. Sin capacidad completa no se muestra viabilidad.
- Las cantidades manuales permanecen en memoria de sesión por cuenta/carga/almacén y desaparecen al cerrar sesión. No se persisten ni se comparten entre dispositivos. Persistencia real sería una fase de backend aparte.
- Rama aislada `feat/visura-prepara-pales-previos-viabilidad-20261026` parte de la corrección de impresión PR #45, SHA `c12375bc1a5967dc046216e63da58c8ec8e73345`. Versión candidata 0.3.37 y caché v070. El usuario autorizó publicar tras integrar y comprobar esta función; hacer HEAD y CI y validar despliegue. Sin SQL, cambios en Supabase ni eliminación de datos.

- Primera CI del commit d46c352b detectó una expectativa obsoleta en tests/print-pdf.test.mjs, v069 frente a v070. Corregida en el siguiente commit. No se cambia el módulo PDF.

- Segunda CI run `40321901143` para HEAD `bd3f68799dc3a6b1e66cb9433cb4740f284c900e` terminó SUCCESS (240 pruebas, 0 fallos). Se añade defensa adicional directamente en `startCurrentPreparation` para impedir iniciar por botón de reintento si el formulario ha pasado a estado no viable. Revalidar CI del nuevo commit.


### 2026-10-26 — Corrección de huecos de camión sin datos: candidata 0.3.38
- El usuario mostró 0 huecos en LP26-19519, LP26-19531 y LP26-19525. Consulta directa de Supabase: las tres revisiones vigentes no tienen `huecos_palets_grandes`, `huecos_palets_pequenos` ni `huecos_palets_total`. Conteo de todas las 14 cargas: 0 revisiones con esos campos. No asumir que cero es capacidad real del camión.
- La lectura local de cabeceras antiguas puede dar 0 desde el PDF. La nueva tarjeta distingue `Sin dato` (ninguna fuente acreditada) y `0 en PDF · confirmar` (cero recibido de la lectura local), sin inventar capacidad. La revisión vigente tiene prioridad. El RPC inicial no se considera prueba de huecos (sus valores por defecto no equivalen a una revisión).
- Los datos manuales siguen entrando al abrir la carga y se mantienen en sesión sin persistencia. No altera PDF, Supabase, reloj de preparación ni cálculos de bultos.
- Versión candidata 0.3.38; caché v071; rama independiente desde HEAD operativo e453c6e9cd04b7e92daea54bb95bcc53c2fb5c16. Validar CI antes de publicar y documentar autorización; no borrar cargas.


### 2026-10-26 — Verificación con PDF auténtico de LP26-19519: formato 6G 1E y Observaciones (candidata 0.3.39)
- El usuario proporcionó 19519.pdf, de 5 páginas, en conversación; NO se ha incorporado el archivo privado a GitHub. En su primera página consta Camión CR2554JRM IVECO 100E-VOLDIS-6G 1E, Huecos plts. camión 0 y Observaciones CENTRO 1*. E significa europeo, confirmado expresamente por el usuario. El 0 es un campo distinto del código de capacidad y no debe reemplazar 6 G / 1 E.
- El parser extrae códigos G/E o G/P expresos del camión, sin convertir E a P. Añade el nuevo atributo JSONB de revisiones huecos_palets_europeos (para importaciones futuras) y el mismo dato en recuperación local PDF. No hay SQL ni migración de base de datos.
- El formulario de capacidad distingue segundo formato E/P, precarga E cuando procede, y vacía las cifras del segundo formato al cambiar su tipo. Nunca suma G y E ni equipara E y P; sigue exigiendo cantidad actual y ocupación previa al calcular.
- Observaciones se mostraban en la tarjeta principal, pero faltaban en títulos de detalles/verificación. Se añaden y se consulta la revisión vigente de forma segura para los listados de verificaciones. El lector ya no arrastra encabezados Devoluciones unidad de la tabla de productos. Para la carga aportada el texto correcto es CENTRO 1*.
- Pruebas sintéticas de cabecera G/E con campo huecos 0, G/P heredado, y recorte de Observaciones contra tablas; no publicar ni integrar en rama operativa sin prueba CI y comprobación en iPhone. Rama: fix/visura-prepara-cabecera-6g-1e-observaciones-20261026; deriva de 0af3acd73deefd2e0b1b1fcad32989ace0ddcf2b. La versión operativa sigue 0.3.37 e453c6e9cd04b7e92daea54bb95bcc53c2fb5c16.

- CI PR #48 run 40331298852 (HEAD 950f1511): 248/250 pruebas; 2 fallos de regresión. Se corrige tolerancia horizontal de continuación de Observaciones (x135 frente a origen x12, manteniendo filtro de encabezados ajenos como Devoluciones) y se actualiza una aserción heredada para el método de enriquecimiento vigente sin modificar datos ni lógica de negocio. Revalidar HEAD posterior.

- CI del segundo commit cd9cdd02eeac54c494abd81717b90bd2695f8575 verificada en GitHub Actions run 40331602194: 250/250 pruebas, 0 fallos, migraciones de base de datos en simulación y concurrencia correctas. PR #48 abierta DRAFT, no fusionada; rama operativa sigue 0.3.37. Falta autorización inequívoca para desplegar esta nueva versión, y prueba en iPhone con PDF auténtico. El PDF de origen sigue únicamente en el chat y no se subió a GitHub.

### 2026-10-26 — Preparación del piloto con usuarios, seguridad y cargas anteriores (candidata 0.3.40)
- Solicitud del propietario: seis operarios (MANUEL RIVADAS, DIEGO PARDO, RODOLFO, DIEGO BUDIÑO, GROS, JAVI SÁNCHEZ) y cuatro supervisores (RÍOS, BRUNO, GUDE, FERMÍN). En Supabase hay una cuenta de administrador y cero usuarios de esas listas. El CHECK vigente de usuarios_app.rol permite solo administrador/operario: supervisor NO está habilitado. No simular habilitación ni asignar privilegios admin. Archivo docs/USUARIOS_PILOTO_VISURA_PREPARA.md detalla el proceso seguro.
- Interfaz administrativa muestra los diez nombres como plantilla PENDIENTE DE ALTA. No son cuentas ni credenciales reales. La clave personal puede establecerla una persona que haya autenticado previamente una invitación privada, usando supabase.auth.updateUser desde Ajustes; no se solicita ni guarda por administración. Antes del alta se requieren datos personales de contacto para invitaciones verificables y una migración de rol/permisos de supervisor revisada.
- Se retira prepClock y su setInterval (contador de duración) en interfaz, y los indicadores de duración individual visibles para administración. Se conservan exclusivamente las marcas temporales técnicas del servidor para control de estado/historial, sin exhibir velocidad al operario. Se cambian textos de reloj y productividad.
- En Control de Cargas, administración recibe acceso directo a Cargas antiguas; consulta no destructiva con selección de códigos anteriores a hoy, y archivo/restauración solo tras un gesto y confirmación expresos. No se borra, resetea, archiva ni restaura automáticamente ninguna carga.
- Imagen 3D de control de cargas: nuevo candidato generado como asset local para evaluación. No se incorpora al repositorio ni se publica una imagen no validada en el flujo operativo; conservar estética VISURA coherente y diferenciada.
- Rama aislada feat/visura-prepara-piloto-usuarios-sin-cronometro-20261026 derivada de PR #48 HEAD 72805631754a6b2c05cf2414886dbcee3c870a40, base operativa anterior 0.3.37. No aplicar migración de Supabase, no publicar sin CI y revisión del alcance e identidad de operarios.

- 26/10/2026 ajuste visual: las seis tarjetas del submenú Control de Cargas sustituyen emoji por imágenes 3D existentes y exclusivas de VISURA PREPARA. Se reutilizan solo archivos ya verificados dentro de assets/home, sin introducir binarios no revisados ni modificar INVENTA. La nueva ilustración 3D generada en chat se mantiene candidata sin integrar todavía.


### 2026-10-26 — Recuperación segura tras interrupción de streaming (PR #48 / PR #49)

**Fuentes verificadas directamente en GitHub el 26/10/2026; este bloque prevalece sobre hipótesis o estados parciales anteriores, no sustituye el historial.**

- **Rama operativa (publicada):** `cursor/verificacion-fisica-cargas-8ba0`, HEAD `e453c6e9cd04b7e92daea54bb95bcc53c2fb5c16`, `version.json = 0.3.37`. Despliegue GitHub Pages run [40322360898](https://github.com/josegude-ux/KONTROLA/actions/runs/40322360898) concluyó `success` para ese SHA. Durante esta recuperación no se modificó, fusionó ni publicó la rama operativa.
- **Corrección conjunta 6 G / 1 E / Observaciones:** [PR #48](https://github.com/josegude-ux/KONTROLA/pull/48), **OPEN DRAFT**, branch `fix/visura-prepara-cabecera-6g-1e-observaciones-20261026`, HEAD `72805631754a6b2c05cf2414886dbcee3c870a40`, candidata `0.3.39`. CI run [40331901312](https://github.com/josegude-ux/KONTROLA/actions/runs/40331901312), en ese mismo SHA: **250 tests, 250 pass, 0 fail, 0 skipped**. La ejecución fallida previa 40331298852 se corrigió antes de esa HEAD; **no** interpretarla como fallo actual.
- **Secuela para piloto:** [PR #49](https://github.com/josegude-ux/KONTROLA/pull/49), **OPEN DRAFT**, branch `feat/visura-prepara-piloto-usuarios-sin-cronometro-20261026`, HEAD antes de esta anotación `73a467647a390dabc9d642554294f23924dbbd02`, candidata `0.3.40`. Su cadena de padres es `73a4676` → `f44c8fb` → `7280563` (PR #48). **No recrear ni aplicar la PR #48 por separado sobre PR #49**. CI run [40344141613](https://github.com/josegude-ux/KONTROLA/actions/runs/40344141613) en HEAD `73a4676`: **252 tests, 252 pass, 0 fail, 0 skipped**. La PR #49 incluye eliminación del contador visible, plantilla de 10 nombres, contraseña personal solo para usuarios ya autenticados, selección administrativa de cargas antiguas y recursos 3D ya existentes; ninguna de esas funcionalidades está desplegada en 0.3.37.
- **Verificación de la corrección PDF:** `src/core.mjs` contiene `extraerFormatoCamion` que reconoce un código `6G 1E` independientemente de `Huecos plts. camión: 0`. `src/legacy-header.mjs` transporta `huecos_palets_europeos`, `src/logic.mjs` lo presenta como E y `src/palet-viabilidad.mjs` lo distingue de P. `tests/vehicle-header.test.mjs` prueba G/E, G/P, cero independiente y Observaciones sin contaminarse con la tabla siguiente; `tests/legacy-header.test.mjs` prueba recuperación de cabecera; `tests/navigation.test.mjs` prueba los títulos. **Las pruebas emplean objetos o textos sintéticos, NO prueban la importación extremo a extremo del archivo PDF original de cinco páginas en iPhone.**
- **Observaciones:** para LP26-19519 la cabecera original descrita por el usuario indica `CENTRO 1*`; la corrección evita arrastrar `Devoluciones unidad` al título, sin modificar cargas antiguas en Supabase. E significa **palé europeo** según confirmación expresa del usuario. No inventar conversiones entre G, E y P.
- **Autenticación real pendiente:** último estado comprobado en Supabase (lectura previa del mismo día): una cuenta administradora activa; ninguno de los 6 operarios ni 4 supervisores estaba creado. `usuarios_app.rol` solo acepta `administrador` u `operario`, no `supervisor`. Se documentaron nombres en `docs/USUARIOS_PILOTO_VISURA_PREPARA.md`; mostrarlos NO crea usuarios ni les otorga permisos. La elección de contraseña en Ajustes requiere sesión autenticada por un método de invitación individual verificado. Nunca habilitar inscripción anónima por nombre ni asignar supervisor = admin. Hace falta diseño probado de rol, alta individual y RLS antes del piloto multiusuario.
- **Gestión de cargas antiguas:** PR #49 aporta búsqueda y selección administrativa sin borrado; archivar/restaurar sigue requiriendo confirmación. Conservar pendientes/incidencias e histórico y la política de retención mínima de 90 días. NO usar la prueba con cargas anteriores para limpiar la BD.
- **Visuales:** PR #49 reemplaza iconos emoji del submenú por ilustraciones VISURA PREPARA existentes de `assets/home/`; una imagen nueva generada en chat continúa solo como candidata, NO subida ni publicada.
- **Límites de esta recuperación:** pruebas verdes = validación automatizada, no validación visual en iPhone, ni archivo PDF real, ni sesión multiusuario real, ni aprobación para fusionar/desplegar. Los registros de errores SQL esperados dentro de suites de rechazo no contradicen el resumen CI de cero fallos; no se ejecutó ningún flujo real destructivo.
- **Próximas operaciones independientes y seguras:** (1) validación de lectura de PDF real y Observaciones en dispositivo autorizado, sin reimportaciones ni escrituras; (2) revisión del flujo seguro de invitaciones y permisos supervisor con pruebas en rama aislada, sin tocar Auth real; (3) validar usabilidad visual del nuevo menú. No fusionar la PR #48 ni la #49, no publicar, no alterar Supabase ni datos reales sin autorización específica. Releer siempre HEAD, CI y este bloque antes de futuras operaciones.

**Punto de recuperación:** `PR #48 HEAD 72805631754a6b2c05cf2414886dbcee3c870a40`; `PR #49 HEAD anterior a esta anotación 73a467647a390dabc9d642554294f23924dbbd02`; `operativa HEAD e453c6e9cd04b7e92daea54bb95bcc53c2fb5c16`. Verificar el HEAD nuevo de PR #49 tras guardar este añadido documental.


### 2026-10-26 — Acceso directo a importar cargas (pendiente de integrar)
- Incidencia comunicada: la persona administradora no encontraba un botón de importación en el panel/listado de cargas. El flujo de importación **ya existe** en Administración → Importar PDF; estaba accesible desde «Documentos y administración» y oculto por rol a operarios.
- Cambio propuesto en rama **fix/visura-prepara-acceso-importar-cargas-20261026**, derivada de la PR #49 sin modificarla: acceso «Importar cargas» en Control de Cargas y junto al listado de cargas. Ambos se muestran **solo** con `ownProfile.rol === "administrador"` y reutilizan `openAdminMenu` / `adminController.open` (pestaña 0); no añaden un segundo importador ni nuevas escrituras.
- Mantiene importación manual de PDF desde Business Central, lote validado (máximo 20), revisión explícita y publicación separada, sin modificar roles, backend, SQL, archivos originales ni datos de Supabase. Los operarios no reciben acceso.
- Incluye regresión de navegación/permisos en `tests/navigation.test.mjs`. La rama/PR es candidata para revisión: **no fusionar ni desplegar sin aprobación y pruebas de CI**, más validación en dispositivo con cuenta administrativa. La instalación actual 0.3.37 no contiene todavía estos accesos directos.

### 2026-10-26 — Nomenclatura de PDF C/F por almacén (candidata aislada)
- Decisión del propietario: todos los códigos LP son globalmente únicos entre A Coruña y Ferrol; nunca habrá dos cargas con el mismo número LP. No cambiar la clave primaria de `kontrola_cargas.codigo`.
- PDF renombrado **`F19711.pdf`** = Ferrol (`COR_02_NAR`) y carga **`LP26-19711`**; **`C19711.pdf`** = A Coruña (`COR_01_COR`) y carga **`LP26-19711`**. Son ejemplos independientes de nomenclatura, no una solicitud de crear ambos códigos simultáneamente.
- Reconocer nombres `F/C` + 4–6 cifras + `.pdf` (indistintamente mayúsculas). El prefijo determina el almacén, el número es el sufijo LP, y **el año se extrae de la `Fecha carga` interna cuando no existe un LP explícito en el PDF**. Nunca deducir el año solo del reloj del dispositivo. Conservar soporte para PDF con LP completo y nombres antiguos.
- Si almacén de cabecera, almacén solicitado, código LP escrito en el PDF o año de fecha contradicen la nomenclatura, rechazar sin reservar ni publicar. Si el documento no lleva almacén detectable, permitir clasificar por prefijo con advertencia y revisión administrativa obligatoria. Si no hay año acreditado ni LP explícito, rechazar con mensaje específico.
- Se corrige además el vaciado indebido del selector de cargas pendientes tras importar un lote: refrescarlo desde Supabase, sin tocar carga almacenada ni publicar automáticamente. Conserva máximo 20 PDF, revisión y publicación expresas.
- Desarrollo en rama `feat/visura-prepara-pdf-por-almacen-f-c-20261026`, derivada de PR #51; **aún no instalada ni desplegada**. Nueva prueba `tests/filename-convention.test.mjs` con F/C, compatibilidad, contradicciones y ausencia de año. Validar CI y PDF auténtico antes de integración o despliegue, y no repetir la importación mientras esté pendiente.


---

## Bloque 01 — 27/10/2026: Errores individuales en la importación múltiple (rama aislada)
- **Rama:** `feat/visura-prepara-b01-importacion-aislada-20261027`; base exacta `9a48ce9cef6c9afd5f4e719dec83406103c0f7f6` (PR #52). No confundir con el trabajo UI/responsive de PR #61 ni con la integración paralela PR #60.
- **Defecto confirmado:** la función UI validaba todos los archivos a la vez antes del bucle y rechazaba el lote entero por una única extensión, MIME o tamaño inválidos.
- **Cambio acotado:** `validarSeleccionPdf` solo limita la selección; `validarArchivoPdf` se ejecuta dentro del `try` por documento y los errores se recogen individualmente; se conserva la API estricta anterior `validarLotePdf`. La carga de los otros documentos continúa y el resumen no autopublica.
- **Tests:** ampliados `tests/import-batch.test.mjs` y CI aislada de Node en `.github/workflows/visura-prepara-b01-import-ci.yml`. Verificar resultado del HEAD antes de declarar cerrado.
- **Sin cambios:** original PDF, lectura F/C, código LP, hashes, RPC, SQL, datos reales, BC, verificación, autorización y publicación.
- **Pendiente importante del Bloque 01:** borradores provisionales de PDF sin identificación LP siguen bloqueados actualmente antes de la reserva; requieren diseño del contrato SQL y política de identidad confiable, sin códigos LP inventados. Ver `docs/BLOQUE_01_IMPORTACION_ERRORES_POR_ARCHIVO.md`.
- **Siguiente paso:** verificar CI y PR aislada; analizar contrato de reserva/identificación y escoger implementación segura sin solapar otras ramas. Prohibido fusionar, desplegar o tocar Supabase real sin autorización.


---

## 2026-10-27 · Bloque 01 — Auditoría segura de reintentos por SHA-256
- **Base:** PR #62, commit `8e63ca63270baa90b96e78e90ef819011f6c64fa`. **Rama aislada:** `feat/visura-prepara-b01-auditoria-reintentos-20261027`. PR #61 responsive y PR #60 flujos paralelos continúan separadas.
- **Hallazgo:** el mismo PDF (SHA-256) era correctamente detectado como repetido pero no existía un evento duradero por cada repetición.
- **Cambio:** `supabase/proposals/kontrola_auditoria_reintentos_b01.sql` conserva firma, permisos y contratos de `kontrola_reservar_importacion` y añade exclusivamente un `kontrola_importacion_eventos` por cada repetición válida de la **misma carga**, con administrador, fecha servidor, código, hash, nombre y tamaño. No cambia el PDF ni crea revisiones nuevas. No aplicar a Supabase real sin autorización.
- **Pruebas:** `tests/integration/import-attempt-audit.sql` y bandera de pruebas optativa `KONTROLA_TEST_REINTENTOS=1` en `tests/integration/run.sh`, solo en PostgreSQL efímero/local con guardia `kontrola_test`. Workflow aislado `.github/workflows/visura-prepara-b01-reintentos-ci.yml`. CI de código `41312e91ea79eda354612e9716f70a7dc130ed35`: [run 40482284968](https://github.com/josegude-ux/KONTROLA/actions/runs/40482284968) **SUCCESS**; volver a confirmar HEAD posterior a documentación.
- **Importante:** los hash asociados a otro código LP siguen bloqueados (auditoría de rechazos necesita transacción separada); no confundir con borradores sin LP, aún pendientes. Ver `docs/BLOQUE_01_AUDITORIA_REINTENTOS.md`.
- **Siguiente tarea:** verificar CI/PR sin fusionar, estudiar contrato seguro de borradores provisionales no identificados y continuar con tareas seguras independientes de Bloque 01 sin inventar Verificación física detallada.


---

## Bloque 01 — Provisionales sin código LP verificado (27/10/2026)
**Rama:** `feat/visura-prepara-b01-borradores-provisionales-20261027`, derivada exactamente de commit `cac3294f7e0305b49bd3466643bcdfae15c6b0de` (PR #63). PR #62 importación por archivo es base; PR #61 responsive y PR #60 paralelismo se mantienen separadas. No fusionar/desplegar ni tocar datos reales.

**Defecto comprobado:** el campo `kontrola_importaciones.codigo` exige un LP válido y su RPC rechaza cualquier documento no identificado, impidiendo conservarlo para revisión administrativa.

**Implementación propuesta sin aplicación:** `supabase/proposals/kontrola_pdf_provisionales_b01.sql` propone una tabla privada separada por SHA-256 único y original protegido en Storage; solo Administración puede reservar y descargar PDF, completarlo como pendiente o identificarlo manualmente con LP, almacén y evidencia cotejada con BC. La promoción es atómica a una `kontrola_importaciones` en `revision_requerida`, **nunca a una carga publicada**, conservando hash/ruta y registrando correcciones/evidencia. `src/admin.mjs` y `index.html` muestran bandeja, descarga, campos de identificación y confirmación; `styles.css` adapta formulario a escritorio/tablet/móvil. Los PDF erróneos por corrupción siguen siendo errores, no borradores falsos. No se modifican las operaciones ni el Bloque 02.

**Pruebas:** Node `tests/provisional-drafts.test.mjs`; SQL aislado `tests/integration/provisional-drafts.sql`; flag `KONTROLA_TEST_PROVISIONALES=1` sobre guardia `kontrola_test` y PGHOST local, CI `.github/workflows/visura-prepara-b01-provisional-ci.yml`. El primer ciclo de custodia y RLS sin promoción tuvo [CI SUCCESS 40483566089](https://github.com/josegude-ux/KONTROLA/actions/runs/40483566089); al incluir identificación se detectaron errores de composición SQL y de delimitadores en fixture, ya corregidos en commits posteriores. **Es obligatorio volver a comprobar el HEAD más reciente antes de dar la promoción por validada**.

**Estado real:** trabajo guardado en GitHub, no instalado ni verificado con documentos de empresa o dispositivos reales. El original queda inalterado y solo Administración puede avanzar el estado.

**Siguiente tarea exacta:** verificar Node/PostgreSQL del HEAD sin errores, corregir fallos reproducibles, revisar casos límite de promoción y, después, documentar la PR en borrador. No aplicar SQL a Supabase sin autorización. Detalle: `docs/BLOQUE_01_BORRADORES_PROVISIONALES.md`.
