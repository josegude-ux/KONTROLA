# VISURA 200 · Arquitectura de datos: SQL principal + PDF de contingencia

Estado: **decisión de arquitectura aprobada. Sin implementación.** No se modifica código, no se conecta a SQL y no se usan datos reales.
Fecha: 18/11/2026. Repositorio público: aquí no se escriben servidores, bases, rutas de SharePoint, credenciales ni identificadores internos.

## 0. Papel de VISURA

VISURA PREPARA ALMACÉN es una **herramienta de apoyo** a la operativa. No es un sistema de gestión.

- **Business Central** es el sistema de referencia: pedidos, cargas, repartidores, artículos y cantidades.
- **EKDAL** es donde se pistolean las referencias durante el picking.
- VISURA solo **lee** lo que viene de BC, ya sea por SQL (réplica de BC) o por PDF (documentos generados por BC), para producir listados de ayuda.

Consecuencias:
- VISURA nunca escribe en BC ni en EKDAL, ni pretende sustituirlos.
- Si VISURA no coincide con BC, **manda BC**. VISURA avisa y no corrige nada.
- Un fallo de VISURA no puede parar la operativa: BC y EKDAL siguen funcionando sin ella.
- Los datos propios de VISURA (tiempos, operario, estado de preparación) son auxiliares y no se devuelven a BC.

## 1. Decisión

- **Una sola aplicación y un solo motor de informes.** Dos fuentes alimentan un contrato de datos común.
- **SQL = fuente principal** (consultas de solo lectura, sin que nadie abra Excel).
- **PDF = contingencia operativa.** Se conserva el importador actual tal cual.
- Los cuatro listados (repartidores con frío, sin frío, frío Coruña, frío y barriles Ferrol) salen con el **mismo formato** sea cual sea la fuente, indicando qué datos faltan cuando la fuente es PDF.
- Sin duplicar cargas ni cantidades. Cada carga conserva fecha, almacén, número de carga y procedencia. Si SQL y PDF difieren, **se avisa antes de sustituir**. Las dos fuentes reflejan BC; cuando la diferencia es con BC, prevalece BC.
- Volver a SQL tras una incidencia no pierde documentos, tiempos ni registros hechos con PDF.

```
SQL (solo lectura) ──┐
                     ├─► adaptador → CONTRATO COMÚN → motor único → listados
PDF (contingencia) ──┘   (por fuente)  (con procedencia)
```

Las reglas de negocio (frío, barriles, Ferrol/Coruña, exclusiones CRALM/CRVEN/CC0, reparto único) viven **solo en el motor**. Los adaptadores únicamente traducen campos.

## 2. Contrato común (borrador)

| Campo | SQL (origen previsto) | PDF (hoy) |
|---|---|---|
| `numeroCarga` (LP) | Cabecera de carga: «Nº carga» | Identificador LP del PDF |
| `fecha` | Cabecera de carga: «Fecha» | Fecha del PDF |
| `almacen` | **Por confirmar** (en el Excel es una columna calculada por ruta de cliente) | `COR_01_COR` leído del PDF |
| `camion` | Cabecera de carga: «Cód. camión» | Código de camión del PDF |
| `repartidor` / `acompanante` | «Cód. repartidor» → vendedores/repartidores | Texto del PDF |
| `peso` | **No está en las consultas actuales** | Peso del PDF |
| `lineas[]`: artículo, descripción, unidad, cantidad | Líneas de venta (tipo artículo) unidas por «Nº carga» de la cabecera de pedido | Líneas de mercancía del PDF |
| `lineas[].ubicacion` (Z FRÍO / Z CÁMARA) | **No está en las consultas actuales** | `ZFRIO` en el PDF |
| `lineas[].refrigerado`, `crossDocking` | Atributos del artículo | No disponible |
| `procedencia` | `{fuente:'sql', leidoEn, actualizacionDW}` | `{fuente:'pdf', hash, importadoEn}` |
| `faltantes[]` | Campos sin dato | Campos que el PDF no trae |

Clave única: `(almacen, fecha, numeroCarga)`. La procedencia nunca forma parte de la clave, así que la misma carga de dos fuentes no se duplica.

## 3. Qué hace el Excel recuperado (CARGAS_ALMACEN_CROS_DOKING)

Análisis solo de estructura (consultas Power Query, modelo y tabla dinámica), sin leer filas de datos.

- **Origen:** réplica en Azure SQL de Business Central, sociedad de Coruña. El nombre de la base termina en «-prueba»: hay que confirmar que es la réplica de producción.
- **Tablas:** cabecera de carga EKA, cabecera y líneas de pedido de venta, artículos, clientes, vendedores/repartidores, rutas y clientes por ruta, y una tabla de control de actualización del almacén de datos.
- **Filtros aplicados:**
  - líneas con cliente y con nº de carga, de tipo artículo y pendientes de envío (`Ship = 0`);
  - excluye el tipo de albarán 7015561, las cargas que empiezan por «LD» y el camión `COBROS_MOB`.
- **Modelo:** líneas → artículos, clientes, clientes por ruta y repartidor. Medidas: `Cantidad = SUM(...)` y `Roturas = SUM(...)`.
- **Segmentaciones:**
  - *Refrigerado* y *Cross-Docking* son atributos del artículo;
  - *Almacén* es una columna calculada por ruta de cliente; su fórmula está comprimida y no se puede leer desde el fichero.
- **Hoja «Listado Productos»:** fecha, nº carga, repartidor, cliente, producto, descripción, unidad, observaciones y cantidad, filtrable por estado.
- **Credenciales:** no hay ninguna en el fichero. Power Query las guarda en el equipo, pendientes de actualizar.

## 4. Diferencias que hay que resolver antes de conectar

1. **Frío por artículo frente a frío por ubicación.** El Excel clasifica por el atributo *Refrigerado* del artículo. Los informes históricos y PRUEBA_3 usan la ubicación Z FRÍO / Z CÁMARA. La propuesta de FRÍO CORUÑA pide expresamente no asumir que todo lo refrigerado es FRÍO CORUÑA. Hay que comprobar si las líneas de venta tienen la ubicación y con qué valores.
2. **Solo pendiente de envío.** `Ship = 0` hace que la carga desaparezca de la consulta una vez enviada. Para reimprimir o consultar el histórico hará falta otra tabla (albaranes) o el PDF.
3. **Peso.** Las consultas no lo traen, y la hoja de reparto única elige la carga por peso acreditado. Sin un peso en SQL, esa regla solo funciona con PDF.
4. **Almacén.** Hay que recuperar la fórmula de la columna calculada (Power Pivot → Administrar → tabla ClientesRuta → Almacén) o confirmar otro campo.
5. **Formato del nº de carga.** Comprobar que coincide con el LP del PDF (`LPnn-nnnnnn`).
6. **Consolidación.** La hoja FRÍO CORUÑA suma por producto y repartidor. La regla histórica prohíbe sumar entre cargas distintas. Hay que decidir qué pasa si un repartidor tiene dos cargas el mismo día.
7. **Acceso técnico.** VISURA es una web estática y no puede conectarse directamente a Azure SQL sin exponer credenciales. Necesita un intermediario de solo lectura. Opciones, pendientes de aprobación: extracción programada a una tabla intermedia, función de servidor con usuario de solo lectura, o fichero exportado.

## 5. Siguientes pasos (sin código)

1. Actualizar la contraseña en el Excel (equipo del usuario) y comprobar que actualiza.
2. Capturar la fórmula de *Almacén* y, si es calculada, la de *Refrigerado* y *Cross-Docking*.
3. Para un día elegido, con autorización: comparar SQL y PDF carga a carga (líneas, unidades, ubicación, LP).
4. Con esa evidencia: cerrar el contrato, elegir el intermediario y decidir la regla de consolidación.
