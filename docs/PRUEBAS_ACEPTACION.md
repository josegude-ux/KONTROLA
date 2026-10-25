# KONTROLA — Protocolo de aceptación funcional

**Estado:** preparado, **no ejecutado con datos reales**. Todas las pruebas operativas exigen entorno autorizado, cuentas de prueba y documentos ficticios/anonimizados. Las pruebas de GitHub Actions NO equivalen a validar iPhone, Supabase Auth o Storage.

## Condiciones previas obligatorias
- Aprobación específica antes de utilizar Supabase empresarial o publicar/migrar en producción.
- Copias verificadas de la información real antes de cualquier migración.
- Dos cuentas de operario distintas y una de administrador, todas autorizadas, con asignación de Coruña y Ferrol configurada en entorno aislado.
- PDFs ficticios representativos de ambos almacenes, sin incluir información empresarial confidencial en repositorios públicos.
- Registrar por escenario: fecha, entorno, dispositivo, cuenta, versión, pasos reales, evidencia (sin secretos), resultado y defectos.
- No probar `tests/integration/run.sh` sobre un servidor o base que contenga datos que deban conservarse: **recrea** su base temporal.

## Casos de aceptación

| ID | Perfil / función | Procedimiento de prueba | Resultado esperado |
|---|---|---|---|
| A01 | Inicio de sesión | Operario autorizado inicia sesión en PWA móvil | Perfil y almacenes permitidos; administración oculta |
| A02 | Control de acceso | Operario intenta abrir operaciones administrativas por API o URL | El servidor deniega modificación, aunque se manipule la interfaz |
| A03 | Almacenes | Cambiar A Coruña ↔ Ferrol con red lenta | Nunca aparecen datos del almacén anterior después del cambio |
| A04 | Importar PDF | Administrador carga PDF válido ficticio desde Archivos/OneDrive | Se analizan datos; no se publica sin revisión |
| A05 | PDF dudoso | PDF sin almacén o con totales inconsistentes | Advertencias/errores claros; se bloquea publicación incorrecta |
| A06 | PDF duplicado | Importar el mismo contenido con otro nombre | No se crea una nueva versión del documento |
| A07 | PDF revisado | Importar PDF modificado con mismo código sin preparación iniciada | Solicita confirmación; preserva v1 y publica v2 tras revisión |
| A08 | Bloqueo documental | Tras iniciar preparación, intentar sustituir PDF | El servidor impide sustitución; revisión vigente intacta |
| A09 | Historial | Desde Administración consultar v1 y v2 | Mostrar versiones y PDF históricos privados |
| A10 | Comparación | Cambiar ruta, matrícula, cantidades y referencias repetidas | Mostrar añadidos, eliminados, cambios y diferencias correctas |
| A11 | Consulta | Operario abre carga sin pulsar iniciar | No crea reloj ni modifica registros; consulta PDF original |
| A12 | Preparación | Operario pulsa iniciar y finalizar | Se guarda hora del servidor, una sola sesión operativa válida |
| A13 | Cambio de carga | Operario pasa a otra carga con reloj abierto | Cierre anterior según regla aprobada, auditoría conservada |
| A14 | Verificación | Un operario diferente verifica línea a línea | Impide autoverificación, recupera progreso y registra cantidades |
| A15 | Incidencias | Cantidad comprobada distinta de prevista | Incidencia persistente; cierre no la elimina |
| A16 | Regularización | Administrador confirma regularización hecha manualmente en BC | Se audita el cambio en KONTROLA, sin API de BC |
| A17 | Estadísticas | Filtrar día, almacén, estado, ruta y repartidor | Resúmenes coherentes con el conjunto autorizado |
| A18 | Exportación | CSV de vista filtrada con caracteres especiales | Abre en Excel con datos filtrados sin ejecución de fórmulas |
| A19 | Impresión | Hoja procesada y resumen desde Safari iPhone | Vista y paginación legibles; impresión/PDF correcto |
| A20 | Sesión/cortes | Pérdida de conexión durante una operación y recuperación | Nunca anuncia guardado hasta confirmación del servidor |
| A21 | Actualización | Instalar PWA anterior y buscar nueva versión | Versión visible y recursos nuevos disponibles sin mezcla de caché |
| A22 | Visibilidad | Inicio en perfil operario y administrador | Control de Tanques totalmente oculto |
| A23 | Autorización Storage | Operario sin permisos intenta descargar PDF de otro almacén | Acceso denegado por RLS/políticas de Storage |
| A24 | Fecha diaria | Consultar el resumen cerca de medianoche y al cambiar horario verano/invierno | Fecha del almacén Europe/Madrid, no UTC |
| A25 | Importación múltiple | Seleccionar varios PDF autorizados, uno correcto, otro repetido y otro inválido | Procesamiento secuencial, informe por archivo, ninguna publicación automática |
| A26 | Lote conflictivo | Dos PDF distintos con el mismo número de carga dentro del lote | Se bloquea el segundo para revisión individual, sin sobrescribir el primero |
| A27 | Estadísticas operarios | Administrador filtra A Coruña y Ferrol por fecha | No se mezclan almacenes ni se cuentan tiempos abiertos como finalizados |
| A28 | Privacidad de estadísticas | Operario intenta RPC nominal de estadísticas | Acceso denegado por servidor |
| A29 | Copia legacy | Abrir backup JSON local del original con duplicados y fechas vacías | Informe local, sin subir, sobrescribir ni borrar información |
| A30 | Origen PDF histórico | Revisar copias JSON y almacenamiento IndexedDB de móviles | Se advierte que el backup NO incluye archivos PDF originales |
| A31 | Imprimir lote procesado | Seleccionar 10 cargas autorizadas, imprimir y guardar desde iPhone | Un documento paginado por carga, sin modificar originales ni mezclar almacenes |
| A32 | Cambio de usuario | Operario A cierra sesión y operario B entra en el mismo iPhone | No aparecen datos, PDFs ni información de la sesión A en vistas ocultas o informes |
| A33 | Error de salida | Simular cierre de sesión fallido en Supabase | La aplicación comunica error y no anuncia falsamente la sesión como cerrada |

## Condiciones de salida

**Desarrollo:** funciones implementadas, pruebas unitarias y SQL temporales superadas.

**Validación real:** todas las pruebas A01–A33 ejecutadas y registradas con evidencias, sin errores bloqueantes.

**Puesta en producción:** únicamente tras inventario de datos locales y nube, copia verificada, migración autorizada con reversión, revisión de permisos, aprobación explícita y despliegue controlado.

**Manual definitivo en PDF:** solo después de estabilizar la interfaz y capturar pantallas reales desde una ejecución verificada. No sustituir capturas por imágenes generadas.
