# VISURA · CP012 — Importación compartida hacia PRUEBA_3 R7 (LAB)

- Proyecto: VISURA — DESARROLLO Y COORDINACIÓN
- Módulo: 15 · PREPARA ALMACÉN / 215 · impresión. Coordinación 00
- Orden existente: VISURA-15-AUDITORIA-RECUPERACION-001
- Matriz: VISURA-00-AUDITORIA-RECUPERACION-001
- Distribución: VISURA-00-DIST-F2-001
- Checkpoint: VISURA-215-CP-PUENTE-COMPARTIDO-R7-20261121-012
- Fecha/hora Europe/Madrid verificada: 21/11/2026, 00:09:14 CET
- Base inmutable de main: 30e9c87b429c8d20f951edba251c081d3beb2447
- Rama de continuidad: lab/visura15-impresion-r7-ux-integracion-20261120
- Versión de app de origen: 0.3.53; variante: R7 fuente original embebida + adaptador de solo lectura
- Estado: INTEGRACIÓN LAB PARCIAL. NO GO PRODUCCIÓN. No merge/despliegue/SQL ni escritura sobre cargas.

## Cambio verificable desde CP011

1. Se mantiene el motor PRUEBA_3 R7 íntegro en `lab/visura-prepara-impresion-r7.html`. No se reprograman impresiones.
2. `src/visura-r7-shared-import.mjs`: consulta dos RPC existentes autorizadas: `kontrola_panel_cargas_impresion` y `kontrola_estado_impresion`. Selecciona automáticamente hasta 5 LP nuevas por vez; identifica las ya generadas en el servidor.
3. El adaptador descarga exclusivamente PDFs publicados del COR_01_COR autorizado desde Supabase Storage (RLS existente), verifica patrón de ruta, código LP y SHA256 frente al nombre hash y revalida sesión/almacén/estado antes de importarlos.
4. Entrega los File originales al input `#pdfs` del R7 intacto mediante DataTransfer y evento change. La importación sigue el flujo funcional original de R7; no se genera ni marca impresión compartida.
5. Pantalla `Administración → Impresión`: sección «Traer PDF desde VISURA» con lotes de 5 y opción explícita de mostrar generadas. Comprobación de ámbito usuario+almacén al abrir el iframe y antes de entregar archivos.
6. `src/admin.mjs` enlaza el adaptador con el flujo de administración, limpia al cerrar sesión y recarga al cambiar de almacén. `sw.js` precarga el módulo y dependencias R7.
7. `tests/visura15-r7-shared-import.test.mjs` añade pruebas documentales de selección, validación de rutas y ausencia de escrituras.

## Evidencias y pruebas nuevas

- 10/10 comprobaciones aisladas de sintaxis, alcance, validación, selección incremental, estructura de UI y uso exclusivo de lectura RPC/Storage.
- 5/5 escenarios simulados con navegador falso: descarga+evento File para R7; evitar LP generadas; rechazo ruta manipulada; cancelación por cambio de usuario; bloqueo COR2.
- Simulación con PDF ficticio y digest controlado; NO prueba con PDF BC real. NO se ha ejecutado el test runner Node de la rama ni Chromium/WebKit reales.
- Comparación GitHub verificada: main intacto, rama LAB 69 commits por delante y 0 detrás al registrar este checkpoint.
- No se han ejecutado migraciones, ni actualizado registro `kontrola_impresiones`.

## Bloqueos y alcance

- La sincronización implementada es de **lectura/importación VISURA → R7**. Las importaciones y marcas nuevas en R7 siguen locales por usuario+almacén y NO se sincronizan entre ordenadores.
- `kontrola_registrar_lote_impresion` comprueba fecha de carga BC mientras panel filtra por fecha de publicación: discrepancia histórica confirmada, no corregida en servidor.
- Destinos CORUÑA/FERROL y comentarios manuales carecen de contrato persistente acreditado en la tabla de cargas; propuestas SQL permanecen sin aplicar.
- La E2E con sesión real, PDF autorizado, WebKit/iPhone, Windows/Edge e impresión dúplex física sigue pendiente. NO GO producción.
- Duplicidad entre otros chats no verificable; búsqueda de este identificador en Drive realizada antes de publicar, sin coincidencias.

## Próximo paso

Validar este único puente con navegador real y dos sesiones autorizadas usando LP de prueba y PDF BC autorizado, sin escribir sobre datos de producción. Preparar homologación de sincronización inversa de LISTADO GENERADO y comentarios tras resolver permisos, idempotencia y discrepancia de fecha, sin reescribir el motor R7.
