# KONTROLA — política de archivo PDF (fase de diseño aprobada)

## Parámetros confirmados
- **Elegibilidad:** PDF asociado a una carga **finalizada** hace al menos **30 días completos** (UTC, desde la fecha de cierre definitivo de la carga, no desde su creación ni preparación).
- **Alerta:** mostrar advertencia cuando el uso de **Supabase Storage** alcance o supere el **70 % de la cuota aplicable**. Consultar consumo real a través de métricas autorizadas; nunca deducirlo únicamente sumando archivos de KONTROLA.
- **Destino:** carpeta de archivo histórico en OneDrive, inicialmente mediante exportación manual del administrador.
- **Borrado:** **prohibido el borrado automático** del original en Supabase. La exportación por sí sola jamás lo elimina.
- **Estado actual:** esta política no significa que exista integración Microsoft Graph ni que se haya configurado una cuenta OneDrive.

## Flujo seguro
1. Seleccionar únicamente cargas definitivamente finalizadas y elegibles. Excluir preparaciones cerradas si la carga aún está pendiente de verificación.
2. Generar un manifiesto por documento con identificador estable de carga, nombre de archivo, tamaño en bytes, SHA-256 del contenido, fecha de cierre UTC, fecha de exportación UTC y ruta destino propuesta.
3. Exportar PDF y manifiesto a un paquete descargable. La exportación debe funcionar sin credenciales de OneDrive: el administrador sube manualmente los archivos a la carpeta acordada.
4. Registrar estado **pendiente_de_confirmacion**. No marcar **archivado_verificado** por el mero hecho de descargar un paquete o iniciar una subida.
5. Confirmar en OneDrive la presencia del PDF y contrastar tamaño y SHA-256 de los bytes recuperados (o verificados de extremo a extremo). Si OneDrive no expone el hash SHA-256, descargar y calcularlo localmente; no confundir hashes propietarios con SHA-256.
6. Solo tras confirmación verificable registrar quién verificó, cuándo, identificador/ruta OneDrive y hash. Ante cualquier error, mantener estado pendiente y conservar el original.
7. Mantener metadatos, auditoría y trazabilidad de la carga incluso si en el futuro se aprueba una retirada manual del PDF. **No implementar retirada/borrado sin autorización posterior explícita.**

## Estados previstos
`activo` → `elegible` → `exportado_pendiente` → `archivado_verificado`; `error_verificacion` permite reintentar. El paso a `archivado_verificado` exige prueba de integridad, no solo una casilla visual.

## Seguridad y capacidad
- Únicamente administradores autorizados pueden exportar, confirmar y consultar el archivo histórico.
- No publicar enlaces públicos permanentes a documentos de cargas ni guardar tokens de Microsoft en el cliente sin un diseño seguro.
- La alerta de 70 % es informativa: no bloquea operaciones ni dispara eliminaciones.
- En caso de indisponibilidad de OneDrive, mantener el PDF en Supabase y permitir reintentar sin duplicados lógicos.
- No introducir nuevas tablas ni modificar RLS de producción hasta validar la migración y el proyecto Supabase de destino.
- La retención de 30 días es un **mínimo antes de archivar**, no una fecha de eliminación.
- Antes de implementar automatismos, comprobar límites y permisos de OneDrive corporativo y requisitos de conservación documental.

## Pendiente de implementación
Adaptar el esquema de KONTROLA al cierre definitivo de cargas; crear exportador y manifiesto; validación de SHA-256; pantalla administrativa; métricas de almacenamiento; pruebas con PDF real y verificación desde OneDrive.