# VISURA PREPARA 02 — recuperación y continuidad del informe de posiciones fijas (28/10/2026)

**Responsable:** chat 02 — informe administrativo PREPARA. **Repositorio:** `josegude-ux/KONTROLA`. **PR:** #76, DRAFT/OPEN, sin merge ni despliegue. **Rama exclusiva del informe:** `feat/visura-prepara-admin-posiciones-fijas-20261027`. **HEAD inicial recuperado:** `fb723501e60597f70197e59cc895818203d2403d`.

## 1. Fuente verificada y preservación

Se leyeron de GitHub la PR #76, `docs/CONTROL_POSICIONES_FIJAS.md`, motores, interfaz, exportadores, pruebas y CI; se recuperaron los contratos y referencias de INVENTA PR #22, #23, #24 y #25. El contrato V1 de PR #22 leído en `7e35f1a748343604166a63388d10fd4c415b8c61` se denomina `visura-prepara-fixed-read-v1`; el gateway `architecture/lib/prepara-fixed-read-gateway-seam.mjs` sigue siendo un **seam de laboratorio**, no un endpoint real ni autenticación real.

Se conserva íntegramente el cálculo de stock total por SKU/almacén sin multiplicarlo por asignaciones, incidencias sin fija/cero/negativo/insuficiente, ubicaciones no fijas, decimales BigInt (6 dígitos), filtrado completo y paginación solo visual, Administración responsive, CSV compatible con Excel, XLSX nativo de **dos** hojas (Resumen + Incidencias), PDF A4 apaisado multipágina y propuesta RPC SECURITY INVOKER **NO APLICADA**. INVENTA 08 mantiene por separado su XLSX de **una** hoja; INVENTA 07 es recuento físico sin teoría.

## 2. Desajustes comprobados y correcciones propias

1. **Antigüedad equivocada en interfaz:** `src/admin-fixed-positions.mjs` tomaba la antigüedad visible desde `importedAt`; la fuente de PR #22 exige `exportedAt` certificado. Se ha cambiado a fecha de exportación BC; se presentan por separado exportación, importación y publicación.
2. **Recepción poco estricta del nuevo contrato:** la UI aceptaba JSON compatible en forma, pero no exigía identificador V1, integridad de arrays/conteos, fechas, procedencia, lotes duplicados ni pertenencia de todos los registros al almacén. Nuevo módulo `src/fixed-position-contract-v1.mjs` y uso previo a `classifyFixedPositions`. Comprueba versión, `truncated=false`, certificaciones booleanas, identificador de lote, stock_rows real, conteos publicados, decimales TEXT sin Number, maestros, referencias y ubicaciones, lote SKU/ubicación/lote único, almacén solicitado, coherencia de fechas y ausencia de ceros por omisión no certificados. Las flags siguen **sin constituir autenticación**: el gateway de confianza debe comprobar identidad, cuenta activa, rol, sesión y almacén en cada solicitud.
3. **Fuente insuficientemente conservadora:** `classifyFixedPositions` permitía ausencia de `meta.stale` al evaluar completitud. Ahora exige `stale===false` y `truncated===false`. El contrato V1 invalida metadatos omitidos o incoherentes antes de representar resultados completos.
4. **Trazabilidad de exportaciones:** CSV, XLSX y PDF muestran explícitamente las tres fechas; se conservan el escape de XML, neutralización de fórmulas CSV, números decimales grandes como texto exacto en Excel, dos hojas y el total de filas filtradas. Se ampliaron tests Node/Chromium para validar presencia de fecha BC, formulario y procedencia. No se han cambiado las exportaciones de INVENTA 08.

## 3. Archivos propios de la continuidad

**Nuevos:** `src/fixed-position-contract-v1.mjs`; `tests/fixed-position-contract-v1.test.mjs`; este documento.

**Modificados en rama propia:** `src/admin-fixed-positions.mjs`, `src/fixed-position-report.mjs`, `src/fixed-position-xlsx.mjs`, `src/fixed-position-print.mjs`, `tests/fixed-position-report.test.mjs`, `tests/fixed-position-print.test.mjs`, `tests/fixed-position-xlsx.test.mjs`, `tests/fixed-position-visual.html`, `tests/fixed-position-visual.spec.mjs`.

**Sin modificaciones:** `src/admin.mjs` en esta continuidad; `supabase/proposals/visura_posiciones_fijas_central_rpc.sql`, migraciones 006/008, `sw.js`, Business Central, Supabase real, main, PR #22–#25 y ramas del Bloque 01.

## 4. Pruebas y evidencia reproducible

- Se añadió primero `tests/fixed-position-contract-v1.test.mjs` (commit `65b6c923`) con casos de almacén ajeno, respuesta truncada, versión incorrecta, ausencia/orden de fechas, conteo BC discordante, cero omitido no acreditado, lotes duplicados, referencia sin maestro y cantidad Number. Se implementó a continuación la corrección. La primera revisión funcional pasó por un fallo de unicidad Map/Set que se corrigió en `90ea3f59708292ed1a127c6608a0567ce76fb456`.
- **CI verificada para `90ea3f59708292ed1a127c6608a0567ce76fb456`:** general KONTROLA `40637156141` SUCCESS, responsive Chromium `40637156121` SUCCESS y `40637148553` SUCCESS, RPC laboratorio `40637156136` SUCCESS y `40637148619` SUCCESS. Las pruebas y documentación posteriores requieren verificar CI del **último HEAD** antes de afirmar aprobación final.
- Tests adicionales de exportación y procedencia posteriores: los resultados deben identificarse por SHA y ejecución concreta. Los registros usados son **ficticios**. PostgreSQL 16 temporal y Chromium no equivalen a RLS/Auth de producción ni a Safari físico.

## 5. Conflictos y dependencias de Bloque 01

La PR #75 de KONTROLA (`861dce15ea8dceba94e2f370fad8f0155c34e215` observado) **contiene además una integración previa del informe**, con coincidencia de todos los 15 archivos originales de PR #76 según la lista de cambios de la PR. Su documento `docs/VISURA_PREPARA_INTEGRACION_B01_POSICIONES_FIJAS.md` declara un ensayo de integración sin despliegue; `src/admin.mjs` allí es distinto del original de PR #76. Esto crea **riesgo real de desalineación al integrar**, aunque los módulos puros antes de la presente continuidad tenían blobs iguales. No copiar ni fusionar ramas automáticamente.

En particular, `sw.js` del ensayo B01 precarga los cuatro módulos originales del informe, pero el nuevo import estático `src/fixed-position-contract-v1.mjs` deberá incluirse en la revisión del service worker/versión de caché del chat integrador, sin modificar aquí PR #75. Verificar también los tests `tests/fixed-position-b01-integration.test.mjs` y las pruebas de `src/admin.mjs` para no perder importación, verificación, control de cargas, `refreshOldLoads` y permisos.

## 6. Incidencias asignadas a 04 y 05

**Para 04 (arquitectura):** conservar un único `visura_shared`; no materializar `visura_reporting` como segunda autoridad. Resolver identidad PREPARA/INVENTA, snapshots `REPEATABLE READ` consistentes, autorización revocable servidor por almacén, digest/manifest de filas BC, regla explícita de ceros omitidos, fecha de exportación acreditada, reconciliación de ubicaciones legacy sin almacén y almacén vacío con manifiesto. Revisar precisión del parser XLSX histórico: el defecto documentado en #18 puede redondear valores antes de certificarlos. El cliente no puede generar estas pruebas.

**Para 05 (auditoría cruzada):** comparar el HEAD actual de #76 contra el ensayo apilado de Bloque 01/#75, revisar imports y caché de `sw.js`, revalidar 1440/820/390px y PDF/XLSX/CSV con filtros >1000 filas, lotes de dos almacenes con códigos coincidentes y cambios de puntero concurrentes. Ejecutar en entorno descartable las denegaciones de operario, usuario revocado, almacén ajeno y datos obsoletos. Valorar luego pruebas autorizadas de Auth/RLS reales y Safari iPhone PWA sin confundirlas con CI sintética. **No tocar** PR #22–#25, 006/008, DELETE histórico ni Supabase empresarial.

## 7. Estado de entrega

**Estado: LABORATORIO AISLADO, para auditoría de integración; NO operativo.** El frontend actual mantiene la RPC `kontrola_admin_posiciones_fijas` como contrato futuro: sin backend común publicado no muestra resultados reales. No se ejecutó SQL empresarial, no se modificaron usuarios, no se actualizó Business Central, no se hizo merge ni se desplegó nada. Las migraciones 006/008 y operaciones DELETE requieren estrategia aditiva, backup/restore, atribución de almacén y aprobación explícita.

**Puertas duras de integración:** CI del SHA final, conflictos B01/PR75 y service worker, gateway autenticado, Excel BC auténtico + parser exacto, reconciliación histórica, RLS/permisos, pruebas reales con roles/almacenes, dispositivo Safari, rollback y autorización.
