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
