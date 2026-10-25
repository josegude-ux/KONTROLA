# KONTROLA — Estado funcional y condiciones de cierre

**Alcance vigente desde 25/10/2026:** iniciar KONTROLA con **cargas y PDF nuevos**. No es necesario migrar los PDF, copias JSON o históricos generados hasta ahora. No se borran archivos antiguos ni datos de producción. Ver [Plan de archivo OneDrive](PLAN_ARCHIVO_ONEDRIVE.md).

El código de la aplicación se mantiene y evoluciona sobre la PR #2; no se ha desplegado para trabajadores.

| Función | Estado del desarrollo | Validación pendiente |
|---|---|---|
| Roles y autenticación | Programado | Comprobar Auth/RLS con operario y administrador reales autorizados |
| Separación A Coruña / Ferrol | Programado | Pruebas en ambos almacenes con red lenta y permisos distintos |
| Consulta sin reloj | Programado | Comprobar en iPhone con PDF nuevo |
| Preparación de cargas y cierre | Programado | Comprobar hora de servidor, cambios y cortes de red |
| Verificación física por segundo operario | Programado | Flujo de dos móviles y registro de incidencias |
| Regularización y auditoría | Programado | Validación administrativa; cambios de BC siempre manuales |
| Importación PDF nuevo, revisión y publicación | Programado | Validar PDFs nuevos representativos y Storage real |
| Importación múltiple | Programado | Evaluar lotes y memoria iPhone, sin autopublicación |
| Nuevas revisiones, historial y SHA-256 | Programado | Probar únicamente con documentos generados tras el arranque |
| Consulta y estadísticas de operarios | Programado | Privacidad de nombres, RPC y fecha local |
| Resumen y CSV compatible con Excel | Programado | Excel real y permisos por almacén |
| Impresión de hojas procesadas (hasta 10) | Programado | Calidad, paginación y guardado de PDF auténtico en iPhone |
| Impresión en lote de PDF originales de BC | Pendiente | Decidir alcance; no confundir con hojas procesadas |
| **Archivo periódico en OneDrive** | **Procedimiento manual documentado** | Probar desde Archivos del iPhone a la carpeta OneDrive acordada y verificar la copia |
| Migración/conciliación de datos y PDF antiguos | **Fuera del alcance** | Ninguna: no necesaria para este nuevo arranque |
| Manual PDF con capturas auténticas | Borrador | Ejecutar PWA con datos ficticios, capturar pantallas y preparar PDF final |
| Control de Tanques | Oculto y pausado | Solo con autorización futura |
| INVENTA | Aplicación independiente | No modificar ni mezclar información |

## Siguientes pasos

1. Finalizar las mejoras y correcciones relativas a los **PDF nuevos**, sin importar material histórico.
2. Probar los 35 casos aplicables de [Pruebas de aceptación](PRUEBAS_ACEPTACION.md).
3. Verificar en iPhone **Imprimir / Guardar PDF → Archivos → carpeta OneDrive elegida**, sin transferencia ni borrado automático.
4. Cerrar el manual definitivo con capturas auténticas y aprobar el despliegue cuando Supabase/Auth/Storage hayan sido validados.

## Reglas

- No fusionar `main`, ejecutar migraciones de Supabase de producción, borrar datos o publicar la app a trabajadores sin autorización.
- No asumir que OneDrive está conectado para escritura: la transferencia será manual hasta nueva instrucción.
- No se crea una estructura OneDrive ni se fija un nombre/periodicidad de carpeta sin que el usuario lo indique.
- Las migraciones SQL actuales solo se han probado en PostgreSQL temporal.
- El cambio de alcance no obliga a empezar de cero el **código**, sino los **documentos y operaciones de trabajo**.
