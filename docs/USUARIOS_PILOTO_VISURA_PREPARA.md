# VISURA PREPARA — plantilla de usuarios de las pruebas (26/10/2026)

## Operarios
- MANUEL RIVADAS
- DIEGO PARDO
- RODOLFO
- DIEGO BUDIÑO
- GROS
- JAVI SÁNCHEZ

## Supervisores (rol AÚN NO soportado en la base de datos)
- RÍOS
- BRUNO
- GUDE
- FERMÍN

**Estado confirmado en Supabase:** un usuario administrador activo, ninguna de las diez personas de esta lista dada de alta. CHECK actual de usuarios_app.rol: administrador u operario. No se crean cuentas ni permisos por documentar nombres.

## Primer acceso seguro
1. Administración verifica identidad y dirección de correo personal de cada persona y tramita una invitación individual mediante un flujo seguro de Supabase Auth. No generar direcciones ficticias ni usar cuentas compartidas.
2. La persona abre su propia invitación, confirma el enlace privado y establece contraseña personal de 12 o más caracteres mediante Ajustes > Establecer mi contraseña con sesión válida. No enviar contraseñas por chat.
3. Administración registra en usuarios_app nombre, rol autorizado y activo, y asigna almacenes autorizados. Verificar RLS, RPC y políticas de roles antes de activar cuentas.
4. Las cuentas pueden revocarse individualmente; no se autentica por seleccionar un nombre visible. Debe validarse identidad con correo verificado o método equivalente antes de que aparezca la lista como selector de login.
5. El rol supervisor requerirá una migración y pruebas de permisos de servidor antes de su habilitación. Los supervisores nunca recibirán privilegios de administración como sustituto.

## Seguridad y límites
No almacenar contraseña ni token en repositorio, logs, texto visible ni base de datos ajena a Supabase Auth. No usar service_role en el frontend. No añadir inscripciones anónimas por nombre porque permitiría suplantación. El listado de nombres solo es una plantilla visible en administración y no implica altas reales. Para pruebas hoy pueden participar cuentas de operario creadas por invitación legítima; si no se han habilitado, no afirmar que la prueba multicuenta esté lista.
