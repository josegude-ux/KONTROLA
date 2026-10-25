# KONTROLA · MOVENTA

Aplicación web progresiva para preparación de cargas, desarrollada a partir del motor PDF de [Control de Cargas](https://github.com/josegude-ux/control-cargas-movil) y siguiendo la identidad de [INVENTA](https://github.com/josegude-ux/INVENTA-).

**Estado:** Fase 1 y primer bloque de verificación en desarrollo. **No lista para producción.** La aplicación precisa migraciones que todavía no están aplicadas en Supabase y pruebas con cuentas autorizadas.

## Funcionalidad de fase 1

- Inicio de sesión real (Supabase, el proyecto de Control de Cargas).
- Menú de operario y administración según rol (restricción efectiva mediante RLS).
- Cargas publicadas ordenadas por peso, búsqueda y consulta por pasillos.
- Visualización de código, descripción, ubicación, cantidad y unidad (sin checks; picking en BC).
- Apertura automática de preparación, cierre de la anterior al abrir otra y cierre manual de la última, todo en el servidor.
- Acceso al PDF original desde almacenamiento privado si el documento está publicado.
- Importación administrativa individual de PDF verificado con el motor existente.
- Verificación física independiente línea por línea; el preparador no puede verificar su propia carga.
- Incidencias agrupadas por carga, trazabilidad de cantidades y cierre aun con diferencias pendientes.
- Confirmación administrativa de regularizaciones realizadas manualmente en Business Central.

## Validación

```bash
npm run check
```

Antes de probar con operarios hay que revisar y aplicar de forma autorizada la migración en `supabase/migrations/`. No se ejecuta desde la PWA.

Consulta [docs/FASE_1.md](docs/FASE_1.md) para la puesta en marcha, límites y pruebas, y [docs/REVISION_CURSOR.md](docs/REVISION_CURSOR.md) para la revisión independiente de Cursor.

**Ramas:** Fase 1 en `desarrollo/fase-1-operario`; verificación en `cursor/verificacion-fisica-cargas-8ba0`. No fusionar a `main` hasta la aceptación.
