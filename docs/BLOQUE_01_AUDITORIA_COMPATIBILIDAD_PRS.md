# VISURA PREPARA — Bloque 01 · Auditoría de compatibilidad entre PR abiertas

**Fecha:** 27/10/2026. **Solo inspección de ramas y parches:** no se ha fusionado, publicado ni modificado datos empresariales. No constituye una prueba de integración completa.

## Líneas de desarrollo existentes
- **Paralelismo y escritorio:** PR #58 (Preparación y Verificación independientes), PR #60 (conciliación sin cronómetro) y PR #61 (escritorio/tablet/móvil), encadenadas entre sí. La prueba de composición de estas tres PR aún no se ha realizado contra las funciones documentales nuevas.
- **Importación, custodia y correcciones:** PR #52 (PDF F/C) → #62 (errores individuales) → #63 (auditoría reintentos) → #64 (PDF sin LP) → #65 (protección de estados) → #66 (deduplicación cruzada) → #68 (edición administrativa de cantidades) → #69 (totales PDF/BC y protección de Verificación previa).
- **Centro de Mando:** PR #67 modifica `docs/index.html`, `docs/VISURA_ORDENES.html` e iconos, sin compartir archivos funcionales de VISURA PREPARA de estas ramas. Mantener su responsable separado.

## Coincidencias observadas por archivo
- `index.html`: PR #60 retira reloj; PR #61 corrige mensajes/menú; PR #64 añade bandeja provisional en Administración. Deben coexistir ambas funcionalidades sin recuperar mensajes obsoletos. Son regiones distintas, pero se debe revisar el HTML final.
- `styles.css`: PR #61 añade layout ancho desde 721/1100 px; PR #64 añade formularios de provisionales y PR #68 añade tabla de cantidades. Son reglas aditivas, pero el orden CSS y los puntos de ruptura deben comprobarse visualmente en el artefacto combinado.
- `tests/integration/run.sh`: PR #58 agrega validación de flujos paralelos; la cadena #63–69 agrega propuestas SQL optativas y pruebas antes de las regresiones de archivo. **La combinación es una tarea específica de integración**, no corresponde sobrescribir unilateralmente una de las variantes. Ejecutar pruebas de ambas líneas después de conciliar manualmente.
- `src/app.mjs`: PR #58 y PR #60 modifican funcionamiento paralelo y retiro de reloj. Las PR #62–69 modifican `src/admin.mjs` y `src/document-review.mjs`; no reescribir las funciones de Operarios de PR #58 en esta línea.
- `docs/CONTINUIDAD.md`: modificaciones recurrentes en todas las líneas. Al integrar se deben conservar **todas** las entradas, sin resolver conflictos descartando un historial.
- SQL: PR #58 añade `kontrola_prepara_verificacion_paralelas.sql`; PR #69 añade `kontrola_total_bc_documentado_b01.sql` (propuesta de modificación de las RPC de revisión/publicación). Verificar orden e invariantes, en particular impedir sustitución documental tras iniciar **cualquiera** de los procesos.

## Riesgos de integración NO resueltos
1. PR individuales verificadas sobre bases diferentes: su CI aislada no demuestra automáticamente que todas funcionen juntas.
2. La rama operativa `cursor/verificacion-fisica-cargas-8ba0` puede haber avanzado respecto a la base de las PR anteriores; revisar HEAD y hotfixes antes de proponer cambios.
3. Los PDF originales y permisos de Storage/administración requieren pruebas específicas de RLS con la combinación SQL completa.
4. Las pruebas visuales Chromium usan fixtures sin sesión, no sustituyen ensayos en Windows, tablet y móvil físicos autorizados.
5. No modificar Verificación física detallada: queda para Bloque 02.

## Siguiente implementación segura recomendada
Preparar en una nueva rama **sin publicación** un preflight de compatibilidad por cambios de archivos y contratos de pruebas, sin ejecutar fusiones en ramas operativas ni aplicar SQL real. Antes de combinar código se requiere autorización específica para la integración y pruebas en base PostgreSQL temporal. Mientras tanto, continuar mejoras independientes que no pisen `src/app.mjs` ni las PR #58/#60.
