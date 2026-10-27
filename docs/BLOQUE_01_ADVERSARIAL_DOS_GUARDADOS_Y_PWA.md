# VISURA PREPARA — Bloque 01 · Auditoría de dos revisiones consecutivas

**27/10/2026 | Diagnóstico aislado, sin autorización de merge ni despliegue.**

## Coincidencia detectada y protección del trabajo existente

Mientras se desarrollaba en esta rama independiente una primera mitigación por línea desde PR #69, se verificó que **PR #72** (`feat/visura-prepara-b01-evidencia-por-linea-20261027`, SHA `8cdab594088eba9960968df6d0be6352733c82ea`) ya había implementado una mitigación más extensa con control del origen en el servidor. La rama experimental **NO se ha presentado como nueva PR** y **no debe integrarse para sustituir PR #72**. Los archivos experimentales de cobertura por línea quedan únicamente como referencia de laboratorio.

## Nuevo caso adversario reproducido en PR #72

`tests/integration/b01-two-step-origin-audit.sql` utiliza solo el LP ficticio `LP26-95003` con dos artículos de cantidades originales 2 y 3 y total PDF 5. Bajo las funciones originales de la PR #72:

1. Primer guardado: cantidad 4 con origen 2 en artículo 1, cantidad 9 sin campo `pdfOriginal.qty` en artículo 2, total final 13 y sin correcciones. La revisión queda pendiente, pero el servidor guarda las cantidades alteradas.
2. Segundo guardado: exactamente los mismos artículos más evidencia BC válida **solo del artículo 1**. El helper BC omite el segundo artículo por carecer de `pdfOriginal.qty` y el guard de origen compara con los datos ya alterados del guardado pendiente.
3. La RPC `kontrola_corregir_importacion` devuelve `aprobada` y `kontrola_publicar_importacion` publica la cantidad 9 sin conservar el origen 3 ni justificar ese cambio.

**Prueba:** [GitHub Actions 40506956592](https://github.com/josegude-ux/KONTROLA/actions/runs/40506956592) **SUCCESS como reproducción de fallo**, en PostgreSQL 16 temporal. La prueba exige el marcador `KONTROLA_PR72_ADVERSARIAL_FINDING_TWO_STEP_UNAUDITED`; no es una suite que certifique que el programa sea seguro.

**Comunicación al responsable:** el hallazgo se registró en [comentario de PR #72](https://github.com/josegude-ux/KONTROLA/pull/72#issuecomment-6442335454), sin cambiar ningún archivo de la PR.

**Causa:** `kontrola_bc_origen_preservado` compara contra el `carga_datos` más reciente, que puede contener datos modificados en una revisión aún no aprobada. Se necesita anclar el origen a datos inmutables del primer procesamiento/registro de la importación y añadir una regresión entre dos guardados. La corrección debe conservar los casos permitidos de reprocesamiento y lectura PDF; diseñarla corresponde al responsable de PR #72.

## Verificación complementaria PWA, solo lectura

Se compararon `sw.js`, `version.json`, `src/config.mjs`, `scripts/build-vendor.mjs`, inventarios Git y `.github/workflows/pages.yml`.

- Rama operativa `cursor/verificacion-fisica-cargas-8ba0`, SHA `042724a90b897c9c5d289c52cb36ed970bec9dde`: versión `0.3.45`, caché `kontrola-integral-visura-v078`.
- Rama de flujos paralelos y responsive: versión `0.3.44`, caché `v077`.
- Rama documental PR #69: versión `0.3.40`, caché `v073`.
- El `vendor/pdf-lib.min.mjs` ausente como blob Git en línea paralela **se genera** con `scripts/build-vendor.mjs` en el proceso Pages antes de preparar `dist/vendor`. No declarar un fallo PWA solo por su ausencia del árbol fuente.
- Futuras reconciliaciones NO deben restaurar sin querer la versión/caché anterior. Pages solo tiene disparador de publicación para la rama operativa, no para estas PR.

No se probó una PWA combinada en navegador instalado; el control de versión en el despliegue final sigue pendiente.

## Continuidad

- **Ramas de origen intactas:** PR #60, #61, #69, #70, #72.
- **Esta rama experimental:** `feat/visura-prepara-b01-auditoria-cantidades-completa-20261027` basada en PR #69, sin PR propia. Mantener como referencia y evitar fusionarla por solapamiento con PR #72.
- **No aplicar SQL ni cambios a Supabase real, GitHub Pages, BC o producción.**
- **Siguiente tarea segura:** comprobar en lectura las nuevas correcciones que pudiera incorporar el responsable de PR #72; reejecutar el caso adverso solo si cambia su HEAD, sin modificarlo. Una corrección de la seguridad de origen exige pruebas de revisiones consecutivas, no únicamente pruebas unitarias con un JSON.
