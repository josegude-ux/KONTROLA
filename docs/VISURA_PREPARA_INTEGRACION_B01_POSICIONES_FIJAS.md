# Integración VISURA PREPARA Bloque 01 + informe de posiciones fijas

Integración de **código de pruebas**, autorizada por el usuario el 27/10/2026. No incluye ninguna escritura en Supabase, Business Central, autorización de producción ni despliegue.

## Procedencia preservada
- Base Bloque 01: PR #75, rama `feat/visura-prepara-b01-correcciones-neto-cero-20261027`, commit `b7827629089e33ebf5b95bd509f430d69a07dc61`, sin modificar la rama original.
- Informe: PR #76, rama `feat/visura-prepara-admin-posiciones-fijas-20261027`, commit `fb723501e60597f70197e59cc895818203d2403d`, sin modificar la rama original.
- Rama nueva y exclusiva: `integration/visura-prepara-b01-posiciones-fijas-20261027`; integración por archivos del informe y cambios mínimos al controlador `src/admin.mjs`. La navegación, importación múltiple, evidencia BC, auditoría, `palletsEuropean`, `refreshOldLoads` y resto de B01 conservan su lógica.
- PR #74, hotfix 8G/4E `e5aacd809b80cd9457bd83b9cfc3f03a3774469d`, permanece intacta **y no incluida como merge**. B01 ya tiene el campo `palletsEuropean`, pero esto NO certifica equivalencia total de #74.
- `sw.js` conserva recursos B01, añade los cuatro módulos del informe y distingue la caché de ensayo para evitar cachear inadvertidamente una versión anterior. `version.json` y reglas existentes de actualización de B01 intactos.
- Workflows de integración Node/PG16, RPC PostgreSQL desechable y Chromium responsive/XLSX/PDF se ejecutan solo en esta rama/PR de integración.
- SQL de RPC ubicado exclusivamente en `supabase/proposals`; **no aplicado** a ningún entorno real. Si falta la fuente central acreditada, la pantalla debe advertir y no inventar existencias.

## Verificaciones y barreras
Revisar GitHub Actions del último HEAD y todos los tests. Este ensayo no valida Safari iPhone real ni integra usuarios/almacenes reales. Antes de integrar en una rama operativa, comprobar conflictos con PR #74, PR en paralelo y service worker; decidir y autorizar separadamente migración de identidades, RLS, despliegue y datos de producción. Evitar merges a ramas de otros responsables.
