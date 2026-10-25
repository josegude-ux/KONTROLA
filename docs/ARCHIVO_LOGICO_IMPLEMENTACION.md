# Archivo lógico — plan de implantación

Estado: pendiente de aplicación y pruebas en Supabase.

Auditoría: kontrola_cargas dispone de cerrada_en y cerrada_por; la finalización de verificación admite incidencias pendientes. El 25/10/2026 se observaron 13 cargas.

Requisitos: migración aditiva de archivado, archivado_en, archivado_por, restaurado_en y restaurado_por; operaciones transaccionales de archivar/restaurar solo para administradores autorizados por almacén; registro de auditoría.

Antes de archivar: comprobar cierre de al menos 90 días, verificaciones finalizadas, líneas comprobadas, cero incidencias pendientes, cero preparaciones abiertas, y ausencia de bloqueos o dependencias. Rechazar datos ambiguos.

Integrar las RPC de lectura para exponer archivado, interfaz administrativa y pruebas SQL de permisos, concurrencia, 89/90 días y restauración.

La conexión bloqueó la migración: no afirmar cambios de base de datos ni funcionalidad completa.