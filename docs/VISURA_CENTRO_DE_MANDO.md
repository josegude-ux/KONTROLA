# VISURA — CENTRO DE MANDO
**Versión:** V5.4 — 2026-10-26  
**Objetivo:** conservar órdenes copiables de desarrollo y recuperación de contexto para VISURA.

> Este archivo es una **copia maestra de instrucciones**, no un informe del estado actual del software. Antes de cualquier cambio hay que contrastar ramas, commits, PR y documentación con GitHub. No fusionar, desplegar ni borrar datos sin autorización. No se puede garantizar un proceso en segundo plano ni superar límites de Work.

## 1. CONTINUAR DESARROLLO — TRES MODOS UNIFICADOS (V5)

**Decisión confirmada:** los antiguos botones 01 «Reactivar» y 03 «Cambiar de chat» eran parcialmente redundantes y se unifican en una sola función **01 · Continuar desarrollo**, con **tres modos**: (A) Reanudar en el mismo chat, (B) Continuar en un chat sucesor que YA trabaja en el proyecto, (C) Traspasar por primera vez a otro chat. El formulario solo muestra los campos correspondientes al modo elegido.

**Ejemplo por defecto:** origen **VISURA WORK**, destino **VISURA AUTO-DEV**, modo **CONTINUADOR EXISTENTE**. La orden va a AUTO-DEV, no al Work agotado; no debe detenerse solo por un título previo «CHAT NUEVO».

**Límites:** el botón copia instrucciones y, si aportas URL directa, abre el chat de destino. No lee la lista de tus conversaciones, no crea ni renombra chats y no pega automáticamente el mensaje. Un nombre o enlace no prueba acceso al historial. Se mantiene la protección de los chats reservados a pruebas y las autorizaciones para GitHub/producción.

**Migración de enlaces:** los enlaces anteriores `#orden-1` y `#orden-3` abren la función unificada. Los antiguos `#orden-4` a `#orden-8` se redirigen a la tarea equivalente. Los nuevos enlaces permanentes son `#funcion-1` a `#funcion-8`.

**Variables:** `{{MODO}}`, `{{ORIGEN}}`, `{{DESTINO}}`, `{{ENLACE_ORIGEN}}`, `{{ENLACE_DESTINO}}`, `{{FOCO}}`, `{{REGLA_MODO}}`.

**Plantilla compartida del prompt:**
```text
VISURA / EXCELL — CONTINUAR DESARROLLO, ORDEN ÚNICA.

MODO SELECCIONADO: {{MODO}}
CHAT O DESARROLLO DE ORIGEN: {{ORIGEN}}
CHAT RECEPTOR / RESPONSABLE ACTUAL: {{DESTINO}}
ENLACE A ORIGEN (SI EXISTE): {{ENLACE_ORIGEN}}
ENLACE A DESTINO (SI EXISTE): {{ENLACE_DESTINO}}
TAREA PRIORITARIA OPCIONAL: {{FOCO}}

INSTRUCCIÓN ESPECÍFICA DEL MODO
{{REGLA_MODO}}

OBJETIVO
Continúa la línea de desarrollo elegida en el chat indicado y desde el punto más avanzado REALMENTE VERIFICADO. No vuelvas a empezar, no repitas tareas finalizadas y no confundas diferentes chats VISURA. El nombre del chat, el enlace o una mención antigua a «CHAT NUEVO» NO prueban ni niegan por sí solos continuidad.

VERIFICAR ANTES DE ACTUAR
1. Determina qué historial y documentación del chat de origen y del destino puedes consultar realmente. Si no puedes leer un chat distinto, dilo sin fingirlo. Identifica el trabajo ya realizado en esta conversación y cómo se relaciona con el origen.
2. Comprueba los repositorios vinculados, ramas/HEAD, commits, PR abiertos y cerrados, archivos, pruebas y documentación de continuidad vigente (entre otros, docs/CONTINUIDAD.md y los documentos específicos de Work disponibles). No supongas que main ni documentos antiguos reflejan el máximo avance.
3. Identifica la última tarea concluida y probada, el trabajo en curso, los riesgos de solapamiento con otros chats y la siguiente tarea segura. Distingue implementación, validación, aprobación de imágenes y publicación. Conserva cambios ajenos.
4. Como pista para VISURA WORK → VISURA AUTO-DEV (solo si esa pareja coincide), considera el PR #44 de josegude-ux/KONTROLA, el commit b934a2c y la rama docs/visura-work-chat-nuevo-20261026, pero verifica si hay hitos posteriores; no asumas que esas referencias son el último estado. Comprueba si la autenticación del agente y las políticas de seguridad siguen pendientes antes de trabajar en ellas.

CONTINUAR CON SEGURIDAD
5. Si este chat está reservado expresamente para pruebas o no se ha podido corroborar la correspondencia necesaria, realiza solo una auditoría de lectura hasta aclarar la discrepancia. No escribas en GitHub desde un chat de pruebas.
6. Si esta conversación es la responsable autorizada del desarrollo elegido, reanuda en ella la primera tarea pendiente segura, utilizando las herramientas realmente disponibles. Tras cada hito, verifica, guarda en la rama apropiada y actualiza la continuidad; no hagas una respuesta meramente administrativa ni solicites un traspaso ya asentado.
7. No fusiones PR, no despliegues a producción, no borres datos ni sobrescribas trabajo ajeno sin autorización expresa. No te detengas por obstáculos resolubles: comprueba alternativas técnicas legítimas. Detente solo por un bloqueo real, una ambigüedad material o autorización imprescindible. No prometas trabajo en segundo plano.
8. Antes de crear otro prompt o botón, consulta docs/VISURA_CENTRO_DE_MANDO.md y verifica que no exista ya una orden idéntica o similar. Reutiliza o evoluciona las órdenes existentes en vez de duplicarlas.

SALIDA
Informa brevemente: modo aplicado, ORIGEN y DESTINO, evidencia de continuidad, repositorio/rama/commit/PR realmente comprobados, última tarea finalizada, siguiente tarea, riesgo de solapamiento y resultado de las acciones efectuadas. No inventes tiempos, porcentajes ni verificaciones.
```

**Instrucción para el modo A — mismo chat:**
```text
MISMO CHAT: esta orden se pega en la conversación que ya desarrolla el trabajo seleccionado. Reanuda aquí tras verificar el historial de esta conversación y GitHub. No pidas ir a otro chat por el nombre ni traslades responsabilidad. Si se detecta que el trabajo corresponde en realidad a otra conversación no continuada aquí, verifica en lectura y usa traspaso NUEVO solo si es necesario.
```

**Instrucción para el modo B — continuador existente:**
```text
CONTINUADOR EXISTENTE: el usuario señala que el chat de DESTINO YA RECIBIÓ Y CONTINUÓ el trabajo del ORIGEN. ESTA ORDEN SE PEGA EN ESE DESTINO, responsable actual. NO exijas volver al chat Work agotado, NO rehagas el traspaso, NO bloquees por títulos antiguos «CHAT NUEVO». Comprueba la continuidad real con contexto y GitHub y prosigue desde los avances posteriores, si los hay.
```

**Instrucción para el modo C — traspaso nuevo:**
```text
TRASPASO NUEVO: esta orden se pega en el chat de DESTINO que todavía va a asumir el trabajo del ORIGEN. El destino indicado es el nuevo responsable desde que la sucesión se compruebe con el historial/evidencias. Si el destino es un chat aún no creado, el usuario debe crearlo manualmente y pegar esta orden allí; el panel no puede crear ni renombrar conversaciones. Recupera el último estado verificable, evita colisiones con chats activos y continúa con la primera tarea segura. No atribuyas al chat de destino antecedentes que no sean accesibles o verificables.
```

## 2. PREPARAR TRASPASO WORK
**Cuándo:** Work está cerca de su límite o quieres protegerte antes de perder acceso.

```text
PREPARAR TRASPASO WORK. Antes de cualquier aviso de fin de créditos, verifica y guarda los avances reales; actualiza docs/CONTINUIDAD.md, CONTINUIDAD_WORK_A_CHAT_NORMAL.md y PROMPT_CONTINUAR_SIN_WORK.md donde corresponda. Incluye repositorios, ramas, commits, PR, imágenes aprobadas, decisiones, pruebas, bloqueos y la primera tarea pendiente. Comprueba que los documentos sean accesibles y entrega aquí el prompt completo, autocontenido y copiable para continuar desde un chat normal. Si no puedes guardar en GitHub, entrega la recuperación en esta conversación y declara qué no quedó persistido. Solo emite «DESARROLLO FIN DE CRÉDITOS WORK» si realmente no puedes continuar y después de entregar la recuperación disponible.
```

## 3. CONTINUAR IMÁGENES VISURA
**Cuándo:** reactivar el trabajo del chat «PROMPT E IMÁGENES».

```text
CONTINUAR IMÁGENES VISURA. Recupera la evolución de «PROMPT E IMÁGENES» mediante el contexto accesible, los archivos gráficos y los registros verificables de GitHub. Identifica qué imágenes están solo diseñadas, cuáles aprobadas, cuáles integradas y cuáles verificadas. Conserva el estilo tridimensional acordado y adapta cada imagen al módulo, pantalla o función correspondiente dentro de VISURA. No reutilices imágenes indiscriminadamente ni sustituyas recursos aprobados. Detecta la última tarea visual pendiente, evita modificaciones concurrentes y continúa su implementación sin alterar funciones existentes. Documenta asignaciones, rutas, pruebas y recursos finales. Mantén preparado el traspaso de Work a chat normal antes de cualquier límite.
```

## 4. AUDITAR SOLAPAMIENTOS
**Cuándo:** sospechas que varios chats trabajan sobre la misma parte del proyecto.

```text
AUDITAR SOLAPAMIENTOS VISURA. Compara las tareas de VISURA WORK, PROMPT E IMÁGENES y los demás chats relacionados mediante ramas, commits, PR, documentos de continuidad y estados accesibles. Identifica coincidencias de archivos o funciones, separa los responsables y propone la siguiente tarea independiente para cada línea. No modifiques ni fusiones nada durante esta auditoría. Si algún chat no es accesible, indica la incertidumbre en vez de asumir su estado.
```

## 5. GENERAR IMAGEN O ICONO VISURA

**Cuándo:** al diseñar un nuevo icono, recurso tridimensional o ilustración para cualquier función del ecosistema VISURA. El sistema debe generar como mínimo tres opciones visuales realmente distintas para poder comparar y elegir.

**Dónde explicar su función:** en el campo «¿Para qué sirve la imagen o el icono?» del panel. Selecciona «Icono» o «Imagen», describe el objetivo y pulsa **Copiar prompt para nuevo chat**. Después abre un nuevo chat de ChatGPT y pega el prompt como primer mensaje. Adjunta las capturas de estilo VISURA ya aprobado si están disponibles; ayudan a mantener la fidelidad. No es necesario repetir el prompt general.

**Prompt parametrizado:** los marcadores `{{TIPO}}` y `{{FINALIDAD}}` se sustituyen automáticamente por los campos del panel.

```text
GENERAR IMAGEN O ICONO VISURA.

TIPO DE RECURSO: {{TIPO}}
PARA QUÉ SIRVE: {{FINALIDAD}}

Crea directamente una nueva imagen del tipo indicado. Antes de generarla, utiliza las referencias visuales de VISURA accesibles en esta conversación, archivos adjuntos o recursos verificados; si no puedes acceder a una referencia, no afirmes haberla recuperado. Mantén coherencia visual con el módulo, pantalla o función correspondiente dentro de VISURA, sin imponer nombres de aplicaciones concretas. Respeta las decisiones estéticas aprobadas y evita copiar indiscriminadamente imágenes destinadas a otras funciones.

Estilo de partida: profesional, moderno, tridimensional, limpio, con profundidad, volumen e iluminación cuidada, siempre adaptado al uso descrito. Para un icono, da prioridad a silueta legible, pocos elementos, contraste y formato cuadrado; evita textos pequeños. Si el uso es una ilustración de pantalla o una imagen de contenido, adapta composición y formato a ese uso. Si se adjuntan referencias, consérvalas como guía prioritaria.

OBLIGATORIO — MÍNIMO TRES MUESTRAS: si hay información suficiente, genera y muestra al menos TRES PROPUESTAS VISUALES REALES, identificadas como A, B y C. Deben representar tres caminos creativos sustancialmente distintos, no versiones casi idénticas con cambios de color, iluminación o perspectiva. Diferéncialas de verdad en la idea visual principal, la silueta, la composición, el símbolo o metáfora gráfica y el tratamiento tridimensional; adapta esas diferencias al uso del recurso. Las tres deben ser igualmente trabajadas, profesionales y coherentes con VISURA, con suficiente personalidad y atractivo para que resulte difícil elegir entre ellas. No incluyas una alternativa de relleno ni elijas por el usuario.

Genera las tres imágenes utilizando la herramienta de imágenes disponible; si la herramienta solo permite una o dos por ejecución, continúa con ejecuciones adicionales cuando sea posible. No presentes tres descripciones como si fueran tres imágenes y no afirmes que has generado muestras que no se hayan creado realmente. Muéstralas juntas o de forma claramente comparable, explica en una frase la diferencia esencial de cada una y permite elegir A, B o C antes de refinar la seleccionada.

No te detengas a solicitar preferencias adicionales si la finalidad ya está indicada. Si el uso no está indicado o falta una decisión imprescindible, pregunta solo por ese dato. No te limites a redactar un prompt. Crear propuestas no significa aprobarlas o integrarlas: espera la elección y autorización del usuario antes de sustituir activos o modificar repositorios.
```

**Ejemplo para probar el Centro de mando:**
- Tipo: `Icono`.
- Para qué sirve: `Acceso directo al Centro de mando VISURA en la pantalla de inicio del iPhone. Permite abrir el panel de órdenes para reactivar, recuperar y controlar el desarrollo de VISURA. Debe ser un símbolo corporativo tridimensional, reconocible a tamaño pequeño y coherente con la estética VISURA.`

## 6. INTEGRAR IMAGEN APROBADA EN VISURA — V2

**Cuándo:** una vez aprobada una imagen concreta, para integrarla en el destino correcto; se mantiene separada de la orden 05 que genera tres propuestas.

**Modo de ejecución obligatorio:** «PRUEBA / SIMULACIÓN» (valor por defecto, sin escrituras) o «INTEGRACIÓN EN RAMA» (solo en un chat de desarrollo autorizado, sin publicar, desplegar ni fusionar). El panel solo prepara y copia una orden; no ejecuta por sí mismo sus instrucciones.

**Cómo usar:** identifica aplicación/panel, ubicación exacta, imagen aprobada y su archivo original o enlace directo verificable. Si procede, adjunta el archivo en el chat de implementación. Pulsa «Copiar orden V2». El prompt exige comprobar recursos ya accesibles y agotar alternativas técnicas, incluida GitHub Git Data API con blobs Base64, antes de declarar un bloqueo.

**Continuidad del caso Centro de mando:** repositorio `josegude-ux/KONTROLA`, rama de panel `visura-panel`; existe la rama de trabajo `feat/visura-centro-mando-icono-b-20261026` con referencias y documentación preparadas, pero los binarios aún requieren verificación. No crear otra rama por defecto ni dar por terminada la instalación por crear un ZIP.

**Variables generadas por el panel:** `{{MODO}}`, `{{DESTINO}}`, `{{UBICACION}}`, `{{SELECCION}}`, `{{RECURSO}}`, `{{OBSERVACIONES}}`.

```text
VISURA — ORDEN 06 V2: INTEGRAR IMAGEN APROBADA SIN INTERRUPCIONES EVITABLES

MODO DE EJECUCIÓN: {{MODO}}
DESTINO ELEGIDO: {{DESTINO}}
UBICACIÓN O USO: {{UBICACION}}
IMAGEN APROBADA: {{SELECCION}}
ARCHIVO ORIGINAL O FUENTE: {{RECURSO}}
INDICACIONES ADICIONALES: {{OBSERVACIONES}}

MISIÓN
Incorpora la imagen ya aprobada en el destino seleccionado, conservando su diseño original y todas las funciones existentes. NO generes propuestas nuevas ni rediseñes la imagen. Continúa de forma autónoma, con herramientas realmente disponibles y dentro de esta sesión, hasta completar todas las tareas técnicas seguras permitidas o hasta demostrar un bloqueo real. No prometas trabajo en segundo plano.

0. CORTAFUEGOS DE PRUEBAS Y AUTORIZACIONES
- Si el MODO es «PRUEBA / SIMULACIÓN», o si la conversación receptora está reservada a pruebas, SOLO audita, simula y explica qué se ejecutaría. Prohibido escribir en GitHub, bases de datos, alojamientos o aplicaciones, aunque el resto de la orden pida integrar.
- Si el MODO es «INTEGRACIÓN EN RAMA» y la conversación receptora permite desarrollos reales, está autorizado preparar, verificar y confirmar cambios reversibles únicamente en una rama de trabajo aislada y en el destino indicado. No se autoriza fusionar ramas, modificar producción, cambiar configuración de despliegue, publicar ni borrar datos o imágenes ajenas.
- Ante cualquier duda entre prueba y ejecución real, prevalece PRUEBA / SIMULACIÓN. No conviertas una prueba en una intervención real. Una petición explícita e independiente de mantener el propio Centro de mando no significa autorización para ejecutar esta orden sobre una aplicación.

1. IDENTIFICAR EL ARCHIVO APROBADO
- Busca el archivo original entre los adjuntos accesibles, los archivos de Biblioteca/Proyecto disponibles, las rutas locales verificadas y los enlaces directos realmente descargables. Valida formato, dimensiones y contenido; conserva la fuente y registra SHA-256 cuando sea posible.
- No asumas que una letra A/B/C, una captura o un enlace al chat dan acceso al fichero binario. Verifica que la imagen corresponde a la elección aprobada; si no puedes confirmarlo, solicita solo el recurso o la aclaración imprescindible.
- Si el archivo está disponible, NO te detengas solicitando que el usuario lo adjunte otra vez.

2. RECUPERAR EL DESARROLLO REAL SIN DUPLICAR
- Confirma repositorio, ramas, commits, PR y documentos de continuidad vigentes. Antes de crear una rama nueva, busca si existe una rama de integración previa y reutilízala si conserva el trabajo correcto. No uses documentación antigua de main como estado actual por defecto.
- Para VISURA CENTRO DE MANDO, comienza comprobando josegude-ux/KONTROLA, rama visura-panel, docs/index.html y la posible rama feat/visura-centro-mando-icono-b-20261026. Para otros módulos, identifica su repositorio real.
- Detecta cambios ajenos o trabajo paralelo; no los sobrescribas. Mantén la implementación estrictamente acotada al recurso solicitado.

3. PREPARAR LOS RECURSOS
- Comprueba cómo se insertan iconos/imágenes en la aplicación: HTML, componentes, favicon, apple-touch-icon, manifest, etc. Conserva el original como fuente y genera únicamente los tamaños, formatos y optimizaciones técnicos necesarios, sin rediseñarla.
- Revisa tamaños, relación de aspecto, bordes, fondo y legibilidad. Usa rutas nuevas y reversibles para no destruir recursos anteriores.

4. SUBIR LOS ARCHIVOS A GITHUB: ESCALERA OBLIGATORIA
- Nunca declares que «GitHub no admite archivos binarios» solo porque una función de creación de archivos acepta únicamente UTF-8.
- Primero comprueba una función nativa de subida binaria, si existe.
- Si no existe y está disponible la API Git de GitHub, evalúa y prueba la ruta correcta: codificar los bytes reales en Base64, crear el blob con create_blob y encoding=base64, añadirlo al árbol existente con create_tree, crear el commit con create_commit y el padre verificado, y actualizar la rama mediante update_ref con SHA esperado, sin forzar y sin tocar otras ramas. Verifica que los blobs corresponden a los bytes originales o derivados. NO uses una función exclusiva para texto UTF-8 para grabar una cadena Base64 como si fuera un archivo .png.
- Si esa ruta falla, registra el error exacto y evalúa otra herramienta conectada y autorizada compatible con binarios. Si hay límite de tamaño, prueba optimización técnica razonable sin alterar la estética ni perder la fuente.
- Si todas las rutas disponibles fallan, prepara un paquete local completo con rutas exactas, instrucciones de carga y cambios preservados. Marca «PENDIENTE DE SUBIDA BINARIA» y especifica UNA acción humana concreta necesaria. Es un bloqueo real, NO una integración terminada. Completa las otras tareas seguras que aún sean posibles.

5. CERRAR EL CIRCUITO DE INTEGRACIÓN
- En la rama aislada, enlaza la imagen real desde las pantallas o metadatos pertinentes. Verifica que los binarios existen en GitHub, las rutas coinciden, los archivos son legibles y los derivados tienen dimensiones correctas. Comprueba el HTML o aplicación y el manifest cuando corresponda.
- Verifica visualmente cuando las herramientas lo permitan. Si no puedes probar físicamente en Safari/iPhone, indica esa limitación con precisión y aporta comprobaciones reproducibles. No inventes pruebas en un dispositivo.
- Confirma que no se han alterado funciones existentes, que el diff es mínimo y que el repositorio base/productivo sigue intacto.

6. AVANZAR SIN DETENCIONES ARTIFICIALES
- Tras cada hito, continúa automáticamente con el siguiente paso seguro. No finalices la ejecución solo por haber creado un ZIP, manifest, documento o rama, ni por el primer error subsanable.
- No preguntes por datos ya disponibles. Solo solicita intervención ante falta efectiva del original, ambigüedad material de la selección, permisos negados después de probar alternativas compatibles, conflicto de rama imposible de resolver sin sobrescribir trabajo, o autorización necesaria para fusionar/publicar/operar datos.
- No repitas intentos idénticos que hayan fallado sin cambiar el método. No declares acciones ejecutadas sin evidencia; no prometas trabajo fuera de la sesión ni que superarás límites de herramientas.

7. EVIDENCIA, CONTINUIDAD Y ENTREGA
- Documenta en la rama segura rutas, hashes si procede, archivos modificados, commit, pruebas ejecutadas y pendientes. Mantén diferenciados: APROBADA, ORIGINAL RECUPERADO, DERIVADOS CREADOS, BINARIOS EN GITHUB, REFERENCIAS VALIDADAS, INTEGRADA EN RAMA, PUBLICADA, VERIFICADA EN DISPOSITIVO.
- Al concluir informa brevemente del estado real, rama, commits, evidencias, URL de revisión si existe y siguiente acción concreta. Si falta una etapa, indica cuál y por qué.
- Espera autorización explícita antes de fusionar, publicar/desplegar, sustituir recursos compartidos irreversiblemente o borrar datos.

CRITERIO DE ÉXITO
En INTEGRACIÓN EN RAMA: la imagen aprobada y sus derivados necesarios están realmente en la rama correcta, la aplicación los referencia, se han realizado las comprobaciones técnicas disponibles y la continuidad está documentada, sin publicación no autorizada.
En PRUEBA / SIMULACIÓN: se audita la viabilidad, se identifican rutas y alternativas, se detectan bloqueos y se entrega un plan ejecutable SIN modificar sistemas.
```

## Menú actual — Accesos directos V5.4 (2026-10-26)

**Nueve funciones**, sin duplicidad 01/03, y un gestor de chats compartido en la cabecera (no es una nueva orden). La función 08 permanece para órdenes, incidencias y consultas específicas; la nueva 09 recupera interrupciones de streaming. La nueva orden 01 reúne las tres formas de continuidad; se conserva 02 Preparar Work y las demás tareas de diseño, auditoría, integración y consulta. La interfaz muestra las funciones en una cuadrícula móvil, abre solo la elegida y ofrece «Volver al menú».

- Enlaces nuevos `#funcion-1` a `#funcion-9`. Enlaces históricos `#orden-1` a `#orden-8` compatibles con un mapeo explícito para no enviar a la función equivocada.
- Se mantiene botón «↻ Actualizar», cabecera y logo aprobado, selector de archivos de la integración, todos los prompts independientes y la protección de PRUEBA / SIMULACIÓN.
- Las instrucciones antiguas 01 y 03 siguen consultables en el historial Git de esta rama, pero no se duplican en el menú.
- Solo se editan `docs/index.html`, `docs/VISURA_ORDENES.html` y este documento maestro en `visura-panel`; no se autoriza modificar `main` o aplicaciones.

## Evolución de navegación móvil — Panel compacto (2026-10-26)

**Objetivo:** evitar el desplazamiento vertical por siete órdenes completas en iPhone. El panel web conserva las siete órdenes sin variar sus prompts y muestra solo una a la vez.

- Cabecera breve y **selector de orden** con las siete opciones; controles Anterior y Siguiente y contador visible. Se puede entrar directamente con un enlace `#orden-1` a `#orden-7`; la selección no modifica el contenido ni la copia de los prompts.
- Accesos y documentación secundaria plegados, no ocupan la pantalla inicial. El menú debe mantener contraste, tamaño táctil cómodo y funcionar en móvil sin dependencias externas.
- Orden 07: añade **«Elegir imagen en el dispositivo»** mediante un `<input type="file">` que abre el selector nativo de iOS (Archivos/Fotos, según dispositivo) y muestra nombre y vista previa local cuando sea posible. Mantiene la opción alternativa de URL pública.
- **Limitación explícita:** por seguridad del navegador, seleccionar un archivo en una web independiente NO lo adjunta automáticamente a ChatGPT ni concede al asistente acceso a su ruta local. El prompt copiado incluye el nombre del archivo seleccionado e indica que el usuario debe adjuntarlo al chat receptor. Nunca inventar una URL local accesible al agente.
- La herramienta de elección es totalmente local: no transmite bytes a servidores ni a GitHub desde el panel. La orden 06 de integración V2 sigue respetando PRUEBA / SIMULACIÓN predeterminado y los permisos de integración en rama.

## Botón de actualizar panel (2026-10-26)

- **Ubicación:** cabecera superior del Centro de mando, visible incluso al navegar entre las siete órdenes.
- **Acción:** «↻ Actualizar» vuelve a cargar el HTML de la URL actual incorporando un parámetro `visura_actualizar` con valor único, conservando el ancla `#orden-N` de la orden seleccionada. Esto intenta evitar la caché local y las respuestas anteriores de los proveedores intermediarios.
- **Alcance:** actualiza la página en el dispositivo; no ejecuta órdenes, no descarga cambios en GitHub, no fusiona y no despliega versiones. Los cambios del repositorio solo se reflejarán cuando el alojamiento que sirve el HTML los ofrezca realmente.
- **Advertencias:** si el alojamiento de terceros usa una caché propia que ignora el parámetro o retiene copias, pulsar Actualizar **no garantiza** ver inmediatamente el último commit. Recargar puede perder datos aún no copiados de formularios y archivos locales seleccionados; conviene copiar primero la orden en curso.

## Logo aprobado B en la cabecera — actualización verificada

- **Origen:** imagen maestra aprobada `VISURA_CENTRO_DE_MANDO_ICONO_DEFINITIVO.png` (1024 × 1024), SHA-256 `45890808fada6590d90a925c06139d4ea860d1ff37423835f71dce801c75ab2e`.
- **Archivo binario cargado y verificado en GitHub:** `docs/assets/icons/visura-centro-mando-logo-64.png` (PNG 64 × 64), Git blob SHA `b30dd2ae5e83d0feae2558b073ef916eebb58214` y SHA-256 `f3029a3e673a3f011676ec0ded14bc56a181f24a995c519e00126c8c812599f6`.
- **Integrado en:** cabecera y favicon PNG de `docs/index.html` y `docs/VISURA_ORDENES.html`. El SVG anterior `docs/assets/logo-visura-centro-mando.svg` se mantiene sin borrar por compatibilidad y continuidad, pero las páginas actuales usan el PNG aprobado.
- **Estado confirmado:** binario real en rama `visura-panel`, referencias HTML actualizadas y verificables, `main` sin cambios. **Pendiente:** confirmar el aspecto en Safari del usuario; el icono `apple-touch-icon` de 180 × 180 para el acceso instalado en iPhone NO se ha incorporado aún, y no debe darse por completado. El binario PNG de 64 × 64 no sustituye al necesario para iPhone.
- No generar nuevamente la imagen ni fusionar/publicar otras ramas para completar esta fase.

## Identidad visual de la cabecera (2026-10-26)

- El panel V4 muestra en la cabecera una **V VISURA verde/plata con anillo orbital**, acompañada del nombre y «CENTRO DE MANDO». Recurso de cabecera: `docs/assets/logo-visura-centro-mando.svg`, referenciado por `docs/index.html` y `docs/VISURA_ORDENES.html`.
- Se utiliza también como **favicon SVG** del navegador. La adaptación vectorial conserva los rasgos gráficos generales del icono aprobado, pero **no sustituye el archivo PNG original B** ni demuestra que el icono instalado en iPhone haya cambiado.
- El original aprobado se conserva aparte y la integración de los PNG para el acceso directo iPhone sigue registrada como pendiente en `feat/visura-centro-mando-icono-b-20261026`; evitar declararla completada por esta modificación de cabecera.
- Cambios únicamente en `visura-panel`; no fusionar `main` ni alterar INVENTA/PREPARA.

## 7. ESTADO DE DESARROLLO DE UN CHAT — Proyecto EXCELL

**Cuándo:** cuando quieras seleccionar un chat concreto del proyecto Excel/EXCELL y obtener una evaluación de qué construye, último hito confirmado, cuánto queda para terminar y siguientes pasos, sin reactivar el desarrollo.

**Selector:** «Chat del proyecto que quiero analizar», con nombres conocidos de chats del ecosistema VISURA y opción «Otro chat» para cualquier conversación del proyecto Excel/EXCELL. No se pretende enumerar automáticamente todas las conversaciones: la lista del panel es manual y puede ampliarse. Se permiten un enlace de referencia y una aclaración opcionales.

**Funcionamiento:** el botón 08 prepara y copia un prompt específico al chat seleccionado, que debe pegarse en una conversación donde el historial o las fuentes verificables sean accesibles. **El panel no tiene permisos para consultar todos los chats, ni un nombre o enlace por sí solo aporta acceso**. La orden exige no inventar avances ni porcentajes. En especial, las estimaciones de tiempo o % solo se entregan si el alcance y las evidencias lo justifican; en otro caso señala «no estimable».

**Prohibición:** evaluación en **solo lectura**; no cambiar GitHub, PR, códigos, imágenes, bases de datos ni la aplicación. La orden 07 no reactiva trabajo y no sustituye la orden 01 unificada.

**Variables:** `{{CHAT}}`, `{{ENLACE}}` y `{{CONTEXTO}}`.

```text
AUDITAR ESTADO DE DESARROLLO DE UN CHAT DEL PROYECTO EXCELL.

CHAT OBJETIVO: {{CHAT}}
ENLACE DE REFERENCIA (SI EXISTE): {{ENLACE}}
CONTEXTO O REPOSITORIO ADICIONAL (SI EXISTE): {{CONTEXTO}}

OBJETIVO: Entrega un diagnóstico breve, concreto, verificable y actualizado sobre QUÉ se está desarrollando en ese chat, EN QUÉ PUNTO EXACTO se encuentra y CUÁNTO FALTA PARA TERMINAR. Esto es una AUDITORÍA DE SOLO LECTURA: no cambies código, ramas, PR, documentos, datos, imágenes ni aplicaciones; no inicies ni reanudes el desarrollo.

1. IDENTIFICAR EL CHAT. El nombre identifica la conversación a examinar, pero no garantiza acceso a su historial. Intenta consultar el historial disponible de ese chat del proyecto EXCELL y, cuando sea necesario, las fuentes del proyecto y de GitHub realmente accesibles. No asegures haber leído una conversación únicamente porque conoces su título o enlace. Si no puedes recuperar el historial, indícalo y utiliza solo evidencias verificadas (commits, ramas, PR, archivos y continuidad) sin atribuir falsamente estados de un repositorio entero a ese chat.
2. RECONSTRUIR EL TRABAJO ACTUAL. Identifica su aplicación o funcionalidad concreta, propósito y resultado esperado, últimos cambios realmente comprobados, última tarea terminada, tarea actualmente en curso y estado de pruebas. Contrasta fecha, rama, commit, PR y documentación cuando existan; si varias evidencias discrepan, prioriza la más reciente comprobable y describe la discrepancia.
3. CALCULAR LO QUE FALTA. Enumera las principales tareas restantes, sus dependencias, bloqueos y permisos externos necesarios. Distingue terminado, en curso, pendiente y no verificable. No confundas «código escrito» con «función validada» o «lista para publicar».
4. ESTIMACIÓN HONESTA. Da un porcentaje de avance y una previsión de esfuerzo SOLO si existen entregables definidos y evidencias suficientes para sustentarlos. Explica en una línea la base del cálculo, indica un rango orientativo en lugar de precisión falsa y la incertidumbre asociada. Si faltan alcance o evidencias, indica «avance no estimable de forma fiable» y «plazo no estimable», especificando qué información permitiría calcularlos. No inventes fechas, horas, porcentajes, pruebas ni trabajo que nadie haya realizado.
5. PROTEGE EL ALCANCE. No mezcles VISURA WORK, VISURA 0.1, VISURA 0.2, PROMPT E IMÁGENES u otras líneas por el mero hecho de relacionarse con VISURA. Solo atribuye hitos al chat indicado cuando haya evidencia de esa relación. No uses main como sinónimo del último avance; no repitas contenidos históricos superados.

FORMATO DE RESPUESTA OBLIGATORIO, BREVE Y COMPRENSIBLE:
- CHAT ANALIZADO: [nombre] · FUENTES: [chat, GitHub, documentos realmente consultados] · CONFIANZA: [alta/media/baja].
- QUÉ SE DESARROLLA: 1–3 frases sobre producto, finalidad y alcance.
- PUNTO ACTUAL: última tarea completada y comprobada, tarea en curso, rama/commit/PR relevantes y estado de pruebas.
- AVANCE ESTIMADO: [% o «no estimable»], con base del cálculo y margen de incertidumbre.
- QUÉ FALTA: entre 3 y 6 tareas esenciales, marcando dependencias/bloqueos.
- PARA TERMINAR: [esfuerzo restante en rango y supuestos, o «no estimable»]; explica qué significa «terminado» para este desarrollo (implementado/probado/listo para publicar).
- SIGUIENTE PASO RECOMENDADO: una sola tarea concreta y segura.

Si solo puedes dar un estado parcial, preséntalo como parcial en lugar de inventar una conclusión. No ejecutes ninguna de las tareas enumeradas.
```

## 8. NUEVA ORDEN / CONSULTA A CHAT — incidencias, cambios y preguntas (V5.1)

**Auditoría de duplicidad:** se revisaron las siete funciones existentes. La 01 reanuda o transfiere desarrollos; la 04 audita colisiones; la 07 consulta el **estado general de un chat**. Ninguna permite enviar una **petición concreta, incidencia localizada o pregunta operativa** a un chat responsable. Por tanto, se justifica una única nueva función 08 con tres tipos de solicitud. No crear botones separados para incidencia, consulta y orden.

**Formulario:** escoger un chat del proyecto (incluye «VISURA 0.2»), tipo `INCIDENCIA` / `ORDEN` / `CONSULTA`, asunto, descripción, lo que aparece, lo esperado y evidencias. Permite abrir el chat mediante una URL directa conocida. Botón «Ejemplo: palés» para preparar el caso facilitado por el usuario; se puede cambiar a cualquier asunto.

**Ejemplo real:** en la pantalla de VISURA PREPARA del chat VISURA 0.2 aparecen tarjetas de LP26-19519, LP26-19531 y LP26-19525 con el indicador «HUECOS PALÉS: 0 huecos». La foto **no permite saber por sí sola** si el cero es real, si faltan datos o si falla el cálculo/renderizado; el prompt exige averiguarlo y recuperar las reglas sobre palés de cargas anteriores y el ajuste manual del operario. El panel no puede adjuntar la captura por sí mismo; el usuario la adjunta manualmente en el chat receptor.

**Política:** CONSULTA = solo lectura; INCIDENCIA/ORDEN = corrección o desarrollo autorizado en rama segura, sin fusionar, desplegar ni borrar. Si el chat receptor está reservado a pruebas, no se permiten escrituras. La nueva orden debe revisar problemas ya planteados antes de crear tareas duplicadas.

**Variables:** `{{CHAT}}`, `{{TIPO}}`, `{{ASUNTO}}`, `{{DESCRIPCION}}`, `{{ACTUAL}}`, `{{ESPERADO}}`, `{{EVIDENCIAS}}`, `{{CONTEXTO}}`, `{{REGLA_TIPO}}`.

```text
VISURA / EXCELL — ORDEN, INCIDENCIA O CONSULTA DIRIGIDA A UN CHAT DE DESARROLLO.

CHAT RESPONSABLE: {{CHAT}}
TIPO: {{TIPO}}
ASUNTO: {{ASUNTO}}
DESCRIPCIÓN DEL PROBLEMA O PETICIÓN: {{DESCRIPCION}}
RESULTADO ACTUAL / SITUACIÓN OBSERVADA: {{ACTUAL}}
RESULTADO ESPERADO / PREGUNTA CONCRETA: {{ESPERADO}}
EVIDENCIAS Y CAPTURAS: {{EVIDENCIAS}}
CONTEXTO ADICIONAL: {{CONTEXTO}}

MODO DE TRABAJO
{{REGLA_TIPO}}

INSTRUCCIONES COMUNES
1. Esta orden se pega en el CHAT RESPONSABLE seleccionado; no abras otro chat ni transfieras la responsabilidad solo por diferencias de título. Comprueba qué historial, capturas y archivos están REALMENTE accesibles y no inventes accesos. Si esta conversación está reservada a pruebas, limita la actividad a diagnóstico y simulación, sin escribir en GitHub ni aplicaciones.
2. ANTES DE CREAR TAREAS, analiza si esta misma incidencia, consulta o solicitud ya se planteó, está implementada, tiene PR/commit, o se está desarrollando en otro chat. Revisa el historial accesible, docs/CONTINUIDAD.md y ramas/PR/commits del repositorio aplicable. Si existe, CONTINÚA el trabajo existente y enlázalo; no lo dupliques.
3. Identifica los datos de entrada, las reglas de negocio, cálculos, servicios, importaciones y pantallas que intervienen. No asumas que la captura demuestra la causa. Si un campo indica cero, diferencia cero real, dato no informado, fallo de cálculo y fallo de presentación.
4. Para VISURA PREPARA/INVENTA, recuerda la arquitectura acordada: origen Business Central solo mediante archivos Excel cargados manualmente, validación y persistencia Supabase; sin integración API directa. Conserva cuentas de operarios, reglas de permisos, retención y datos existentes. Si se mencionan palés/huecos, distingue palés de la carga, huecos ocupados, capacidad disponible y cargas anteriores añadidas al camión; comprueba cómo afecta la introducción manual al resultado viable.
5. Si es una CONSULTA, explica la respuesta fundamentada y qué se ha comprobado, sin modificar repositorios ni datos. Si es una INCIDENCIA o una ORDEN de desarrollo y el chat está autorizado para cambios, investiga y ejecuta las modificaciones mínimas, seguras y reversibles en la rama correcta, sin detenerte ante el primer obstáculo subsanable. Verifica las pruebas y documenta el avance. Si no hay acceso/herramientas suficientes, presenta diagnóstico parcial y bloqueo exacto; no afirmes que has corregido algo que no se ha comprobado.
6. No fusiones, despliegues a producción, borres datos ni sobrescribas trabajo ajeno sin autorización expresa. No confundas cerrar un PR con comprobar que el usuario ve la corrección en el aplicativo: diferencia código, pruebas y versión realmente publicada. No prometas trabajo en segundo plano.

AL FINAL: informa de modo claro del problema/solicitud entendida; posible causa o causa comprobada; estado previo; acción realizada o pendiente; rama/PR/commit y pruebas si existen; y siguiente paso para que el usuario pueda verificar la pantalla afectada. No inventes porcentajes ni tiempos.

IMPORTANTE: si se menciona una captura seleccionada en el Centro de mando, los bytes NO se transfieren al copiar el prompt. Debe adjuntarse la imagen al mensaje en el chat seleccionado o ya estar accesible allí.
```

**Regla específica INCIDENCIA:**
```text
INCIDENCIA EXISTENTE: diagnostica la anomalía, confirma el resultado correcto esperado a partir de reglas y datos, comprueba duplicados y realiza la corrección mínima segura en la rama adecuada si el chat está autorizado. No declares resuelto hasta verificar con casos reales o pruebas equivalentes. Si se trata de una incidencia ya comunicada, reanuda su reparación; evita cerrar el trabajo con explicaciones genéricas.
```

**Regla específica ORDEN:**
```text
ORDEN DE TRABAJO: ejecuta la funcionalidad o cambio solicitado si está dentro de los permisos del chat y es técnicamente seguro. Antes de modificar, detecta solapamientos, reutiliza lo ya implementado, delimita criterios de aceptación y verifica los resultados. Si no hay autorización para una acción sensible, prepara y valida todo lo no destructivo y solicita únicamente el permiso imprescindible.
```

**Regla específica CONSULTA:**
```text
CONSULTA DE SOLO LECTURA: explica el funcionamiento actual, responde la pregunta concreta y señala las comprobaciones disponibles; no escribas en GitHub, bases de datos o aplicaciones. Si descubres una incidencia, descríbela y ofrece el paso para tramitarla como INCIDENCIA, pero no la ejecutes desde esta consulta.
```

## Gestor único de chats V5.2 — Monousuario y copia en OneDrive

**Decisión autorizada:** el Centro de mando es monousuario; no se crean usuarios, contraseñas, backend ni permisos Microsoft. Se reutiliza la configuración del propio panel: el gestor de chats no constituye una orden numerada; la orden 09 es la recuperación de streaming, introducida después en V5.3.

**Dónde está:** cabecera superior, botón «⚙ Mis chats». El gestor mantiene un único registro con nombre de conversación, estado (Por verificar / Activo / Continuador / Histórico / Finalizado) y URL directa opcional a `https://chatgpt.com/c/...`. Se puede añadir, editar y quitar una entrada **solo de la lista local**, nunca de ChatGPT. Los estados iniciales se basan en decisiones conocidas cuando las hay (por ejemplo, VISURA WORK histórico, VISURA AUTO-DEV continuador); los demás son «Por verificar», sin inventar actividad.

**Desplegables conectados a la misma lista:** origen de Continuar desarrollo `continuity-source`, destino `continuity-destination`, chat a analizar `status-chat`, chat responsable de Orden/consulta `request-chat`. Se preservan los casos especiales `CHAT NUEVO` y `OTRO`, el comportamiento de los tres modos y la selección predeterminada VISURA WORK → VISURA AUTO-DEV. Los selectores para aplicaciones (por ejemplo `integration-target`) **no** se confunden con selectores de chats.

**Persistencia:** `localStorage` del origen web, clave `visura-centro-chats-v1`. Guardar un cambio actualiza los cuatro desplegables sin recargar. Al abrir la aplicación se recarga este registro **del navegador**, NO la lista de conversaciones de ChatGPT. El registro no se sincroniza entre iPhone, PC o distintos dominios; Safari puede eliminar datos locales. Si el navegador bloquea el guardado, el gestor avisa y no declara una persistencia inexistente.

**Copia en OneDrive SIN autorización especial:**
1. Pulsa **Exportar JSON** en «⚙ Mis chats». En Safari/iOS se intenta mostrar Compartir del sistema y seleccionar **Guardar en Archivos → OneDrive** (si la app OneDrive está instalada, iniciada y habilitada como ubicación de Archivos). Si el navegador no admite compartir archivos, se descarga el JSON para que el usuario lo mueva a OneDrive manualmente.
2. Para recuperar, pulsa **Importar JSON** y elige el archivo desde Archivos/OneDrive. Se valida el formato `visura-chat-registry-v1` y la lista, se pregunta antes de actualizar registros del mismo nombre y se conservan los demás. No se realiza importación silenciosa ni se borra la lista sin aviso.
3. El JSON incluye nombres y posibles enlaces privados a los chats; guárdalo en una ubicación personal. No contiene contraseñas ni tokens. No usar Microsoft Graph, OneDrive API, OAuth, permisos delegados, Supabase ni cuentas adicionales.
4. Esta copia es **manual**, no una sincronización bidireccional ni un acceso automático a archivos de OneDrive. La función de compartir exacta depende de Safari y de las opciones del iPhone.

**Pruebas mínimas:** añadir/editar/quitar, persistencia tras recarga, seleccionabilidad en los cuatro formularios, exportación/importación incluyendo coincidencias y registro vacío, validación de URLs, ausencia de cambios en `main`, siete/ ocho funciones según la versión (V5.2: ocho), captura e integración conservadas. La prueba de interfaz real y de ubicación OneDrive en el iPhone solo puede confirmarla el usuario.

## 9. RECUPERAR TRAS STREAMING INTERRUMPIDO — V5.3

**Auditoría antduplicados (26/10/2026):** revisadas órdenes 01–08 de `visura-panel`. La orden 01 reanuda o transfiere un desarrollo entre chats, mientras que la 08 comunica órdenes/incidencias/consultas. Ninguna verifica específicamente el resultado de acciones que podrían haber quedado ejecutadas durante un corte de respuesta ni recupera un checkpoint de streaming. **Se crea la orden 09 como función diferenciada**, para pegarla en el MISMO chat donde ocurrió la interrupción. No hace traspaso ni abre chats.

**Diseño V5.4 — recurso aprobado:** el acceso y el formulario de la orden 09 usan la **misma captura aportada por el usuario** («Streaming interrumpido. Esperando el mensaje completo…»), no una ilustración redibujada. Se ha preparado un derivado técnico optimizado para la web, conservando todo el contenido y la composición (WebP 500 × 114 px), en `docs/assets/streaming-aviso-original.webp`. El original JPEG de la conversación se conserva sin alteración; el derivado no es idéntico byte a byte debido a la compresión y reducción. Solo el botón 09 y su formulario adoptan fondo crema, borde suavemente anaranjado y acentos naranjas coherentes con la captura. El resto de funciones VISURA mantiene el diseño y comportamiento anterior.

**Formulario:** campo «Tarea que estaba en curso» editable y precargado con «Comprobar las pruebas automáticas de la corrección conjunta de 6 G, 1 E y Observaciones, guardada presuntamente en una rama aislada.». Dos botones: **Copiar recuperación** y **Ver prompt** (con Ocultar al desplegar). Se sustituye únicamente `{{TAREA_EDITABLE}}` por el texto en el momento de copiar. Si el campo está vacío, pedir al usuario que lo complete y no copiar un prompt con marcador sin resolver. Copiar no ejecuta tareas ni escribe en GitHub.

**Verificación de ejemplo:** se confirmó la existencia del PR #48 «VISURA PREPARA: corregir lectura 6G 1E y Observaciones», rama `fix/visura-prepara-cabecera-6g-1e-observaciones-20261026`. Su presencia no prueba que las pruebas automáticas hayan terminado ni que la corrección esté desplegada. El prompt obliga a verificar antes de continuar.

**Límites:** no fusionar, desplegar, eliminar datos ni sobrescribir ramas ajenas sin permiso. Respetar chats reservados a pruebas y confirmar toda evidencia. Mantener intactos el gestor de chats/OneDrive, accesos anteriores, enlace directo `#funcion-9` y enlaces históricos.

**Prompt maestro literal:**
```text
RECUPERACIÓN SEGURA TRAS INTERRUPCIÓN DE STREAMING — VISURA / EXCELL

Se ha interrumpido la transmisión de la respuesta durante el desarrollo.

Recupera la continuidad del trabajo desde el último estado realmente verificable.

INSTRUCCIONES OBLIGATORIAS:

1. Comprueba en GitHub la rama activa, los últimos commits, los PR abiertos y los resultados de las pruebas.
2. Identifica qué operaciones se completaron, cuáles están pendientes y cuáles no pueden verificarse.
3. No repitas cambios que ya estén guardados.
4. No sobrescribas modificaciones de otros chats o desarrollos.
5. Conserva intactas las aplicaciones instaladas y sus datos.
6. Consulta docs/CONTINUIDAD.md, pero no consideres su contenido más antiguo que los commits recientes como estado definitivo.
7. Actualiza la documentación de continuidad con los resultados verificados.
8. Reanuda únicamente las operaciones pendientes y autorizadas.
9. No fusiones ramas, publiques versiones ni modifiques bases de datos reales sin autorización.
10. Tras cada hito, guarda y documenta un punto de recuperación verificable.

TAREA QUE ESTABA EN CURSO:

{{TAREA_EDITABLE}}

OBJETIVO:

Continuar el desarrollo sin pérdida de trabajo, sin duplicaciones y sin reiniciar tareas ya finalizadas.

No te detengas salvo bloqueo real o necesidad imprescindible de autorización. Si una comprobación no es posible, documenta la limitación y continúa con la siguiente tarea independiente y segura.
```

## Regla permanente 0 — Comprobar duplicados ANTES de crear un prompt

Antes de redactar, guardar, proponer o añadir un prompt/botón al Centro de mando:
1. Consultar este catálogo maestro en GitHub (rama vigente `visura-panel`) y los prompts/funciones existentes; identificar su finalidad real, datos de entrada, destino, acciones y efectos.
2. Comparar si el requerimiento nuevo es **idéntico, similar, complementario o diferente**. Si ya existe una orden que cumple lo solicitado, usarla; si le faltan parámetros o reglas, **modificar y evolucionar esa orden** sin abrir otra numeración.
3. Crear botón nuevo solo cuando su propósito y resultados sean materialmente distintos, y documentar en el registro por qué no se reutilizó otro. Revisar que no haya contradicciones y no replicar el mismo prompt bajo varios nombres.
4. Probar el generador con al menos dos opciones diferentes y con opciones vacías; verificar que cambia correctamente origen/destino y que no mezcla chats ni ejecuta acciones desde el panel.
5. Mantener las dos copias HTML, el documento maestro y la numeración sincronizados. No tocar `main`, no fusionar ni desplegar aplicaciones sin autorización.

**Separación de funciones actual:** 01 Continuar desarrollo (tres modos); 02 Preparar Work; 03 Continuar imágenes; 04 Auditar solapamientos; 05 Crear imágenes; 06 Integrar imagen; 07 Consultar estado del chat en solo lectura; 08 Comunicar una orden, incidencia o consulta concreta a un chat; 09 Recuperar una respuesta de desarrollo interrumpida por streaming en el mismo chat. Antes de crear otro botón, verificar solapamientos. Son funciones relacionadas pero no duplicadas.

## Reglas comunes
1. Consultar primero el estado verificado en GitHub, **sin tratar la documentación antigua de main como último estado**.
2. Evitar repetir tareas y sobrescribir trabajo paralelo.
3. No fusionar, publicar ni ejecutar operaciones destructivas sin autorización.
4. Registrar avances comprobados y mantener documentación de continuidad.
5. Preparar traspaso a chat normal antes de agotar recursos Work; no fingir conocer saldo si no es visible.
6. Ejecutar tareas autorizadas en la sesión activa; no prometer procesos en segundo plano.

## Accesos
- **Repositorio de copia:** `josegude-ux/KONTROLA`, rama independiente `visura-panel`.
- **Archivo:** `docs/VISURA_CENTRO_DE_MANDO.md`.
- **Panel web independiente:** `docs/VISURA_ORDENES.html` en esta misma rama.
- **ChatGPT:** recomendable un chat separado titulado «VISURA — CENTRO DE MANDO» dentro de un proyecto VISURA.
- **iPhone:** abrir el panel independiente desde un acceso guardado o copiar las órdenes a una nota fijada.

**Importante:** los botones dentro de un mensaje no se pueden fijar dinámicamente al final del chat al crecer la conversación. El panel independiente evita esa limitación.


## Acceso web permanente provisional (tercero externo)

- **Panel HTML**: https://raw.githack.com/josegude-ux/KONTROLA/visura-panel/docs/index.html
- **Rama para el panel**: `visura-panel` (independiente de `main`).
- Este enlace funciona a través del proveedor externo **raw.githack.com** y no es GitHub Pages. Puede mostrar una pantalla de confirmación de seguridad antes de cargar archivos HTML; la disponibilidad depende de ese servicio.
- Los cambios futuros en `visura-panel/docs/index.html` podrán verse en el mismo enlace tras propagarse la caché.
- Para pasar a **GitHub Pages oficial sin tocar la publicación existente de KONTROLA**, utilizar otro repositorio dedicado para el panel. No modificar la fuente GitHub Pages de KONTROLA sin verificar su configuración y autorización específica.
