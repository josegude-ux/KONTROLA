# Integración menú oficial VISURA PREPARA — pendiente de binarios

Fecha: 26/10/2026. Rama aislada `feature/visura-prepara-menu-oficial-20261026`, creada desde `branding/visura-prepara-20261026`.

Se ha recibido y leído el ZIP oficial y la ficha `FICHA_ASIGNACION_IMAGENES.md`.

| Tarjeta visible | ID inmutable | WEBP esperado |
|---|---|---|
| Preparación | openPreparation | assets/home/visura-prepara-preparacion-3d.webp |
| Control de Cargas | openReview | assets/home/visura-prepara-control-cargas-3d.webp |
| Operaciones | openCargas | assets/home/visura-prepara-operaciones-3d.webp |
| Administración | openAdmin | assets/home/visura-prepara-administracion-3d.webp |

**Estado:** ya se cambiaron las etiquetas visibles de `openReview` a «Control de Cargas» y de `openCargas` a «Operaciones» sin modificar los manejadores. No se han cambiado todavía las rutas de `index.html` ni la caché `sw.js`, porque los cuatro archivos WEBP del ZIP local todavía no están subidos a GitHub. Cambiar rutas antes de subirlos rompería las imágenes. Se preparó un paquete local con los 4 WEBP y originales. Esta nota NO certifica la implementación.

**Próximo commit de integración de recursos:** subir los ocho binarios, modificar únicamente las rutas de las cuatro tarjetas, ajustar precarga y versión de caché, actualizar las pruebas de integridad de imágenes y `docs/CONTINUIDAD.md` en el mismo commit. Las etiquetas y pruebas de acciones ya están en la rama; no repetirlas. No modificar Supabase, roles ni lógica. Crear PR borrador, sin merge ni despliegue. Verificar capturas reales después de servir la rama en entorno de pruebas.
