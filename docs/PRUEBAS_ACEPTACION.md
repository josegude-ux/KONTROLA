# KONTROLA — Protocolo de aceptación funcional

**Estado:** preparado, **no ejecutado con datos reales**. Todas las pruebas operativas exigen entorno autorizado, cuentas de prueba y documentos ficticios/anonimizados. Las pruebas de GitHub Actions NO equivalen a validar iPhone, Supabase Auth o Storage.

## Condiciones previas obligatorias
- Aprobación específica antes de utilizar Supabase empresarial o publicar/migrar en producción.
- No habrá migración de PDF/registro histórico anterior al nuevo arranque. Se conservan intactas las aplicaciones y datos originales; no se autoriza borrar ninguna base.
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
| A29 | Imprimir lote procesado | Seleccionar 20 cargas autorizadas, imprimir y guardar desde iPhone | Un documento paginado por carga, sin modificar originales ni mezclar almacenes |
| A30 | Cambio de usuario | Operario A cierra sesión y operario B entra en el mismo iPhone | No aparecen datos, PDFs ni información de la sesión A en vistas ocultas o informes |
| A31 | Error de salida | Simular cierre de sesión fallido en Supabase | La aplicación comunica error y no anuncia falsamente la sesión como cerrada |
| A32 | Archivo periódico | Generar un informe nuevo desde KONTROLA y guardarlo como PDF con Safari/iPhone | PDF válido, distinto del HTML de descarga, listo para mover a OneDrive |
| A33 | Movimiento a OneDrive | Mover el PDF nuevo a la carpeta empresarial elegida mediante Archivos | Archivo presente y accesible en OneDrive, sin que KONTROLA haya enviado el contenido automáticamente |
| A34 | Archivo y retención | Comprobar después de mover el documento nuevo a OneDrive | Sin borrados automáticos del original BC, las revisiones en KONTROLA o la copia guardada |
| A35 | Alcance documental | Entrar en Administración tras iniciar la app con documentos nuevos | Ningún menú de migración de PDFs antiguos; las revisiones nuevas siguen funcionando |

| A36 | Archivo por fecha | Filtrar del 21 al 24 de octubre con cargas dentro, fuera y sin fecha | Solo se incluyen cargas con fecha válida dentro del intervalo y se informa si el rango es incorrecto |
| A37 | Carátula PDF OneDrive | Seleccionar veinte cargas, preparar el documento y guardarlo desde Safari | Primera página con índice/códigos/fecha/almacén, luego hojas separadas; sugerencia de nombre sin declarar subida realizada |


| A38 | Grupos consecutivos | Filtrar 45 cargas y pulsar sucesivamente la selección rápida | Primer grupo 20, segundo 20, tercero 5; cada carátula corresponde a las cargas correctas |
| A39 | Impresión grande iPhone | Imprimir un grupo de 20 cargas con muchas líneas por hoja | Sin bloqueos de memoria ni páginas cortadas; PDF legible y guardable en Archivos/OneDrive |

| A40 | Carga modificada | Seleccionar veinte cargas y modificar una cantidad o matrícula desde otra sesión antes de imprimir | Se bloquea la generación y se exige actualizar la lista; no se archivan datos anteriores |
| A41 | Cambio durante la impresión | Iniciar comprobación de lote con red lenta y cambiar almacén o sesión | Se descarta la respuesta anterior y no aparece un PDF del almacén o usuario previo |

## Condiciones de salida

**Desarrollo:** funciones implementadas, pruebas unitarias y SQL temporales superadas.

**Validación real:** todas las pruebas A01–A41 ejecutadas y registradas con evidencias, sin errores bloqueantes.

**Puesta en producción:** únicamente tras definir el inicio documental nuevo sin borrado de datos, validar la privacidad y permisos, probar el guardado PDF y movimiento manual a OneDrive, obtener aprobación explícita y realizar un despliegue controlado.

**Manual definitivo en PDF:** solo después de estabilizar la interfaz y capturar pantallas reales desde una ejecución verificada. No sustituir capturas por imágenes generadas.
