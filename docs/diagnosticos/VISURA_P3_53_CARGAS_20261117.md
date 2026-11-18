# Por qué hay 53 cargas PRUEBA_3 en control-cargas-movil (antes 24) — 17/11/2026

Solo lectura: SELECT agregados sobre `visura_p3_*` y logs de API. Sin escrituras, sin códigos LP ni nombres.

## Hechos
- `visura_p3_cargas`: 53 filas, todas `COR_01_COR`, todas creadas el 17/11 (10:41–18:15 Madrid) por **un único usuario**.
- 53 códigos LP distintos, 0 códigos con varios hash, 0 filas repetidas → **no son duplicados**.
- 52 `sin_iniciar`, 1 `en_preparacion`. `visura_p3_operaciones` y `visura_p3_sesiones`: 1 fila cada una.
- Logs: exactamente 53 `POST /rpc/visura_p3_registrar_copia` (todas 200), sin inserts por otra vía:

| Hora Madrid | Altas | Dispositivo | Acumulado |
|---|---|---|---|
| 10:4x | 13 | iPhone | 13 |
| 14:3x | 10 | iPhone | 23 |
| 15:0x | 1 | Windows | **24** |
| 17:1x | 13 | iPhone | 37 |
| 18:1x | 16 | Windows | **53** |

## Causa
`syncCopies()` (src/prueba3-tiempos.mjs) se ejecuta tras cada importación y al iniciar, y registra **toda carga local con LP y huella PDF válida** mediante `visura_p3_registrar_copia`, aunque nadie la prepare. Las 29 nuevas son dos importaciones de PDFs nuevos de esta tarde (iPhone 17:1x y Windows 18:1x) con la misma cuenta. El contador sube con cada PDF importado, no con cargas preparadas.

## Lo que no indica
No hay duplicados por reimportación (mismo LP con otro hash), ni borrados, ni altas fuera de la app.

## A decidir (sin cambios aplicados)
Si se quiere que en Supabase solo aparezcan cargas que se preparan, el registro debería hacerse en el primer `inicio` y no en la importación. Requiere tu aprobación.
