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

## Próximas acciones seguras
1. Ejecutar pruebas CI de propuesta y corregir fallos.
2. Comprobar impresión real y protección de rutas.
3. Preparar contrato y prototipo RPC sobre base descartable si la arquitectura central está decidida, sin ejecutar migraciones empresariales.
4. Entregar PR borrador para revisión. NO fusionar ni desplegar.

No reiniciar; no duplicar; no fusionar; no desplegar sin autorización.
