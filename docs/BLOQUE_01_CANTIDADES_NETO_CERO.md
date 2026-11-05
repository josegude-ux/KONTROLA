# VISURA PREPARA · Bloque 01 — Cantidades con total neto compensado y auditoría de eventos

**Fecha:** 27/10/2026. **Estado:** propuesta independiente, sin integrar ni aplicar a Supabase real.

## Por qué es necesario

Tras PR #72 (evidencia BC por cada línea) quedaba un escenario distinto: una carga con dos líneas leídas del PDF como **2+3=5** podía corregirse a **4+1=5** manteniendo el total global. Si la propuesta SQL solo exigía evidencia adicional cuando `actual_total != declared_total`, era posible que una corrección BC incompleta o incluso un cambio sin ningún evento pasaran inadvertidos.

La corrección está apilada sobre el HEAD exacto `8cdab594088eba9960968df6d0be6352733c82ea` de PR #72, en la rama `feat/visura-prepara-b01-correcciones-neto-cero-20261027`. No modifica PR #72 ni PR #69.

## Implementación propuesta

- `supabase/proposals/kontrola_bc_neto_cero_b01.sql` endurece la RPC administrativa de revisión: si hay alguna corrección declarada como `dato_pdf_bc`, exige que **todas** las cantidades alteradas queden justificadas, incluso cuando el total no cambia. Revisa también el valor `pdfOriginal` guardado.
- `supabase/proposals/kontrola_qty_sin_evento_b01.sql` incorpora una verificación de **cada cambio efectivo de cantidad** respecto al registro previo, exigiendo evento de tipo `lectura_pdf` o `dato_pdf_bc`, línea, valor anterior y posterior, justificación, fecha y autor de la sesión administrativa. Si falta, la RPC **rechaza el cambio antes de persistirlo**: así no se puede aprobar en un intento posterior tratando la cantidad manipulada como origen.
- `src/document-review.mjs` añade un error de revisión para evidencia BC incompleta y para cambios de cantidad sin corrección, aunque el total siga coincidiendo.
- `tests/quantity-zero-net.test.mjs` comprueba ambos hallazgos en frontend y confirma que correcciones de lectura del PDF completas no se confunden con evidencia BC.
- `tests/integration/bc-zero-net.sql` prueba carga ficticia `LP26-96001`, total 5, rechazo de evidencia BC parcial y publicación con dos evidencias.
- `tests/integration/quantity-audit-event.sql` prueba la carga ficticia `LP26-96002`: rechazo sin evento, no persistencia de edición incompleta, rechazo de autor distinto y aprobación de dos correcciones genuinas de lectura del PDF.
- `.github/workflows/visura-prepara-b01-neto-cero-ci.yml` ejecuta Node y SQL en PostgreSQL 16 temporal local, con regresiones de PR #69/#72, sin bases empresariales.

## Resultado verificado

**[GitHub Actions #40508839934](https://github.com/josegude-ux/KONTROLA/actions/runs/40508839934): SUCCESS**, tras corregir un test que intentaba consultar desde `authenticated` una función interna sin `GRANT`. No se amplió el permiso de esa función.

Las suites anteriores y las nuevas de seguridad pasaron con datos ficticios. La resolución `KONTROLA_B01_CANTIDAD_EVENTO_INTEGRIDAD_OK` confirma rechazo de cantidad sin evento y conservación del borrador original, más correcciones legítimas con documentación.

## Compatibilidad y límites

- Sigue siendo necesario revisar el tratamiento de **altas o bajas de referencias**, ya que este refuerzo examina cantidades por índice y respeta provisionalmente el flujo preexistente cuando cambia la longitud del listado. No reclamar cobertura de esas operaciones.
- No constituye una migración consolidada: el orden final de propuestas SQL junto a Preparación/Verificación paralelas requiere integración autorizada y tests cruzados.
- No sustituye el contraste manual con Business Central, ni el control de roles/RLS real ni los ensayos autenticados de la interfaz unificada.
- El estado de todas las ramas de origen permanece sin fusionar ni desplegar.

**Restricciones observadas:** ningún cambio en Business Central, Supabase productivo, almacenamiento real ni Bloque 02.
