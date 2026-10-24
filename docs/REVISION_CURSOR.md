# Revisión solicitada a Cursor

Este PR no se fusiona automáticamente. Revisar especialmente:

1. \`supabase/migrations/20261024_kontrola_preparacion.sql\` y el comportamiento RLS, incluyendo \`storage.objects\`.
2. Seguridad de \`SECURITY DEFINER\`, \`search_path\`, GRANT/REVOKE, carreras entre dos operarios y reintentos.
3. Fidelidad de \`src/core.mjs\` con el origen de Control de Cargas v0.5.26; posibles límites de lectura de PDF.
4. Inicio automático: una carga por preparador y un preparador por carga; cierre de la anterior cuando empieza una nueva.
5. Datos de preparador tomados exclusivamente de sesión verificada.
6. Accesibilidad y comportamiento en iOS PWA / Chrome escritorio.
7. Enlaces PDF firmados y tratamiento de ventanas emergentes bloqueadas.
8. Limpieza de objetos huérfanos y garantías de no sobrescritura.
9. No confundir validación del PDF con verificación física.
10. No modificar el proyecto Supabase de INVENTA ni los datos heredados.

Ejecutar \`node --test tests/*.test.mjs\` y \`node --check src/app.mjs\`; proponer pruebas E2E con dos identidades y un documento real.

Esta rama contiene código en fase de pruebas. La migración NO está aplicada y las cuentas de operario NO están creadas todavía.
