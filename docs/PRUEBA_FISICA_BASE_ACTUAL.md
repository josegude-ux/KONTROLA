# Prueba física de VISURA PREPARA usando la base de datos actual

## Alcance
Esta prueba usa la instancia Supabase que ya utiliza la aplicación. No se crea una base de datos nueva ni se cambia la configuración de conexión. Se permite consultar datos existentes y realizar pruebas de lectura/sincronización entre dispositivos.

## Límites de seguridad
- No ejecutar acciones de vaciado, borrado masivo, eliminación de tablas ni reinicio de datos.
- No publicar cargas reales ni ejecutar operaciones administrativas irreversibles durante la revisión visual.
- Si una prueba requiere iniciar una preparación o guardar una verificación, utilizar únicamente una carga de pruebas existente y anotar su código antes de empezar.
- No cambiar roles, permisos, claves, URL ni variables de Supabase.
- No fusionar ni desplegar esta rama como parte de esta revisión.

## Preparación
- [ ] Identificar el usuario de prueba individual que se usará en cada dispositivo.
- [ ] Confirmar que iPhone, Android y Windows abrirán la misma versión candidata.
- [ ] Confirmar que los tres dispositivos apuntan al proyecto Supabase actual esperado, sin mostrar ni copiar claves.
- [ ] Anotar versión mostrada, dispositivo, navegador y hora de prueba.

## iPhone (Safari y PWA instalada)
- [ ] Iniciar sesión con el usuario autorizado.
- [ ] Ver menú, imágenes, textos y ausencia de solapamientos.
- [ ] Abrir cada función accesible y regresar con «Volver».
- [ ] Confirmar que las cargas visibles coinciden con el almacén seleccionado.
- [ ] Cerrar y reabrir la app; comprobar sesión y persistencia esperada.
- [ ] Verificar actualización de la PWA y ausencia de imágenes antiguas.

## Android (Chrome y PWA instalada)
- [ ] Repetir las comprobaciones anteriores.
- [ ] Abrir sesión con un usuario individual y comprobar que el contenido se sincroniza con la misma base de datos.
- [ ] Comprobar que un cambio de prueba permitido aparece al refrescar en el otro dispositivo.
- [ ] Cerrar sesión y confirmar que no quedan vistas de datos privados accesibles.

## Windows (Chrome o Edge)
- [ ] Repetir la revisión visual y de navegación.
- [ ] Confirmar carga de imágenes, consola sin errores y ausencia de scroll horizontal.
- [ ] Confirmar lectura de los mismos datos de prueba y actualización tras refrescar.

## Evidencias
Para cada incidencia, guardar captura sin exponer contraseñas, tokens, correos ajenos ni datos personales innecesarios. Registrar: dispositivo, navegador, versión, pasos, resultado esperado, resultado observado y código de carga de prueba si aplica.

## Limitación actual de despliegue
El workflow `.github/workflows/pages.yml` publica en el mismo GitHub Pages de KONTROLA y su disparador manual despliega el checkout seleccionado. No ejecutarlo para esta prueba porque podría sustituir la aplicación publicada. Para probar esta rama en dispositivos físicos hace falta una URL de preview aislada o un método de alojamiento temporal que no cambie la URL de producción.
