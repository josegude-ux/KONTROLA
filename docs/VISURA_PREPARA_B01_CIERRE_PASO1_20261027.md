# VISURA PREPARA — cierre técnico PASO 1 (27/10/2026)

**Estado:** integración de código en rama aislada, pendiente de superar CI de este HEAD. **No** implica aprobación de PASO 2, despliegue, migración ni activación de RPC empresariales.

## Procedencia comprobada
- Repositorio: `josegude-ux/KONTROLA`; rama predeterminada `main`.
- Base consolidada del Bloque 01: `feat/visura-prepara-b01-correcciones-neto-cero-20261027`, HEAD inicial `861dce15ea8dceba94e2f370fad8f0155c34e215` (PR #75).
- El merge de PR #79 integró el informe propuesto por PR #76 en esa rama de desarrollo. **No incorporar otra vez #76 ni #79**.
- Hotfix de capacidad PR #74: `fix/prepara-recuperar-8g-4e-20261027` / `e5aacd809b80cd9457bd83b9cfc3f03a3774469d`. Es divergente respecto a B01 (merge-base `e453c6e9cd04b7e92daea54bb95bcc53c2fb5c16`). **No fusionar íntegramente #74**.
- Rama aislada de conciliación: `integration/visura-prepara-b01-cierre-compatibilidad-20261027`, basada exclusivamente en el HEAD inicial anterior.
- Se revisaron metadatos de PR #60, #61, #62, #63, #64, #65, #66, #68, #69, #70, #72, #74, #75, #76 y #79. Son una cadena de dependencias y pruebas; no re-fusionarlas ni cerrarlas desde este chat.

## Diagnóstico y resolución específica #74
Gran parte de #74 ya existía en B01: parser G/E/P, campo europeo en JSONB, menú y selección de segundo formato. **Diferencias reales corregidas en esta rama:**
1. Un `huecos_palets_total=0` genérico no bloquea la relectura autorizada del PDF original (ruta y código comprobados, descarga local, sin escritura).
2. Un `8G 4E` o `6G 1E` explícito del PDF recuperado tiene prioridad sobre un cero genérico guardado, sin desplazar una revisión vigente con capacidad positiva. Se conserva la observación de la revisión y la fuente real del dato.
3. Un cero aislado, o un desglose formado solo por ceros, no acredita capacidad; las cantidades de palés anteriores y actuales siguen siendo obligatorias para obtener viabilidad.
4. El selector E/P se muestra en modo desglose y limpia sus tres campos al alternar; el cero sin acreditar no se autopresenta como capacidad disponible.
5. Caché PWA aislada `kontrola-integral-visura-v074-fijas-ge-cierre` y tests de versión alineados sin tocar la versión comercial ni publicar.
6. Pruebas nuevas para parser, relectura, prioridad de revisión y PDF, incompletitud, formatos separados, preservación administrativa y protección del inicio.

**Sin cambios** a SQL propuestos, esquema de datos, RLS, roles, usuarios, Business Central, informes exportados ni permisos reales.

## Protección del Bloque 01 y posiciones fijas
Se mantienen la importación múltiple con fallos aislados, reintentos auditados, provisionales, hash, justificación de cambios, evidencia BC por línea y neto cero, archivo e historial, preparación/verificación independientes y administración. El informe incorporado en #79 conserva informes separados por almacén, stock BC independiente, negativos/decimales, CSV, XLSX, PDF multipágina y la RPC exclusivamente como propuesta en `supabase/proposals/visura_posiciones_fijas_central_rpc.sql`.

No interpretar dato ausente como cero, ni G/E/P como equivalentes. Los valores G/E/P son **capacidad del camión**, no palés necesarios de esta carga. No efectuar cálculos si falta alguno de los datos esenciales.

## Validaciones y límites
- Pruebas históricas del HEAD #79: 325 Node, PostgreSQL 16 y 6 Chromium, según workflows de integración. **Estos resultados no cubren las correcciones actuales**.
- El cierre solo será validado al comprobar las acciones CI y los resultados sobre el HEAD de esta rama; incluir regresión Node y PostgreSQL 16 aislado. Chromium/PDF/XLSX del estado anterior deberán revisarse y repetir cuando aplique.
- No se ha examinado un PDF auténtico 8G4E ni ejecutado Safari iOS físico. Los fixtures son sintéticos. No acreditar esos ensayos por inferencia.
- El contenedor de este chat no puede resolver el host GitHub para clonar el repositorio: la ejecución local de suites no está disponible; se solicita su ejecución por GitHub Actions en PR de esta rama.
- No activar `kontrola_admin_posiciones_fijas` en Supabase empresarial ni migrar arquitectura compartida. No fusionar rama operativa ni desplegar sin autorización.

## Siguiente paso técnico
Ejecutar y verificar CI del HEAD definitivo en PR aislada; corregir fallos y documentar resultados. Si queda satisfactoria, solicitar revisión de integración a los responsables y planificar PASO 2 **sin considerarlo activado**.