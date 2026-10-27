# VISURA PREPARA — Control administrativo de posiciones fijas
**27/10/2026 · implementación aislada NO DESPLEGADA**.

## Base, continuidad y alcance
Repositorio josegude-ux/KONTROLA, rama feat/visura-prepara-admin-posiciones-fijas-20261027. Base cursor/verificacion-fisica-cargas-8ba0 @ 042724a90b897c9c5d289c52cb36ed970bec9dde. Chat responsable 02 - VISURA PREPARA - Desarrollo Bloque 01.

No alterar PR #58, #69, #72, #75, main, otros módulos o repositorios. Reutilizar el concepto de informe de INVENTA, rama feature/admin-posiciones-fijas-informe-0303. No reutilizar ciegamente su COALESCE(stock,0): posiciones sin líneas BC solo valen cero si la exportación certifica explícitamente esa semántica.

## Archivos y funcionalidad propuesta
- src/fixed-position-report.mjs: clasificación pura por almacén, artículo, posición y lotes. Incidencias sin fija, cero, negativa e insuficientes; acumulación decimal exacta hasta seis posiciones.
- src/admin-fixed-positions.mjs: pestaña exclusiva Administración, indicadores de referencias únicas y posiciones, filtro por búsqueda/almacén/pasillo/zona/otras ubicaciones, escritorio en tabla, móvil en tarjetas, paginación de pantalla de 50 y exportación CSV del conjunto filtrado completo.
- src/admin.mjs: integración mínima con pestañas, limpieza de sesión y RPC administrativa.
- tests/fixed-position-report.test.mjs: pruebas ficticias.
- Impresión A4 horizontal: vista HTML imprimible y diálogo nativo para guardar PDF.

## Fuente de datos: contrato previo a integración

La UI llama a la RPC denominada kontrola_admin_posiciones_fijas con p_almacen y espera UN objeto JSON completo. Esta RPC NO está desplegada en el Supabase actual de PREPARA, y NO se debe activar allí mediante credenciales de INVENTA. Hasta aprobar y preparar un backend común seguro, la aplicación informa "no disponible".

Ejemplo de estructura del objeto JSON:
{
  "warehouse":"COR_01_COR",
  "meta":{"warehouse":"COR_01_COR","authorized":true,"stockComplete":true,
    "catalogComplete":true,"positionsComplete":true,"absentStockIsZero":false,
    "truncated":false,"sourceFile":"BC_COR_01_COR.xlsx",
    "importedAt":"2026-10-27T10:00:00Z"},
  "products":[{"code":"PRD001","description":"Artículo","unit":"UD"}],
  "fixed":[{"warehouse":"COR_01_COR","product_code":"PRD001","location_code":"A01-P01"}],
  "locations":[{"warehouse":"COR_01_COR","code":"A01-P01","aisle":"A01","zone":"Z"}],
  "stock":[{"warehouse":"COR_01_COR","product_code":"PRD001",
    "location_code":"A01-P01","lot":"L1","quantity":"0","unit":"UD"}]
}

Las banderas meta son certificaciones SERVIDOR, no valores de entrada del cliente. Si hay recortes a 1.000 registros, ausencia de un almacén autorizado, datos maestros parciales, stock BC sin confirmar, importación incompleta o datos de ubicaciones sin almacén inequívoco, no declarar completitud.

El servidor debe validar por petición: cuenta activa y rol administrativo seguro, permisos por almacén y RLS; origen de Excel completo y de un solo almacén; exclusión de datos físicos de recuento, diferencias, movimientos y filas ajenas; relaciones correctas de artículos-ubicaciones-lotes; paginación interna completa; cantidades numéricas exactas. RPC estrictamente de lectura, sin nuevas autorizaciones generales ni claves secretas en navegador.

Inventario histórico: INVENTA tenía catálogo y ubicaciones, KONTROLA sus cargas, en Supabase separados. El estudio existente docs/ESTUDIO_UNIFICACION_SUPABASE.md no equivale a unificación real. En INVENTA las tablas de posiciones fijas y ubicaciones no exponen hoy un almacén inequívoco; resolver eso ANTES de usar la misma ubicación en varios almacenes. No fusionar proyectos, copiar usuarios ni alterar Tanques. Unificación real sujeta a autorización separada.

## Seguridad y validación pendientes
- No se han tocado Supabase, Business Central, producción, usuarios ni permisos.
- La seguridad cliente depende además de una autorización RPC del servidor cuando exista; no basta ocultar la pestaña.
- La ausencia de línea no supone stock cero salvo política BC acreditada por el importador.
- CSV completo protegido frente a fórmulas maliciosas. XLSX nativo pendiente de evaluar infraestructura.
- El PDF imprimible necesita pruebas en Safari/PWA iOS y de multipágina.
- Probar con usuarios reales autorizados y no autorizados, cambios de almacén, volúmenes elevados, móviles/tablets/escritorio y regresiones de INVENTA/PREPARA.
- Revisar si se requieren más de seis decimales de BC antes de activar.
- Si la rama base avanza, revisar conflictos con ramas apiladas antes de integrar.


## Verificación actual de Supabase (27/10/2026, exclusivamente SELECT)
- Proyectos comprobados: INVENTA wlejxnpphysogrzcxjfh ACTIVE_HEALTHY; control-cargas-movil/PREPARA oevetnszmfxeukcncwji ACTIVE_HEALTHY; control-tanques-staging INACTIVE. Ninguna operación de modificación.
- En INVENTA, la importación BC actual corresponde a COR_01_COR: 3.041 de 3.041 líneas esperadas, 1.853 artículos y 794 ubicaciones, estado committed, actualizada el 24/10/2026 a las 13:38 UTC. Es una instantánea: no garantiza vigencia al imprimir ni que el catálogo represente absolutamente todas las referencias de BC. No afirmar que existen importaciones equivalentes por cada otro almacén.
- El esquema INVENTA mantiene bc_import_current como singleton global, no una importación activa independiente por almacén. El futuro backend debe garantizar importaciones completas y vigentes POR ALMACÉN antes de habilitar estadísticas. Una fila actual de COR_01_COR no puede respaldar COR_02_NAR u otros almacenes.
- INVENTA utiliza profiles; PREPARA utiliza usuarios_app. Se confirmó que fixed_positions y locations de INVENTA no tienen columna de almacén. La seguridad compartida precisa una correspondencia explícita de identidades, roles y ámbitos.
- RLS está activada para products, locations, fixed_positions, bc_import_batches, bc_import_current, bc_import_lines y profiles de INVENTA; esto no certifica que todas las políticas sean adecuadas para una aplicación PREPARA unificada.
- Se verificó que la RPC kontrola_admin_posiciones_fijas NO existe actualmente en PREPARA. Toda activación real sigue bloqueada hasta revisión y autorización específica.
- GitHub Actions de PR #76: ejecución 40520286960 SUCCESS con 300 pruebas JavaScript superadas, cero fallos, y pruebas SQL de control de cargas sobre PostgreSQL temporal correctas.

## Control de calidad y continuidad (27/10/2026, revisión adicional)

- Se comprobó la PR #76 en borrador contra `cursor/verificacion-fisica-cargas-8ba0`, sin fusión y sin tocar `main`.
- El motor y la interfaz incorporan validación por almacén, cobertura de ubicaciones y tratamiento explícito de importaciones antiguas, además de stock negativo, cero y lotes. `src/fixed-position-print.mjs` construye el informe A4 apaisado multipágina.
- La propuesta `supabase/proposals/visura_posiciones_fijas_central_rpc.sql` permanece **sin aplicar**. Requiere fuente compartida, catálogo y ubicaciones por almacén, perfiles/roles compatibles y autorización separada.
- El ensayo SQL se ejecuta en PostgreSQL temporal por el flujo específico `.github/workflows/visura-prepara-posiciones-fijas-ci.yml`. El CI general de PREPARA queda sin duplicación de esa prueba.
- `tests/fixed-position-visual.html` usa datos ficticios y el módulo real de interfaz. El flujo `.github/workflows/visura-prepara-posiciones-visual-ci.yml` prueba anchuras desktop/tablet/móvil, filtrado, cambio de almacén y genera un PDF A4 multipágina de prueba; **no** supone despliegue ni prueba de dispositivos físicos.
- En el commit `8fac9b7587e470bdd23a59ae32cac4e2638d94ac`, las tres validaciones publicadas están en **SUCCESS**: regresiones y SQL de cargas (run 40526295487), RPC aislada (run 40526295478), responsive/impresión (run 40526295576).
- No se ha aplicado ninguna migración, creado cuentas, unificado bases, desplegado PWA ni enviado datos a BC. No declarar el informe disponible en operaciones reales.

**Siguiente acción que requiere autorización y coordinación:** aprobar arquitectura de origen central, atribución única de ubicaciones/posiciones por almacén, mapeo de identidades/permisos, ensayos finales con datos reales autorizados y plan de reversión. Hasta entonces la RPC no existe en el Supabase operativo de PREPARA y su pestaña debe permanecer sin datos empresariales.

## Próximas acciones seguras
1. Ejecutar pruebas CI de propuesta y corregir fallos.
2. Comprobar impresión real y protección de rutas.
3. Preparar contrato y prototipo RPC sobre base descartable si la arquitectura central está decidida, sin ejecutar migraciones empresariales.
4. Entregar PR borrador para revisión. NO fusionar ni desplegar.

No reiniciar; no duplicar; no fusionar; no desplegar sin autorización.

## Entrega verificada y límites de producción — 27/10/2026

### Archivos nuevos y modificaciones
- src/fixed-position-report.mjs: motor de clasificación por artículo, posición, lotes y almacén; decimales exactos hasta 6 posiciones; evaluación explícita de datos insuficientes y antigüedad; mapas para evitar coste cuadrático.
- src/admin-fixed-positions.mjs y src/admin.mjs: pestaña de Administración, indicadores pulsables, filtros por almacén/referencia/pasillo/zona y existencia en reserva; tablas en escritorio, tarjetas móviles y exportación CSV sin límite por paginación.
- src/fixed-position-print.mjs: informe imprimible A4 apaisado con categorías, cabecera, procedencia, filtros, recuentos de referencias y posiciones, numeración de páginas y observaciones.
- supabase/proposals/visura_posiciones_fijas_central_rpc.sql: SQL de la futura función administrativa de SOLO LECTURA (security invoker). No se ha aplicado a ninguna base.
- tests/fixed-position-report.test.mjs y tests/fixed-position-print.test.mjs: motor, fuente, ausencia de cero ficticio, CSV seguro, datos obsoletos e impresión >1000 filas.
- tests/integration/fixed-positions-contract.sql y workflow visura-prepara-posiciones-fijas-ci.yml: ensayos de permiso por rol/almacén y verificación de importación en PostgreSQL 16 efímero.
- tests/fixed-position-visual.html y tests/fixed-position-visual.spec.mjs y workflow visura-prepara-posiciones-visual-ci.yml: cinco ensayos Chromium en 1440/820/390 píxeles, filtrado, cambios de almacén y generación PDF real multipágina. Fuente FICTICIA.

### Resultado probado
- CI KONTROLA: 311 tests Node aprobados, 0 fallidos; migraciones, concurrencia y regresiones SQL anteriores PASS (GitHub Actions 40526295487, commit 8fac9b7587e470bdd23a59ae32cac4e2638d94ac).
- RPC en base PG descartable: SUCCESS (GitHub Actions 40526295478).
- Chromium visual: cinco casos superados y artefactos de capturas/archivo PDF multipágina (GitHub Actions 40526295576).
- NO hay pruebas reales en Safari iPhone PWA ni aceptación con usuarios reales; Chromium no sustituye esas comprobaciones.
- No se han aplicado migraciones ni escrituras de Supabase, ni cambios en Business Central, ni modificaciones de permisos o despliegues.

### Condiciones de fuente central que NO se han activado
La RPC futura necesita un proyecto central con identidad administrativa autorizada y privilegios POR ALMACÉN, catálogo y lotes BC importados manualmente, y fuentes oficiales de posiciones y ubicaciones inequívocamente identificadas por almacén. PREPARA e INVENTA tienen aún dos proyectos Supabase independientes.

El SQL es deliberadamente una propuesta: hace referencia a relaciones futuras de visura_reporting y utiliza stocks y catálogo centrales. Debe existir una migración con correspondencia de usuarios, almacenes, RLS y vistas/relaciones probadas antes de cualquier instalación. No debe generarse una copia paralela de maestros sin aprobación.

Los resultados definitivos exigen stockComplete, catalogComplete, positionsComplete y locationsComplete acreditados; archivo y fecha, y que el conjunto no esté obsoleto. Falta de línea BC o ubicación no validada = datos insuficientes, salvo contrato acreditado de ceros omitidos.

### Pendientes que exigen autorización o un dispositivo real
1. Arquitectura central, equivalencia de identidades y mapeo de posiciones fijas por almacén: aprobación previa con backups y reversión; ningún merge implícito de bases.
2. Aplicación real de migraciones, RPC, grants y RLS con cuentas de prueba en ambos almacenes; requiere consentimiento específico.
3. Integración de la PR con la pila Bloque 01, fusión y despliegue; prohibidos sin aprobación expresa y revisión de solapamientos.
4. Validación física de Safari en iPhone/PWA, impresión y Guardar PDF.
5. XLSX nativo no incluido por falta de infraestructura de exportación bloqueada. CSV con BOM es compatible con Excel y no necesita librerías ni costes adicionales.

ESTADO: desarrollo aislado terminado y probado en simulación; sin desplegar ni conectar con datos empresariales reales. No afirmar funcionamiento productivo antes de completar las autorizaciones y las pruebas físicas.
