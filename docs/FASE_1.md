# KONTROLA · fase 1 · preparación (rama de pruebas)

## Alcance implementado en código

- Identidad visual y navegación inspiradas en las guías oficiales de INVENTA.
- Autenticación real con el Supabase **de Control de Cargas** (\`oevetnszmfxeukcncwji\`); INVENTA sigue independiente.
- La identidad del operario se toma de \`auth.users\` mediante \`kontrola_mi_perfil\`; el navegador no consulta directamente \`usuarios_app\`.
- Menús Preparación y Verificación habilitados para todos los usuarios autorizados.
- Solo administradores habilitados pueden usar la pantalla de publicación de PDF.
- El lector de Business Central (\`src/core.mjs\`) se copió sin cambios de \`control-cargas-movil\` v0.5.26.
- Consulta de referencias por pasillo, ubicación, descripción, cantidad y unidad (sin checks de picking).
- Al abrir una carga, una función SQL atómica registra el inicio y cierra cualquier otra preparación activa **del mismo operario** en ese instante. La última preparación también puede finalizarse explícitamente.
- La verificación es independiente, línea por línea y debe realizarla una persona distinta al preparador.
- Cada cantidad se registra con usuario y hora de servidor. Las diferencias crean incidencias agrupadas por carga.
- Al completar todas las líneas, la carga se cierra aunque queden incidencias pendientes de regularización manual en Business Central.
- PDF privados en bucket \`kontrola-pdfs\`, con URL firmada de corta duración.
- No se reemplazan documentos ya publicados con un PDF diferente.
- El sistema actual Control de Cargas sigue sin cambios.

## Estado y límites

**No afirmar que está listo para producción.** El código depende de la migración SQL incluida en \`supabase/migrations/\`, que NO se aplica automáticamente. Hasta aplicar y verificar la migración, la consulta de cargas no funcionará.

Para probar con documentos reales, un administrador habilitado debe importar al menos un PDF desde KONTROLA. Se reutiliza la lógica de interpretación, pero **aún no hay un puente automático para migrar los PDF locales** de Control de Cargas a KONTROLA. Los PDF originales de Control de Cargas no se comparten por sí solos.

El cierre de preparación y de una carga verificada está implementado en SQL propuesto. La gestión automática de Business Central no forma parte de KONTROLA.

La versión inicial usa red para autenticar, registrar el inicio y visualizar documentos compartidos. **No ofrece trabajo offline fiable**. No simularlo.

## Seguridad

- Nueva tabla \`kontrola_cargas\` para documentos publicados; los datos de \`cargas_compartidas\` no se modifican.
- Nueva tabla \`kontrola_preparaciones\`; no existe INSERT/UPDATE/DELETE directo para trabajadores.
- Las horas se toman de Supabase (reloj servidor).
- Función SQL transaccional \`kontrola_abrir_carga\`: serializa los inicios y no permite que dos operarios preparen la misma carga.
- RLS para carga/documentos/tiempos. La interfaz no sustituye la autorización en servidor.
- Las mutaciones de verificación solo se realizan mediante funciones SQL; no hay INSERT/UPDATE/DELETE directo para usuarios autenticados.
- Los bloqueos por carga y de fila evitan dos verificadores simultáneos y carreras al registrar o finalizar.
- Se conserva un evento inmutable por cada cambio de cantidad; solo un administrador activo puede confirmar una regularización ya hecha en BC.
- Bucket separado \`kontrola-pdfs\` con subida solo para administradores.
- Es obligatorio probar con dos cuentas y dos dispositivos antes de producción.

## Cómo probar la fase 1

1. Abrir un pull request desde \`desarrollo/fase-1-operario\` sin fusionar a \`main\`.
2. Ejecutar \`node --test tests/*.test.mjs\`, y \`node --check src/app.mjs\`.
3. Revisar la migración, obtener la aprobación del propietario y aplicarla al proyecto **correcto** de Supabase.
4. Confirmar que existe un administrador activo de \`usuarios_app\`. No hay contraseña predefinida.
5. Crear un usuario de pruebas de Supabase Auth mediante invitación administrativa, y habilitarlo en \`usuarios_app\` con \`rol='operario'\`.
6. Publicar un PDF real verificado desde la interfaz del administrador.
7. Entrar como operario en móvil: carga por peso, selección, pasillos, documento original.
8. Abrir segunda carga: mismo instante de cierre/inicio en \`kontrola_preparaciones\`.
9. Desde otro operario, intentar abrir la carga ya asignada: el servidor debe impedirlo.
10. Comprobar cierre de sesión, permisos administrativos, y que otras aplicaciones conservan sus datos.
11. Finalizar una preparación y comprobar que el preparador no puede verificarla.
12. Verificarla con otra cuenta, registrar coincidencias y diferencias, y cerrar todas las líneas.
13. Confirmar que la carga queda cerrada con incidencias pendientes y que solo administración puede marcarlas como regularizadas.

## Trabajos siguientes

Aplicar y validar las migraciones en un entorno autorizado, pruebas E2E con dos identidades y dos dispositivos, aviso en tiempo real al responsable, integración automática con el panel de cargas original para evitar reimportar PDF, copias/recuperación y manejo offline controlado.

Fuentes: [INVENTA](https://github.com/josegude-ux/INVENTA-) · [Control de Cargas](https://github.com/josegude-ux/control-cargas-movil).
