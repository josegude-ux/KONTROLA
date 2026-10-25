# KONTROLA — Inicio documental nuevo y archivo periódico en OneDrive

**Decisión del responsable (25/10/2026):** comenzar KONTROLA desde cero en cuanto a documentos y registros operativos iniciales. **No es necesario importar, reconstruir, conciliar ni conservar en KONTROLA los PDF generados anteriormente.**

El código de la aplicación ya desarrollado se mantiene y seguirá completándose. No se borran datos preexistentes de ninguna aplicación, cuenta, nube o base de datos; tampoco se ejecutan migraciones en producción.

## Flujo futuro acordado

1. El administrador descarga desde Business Central los PDF **nuevos** de las cargas.
2. Los importa y revisa en KONTROLA. Las validaciones de duplicados y revisiones continúan aplicándose **a los documentos nuevos del propio sistema**.
3. KONTROLA genera las hojas de preparación e informes PDF que correspondan y registra la jornada y las verificaciones.
4. **Periódicamente**, el administrador prepara los informes nuevos en KONTROLA, por carga o en lotes de hojas procesadas.
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
