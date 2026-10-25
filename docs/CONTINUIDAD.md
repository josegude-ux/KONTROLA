# KONTROLA — Ficha maestra de continuidad

**Actualización:** 25 de octubre de 2026
**Repositorio:** https://github.com/josegude-ux/KONTROLA
**Rama principal del desarrollo en curso:** cursor/verificacion-fisica-cargas-8ba0
**PR de trabajo:** https://github.com/josegude-ux/KONTROLA/pull/2
**PR de Fase 1:** https://github.com/josegude-ux/KONTROLA/pull/1
**Versión del código de esta rama:** 0.3.8

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
