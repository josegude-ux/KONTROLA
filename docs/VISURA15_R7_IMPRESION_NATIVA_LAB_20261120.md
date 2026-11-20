# VISURA PREPARA ALMACÉN — integración nativa de impresión R7 (LAB)

Proyecto: VISURA — DESARROLLO Y COORDINACIÓN. Módulo: 15 / impresión 215. Coordinación 00.
Orden vigente: VISURA-15-AUDITORIA-RECUPERACION-001. Matriz: VISURA-00-AUDITORIA-RECUPERACION-001. Distribución: VISURA-00-DIST-F2-001.
Base: KONTROLA main 30e9c87b429c8d20f951edba251c081d3beb2447 · versión 0.3.53.
Fuente: PRUEBA_3 R7, ZIP SHA256 4520d75685ae98ce919b77b5caa5fea595e659f0f83f370eed513ecf3660d5c4. PRUEBA_2 descartada.
Rama LAB: lab/visura15-impresion-r7-ux-integracion-20261120.
Estado: INTEGRACIÓN PARCIAL. NO GO PRODUCCIÓN. Sin merge, despliegue, SQL ni datos reales.

## Integrado de forma nativa

1. Misma Administración > Impresión. Pantalla compacta y responsive con identidad VISURA (#0B2647, #D52835), contadores y búsqueda.
2. Conservadas las RPC compartidas existentes kontrola_panel_cargas_impresion, kontrola_estado_impresion y kontrola_registrar_lote_impresion. Sin localStorage paralelo.
3. Selección automática de hasta 20 cargas nuevas por impresión pendiente, reimpresión manual y registro de listado generado, no impresión física certificada.
4. Composición previa al registro en servidor; conservadas validaciones previas de usuario, almacén y revisión de cargas.
5. Nuevo PDF vectorial dúplex, disponible por botón independiente: carátula y cada LP ocupan número par de páginas; reverso blanco cuando proceda. Modo normal intacto.
6. Destino solo si es explícito (no deducir de almacén o matrícula). Observaciones originales mostradas cuando se disponga de ellas, con escape HTML. FERROL ordenado por TOTAL acreditado, no por peso.

## Pruebas de código aisladas

13/13 PASS sobre fuentes exactas GitHub: sintaxis de módulos, selección incremental, destino no inferido, orden TOTAL, observaciones, PDF normal y dúplex, paridad de LP extensa, RPC existentes y responsive.
PDF normal portada+LP: 2 páginas. PDF dúplex portada+LP: 4 páginas. Portada+3 LP: 8 páginas. LP larga: 5 normal / 6 dúplex.
Test Node incluido: tests/visura15-native-print-r7.test.mjs. No se ha ejecutado npm test completo ni E2E ni impresora real.

## Faltantes y bloqueos

El código integrado todavía no sustituye la totalidad del motor independiente R7: impresión del original BC recortado antes de CONTROL ENVASES, hojas individuales FRÍO CORUÑA y anexos, matrícula por peso, hoja de reparto y comentarios manuales compartidos necesitan contrato autorizado y pruebas de compatibilidad.
El frontend filtra publicado_en hoy, mientras la migración histórica de la RPC de registro compara fecha de carga con hoy. Potencial discrepancia no verificada contra el esquema real Supabase. No ejecutar migraciones sin autorización.
Necesario contrastar en LAB el contrato real de RPC/Storage para permitir imprimir originales, destino, TOTAL, frío y comentarios sin mezclar COR1/COR2; comprobar con dos usuarios, pruebas Windows/Edge e impresora física.

Sin datos reales, contraseñas ni secretos en este expediente. Inventario y Tanques fuera de alcance.