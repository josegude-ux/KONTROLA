# KONTROLA — Matriz de cierre y brechas funcionales

**Lectura inicial:** KONTROLA v0.3.15 (PR #2) y Control de Cargas Móvil v0.5.26 (referencia funcional). El código de KONTROLA está desarrollado en la rama; **no publicado en producción**. El estado «programado» no significa «validado en móvil».

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
| Importación múltiple del Control de Cargas original | **Programada v0.3.8** | Pruebas E2E de hasta 20 documentos, memoria móvil, confirmaciones y acceso a revisiones pendientes |
| Impresión por lotes de originales | **Pendiente** | La impresión conjunta v0.3.11 SOLO cubre hojas procesadas; pendiente combinación vectorial y validación iPhone de originales |
| Estadística por operario con nombres identificables | **Programada v0.3.9** | Validar privacidad, fechas y permisos RPC en Supabase autorizado y comprobar iPhone |
| Paso de cargas/historial local del Control de Cargas original | **Auditoría 0.3.10 y conciliación 0.3.13; migración pendiente** | Comparar códigos y metadatos por almacén autorizado; cotejar PDF IndexedDB, historial de horarios y OneDrive por separado; plan de migración reversible |
| Manual PDF con capturas auténticas | **Borrador** | Capturar pantallas de PWA en ejecución y verificar textos antes de producir PDF |
| Control de Tanques | **Oculto y pausado** | Solo integrar con autorización posterior |
| Unificación Auth/Supabase con INVENTA | **Estudio, no implementado** | Requiere propuesta, backups y autorización; INVENTA independiente |


| Impresión conjunta de hojas procesadas | **Programada v0.3.11** | Probar paginación real Safari/AirPrint y límite de 10 cargas |
| Auditoría de backups JSON legacy | **Programada v0.3.10** | No migra datos; cotejar con teléfonos/OneDrive y obtener permisos antes de actuar |
| Conciliación de backup con panel autorizado | **Programada v0.3.13 (solo lectura)** | Comprobar con dos perfiles y móviles; no asumir PDF idénticos ni importar registros |

| Inventario local de PDFs legacy | **Programado v0.3.14** | Validar acceso desde el mismo origen/contenedor; un iPhone con PWA separada puede no compartir IndexedDB |
| Recuperación local individual PDF legacy | **Programada v0.3.15** | Validar Safari/Archivos, SHA-256, privacidad, permisos y copias antes de migrar |

## Prioridades de continuación

1. **P0 antes de uso empresarial:** no desplegar sin inventario de datos locales, matriz de acceso validada, permisos Storage probados y copia/restauración ensayada.
2. **P1 funcional:** validar importación PDF múltiple, estadísticas por operario y lote de hojas procesadas; resolver impresión por lotes de PDF originales y diseño de migración reversible, sin inventar reglas de BC.
3. **P1 de aceptación:** ejecutar y firmar los escenarios de [PRUEBAS_ACEPTACION.md](PRUEBAS_ACEPTACION.md).
4. **P2 documentación:** cerrar [MANUAL_USUARIO_BORRADOR.md](MANUAL_USUARIO_BORRADOR.md), producir el PDF definitivo con capturas reales y distribuirlo solo tras aprobación.
5. **P2 lanzamiento:** plan de reversión, aprobación escrita para migraciones y despliegue, publicación gradual y supervisión inicial.

## Regla de seguridad

- No fusionar PR #2 a `main`, ni aplicar SQL real, ni alterar Control de Cargas original, INVENTA o Tanques por iniciativa propia.
- Las migraciones ya versionadas se prueban únicamente en PostgreSQL descartable de GitHub Actions.
- Una simulación local o una prueba unitaria no sustituye una prueba de Supabase Auth/Storage ni una impresión iPhone.
- Cuando se implemente el importador de lotes, cada PDF ha de quedar separado en importación propia, mantener su SHA-256, no auto-publicar y conservar correcciones, PDFs antiguos y registros horarios.
