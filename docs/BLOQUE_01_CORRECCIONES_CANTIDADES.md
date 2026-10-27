# VISURA PREPARA · Bloque 01 — Corrección administrativa de cantidades

**27/10/2026. Rama aislada:** `feat/visura-prepara-b01-correcciones-cantidades-20261027`.
**Base exacta:** `9f36a2da93509124b883db807d0c2e1d0f19f48d` (PR #66). No fusionar ni desplegar.

## Defecto encontrado
`src/document-review.mjs` implementaba `applyLineCorrection` y conservaba `pdfOriginal`, pero `src/admin.mjs` no ofrecía un formulario para que Administración corrigiera manualmente las cantidades. La información corregida no resultaba visible ni justificable a través de esa pantalla.

## Implementación incremental
- Nuevo helper `applyValidatedQuantityCorrection`: exige usuario identificado, cantidad numérica no negativa de hasta tres decimales, tipo de origen (`lectura_pdf` o `dato_pdf_bc`) y evidencia textual mínima de contraste manual con BC.
- Reutiliza `applyLineCorrection` sin alterar el original. Registra línea, campo, valor anterior y posterior, actor, fecha/hora, tipo de corrección, justificación y fuente.
- `src/admin.mjs` muestra cada referencia, cantidad operativa VISURA, valor original y distintivo CORREGIDA. Permite editar en un `details` expandible y almacenar temporalmente la corrección **solo antes de publicar**. `Guardar revisión` persiste por la RPC administrativa existente; no se escribe directamente en Business Central.
- Al cambiar una cantidad, se recalculan `actualTotal` y hallazgos del documento. El cambio vuelve a `revision_requerida`.
- `styles.css` usa disposición horizontal en ordenador/tablet y una columna táctil en móvil, con sin pérdida del contenido y sin afectar a la impresión A4.

## Límite explícito — discrepancias con el total impreso
- Si la cantidad operativa validada en BC difiere del total numérico que figura en el PDF, `analyzeDocument` detecta `quantity_total_mismatch` y **la publicación sigue bloqueada**.
- Esto impide alterar artificialmente el total declarado en el PDF o aceptar automáticamente un dato contradictorio. Se ha implementado la edición, la conservación de evidencia y la revisión, pero **no se declara completada la autorización de publicación para PDF de origen erróneo**: requiere un contrato adicional de revisión/servidor, que preserve total original frente a total operativo y las condiciones de aprobación documental.
- No permitir cambios materiales tras iniciarse Preparación/Verificación. Los borradores publicados no muestran el formulario.
- No duplicar picking BC ni inventar procedimientos del Bloque 02.

## Verificación
- `tests/quantity-audit.test.mjs`: tipos de origen, cantidad no negativa, tres decimales, preservación PDF, evidencias, actor, fecha, múltiples correcciones, protección de totales y errores.
- `tests/quantity-layout.spec.mjs`: Chromium y capturas en móvil 390×844, tablet 768×1024 y 1024×768, escritorio 1440×900 y 1920×1080; comprueba que no se desborda horizontalmente.
- CI aislada `.github/workflows/visura-prepara-b01-cantidades-ci.yml`: regresión Node, PostgreSQL 16 efímero con propuestas ya aisladas y prueba visual. Verificar estado del HEAD, no afirmar producción validada.
- El formulario visual se prueba sin sesión ni datos empresariales. Se requieren ensayos manuales con rol de Administración en entorno no productivo antes de integrar.

**No autorizado:** fusión, despliegue, modificaciones a Supabase real, originales reales o Business Central.
**Siguiente tarea independiente:** contrato seguro para correcciones por PDF de origen erróneo, con total PDF original preservado y total BC operativo diferenciado, aprobación administrativa y prueba SQL temporal. No invadir el Bloque 02.
