# KONTROLA — Inicio documental nuevo y archivo periódico en OneDrive

**Decisión del responsable (25/10/2026):** comenzar KONTROLA desde cero en cuanto a documentos y registros operativos iniciales. **No es necesario importar, reconstruir, conciliar ni conservar en KONTROLA los PDF generados anteriormente.**

El código de la aplicación ya desarrollado se mantiene y seguirá completándose. No se borran datos preexistentes de ninguna aplicación, cuenta, nube o base de datos; tampoco se ejecutan migraciones en producción.

## Flujo futuro acordado

1. El administrador descarga desde Business Central los PDF **nuevos** de las cargas.
2. Los importa y revisa en KONTROLA. Las validaciones de duplicados y revisiones continúan aplicándose **a los documentos nuevos del propio sistema**.
3. KONTROLA genera las hojas de preparación e informes PDF que correspondan y registra la jornada y las verificaciones.
4. **Periódicamente**, el administrador abre **Imprimir varias hojas procesadas**, elige las fechas del periodo, selecciona hasta diez cargas por lote y prepara un informe con carátula e índice de cargas. Si hay más de diez, prepara varios documentos.
5. Desde la vista de informe utiliza **Imprimir / Guardar PDF**. En iPhone puede emplear la hoja de impresión/Compartir para guardar el PDF en **Archivos**.
6. Los documentos generados se **mueven a una carpeta de OneDrive elegida por la empresa**. No se impone todavía nombre de carpeta ni periodicidad exacta.
7. Se comprueba desde OneDrive que el archivo se abre correctamente y está en la carpeta esperada. **Ningún PDF se borra automáticamente** de KONTROLA, del móvil o de Business Central.

## Alcance y límites actuales

- El archivo periódico en OneDrive es **manual**, no una sincronización automática. La aplicación no posee ahora integración autorizada para escribir en OneDrive.
- La acción **Descargar** de KONTROLA exporta un documento HTML de la hoja; para obtener un PDF real se usa **Imprimir / Guardar PDF**. No se debe cambiar el nombre de un HTML a .pdf y afirmar que es PDF.
- La impresión conjunta de hasta diez **hojas procesadas** está implementada. No equivale a fusionar los **PDF originales** de Business Central.
- La carpeta de OneDrive todavía no tiene ruta confirmada. Cuando se configure, conservar los permisos empresariales correctos.
- El archivado en OneDrive no elimina la necesidad de protección y auditoría de los originales utilizados por KONTROLA durante la operación.
- No hay que usar la funcionalidad de migración/conciliación de los PDF antiguos; el panel de esas funciones queda oculto. Los módulos de código históricos permanecen versionados, pero fuera del flujo de trabajo nuevo.
- Para pruebas en entornos aislados se siguen empleando **PDF ficticios**; «empezar desde cero» no autoriza borrar datos reales para conseguir una base vacía.

## Pruebas necesarias

- Guardar un informe nuevo como PDF real en iPhone/Safari.
- Moverlo con Archivos a la carpeta de OneDrive aprobada y abrirlo allí.
- Repetir con informe multipágina de diez cargas para revisar saltos de página.
- Verificar que no se confunden cargas de Coruña y Ferrol.
- Confirmar que no existen borrados automáticos cuando se archivan informes.

**Estado:** desarrollo del flujo de orientación en la interfaz; sin movimiento real a OneDrive ni pruebas iPhone/OneDrive ejecutadas.


## Mejoras implementadas en v0.3.17

- La pantalla de impresión permite filtrar por fecha de carga **desde/hasta**, sin imponer una periodicidad fija.
- El documento de archivo incluye una **primera página con listado de cargas y sus fechas**, seguida de cada hoja procesada.
- Se propone un nombre `KONTROLA_HOJAS_<ALMACEN>_<PERIODO>.pdf`, que el administrador puede utilizar al guardar desde Archivos.
- La alternativa «Descargar HTML» NO genera PDF; usar «Imprimir / Guardar PDF» para mover un documento PDF auténtico a OneDrive.
- No hay marcas de «archivado» automáticas, para no presentar como realizada una operación que todavía necesita la acción manual.
- Las herramientas de migración antigua se han desconectado; se empieza con documentos nuevos.

**Validación automática:** 123 tests OK en GitHub Actions `40191583046`; pendientes Safari/Archivos/OneDrive reales y verificación de saltos de página.
