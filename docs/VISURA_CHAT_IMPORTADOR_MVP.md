# VISURA Centro de Mando — Importador local de chats (MVP)

**27 de octubre de 2026.** Rama aislada `feat/visura-centro-chatgpt-import-local-mvp-20261027`, basada en `visura-panel` @ `e8b4b177ee172b50ba0a96ee8f1d8819ce53344e`. PR de diseño relacionado: #71 (separado). **No publicado, no fusionado.**

## Alcance implementado
- Se añade «Importar chats reales de ChatGPT» dentro del gestor **Mis chats VISURA**, sin botón nuevo en las diez funciones.
- Se seleccionan en el dispositivo uno o varios ficheros `conversations.json` o fragmentos JSON, hasta **35 MiB por archivo**. ZIP y ficheros enormes no están soportados en esta primera versión; se informa en la interfaz.
- El navegador procesa JSON **localmente**. Puede leer el archivo completo temporalmente en memoria, pero **no conserva ni transmite mapping, mensajes o adjuntos**. Solo ID/título, sello de actualización para elegir versión dentro de la sesión; en el registro solo `conversationId`, `sourceTitle` y los campos previos `name/state/link`.
- Selección sin teclear: «VISURA y relacionados», todos, ninguno, búsqueda opcional y casillas. La lista visible se limita a 80 por rendimiento; seleccionar todos incluye la lista completa del archivo.
- Previsualización/confirmación con cantidades de nuevos, renombrados por ID, sin cambios y colisiones. No se eliminan conversaciones ausentes. Límite total del gestor **300 fichas**. Si excede, cancela sin modificar.
- Los registros nuevos tienen estado `sin_verificar` y no inventan enlaces. Las fichas ya identificadas por ID conservan estados y enlaces; títulos repetidos se distinguen visualmente mediante sufijo de ID, conservando el título original como `sourceTitle`.
- `validateChat` admite metadatos opcionales y protege identificadores frente a ediciones manuales y restauraciones de copias antiguas. La copia VISURA propia sigue siendo `visura-chat-registry-v1` compatible.
- Los desplegables de las diez funciones se actualizan tras confirmar, usando el gestor existente. **No hay conexión en directo con ChatGPT**, ni lectura de cookies/contraseñas ni sincronización de títulos entre dispositivos.

## Pruebas ejecutadas
- `node --check docs/chatgpt-import.js`: sintaxis correcta.
- `node docs/test-chatgpt-import.js`: 11 pruebas unitarias con datos sintéticos (extracción solo de metadatos, renombrado por ID, preservación de estado/enlace, no asociar por nombre legacy, ausencias, colisiones, IDs duplicados, errores, límite y formato alternativo).
- Comparación de ambos HTML antes de construir los blobs: HTML idénticos; solo se alteran 3 fragmentos del gestor existente y se añade una referencia a JS; se conservan funciones 01–10 y recursos iPhone.

## Pendiente
1. Prueba funcional en navegador, especialmente Safari iPhone, permisos de lectura y almacenamiento local; sin suplantar dicha prueba por unit tests.
2. Validar estructura contra una exportación **real autorizada**, sin compartir mensajes privados en GitHub ni enviar `conversations.json` a este chat.
3. Mejoras de rendimiento para exportaciones enormes y descompresión ZIP local sin red, sujetas a otra iteración.
4. Opcional: asociación guiada de registros manuales previos sin ID con IDs de exportación, **con confirmación**.
5. Revisar integración/publicación únicamente con autorización específica posterior; no modificar `main`, `visura-panel`, PR #67 o datos de otras aplicaciones.

## Salvaguarda del alojamiento compartido — pendiente dominio exclusivo

**Importador deshabilitado deliberadamente en `rawcdn.githack.com` y `raw.githack.com`:** ambos son proveedores de páginas de terceros que comparten su origen de navegador entre distintos repositorios. El almacenamiento `localStorage` es por origen y, en estas condiciones, no se considera adecuado para títulos/IDs privados. La interfaz muestra el motivo y no permite seleccionar archivos. La activación para datos reales exige antes un dominio/origen exclusivo controlado por VISURA y revisión de privacidad. Esta medida no afecta al gestor anterior ni al icono del iPhone. Esta rama sigue sin publicar.
