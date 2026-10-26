# Lista de aceptación visual — VISURA PREPARA

Estado: pendiente de validación manual en dispositivos físicos. Las pruebas automatizadas de GitHub Actions no sustituyen esta revisión.

## Preparación
- [ ] Abrir la versión de prueba/preview, no producción.
- [ ] Confirmar caché PWA `kontrola-integral-visura-v063`.
- [ ] Si la PWA conserva la versión anterior, cerrar la aplicación por completo y volver a abrirla con conexión para actualizar el service worker.

## Menú e imágenes
- [ ] Preparación: `visura-prepara-preparacion-3d.webp`.
- [ ] Control de Cargas: `visura-prepara-control-cargas-3d.webp`.
- [ ] Operaciones: `visura-prepara-operaciones-3d.webp`.
- [ ] Administración solo aparece después de validar el rol administrador.
- [ ] Sin imágenes estiradas, recortes inesperados, texto superpuesto ni desbordamiento horizontal.
- [ ] Las cuatro ilustraciones se distinguen entre sí y el texto mantiene contraste legible.

## Acciones
- [ ] Preparación abre el menú de preparación y permite volver.
- [ ] Control de Cargas abre la verificación física y permite volver.
- [ ] Operaciones abre su menú y conserva las opciones existentes.
- [ ] Administración solo puede abrirse con rol autorizado.
- [ ] Volver permanece arriba a la izquierda en las vistas correspondientes.

## Dispositivos y PWA
- [ ] iPhone (Safari/PWA): diseño, navegación y actualización correctos.
- [ ] Android (Chrome/PWA): diseño, navegación y actualización correctos.
- [ ] Windows (Chrome/Edge): diseño, navegación y actualización correctos.
- [ ] Tras abrir una vez con conexión, las cuatro imágenes siguen disponibles sin conexión.
- [ ] Sin errores 404 de imágenes ni errores JavaScript en consola.

## Evidencias para cerrar
Registrar dispositivo, navegador, fecha, resultado y capturas reales. No marcar una casilla sin haberla probado.

## Límite
Las pruebas automatizadas confirman estructura, referencias, caché y controladores en el código. No son una prueba visual en hardware real. No fusionar ni desplegar la PR hasta revisar estas evidencias.
