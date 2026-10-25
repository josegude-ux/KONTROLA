# Política propuesta de retención de cargas (90 días)

Estado: propuesta documental. No autoriza eliminación ni cambios en Supabase.

## Cómputo
Las cargas finalizadas se conservarán al menos 90 días naturales completos desde la marca de tiempo verificable de finalización. La fecha del PDF, importación, publicación o impresión no inicia el plazo. Si no existe marca fiable, no son elegibles. Las marcas se calculan en UTC y se muestran en Europe/Madrid.

## Archivo
Una carga finalizada puede ocultarse de las listas operativas mediante archivo lógico, conservando todos sus datos y permitiendo búsquedas administrativas por código, almacén, fecha y estado. Archivar no elimina.

## Protecciones
No son elegibles las cargas pendientes de revisión, aprobadas sin publicar, en preparación, en verificación, con incidencias abiertas, discrepancias sin regularizar, procesos pendientes o estados ambiguos. Bloquear también las sometidas a auditoría, reclamación, retención legal o con dependencias no verificadas. Cualquier error o cambio concurrente impide eliminar.

## Eliminación definitiva: fase futura desactivada
Transcurridos 90 días, la carga solo será candidata a revisión. Nunca se eliminará automáticamente. La operación requerirá un administrador autorizado, selección explícita, motivo, vista previa de los registros y archivos afectados y confirmación reforzada. El servidor deberá revalidar permisos, estado, incidencias, plazo y relaciones en una transacción; denegar ante cualquier duda.

Registrar evidencia de auditoría protegida con actor, fecha, identificador, almacén, motivo y resultado. Antes de implementar, inventariar tablas relacionadas, documentos originales y derivados, impresiones, revisiones, incidencias, historial y copias de seguridad; comprobar obligaciones legales y estrategia de recuperación.

## Pruebas previas obligatorias
Casos de 89 y 90 días; cargas no finalizadas, incidencias abiertas, bloqueos, permisos por almacén, cambios concurrentes, auditoría, dependencias, reintentos y recuperación. Las pruebas automatizadas no sustituyen las pruebas en dispositivos reales.

## Pendiente de definir
Estado y evento exactos de finalización, estructura real de relaciones SQL/Storage, evidencia mínima retenida, autorizadores y alcance de eliminación. Sin resolverlo, el borrado permanece deshabilitado.

## Inventario confirmado en código (auditoría 2026-10-25)
- `kontrola_cargas.estado='cerrada'` se establece al llamar a `kontrola_finalizar_verificacion`, incluso cuando se crea una incidencia pendiente (prueba `tests/integration/workflow.sql`). **No basta con estado cerrada**.
- `kontrola_verificaciones` y `kontrola_verificacion_lineas` registran verificación y líneas; `kontrola_verificacion_eventos` conserva eventos por línea.
- `kontrola_preparaciones.fin` y `cierre_motivo` documentan el fin de preparación, pero **no deben utilizarse como fecha de cierre definitivo de la carga**.
- `kontrola_incidencias.estado='pendiente'` impide eliminar; `regularizada` se confirma mediante `kontrola_regularizar_incidencia`, con historial en `kontrola_incidencia_eventos` y avisos en `kontrola_avisos`.
- `kontrola_carga_revisiones`, `kontrola_importaciones` y `kontrola_actividad` se actualizan en `kontrola_publicar_importacion` (migración `20261027_kontrola_revision_documental_segura.sql`).
- `kontrola_impresiones.codigo` referencia `kontrola_cargas(codigo)` (migración `20261030_kontrola_impresiones.sql`). No eliminar la carga sin resolver esa dependencia.
- PDF originales y revisiones documentales pueden estar en Supabase Storage: requieren inventario y política de conservación propia; no eliminar objetos basándose únicamente en el código LP.

### Bloqueante técnico para activar los 90 días
Las pruebas consultadas verifican el estado `cerrada`, pero **no acreditan todavía una columna de marca temporal del cierre definitivo de verificación**. No usar `actualizado_en`, `fecha`, `publicado_en` ni `preparaciones.fin` como sustituto. Antes de implementar, inspeccionar el esquema completo y la definición de `kontrola_finalizar_verificacion`; si no hay marca fiable, diseñar una migración específica, retrocompatibilidad y tratamiento conservador de históricos sin fecha. Ninguna carga sin fecha verificable será elegible.

### Alcance de este apartado
La **política funcional y las dependencias conocidas quedan documentadas**. La implementación de archivo y borrado está expresamente fuera de alcance hasta que se verifique el esquema completo y se apruebe una migración. El PR de documentación no cambia datos ni activa procesos.
