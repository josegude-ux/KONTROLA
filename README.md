# KONTROLA · MOVENTA

Aplicación web progresiva para preparación de cargas, desarrollada a partir del motor PDF de [Control de Cargas](https://github.com/josegude-ux/control-cargas-movil) y siguiendo la identidad de [INVENTA](https://github.com/josegude-ux/INVENTA-).

**Estado:** Fase 1 en desarrollo. **No lista para producción.** La aplicación precisa una migración nueva que todavía no está aplicada en Supabase y cuentas autorizadas.

## Funcionalidad de fase 1

- Inicio de sesión real (Supabase, el proyecto de Control de Cargas).
- Menú de operario y administración según rol (restricción efectiva mediante RLS).
- Cargas publicadas ordenadas por peso, búsqueda y consulta por pasillos.
- Visualización de código, descripción, ubicación, cantidad y unidad (sin checks; picking en BC).
- Apertura automática de preparación y cierre de la anterior al abrir otra, ambos en el servidor.
- Acceso al PDF original desde almacenamiento privado si el documento está publicado.
- Importación administrativa individual de PDF verificado con el motor existente.
- La revisión física y el cierre conjunto se añadirán más adelante.

## Validación

```bash
node --test tests/*.test.mjs
node --check src/app.mjs
```

Antes de probar con operarios hay que revisar y aplicar de forma autorizada la migración en `supabase/migrations/`. No se ejecuta desde la PWA.

Consulta [docs/FASE_1.md](docs/FASE_1.md) para la puesta en marcha, límites y pruebas, y [docs/REVISION_CURSOR.md](docs/REVISION_CURSOR.md) para la revisión independiente de Cursor.

**Rama de trabajo:** `desarrollo/fase-1-operario`. No fusionar a `main` hasta la aceptación.
