# VISURA PREPARA · Bloque 01 — Contratos RPC de ramas documentales

**Fecha:** 27/10/2026. **Tipo:** verificación estática reproducible y sin cambios de servidor.

## Fuentes inspeccionadas

Ramas con SHA inmóviles de PR #60, #61 y #69; textos de `src/app.mjs`, `src/admin.mjs` y `supabase/proposals/kontrola_pdf_provisionales_b01.sql` leídos con `git show`. No se creó rama combinada ni se consultó el servidor Supabase real.

**Resultados de [CI 40503306034](https://github.com/josegude-ux/KONTROLA/actions/runs/40503306034): SUCCESS**, tanto el job del inventario/contratos como las pruebas conjuntas PostgreSQL ficticias.

Los clientes de ambas líneas invocan 20 nombres RPC comunes. La rama documental añade exactamente tres RPC, con funciones propuestas y declaración `REVOKE ALL ... FROM PUBLIC, anon` más `GRANT EXECUTE ... TO authenticated`:

- `kontrola_reservar_provisional_pdf`
- `kontrola_completar_provisional_pdf`
- `kontrola_identificar_provisional_pdf`

La mera presencia de `GRANT` no prueba autorización por administrador ni políticas RLS de almacén; esos controles se ensayan en las pruebas PostgreSQL de cada PR y requieren revisión de permisos antes de cualquier puesta en producción.

## Herramientas añadidas

- `scripts/preflight-b01-rpc.mjs`: compara nombre de llamadas `client.rpc(...)` en las tres ramas, exige que no haya diferencias RPC inesperadas y comprueba que las tres nuevas funciones documentales mantengan definiciones y sentencias de revocación/concesión esperadas.
- `tests/preflight-b01-rpc.test.mjs`: cubre deduplicación, diferencias entre ramas, detección de ausencia de `REVOKE`/GRANT y estado inequívoco `NO INTEGRADO`.
- Workflow de PR #70: ejecuta ambos y adjunta artefactos `preflight-b01-rpc.md/json` en CI, sin alterar archivos funcionales de origen.

## Estado de compatibilidad

La disponibilidad de llamadas RPC demuestra únicamente **presencia estática**. No prueba que el frontend combinado funcione ni reemplaza las pruebas SQL cruzadas de las sesiones independientes. La matriz de frontend [`BLOQUE_01_INVENTARIO_FRONTEND_SIN_FUSION.md`](BLOQUE_01_INVENTARIO_FRONTEND_SIN_FUSION.md) contiene las funciones que se perderían si se escogiera directamente un archivo de una sola rama.

**Siguiente revisión segura:** seguridad de correcciones de cantidades originales frente a BC, en base PostgreSQL de prueba, con escenarios adversos antes de autorizar integración.

**No se han fusionado PR, aplicado SQL a Supabase ni desplegado nada.**
