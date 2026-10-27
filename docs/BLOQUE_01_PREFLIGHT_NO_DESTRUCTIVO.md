# VISURA PREPARA · Bloque 01 — Preflight no destructivo de compatibilidad

**27/10/2026 · Rama de auditoría:** `audit/visura-prepara-b01-preflight-cruces-20261027`
**Base exacta de lectura de la cadena documental:** commit `13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf` (PR #69).
**Líneas contrastadas:** PR #60 (commit `18c46b0c742bae9321f08603da40dfd1e7d76323`), PR #61 (`d66ecad37a13c3af6dafe2463236a1e2b874f77a`) y PR #69. Todas permanecen en borrador.

## Situación verificada

Las líneas de desarrollo son **divergentes**, no una sucesión lineal de ramas:

- `feat/visura-prepara-integracion-pr49-pr58-20261026` y la cadena documental PR #69 comparten ancestro `e453c6e9cd04b7e92daea54bb95bcc53c2fb5c16`.
- La rama responsive PR #61 y la documental PR #69 comparten el mismo ancestro. La última consulta a GitHub informó estado `diverged`.
- La rama documental contiene correcciones de cantidades, provisionales y contratos de datos, pero **no** el módulo `src/parallel-workflows.mjs` que existe en la línea paralela.
- El CSS de la línea documental conserva el `max-width:1020px` de la base; la línea responsive posee el override de escritorio `max-width:1480px` bajo `@media screen`. Por tanto los ensayos por separado no prueban una pantalla final que incorpore ambas mejoras.
- `tests/integration/run.sh`, `index.html`, `styles.css`, `docs/CONTINUIDAD.md` y otros archivos requieren una revisión de solapamientos; no se han integrado.

## Implementación de auditoría segura

- `scripts/preflight-b01.mjs` lee exclusivamente objetos Git de tres SHA fijados mediante `git show`, `git diff`, `git merge-base` y `git rev-parse`. No usa `git merge`, `git merge-tree`, `git rebase`, `git cherry-pick`, checkout sobre ramas operativas, ni comandos de escritura en remoto.
- Detecta si alguna rama avanza respecto al SHA fijado y **detiene el diagnóstico antes de usar datos desactualizados**.
- Produce `artifacts/preflight-b01.md` y `artifacts/preflight-b01.json` solo en el ejecutor efímero de GitHub Actions; no sube informes a repositorios ni modifica archivos empresariales.
- Distingue contratos existentes por separado de funcionalidades que aún no coexisten en una misma rama.
- `tests/preflight-b01.test.mjs` comprueba los resultados con fixtures, incluido que un contrato faltante no pase inadvertido y que un informe satisfactorio nunca declare integración autorizada.
- `.github/workflows/visura-prepara-b01-preflight-ci.yml` obtiene las referencias de GitHub **solo en lectura**, ejecuta los tests y adjunta los informes como artefactos (retención de siete días).
- **Un workflow SUCCESS solo certifica que el examen de ramas terminó y los contratos fuente esperados se hallaron.** No certifica que las PR puedan fusionarse ni que la aplicación esté funcionalmente integrada.

## Compatibilidad que queda pendiente

1. Componer pruebas de los flujos paralelos con la cadena documental en PostgreSQL temporal **solo cuando exista autorización específica para la integración técnica**, sin tocar producción.
2. Revisar manualmente las zonas comunes de `index.html`, `styles.css`, `src/app.mjs`, `src/admin.mjs`, `tests/integration/run.sh` y `docs/CONTINUIDAD.md`; conservar todas las funciones existentes.
3. Verificar por separado que los cambios de controles de publicación de PR #69 no interfieren con el inicio independiente de Verificación de PR #58/#60.
4. Ensayar la interfaz **real combinada** en escritorio, tablet y móvil, con controles táctiles y anchura adecuada, en entorno autorizado.
5. Conservar el picking de Business Central, un único preparador, número de palets informativo y mecánica detallada de Verificación reservada al Bloque 02.

**Bloqueo:** ninguna de estas instrucciones autoriza fusionar ni desplegar. El resultado correcto de este preflight es **NO INTEGRADO / PENDIENTE DE VALIDACIÓN CONJUNTA** mientras las líneas permanezcan separadas.

**Siguiente tarea segura:** verificar la CI y artefactos del último HEAD de auditoría, documentar cualquier contrato faltante y dejar referencia exacta de la rama, commit y ejecución. No desplegar ni modificar datos reales.
