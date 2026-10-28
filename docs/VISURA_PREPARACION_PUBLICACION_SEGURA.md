# VISURA / EXCELL — Preparación para publicación segura del Centro de Mando

**Fecha:** 28 de octubre de 2026  
**Responsable:** 03.1 — VISURA Centro de Mando  
**Candidato:** PR #82, rama `feat/visura-centro-integracion-diagnostico-chats-20261028`  
**Estado:** PREPARADO PARA REVISIÓN; **NO publicado, NO fusionado y SIN importaciones reales habilitadas**.

## 1. Estado y alcance verificados

- Base pública preexistente `visura-panel` @ `e8b4b177ee172b50ba0a96ee8f1d8819ce53344e`.
- PR #82 combina el desarrollo de función 11 del PR #81 y el importador del PR #73, con integración selectiva. PR #71 es el diseño del importador y PR #67 conserva el icono B. **No fusionar los PR #73 y #81 por separado o se duplicarán los cambios sobre los HTML.**
- Contenido verificado: once funciones 01–11, función previa CONTINUAR DESARROLLO, cuatro fases de DIAGNOSTICAR PARADA Y REANUDAR, clasificación A–I, gestión de chats, importación por título/ID de un JSON exportado, botones de copia, `docs/index.html` y `docs/VISURA_ORDENES.html` idénticos, manifest e icono B original.
- CI anterior del HEAD `04ffd96b52f42b5b13c0f08df6bb3a9e8910a767`: GitHub Actions run #40612625058, `success`, con pruebas Node + HTML E2E Chromium móvil/tableta/escritorio y recursos HTTP 200 en servidor local. **No se confundirá con Safari físico ni con comprobación HTTP del alojamiento futuro.**

## 2. Condición crítica: origen web exclusivo y privacidad

**No publicar en el actual GitHack compartido como plataforma final.** El almacenamiento `localStorage` es de un origen (protocolo + hostname + puerto), no de un repositorio o ruta. El dominio `josegude-ux.github.io` comparte origen entre sitios de proyecto en diferentes rutas; no basta un nuevo repositorio GitHub Pages para aislar datos personales si todos usan ese hostname.

- Elegir **hostname realmente exclusivo de VISURA**, con HTTPS y control de publicación. Opciones a evaluar *sin crear nada todavía*: un subdominio propio verificado en GitHub Pages, o un hostname único por proyecto de Cloudflare Pages del tipo `https://<proyecto-aprobado>.pages.dev/`. Estos son ejemplos **no creados ni verificados como disponibles**.
- No reutilizar el mismo hostname para aplicaciones distintas o contenido de terceros. Un origen web dedicado **no equivale a acceso privado autenticado**: el HTML público puede leerlo cualquiera; la información privada solo debe existir en el navegador local y no en GitHub.
- En esta fase el importador funciona **solo en loopback de pruebas** `localhost` / `127.0.0.1` / `[::1]` mediante HTTP(S). Queda **bloqueado por defecto en TODOS los dominios públicos**, incluidos GitHack, `github.io` y una futura dirección aún no aprobada. Solo se desbloqueará con autorización para un hostname HTTPS exacto y otra revisión.
- Se han añadido pruebas de rechazo de dominios compartidos/inesperados (`docs/test-import-origin.js`). No introducir un `conversations.json` real en URLs temporales, GitHack ni un alojamiento no aprobado.
- Mantener el script y assets propios, sin librerías externas de analítica; revisar cabeceras HTTPS, cache, Content-Type, CSP y ausencia de peticiones que transmitan metadatos antes de activar.
- Cuidado: el gestor **anterior** usa ya `localStorage` en GitHack si se guardaron títulos/enlaces; no está migrado ni cifrado. Avisar al usuario y hacer copia privada local antes de abandonar la dirección antigua. Safari no comparte automáticamente esa base de datos con la nueva URL.

## 3. Contenido que se publicaría (solo con permiso)

Construir un **paquete estático limitado** (sin desplegar aún) con los ficheros exactos de PR #82:
- `docs/index.html`, `docs/VISURA_ORDENES.html`, `docs/visura-recovery.js`, `docs/visura-recovery.css`, `docs/chatgpt-import.js`, `docs/manifest.webmanifest`.
- `docs/assets/icons/` con los iconos verificados, `docs/assets/streaming-aviso-original.webp`, `docs/assets/logo-visura-centro-mando.svg` si se emplea en el CSS.
- No incluir en la web estática `conversations.json` de un usuario, copias de localStorage, historiales, capturas privadas, CI, tests ni documentación de continuidad innecesaria.

**URL de producción prevista:** `https://<hostname-exclusivo-aprobado>/`. Es un **marcador de planificación, no un enlace válido ni reservado**. Mantener el mismo URL estable para futuras versiones. Separar URL de ensayo y producción por **origen**, no por ruta, para no compartir almacenamiento.

**Controles de publicación:** probar HTTPS/certificado, DNS/CNAME, 200 y MIME de HTML/JS/CSS/PNG/manifest, manifest `start_url`, Apple Touch, consola JS, CSP viable y permisos de escritura de la rama de despliegue. Verificar que no existe otro GitHub Pages de KONTROLA que pudiera alterarse. Una publicación no debe cambiar `main` ni otras apps.

## 4. Prueba física en iPhone (SIN DATOS PRIVADOS)

Solo cuando el usuario tenga una **URL de ensayo HTTPS exclusiva** aprobada; hasta entonces se puede comprobar el aspecto y los prompts con capturas/escenario ficticio en un navegador de ensayo que **mantenga deshabilitada la importación**.

1. En Safari del iPhone, abrir la URL de ensayo **realmente confirmada** (no una URL inventada), comprobar el candado HTTPS, el título y el icono B.
2. Abrir función 01 «CONTINUAR DESARROLLO», seleccionar un modo y copiar el prompt; pegar en Notas y comparar principio y fin. No enviarlo a un chat real de desarrollo.
3. Volver al menú y abrir función 11; pulsar «COPIAR DIAGNÓSTICO COMPLETO» y pegarlo en Notas. Debe contener preguntas A–J y salvaguardas.
4. Pegar una **respuesta ficticia** del tipo «CAUSA: error de streaming. Última tarea: PR de prueba. Pendiente: verificar pruebas». Analizar: debe indicar tipo B y generar un prompt contextual diferente del caso Git y de falta de autorización. Copiar el prompt íntegro y compararlo en Notas.
5. Introducir «Continúa el bloqueo; no hay evidencia nueva» en verificación. No debe declarar «recuperación completada». Comprobar que un segundo diagnóstico sin nuevos datos no entra en bucle.
6. Abrir «Mis chats» y comprobar que muestra el importador **bloqueado en un dominio todavía no autorizado**. **No seleccionar archivos reales**. Comprobar gestión antigua sin escribir nombres privados nuevos.
7. Probar orientación vertical/horizontal, regreso al menú y que no se pierde contenido al cambiar de una función a otra.
8. En Safari: Compartir → Añadir a pantalla de inicio → Abrir como app web → Añadir, **solo cuando la URL estable haya recibido autorización de publicación**. Verificar icono B, apertura y navegación.
9. Guardar capturas solo de datos ficticios; informar de los pasos que no coincidan. El test Chromium no sustituye esta prueba física.

## 5. Despliegue controlado y reversión

**Preparación**: backup/exportación privada del gestor local existente; guardar el HEAD Git de PR #82, los hashes de iconos, el URL anterior funcional y el contenido exacto de la publicación candidata; CI verde y revisión de acceso externo.

**Canario**: publicar un alojamiento exclusivo de pruebas **solo tras permiso**, con importación privada todavía deshabilitada. Ejecutar prueba física y aprobación del usuario. No cambiar aún la URL anterior del iPhone.

**Publicación autorizada**: desplegar el paquete estático verificado en el hostname definitivo. Mantener `visura-panel` anterior y acceso directo antiguo disponibles hasta verificar la nueva instalación. Tras una aprobación posterior separada y auditoría de privacidad, habilitar el importador únicamente en el hostname HTTPS aprobado (nunca por permitir genéricamente cualquier `.pages.dev` o `.github.io`).

**Reversión**: si falla la nueva versión, restaurar en el hospedaje nuevo el artefacto/version SHA anterior y verificar HTTP/JS/iconos; volver al acceso antiguo funcional. **No borrar `localStorage` ni exportaciones privadas** sin confirmación explícita; no intentar copiar automáticamente datos entre orígenes. No hacer force-push ni reescribir `main`/PR anteriores.

## 6. Evidencias y bloqueos a resolver

| Comprobación | Estado |
| --- | --- |
| HEAD y PR #82, #73 y #81 | Verificados; PR #82 candidata conjunta |
| HTML idénticos, 11 funciones, icono B | Verificado en GitHub |
| Tests Node + E2E Chromium full HTML | CI verde en HEAD anterior; nueva prueba estricta de origen a validar |
| Carga de conversaciones en GitHack | Bloqueada; se refuerza a cualquier dominio público no aprobado |
| Proveedor de hosting/origen exclusivo | **Por elegir y autorizar** |
| URL HTTPS real de ensayo, permisos y DNS | **No creada; no se puede verificar ahora** |
| Safari/iPhone físico | **Pendiente de realizar por el usuario** |
| Exportación ChatGPT real y seguridad | **No autorizada ni probada** |
| PR merge, publicación, cambios de `visura-panel` | **No autorizados; no realizados** |

## 7. Siguiente autorización mínima y secuencia

Solicitar **solo autorización para crear un alojamiento HTTPS exclusivo de ENSAYO con contenidos estáticos no privados, sin activar el importador**, eligiendo proveedor/dominio (Cloudflare Pages proyecto independiente, o GitHub Pages con subdominio propio validado). Esta autorización no incluirá publicar producción ni activar tratamiento de datos privados. Una vez exista una URL real comprobable, ejecutar la lista de Safari anterior; después pedir permiso separado de integración/despliegue.
