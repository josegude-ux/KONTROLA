# VISURA PREPARA · ALMACÉN — Piloto LAB de selección v0.5.6

**Orden existente:** VISURA-15-AUDITORIA-RECUPERACION-001.  
**Contrato:** VISURA-15-CONTRATO-CONTROL-CARGAS-v056-001.  
**Fecha:** 09/11/2026 (Europe/Madrid).  
**Estado:** Código en rama aislada para pruebas; no validado en aplicación publicada, no integrado en las ramas paralelas, no desplegado, sin migraciones SQL aplicadas.

## Referencias fijadas

- Origen funcional: `josegude-ux/control-cargas-movil`, v0.5.6 «Seleccionar todas» en `9ef4235bbf0b81d67eb681da2900cbd7cd08ad86`. **No partir de versiones posteriores.**
- Destino: `josegude-ux/KONTROLA`, solo modalidad **PREPARA · ALMACÉN**.
- Punto de partida aislado: `integration/visura-prepara-b01-cierre-compatibilidad-20261027` a `65a9ddc343921f6be8844476903748a493881a8f`.
- Rama de esta actuación: `lab/visura15-paridad-control-cargas-v056-20261109`.
- TANQUES no se ha tocado; ni INVENTA, ni `main`, ni producción, ni Supabase real ni Business Central.

## Cambios efectivos de código

- `src/batch-selection-v056.mjs`: normalización/búsqueda, «Seleccionar todas» entre las elegibles del almacén, «Marcar visibles» conforme a filtro, conciliación de selección por permisos y evaluación del límite operativo.
- `src/admin-print-batch.mjs`: controles conectados; selección preservada al filtrar, selección limpiada al cambiar almacén, perfil, modo reimpresión y refrescar. Mantiene preflight de cambios sobre el servidor antes de registrar el lote.
- `index.html`: barra de búsqueda, tres controles de selección y acceso al selector por grupos.
- `tests/batch-selection-v056.test.mjs`, `tests/admin-print-batch.test.mjs`, `tests/archive-period.test.mjs`: tests de selección, búsqueda, conservación de selección, seguridad y bloques.
- `.github/workflows/visura15-paridad-v056-lab-ci.yml`: CI con pruebas sin backend real, ni credenciales, ni escrituras en producción.

## Comportamientos que deben probarse

1. En el almacén autorizado, publicar en un entorno de pruebas 3 cargas **ficticias** A/B/C con documentos de prueba, y abrir Administración → Imprimir varias hojas procesadas.
2. Buscar A: solo A visible. «Marcar visibles»: A queda seleccionada. Buscar B: A permanece seleccionada aunque oculta; marcar visibles: A y B seleccionadas.
3. «Seleccionar todas»: selecciona todas las cargas elegibles del almacén, **no solo las filtradas**. «Desmarcar»: limpia todas, incluidas las ocultas por búsqueda.
4. Una carga de otro almacén, sin permisos, no debe aparecer en la selección; el cambio de almacén descarta la selección antigua.
5. En lote de 1 a 20 hojas comprobadas, generar vista previa y comprobar carátula, hojas separadas, datos y nombre de archivo sin usar registros reales.
6. Con más de 20 elegibles, «Seleccionar todas» debe marcar las 21+ sin ocultar la selección, pero **no debe registrar ni generar un lote parcial**. «Siguiente grupo» permite trabajar con un máximo de 20 en cada intento.
7. Comprobar reimpresión explícita y que cambios entre selección y preparación se abortan en el preflight.
8. Comprobar diseño responsive y guardado PDF en navegadores reales; las pruebas automáticas no sustituyen esta comprobación.

## Limitaciones aún pendientes, no ocultar

- **Paridad funcional parcial.** Este primer cambio resuelve selección y búsqueda del lote administrativo. Todavía no reproduce el bloque v0.5.6 «original PDF recortado a MERCANCÍA + hoja resumen por cada carga»: el módulo actual solo imprime las **hojas procesadas**, no los originales. Esta diferencia exige una tarea separada con recorte fiable y exportación A4 sin envases/palés/firmas.
- **Límite de 20 por PDF**: no ampliado. La v0.5.6 permitía seleccionar e imprimir un número arbitrario, pero PREPARA tiene un backend/registro empresarial de lotes. Ampliar requerirá definir preflight completo, idempotencia, memoria y control de errores; no se han improvisado cambios del backend.
- El subconjunto B01 elegido no incorpora por sí solo toda la conciliación de **preparación y verificación paralelas** de las PR #58/#60/#61. No alterar este requisito; verificar e integrar expresamente antes de aceptar PREPARA al completo.
- Almacenamiento compartido, roles y rutas de impresión pueden requerir migraciones y datos de ensayo. Ninguna prueba con cuentas reales, dos dispositivos, servidor operativo ni impresora se ha ejecutado.
- El sistema muestra **cargas publicadas hoy** elegibles para esta pantalla; «Todas» se limita a ese universo, no a todas las cargas históricas.

## Evidencia automática

- GitHub Actions: [ejecución validada #42668380863](https://github.com/josegude-ux/KONTROLA/actions/runs/42668380863): **success** para el commit `d5198ba23b39566309164c338bd490a52e62b141`.
- Etapas de ese run: `npm ci`, sintaxis JS, `node --test tests/batch-selection-v056.test.mjs tests/admin-print-batch.test.mjs` y `npm test` de regresión sin servidor: todas aprobadas.
- CI puede repetirse tras incorporar esta nota. El resultado del run citado **no incluye** cambios posteriores a ese commit, que deben comprobarse individualmente.
- No hay capturas de navegador reales ni aceptación del usuario.

## Continuidad sin duplicar fases

Conservar esta rama y su PR para terminar **primero** las pruebas del selector contra A/B/C ficticios; después incorporar recorte/exportación de PDF original MERCANCÍA en una iteración controlada, sin alterar los originales ni incorporar código posterior defectuoso de Control de Cargas. Revisar en paralelo los contratos de PR #58 antes de considerar la equivalencia de la aplicación completa.

**Prohibido fusionar, publicar, aplicar SQL, registrar documentos reales o modificar producción por el mero hecho de pasar CI.**
