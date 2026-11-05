VISURA PREPARA 15 - CONTROL DE CARGAS / EN RECEPCION - R1/L4
BANCO LAB AISLADO | 05/11/2026 | NO PUBLICADO

REQUISITOS: Node.js 22 o compatible, navegador en equipo de laboratorio.

1. Descomprimir/extraer el TXT autocontenido con la orden indicada en la entrega.
2. Abrir la carpeta extraida en un terminal.
3. Ejecutar pruebas nuevas:
     node --test tests/cierre-recepcion-r1l4.test.mjs tests/cierre-recepcion-ui-r1l4.test.mjs
4. Ejecutar servidor SOLO en loopback:
     node lab/servidor-recepcion.mjs 4175
5. Abrir en un navegador de PC autorizado:
     http://127.0.0.1:4175/?visura15_recepcion_lab=1
6. PREPARA se abre automáticamente en el apartado real «En recepción» con 4 cargas
   completamente SINTETICAS. Cambiar perfil/almacen LAB para comprobar ACL.
   Al elegir una carga, abrir la ficha, registrar diferencias y cerrar.
7. El estado de prueba se guarda exclusivamente en localStorage bajo la clave
   visura15-r1l4-recepcion-LAB-sintetica-v1. Permanece tras recargar en el
   mismo navegador/origen. NO es la persistencia multiusuario empresarial.
8. Para repetir desde cero: en Herramientas del navegador borrar SOLO ESA CLAVE
   del origen http://127.0.0.1:4175, sin borrar otros datos.

IMPORTANTE
- El simulador no se activa sin hostname loopback Y query visura15_recepcion_lab=1.
- El simulador no ejecuta ninguna llamada Supabase ni Business Central.
- Las hojas «HOJA-SINTETICA» NO son PDF ni hojas originales de clientes reales.
- Los permisos «RETURN_CLOSE» son dobles LAB; NO son permisos efectivos reales.
- «CLOSED_OPERATIONAL» no equivale a incidencia resuelta: OPEN se conserva.
- Candidaturas PENDING_BRIDGE son locales y no se comunican al módulo 14/INVENTA.
- Sin función de devolución real ni autorización de despliegue.
- El código empresarial original de la rama GitHub permanece sin modificación remota.

EJECUCION E2E
El navegador del entorno de autor bloqueó HTTP incluso 127.0.0.1 con
ERR_BLOCKED_BY_ADMINISTRATOR; E2E navegador con interacción real queda SKIP.
Se ejecutaron tests Node de servicio, reglas, HTML y rutas; HTTP local via curl
funcionó: GET 200, POST 405, acceso /.github 403.
Las capturas se generaron renderizando el HTML real sin iniciar sesión, a
320/390/768/1440 px (no suponen una sesión autenticada real).


CONTINUIDAD R1/L5 — INFORME LOCAL DE RECEPCIÓN (SOLO LAB)
- En la pantalla «En recepción» aparece el panel «Informe local de recepción (LAB)».
- Calcula todas las cargas sintéticas del almacén activo, incluidos cierres con incidencias OPEN.
- La fecha de recepción acreditada NO se sustituye por la hora de cierre LAB.
- Botón «Descargar CSV sintético»: descarga local en el navegador sin petición de red ni escritura.
- El servicio verifica RETURN_READ y la pertenencia al almacén en cada lectura.
- Al seleccionar un perfil sin permiso de almacén, el informe se oculta y el CSV se bloquea.
- El archivo extraíble no contiene la URL ni la clave pública de Supabase; los campos están vacíos.
- No ejecutar ni publicar en entornos empresariales.
- Pruebas nuevas: node --test tests/cierre-recepcion-informe-r1l5.test.mjs tests/cierre-recepcion-informe-ui-r1l5.test.mjs
- En el entorno de autor la navegación de Chromium a cualquier URL fue bloqueada; se probó interacción DOM offline, no autenticación empresarial.


CONTINUIDAD R1/L6 — EXPEDIENTE JSON SINTETICO DE RECEPCION
- Dentro de una ficha LAB, botón «Descargar expediente JSON con SHA-256».
- Revalida RETURN_READ y almacén desde servicio local. Nunca escribe en la ficha.
- Incluye hoja y datos ORIGINALES SINTÉTICOS, incidencias e historial local.
- No cambia estado OPEN ni declara fecha de recepción no acreditada.
- Verificación offline en Node: node lab/verificar-expediente-lab.mjs ruta_al_json
- SHA-256 solo comprueba integridad: NO firma digital ni acredita autenticidad.
- Sin backend empresarial, sin envío de archivo y sin activar el cierre real.
