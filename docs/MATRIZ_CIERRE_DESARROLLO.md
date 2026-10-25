# KONTROLA — Matriz de cierre y brechas funcionales

**Lectura inicial:** KONTROLA v0.3.7 (PR #2) y Control de Cargas Móvil v0.5.26 (referencia funcional). El código de KONTROLA está desarrollado en la rama; **no publicado en producción**. El estado «programado» no significa «validado en móvil».

| Función necesaria | Estado de código | Pendiente antes de producción |
|---|---|---|
| Inicio de sesión y roles operario/administrador | Programado | Validar Supabase Auth real en entorno autorizado |
| Selector y permisos de A Coruña / Ferrol | Programado | E2E en dos cuentas y RLS real |
| Consultar cargas sin reloj | Programado | Verificar tras pérdida de red en iPhone |
| Inicio explícito, cierre manual y cambio de carga | Programado | Verificar tiempos y recuperación real |
| Verificación por otro operario y cantidades línea a línea | Programado | Flujo E2E completo en dos teléfonos |
| Incidencias, historial y regularización manual confirmada | Programado | Validación operativa y auditoría de estados |
| Importación manual de PDF, hallazgos y correcciones | Programado para un PDF | Revisar PDFs reales autorizados de Coruña y Ferrol |
| Hash SHA-256 y bloqueo de PDF repetido | Programado y probado en PostgreSQL temporal | Comprobar con Supabase Storage real |
| Revisión documental sin sustituir cargas iniciadas | Programado y probado en PostgreSQL temporal | Confirmación de UI en navegador móvil |
| Historial visual y comparador v0.3.6 | Programado | Verificar E2E y acceso a PDF históricos |
| Historial filtrado y resúmenes CSV/impresión | Programado | Validar exportación con Excel y AirPrint |
| Fecha diaria Europe/Madrid y protección de almacén | Programado y probado automáticamente | Comprobar reloj/dispositivo real |
| Importación múltiple del Control de Cargas original | **Pendiente** | Diseñar cola que no descarte correcciones ni cree borradores inadvertidos |
| Impresión por lotes de originales | **Pendiente** | Definir política de exposición/permiso de originales por revisión y probar impresora |
| Estadística por operario con nombres identificables | **Parcial** | Definir consultas autorizadas de servidor y permisos sobre perfiles |
| Paso de cargas/historial local del Control de Cargas original | **Pendiente** | Inventariar móviles, copias JSON, OneDrive, PDFs, identificadores y evitar duplicados |
| Manual PDF con capturas auténticas | **Borrador** | Capturar pantallas de PWA en ejecución y verificar textos antes de producir PDF |
| Control de Tanques | **Oculto y pausado** | Solo integrar con autorización posterior |
| Unificación Auth/Supabase con INVENTA | **Estudio, no implementado** | Requiere propuesta, backups y autorización; INVENTA independiente |

## Prioridades de continuación

1. **P0 antes de uso empresarial:** no desplegar sin inventario de datos locales, matriz de acceso validada, permisos Storage probados y copia/restauración ensayada.
2. **P1 funcional:** importación PDF múltiple segura, impresión por lotes y estadísticas por operario, sin inventar reglas de picking o BC.
3. **P1 de aceptación:** ejecutar y firmar los escenarios de [PRUEBAS_ACEPTACION.md](PRUEBAS_ACEPTACION.md).
4. **P2 documentación:** cerrar [MANUAL_USUARIO_BORRADOR.md](MANUAL_USUARIO_BORRADOR.md), producir el PDF definitivo con capturas reales y distribuirlo solo tras aprobación.
5. **P2 lanzamiento:** plan de reversión, aprobación escrita para migraciones y despliegue, publicación gradual y supervisión inicial.

## Regla de seguridad

- No fusionar PR #2 a `main`, ni aplicar SQL real, ni alterar Control de Cargas original, INVENTA o Tanques por iniciativa propia.
- Las migraciones ya versionadas se prueban únicamente en PostgreSQL descartable de GitHub Actions.
- Una simulación local o una prueba unitaria no sustituye una prueba de Supabase Auth/Storage ni una impresión iPhone.
- Cuando se implemente el importador de lotes, cada PDF ha de quedar separado en importación propia, mantener su SHA-256, no auto-publicar y conservar correcciones, PDFs antiguos y registros horarios.
