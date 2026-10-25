# KONTROLA — Manual para trabajadores y administración (BORRADOR)

**Este documento NO es todavía el manual PDF definitivo.** Falta verificar las pantallas en la PWA instalada y añadir capturas reales obtenidas de la aplicación en ejecución. No fabricar capturas ni usar imágenes simuladas. No distribuir como manual de producción.

## Para empezar

KONTROLA sirve para consultar las cargas, registrar el tiempo de preparación y comprobar las cantidades. La preparación física y las regularizaciones en Business Central se siguen haciendo con las herramientas habituales de la empresa.

### 1. Entrar en la aplicación

1. Abre KONTROLA en tu móvil.
2. Escribe el correo y la contraseña que te haya facilitado administración.
3. Pulsa **Entrar**.
4. Comprueba que aparece tu nombre y que estás en el almacén correcto.

Si no puedes entrar, comprueba la conexión. Si el mensaje dice que no tienes permisos, avisa a administración. No compartas tu contraseña.

**Captura pendiente:** inicio de sesión real sin credenciales visibles.

### 2. Seleccionar almacén

Antes de consultar o preparar una carga, comprueba si estás en **A Coruña** o **Ferrol**. Cambia de zona con el selector, si tienes permiso.

Si no aparece una zona que necesitas, administración debe revisar tus permisos. Nunca utilices cargas de un almacén distinto.

**Captura pendiente:** selector con datos ficticios, mostrando claramente la zona.

### 3. Consultar una carga SIN iniciar el tiempo

1. Entra en **Control de Cargas** y luego en **Consultar cargas**.
2. Busca por número de carga, ruta, matrícula o repartidor.
3. Pulsa la carga que quieras ver.
4. Consulta el documento original o la hoja de mercancía por pasillos.

**Consultar no inicia ningún reloj.** Este modo es de solo lectura.

**Captura pendiente:** listado y detalle en modo consulta.

### 4. Preparar una carga

1. Entra en **Preparación** (o **Control de Cargas → Preparación de cargas**).
2. Busca la carga correspondiente a tu almacén y ábrela.
3. Cuando estés listo para empezar la preparación física, pulsa **Iniciar preparación**.
4. Realiza el picking con la pistola de Business Central como siempre.
5. Al terminar, pulsa **Finalizar preparación**.

El servidor registra los tiempos. No pulses dos veces por impaciencia: espera a la confirmación de que la operación está guardada. Si se pierde la conexión, comprueba el estado antes de repetir la acción.

**Captura pendiente:** botón de inicio y estado de reloj activo.

### 5. Verificar una carga

La verificación debe realizarla **otra persona distinta de quien la preparó**.

1. Entra en **Verificación** o **Control de Cargas → Verificación física**.
2. Abre una carga preparada por otra persona.
3. Pulsa **Iniciar verificación** cuando proceda.
4. Revisa físicamente cada línea y escribe la cantidad que has contado.
5. Guarda cada comprobación y confirma que el sistema la ha registrado.
6. Una vez comprobadas todas las líneas, pulsa **Finalizar verificación**.

Si hay diferencia, KONTROLA registra una incidencia. **La carga puede cerrarse aunque quede una incidencia pendiente.**

**Captura pendiente:** detalle de comprobación sin datos reales.

### 6. Historial y resumen

1. En **Control de Cargas → Historial y resumen**, selecciona el almacén.
2. Filtra por fecha, estado, ruta o repartidor.
3. Revisa las cantidades y los totales mostrados.
4. Usa **Exportar Excel (CSV)** para descargar únicamente lo que está filtrado.
5. Usa **Imprimir resumen** para abrir la impresión o guardar el informe desde el navegador.

**Captura pendiente:** filtros y totales calculados con datos ficticios.

### 7. Si aparece un error

- **No hay conexión:** comprueba los datos móviles o Wi-Fi y no des por guardado lo que no tenga confirmación.
- **Carga no disponible:** revisa código y almacén; podría estar cerrada o no publicada.
- **Sin permiso:** solicita al administrador el acceso correcto; no uses otra cuenta.
- **PDF no disponible:** avisa a administración, puede faltar el documento en almacenamiento privado.
- **Operación en curso:** espera a que termine antes de cambiar de pantalla.

## Solo para administración

### 8. Importar un documento PDF

1. Descarga el PDF manualmente desde Business Central.
2. En KONTROLA, entra en **Administración**.
3. Selecciona uno o varios PDF desde el móvil, Archivos u OneDrive (máximo 20 archivos por lote). Cada PDF queda pendiente de revisión individual; ninguno se publica automáticamente.
4. Pulsa **Importar y procesar**.
5. Revisa los datos, el almacén, las cantidades y cualquier aviso.
6. Corrige únicamente lo que puedas comprobar con el documento.
7. Guarda la revisión y publica solo cuando la aplicación permita hacerlo.

Si se trata de otra versión de la misma carga, comprueba el aviso de sustitución. No se puede reemplazar un PDF cuando la preparación ya ha comenzado.

**Captura pendiente:** formulario de importación y hallazgos con PDF ficticio.

### 9. Ver y comparar revisiones antiguas

1. Entra en **Administración → Historial de revisiones de PDF**.
2. Escribe el número de carga, por ejemplo `LP26-12345`.
3. Pulsa **Consultar revisiones**.
4. Revisa qué versión es vigente y cuáles son históricas.
5. Pulsa **Abrir PDF original** para consultar una revisión concreta, si tienes permiso.
6. Selecciona **Comparar desde** y **Hasta** para ver productos y datos que cambiaron.

Esta función **no modifica ni restaura documentos**.

**Captura pendiente:** historial comparativo real con revisiones ficticias.

### 10. Incidencias y regularizaciones

1. Consulta las incidencias pendientes agrupadas por carga.
2. Comprueba qué productos y cantidades presentan diferencias.
3. Realiza la regularización en Business Central **manualmente**.
4. Solo después de hacerlo, confirma la regularización en KONTROLA.

KONTROLA registra la confirmación, **no modifica Business Central por sí misma**.

**Captura pendiente:** incidencias administrativas de prueba.

### 11. Estadísticas por trabajador

En **Administración → Actividad por operario**, elige la fecha y el almacén. Pulsa **Actualizar**. Comprueba los tiempos de trabajos terminados y las tareas que siguen abiertas. Esta pantalla está reservada a administradores.

**Captura pendiente:** tabla real de operarios con cuentas ficticias.

### 12. Imprimir varias hojas procesadas

En **Administración → Imprimir varias hojas procesadas**, pulsa **Actualizar**, selecciona hasta 10 cargas y luego **Preparar impresión de hojas seleccionadas**. Desde la vista de informe utiliza **Imprimir / Guardar PDF**.

Estas son **hojas procesadas por KONTROLA**, no copias de los PDF originales de Business Central. La impresión conjunta de originales sigue pendiente.

**Captura pendiente:** selector de cargas e informe multipágina real.

### 13. Archivar los nuevos PDF en OneDrive

Partimos con documentos nuevos: **no vamos a importar los PDF generados antes de poner en marcha KONTROLA**.

1. Genera la hoja procesada o el resumen nuevo que quieres guardar.
2. Pulsa **Imprimir / Guardar PDF**. La opción **Descargar** genera HTML, no un PDF real.
3. En el iPhone, usa las opciones de impresión/compartir para **Guardar en Archivos** como documento PDF.
4. Cuando toque el archivo periódico, **mueve los PDF a la carpeta de OneDrive que haya designado la empresa**.
5. Abre el archivo desde OneDrive para comprobar que se ha guardado correctamente.

El movimiento a OneDrive es **manual**. KONTROLA no sube ni borra documentos por su cuenta. Los PDF originales de Business Central siguen protegidos dentro del flujo de la aplicación.

**Capturas pendientes:** guardar PDF desde Safari/iPhone, mover en Archivos a OneDrive y verificar que el documento se abre desde OneDrive.

## Capturas y entrega definitiva

- Capturar todas las pantallas anteriores en una ejecución real de la versión candidata y un entorno autorizado de pruebas.
- Ocultar identificadores personales, contraseñas y datos comerciales.
- Comprobar los textos exactos en iPhone; actualizar instrucciones según la interfaz implementada.
- Generar entonces un PDF con índice, capturas de cada paso, explicaciones muy sencillas y apartado de solución de errores.
- No publicar el manual ni la aplicación como definitivos sin pruebas de aceptación registradas.
