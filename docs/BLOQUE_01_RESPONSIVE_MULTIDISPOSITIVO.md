# VISURA PREPARA — Bloque 01 · Diseño adaptable multidispositivo

**Fecha:** 27/10/2026
**Rama aislada:** `feat/visura-prepara-b01-responsive-20261027`
**Base exacta:** `18c46b0c742bae9321f08603da40dfd1e7d76323` (integración parcial PR #49 + PR #58)
**Alcance:** exclusivamente HTML/CSS responsivo y pruebas. Ninguna modificación de preparación, verificación, importación, Supabase, impresión A4 ni datos reales.

## Requisito transversal aprobado
- Escritorio: aprovechar ancho sin dar aspecto de móvil, mostrar menú principal a dos columnas en ventanas grandes; desplegar opciones administrativas con controles legibles; listar cargas en columnas cuando haya espacio.
- Tablet: adaptar por ancho de ventana (vertical/horizontal), no por marca de dispositivo; priorizar una columna en menú principal cuando la anchura lo aconseje.
- Móvil: una columna en el menú, controles táctiles y prevención de desplazamiento horizontal de la página. Tablas específicas conservan su desplazamiento interno cuando está justificado.
- No modificar identidades VISURA, imágenes oficiales, flujos operativos, navegación, permisos ni presentaciones de impresión/PDF.

## Auditoría anterior a cambios
- `main` contiene solo documentos; el código está en `cursor/verificacion-fisica-cargas-8ba0` y PR derivadas.
- PR #58 contiene inicio de Preparación/Verificación en paralelo, sin migraciones aplicadas. PR #60 integra parcialmente la retirada de cronómetro de PR #49. PR #51 y PR #52 están separadas, **no** se han integrado.
- `styles.css` contenía `.container{max-width:1020px}` y anulaba con `#homeView .inventa-inspired-home{max-width:720px}`; el escritorio desperdiciaba espacio horizontal.
- Existían @media para móvil y pruebas visuales solo de escritorio/móvil, pero no tablet o resize de ventana en el flujo operativo.
- No existe acceso a worktree local de otros chats: aislamiento preventivo con rama nueva creada desde commit conocido.

## Cambios
- Añadidas reglas al final de `styles.css`, restringidas con `@media screen`, sin alterar reglas `@media print`.
- Entre 721 y 1099 px: menú principal ancho a una columna, paneles fluidos y navegación de administración distribuida.
- Desde 1100 px: menú principal en dos columnas; listas de cargas en dos columnas y menú administrativo en cuatro columnas.
- Hasta 720 px: interfaz compacta, barras de búsqueda apilables y controles de incidencias sin salirse de pantalla.
- Entre 721 y 960 px: edición de líneas de revisión distribuida en dos columnas para legibilidad.
- Contrato Node: `tests/responsive-layout.test.mjs`.
- Test Chromium E2E de maquetación: `tests/responsive-layout.spec.mjs`, comprueba todas las vistas visibles y paneles de Administración sin autenticación ni base de datos; resoluciones 320×720, 390×844, 768×1024, 1024×768, 1440×900 y 1920×1080, además de cambios de anchura sin recarga.
- CI aislada: `.github/workflows/visura-prepara-responsive-ci.yml`, ejecuta pruebas y guarda capturas. La sesión de usuario y permisos **no** se simulan ni se dan por probados en esta prueba visual.

## Criterios de cierre
1. CI Node y Chromium satisfactoria, sin errores ni desplazamiento horizontal del documento en las vistas principales.
2. Revisar artefactos de capturas del menú principal y Administración en escritorio, tablet y móvil.
3. Quedan pendientes pruebas manuales en Windows/Edge, tablets y móviles físicos cuando exista entorno de prueba autorizado.
4. No fusionar a la rama operativa ni desplegar/PWA hasta aprobación específica.

## Siguiente trabajo autorizado
- Corregir cualquier fallo reproducible de la CI responsive **en esta rama**, volver a comprobar.
- Revisar visualmente pantallas de preparación, historial, Administración y carga publicada en el entorno de prueba sin manipular datos empresariales.
- Proseguir con tareas independientes del Bloque 01 cuando se confirme su cobertura frente a PR #49, #51, #52, #58 y #60. La comprobación física detallada por artículo queda fuera de alcance y no debe improvisarse.
