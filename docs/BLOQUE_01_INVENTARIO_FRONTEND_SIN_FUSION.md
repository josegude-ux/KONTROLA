# VISURA PREPARA — Bloque 01 · Contratos frontend pendientes de coexistencia

**Fecha:** 27/10/2026. **Resultado:** examen estático satisfactorio de los orígenes, **frontend NO integrado**.

## Referencias fijadas

- Flujos paralelos: `feat/visura-prepara-integracion-pr49-pr58-20261026` — `18c46b0c742bae9321f08603da40dfd1e7d76323`.
- Interfaz adaptable: `feat/visura-prepara-b01-responsive-20261027` — `d66ecad37a13c3af6dafe2463236a1e2b874f77a`.
- Importación/documentos: `feat/visura-prepara-b01-totales-bc-auditados-20261027` — `13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf`.
- Preflight independiente: `audit/visura-prepara-b01-preflight-cruces-20261027` — PR #70, en borrador.

## Inventario técnico confirmado

El analizador `scripts/preflight-b01-frontend.mjs` inspecciona los cuatro archivos `index.html`, `styles.css`, `src/app.mjs` y `src/admin.mjs` de cada línea **por SHA inmóvil con `git show`**. Verifica que los módulos importados existan con `git cat-file -e`, identifica IDs HTML exclusivos y duplicados, referencias `$("elementId")` sin nodo, y presencia de diez contratos protegidos. No combina archivos ni prueba una UI inexistente.

**Resultados confirmados en [CI 40502771216](https://github.com/josegude-ux/KONTROLA/actions/runs/40502771216):** ambos jobs SUCCESS (inventario y SQL cruzado); diez contratos de frontend presentes en su línea responsable; diez no se reúnen en las tres ramas; cero errores de referencias DOM y duplicados detectados en los archivos examinados. No extrapolar a pruebas autenticadas.

| Protección | Origen donde se conserva | No presente en línea documental |
|---|---|---|
| Preparación y Verificación paralelas | Paralela y responsive | Sí |
| Matriz de pasillos | Paralela y responsive | Sí |
| Descarga A4 compacta | Paralela y responsive | Sí |
| Impresión específica COR 1 | Paralela y responsive | Sí |
| Previsualización COR 2 | Paralela y responsive | Sí |
| Escritorio amplio `max-width:1480px` | Responsive | Sí |
| Bandeja provisional con PDF sin LP | Documental | No; falta en paralela y responsive |
| Corrección manual auditada con evidencia BC | Documental | No; falta en paralela y responsive |
| Recuperación de cargas anteriores | Documental | No; falta en paralela y responsive |
| Contraseña individual | Documental | No; falta en paralela y responsive |

**IDs HTML presentes únicamente en la línea documental respecto de la paralela:** `browseOldLoads`, `cargasAntiguas`, `choosePasswordForm`, `oldLoadsList`, `ownPassword`, `ownPasswordConfirm`, `ownPasswordStatus`, `pilotRoster`, `provisionalPdfList`, `provisionalPdfSection`, `truckCapacityPLabel`, `truckCurrentPLabel`, `truckPreviousPLabel`, `truckSecondKind`.

**IDs HTML presentes únicamente en la paralela respecto de la documental:** `aisleMatrixSummary`, `aisleMatrixTable`, `downloadCompactA4`, `previewCor2Detail`, `printCor1Pack`, `saveCompactA4Admin`, `warehousePrintActions`.

Los IDs indican posibles pérdidas de interfaz si se copiara un archivo de una rama a otra. No se debe tratar como un diff que pueda aplicarse automáticamente: `src/app.mjs`, `src/admin.mjs`, `index.html` y `styles.css` deben reconciliarse por comportamiento. No borrar interfaces ni restaurar dependencias obsoletas.

## Ejecución y pruebas

- `scripts/preflight-b01-frontend.mjs`: genera `artifacts/preflight-b01-frontend.md` y `.json` con estado `FRONTEND_NOT_INTEGRATED`, y detiene si alguna rama avanzó o perdió un contrato de origen.
- `tests/preflight-b01-frontend.test.mjs`: comprueba ids/imports, diferencias entre ramas, referencias DOM huérfanas, ids duplicados y desaparición de un contrato aprobado.
- CI `.github/workflows/visura-prepara-b01-preflight-ci.yml`: ejecuta inventario y pruebas y guarda el informe de frontend junto a los artefactos de auditoría por un máximo de siete días.
- La primera ejecución [40502652767](https://github.com/josegude-ux/KONTROLA/actions/runs/40502652767) mostró un error **del propio auditor** al sobrescribir con la palabra `exists` el contenido en memoria de `src/admin.mjs` al verificar imports. Fue corregido sin tocar código funcional. [40502771216](https://github.com/josegude-ux/KONTROLA/actions/runs/40502771216) **SUCCESS**.

## Próximos ensayos seguros

- Revisar contrato de nombres RPC utilizados por `src/app.mjs` y `src/admin.mjs` frente a funciones SQL de origen, siempre en lectura.
- Revisar coherencia de versión/caché PWA y eventos DOM antes de una futura integración.
- Únicamente con autorización adicional: integrar realmente las ramas en entorno aislado, correr tests con usuarios de prueba y comparar visualmente a 320/390/768/1024/1440/1920 px.
- Mantener impresión A4, identificación LP, roles, historial, preparador único y BC manual; Bloque 02 fuera de alcance.

**No se ha fusionado, desplegado, cambiado Supabase ni manipulado Business Central.**
