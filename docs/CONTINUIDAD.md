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

### 2026-10-25 — Migración de archivo propuesta, NO aplicada
- `supabase/proposals/kontrola_archivo_logico.sql`: metadatos, auditoría, RPC administrativa transaccional con bloqueo de fila, plazo de 90 días y validaciones de incidencias/dependencias.
- Es propuesta pendiente de revisión y aplicación; no cambia las RPC de lectura ni la interfaz. La herramienta de migración ha sido bloqueada.

### Revisión SQL defensiva
- Rechazar explícitamente `p_archivar IS NULL` para evitar restauración accidental.
- La propuesta no se ha aplicado ni validado en Supabase.

### Validación pendiente de archivo lógico
- Pruebas automáticas actuales no ejercitan la nueva RPC, porque SQL está en `supabase/proposals` y no en `supabase/migrations`.
- Antes de migrar: confirmar cierre definitivo, que las incidencias no se reabran, políticas RLS y auditoría de restauración; probar rollback en base aislada.

### Pruebas estáticas de contrato del archivo
- `tests/archive-sql-contract.test.mjs` verifica restricciones declaradas del SQL de propuesta. No ejecuta SQL ni sustituye integración con PostgreSQL/Supabase.

### CI de PR #11
- El workflow `.github/workflows/ci.yml` ejecuta tests en pull requests dirigidos a la rama operativa, no necesariamente en cada push de rama feature. Para validar el commit, comprobar ejecución de PR (merge ref) o solicitar revisión sin fusionar.

### 2026-10-25 — Requisito de verificación real
- La propuesta SQL bloquea archivo cuando una verificación se marcó finalizada sin ninguna línea verificada. No se ha ejecutado en Supabase.

### 2026-10-25 — Ampliación de contrato SQL
- Añadidas comprobaciones estáticas de verificación sin líneas, preparaciones abiertas, avisos activos y auditoría de restauración. Pendiente CI y pruebas SQL reales.

### 2026-10-25 — Consulta administrativa de archivadas preparada
- Añadida a la propuesta SQL la RPC `kontrola_listar_archivadas()`, solo administración y filtrada por almacenes autorizados.
- Aún no aplicada en Supabase; debe probarse junto con la migración antes de usarla.

### Revisión de estados de incidencias
- El esquema real limita estados a `pendiente`, `descartada` y `regularizada`. La política de archivo bloquea incidencias `pendiente`; las descartadas se consideran resueltas y no deben bloquear archivo por sí solas.
- SQL y prueba estática ajustados en la rama propuesta. No aplicado en Supabase.
