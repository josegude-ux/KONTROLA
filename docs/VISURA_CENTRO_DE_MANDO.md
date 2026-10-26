# VISURA — CENTRO DE MANDO
**Versión:** V4.3 — 2026-10-26  
**Objetivo:** conservar órdenes copiables de desarrollo y recuperación de contexto para VISURA.

> Este archivo es una **copia maestra de instrucciones**, no un informe del estado actual del software. Antes de cualquier cambio hay que contrastar ramas, commits, PR y documentación con GitHub. No fusionar, desplegar ni borrar datos sin autorización. No se puede garantizar un proceso en segundo plano ni superar límites de Work.

## 1. REACTIVAR VISURA — CONTINUIDAD VERIFICADA (V3)

**Error corregido:** la versión V2 exigía pegar la orden literalmente en el chat elegido. Eso produjo una parada incorrecta cuando un chat inicialmente denominado «CHAT NUEVO» ya había recuperado y continuado legítimamente VISURA AUTO-DEV procedente de VISURA WORK. Una diferencia de nombre no demuestra que sea otro desarrollo.

**Cuándo:** cuando quieras reanudar una línea ya iniciada, bien en su chat original o en una conversación que ya se haya convertido de forma verificable en su sucesora.

**Selector:** elige el chat/línea a reanudar (incluye ahora «VISURA AUTO-DEV»), indica si estás en el chat original o en un chat continuador ya iniciado y, en el segundo caso, puedes identificar el chat de procedencia. El enlace directo sigue siendo opcional.

**Distinción con la orden 03:** la orden 01 reanuda un desarrollo **ya presente o continuado en la conversación receptora**; la 03 sirve para un **traspaso nuevo** entre conversaciones que todavía no han establecido continuidad. No hay que pedir al usuario rehacer el traspaso cuando la sucesión ya está comprobada.

**Seguridad:** si la conversación receptora está reservada a pruebas, no se hacen cambios. Si no se puede verificar que la conversación pertenece a la línea elegida, únicamente se audita sin escribir. No se usa la coincidencia de títulos como prueba de identidad ni se confunde disponer de un nombre con leer el historial.

**Variables:** `{{NOMBRE_CHAT}}`, `{{MODO}}`, `{{PROCEDENCIA}}`, `{{ENLACE_CHAT}}`.

```text
REANUDAR DESARROLLO VISURA — CONTINUIDAD VERIFICADA.

CHAT O LÍNEA DE DESARROLLO QUE QUIERO REANUDAR: {{NOMBRE_CHAT}}
SITUACIÓN DE ESTA CONVERSACIÓN: {{MODO}}
CHAT DE PROCEDENCIA (SI LO HUBO): {{PROCEDENCIA}}
ENLACE DE REFERENCIA (SI LO HAY): {{ENLACE_CHAT}}

MISIÓN
Continúa el desarrollo indicado desde su último avance REALMENTE verificado, sin rehacer tareas ni detenerte por una discrepancia nominal de conversaciones. Esta orden sirve tanto en el chat original como en un CHAT CONTINUADOR YA INICIADO que haya recuperado y trabajado sobre esa misma línea. Identifica el desarrollo por su historial y evidencia técnica, NO solo por el título de la conversación.

REGLA CRÍTICA SOBRE «CHAT NUEVO» Y CHATS CONTINUADORES
- Si esta conversación figura como «CHAT NUEVO» o tiene un nombre distinto, NO te detengas automáticamente ni respondas «pega el prompt en el chat original». Comprueba primero si aquí YA SE HABÍA RECUPERADO Y CONTINUADO el desarrollo elegido desde Work u otra conversación: historial realmente accesible, documentos de traspaso, ramas, commits, PR, archivos y pruebas vinculadas.
- Un chat legítimo sucesor puede tener nombre diferente al de origen. Si la continuidad está verificada, acepta este chat como responsable actual, informa de ello brevemente y CONTINÚA con la siguiente tarea segura, sin exigir volver al chat agotado ni utilizar de nuevo la orden 03.
- El nombre, un enlace o una afirmación previa por sí solos NO demuestran acceso al historial ni autorización para modificar un repositorio. Si hay conflicto o falta evidencia para vincular este chat con el desarrollo elegido, limita las acciones a auditoría de solo lectura e informa de la discrepancia concreta; usa la orden 03 solo para establecer un traspaso REALMENTE nuevo o no verificado.

COMPROBACIONES OBLIGATORIAS ANTES DE CAMBIOS
1. Verifica qué conversación y antecedentes puedes consultar de verdad. Para una línea procedente de otro chat, comprueba su procedencia indicada y la continuidad previamente asentada; no inventes lecturas de chats inaccesibles.
2. Examina repositorios pertinentes, ramas activas, commits, PR abiertos/cerrados, archivos y documentación de continuidad con especial atención a los hitos MÁS RECIENTES. No asumas que main o docs/CONTINUIDAD.md antiguos reflejan el último estado.
3. Distingue lo desarrollado, lo probado, lo pendiente, lo aprobado visualmente y lo integrado. Identifica la última tarea realmente comprobada y la siguiente tarea independiente y segura. Comprueba solapamientos con otros chats antes de escribir.

EJECUCIÓN Y PARADA
- Si este chat está expresamente reservado a PRUEBAS, no modifiques GitHub, aplicaciones ni bases de datos, aunque haya continuidad: solo audita o simula.
- Si es un chat de DESARROLLO con continuidad verificada, continúa autónomamente la siguiente tarea autorizada y segura. Tras cada hito, verifica, guarda en la rama correcta y documenta los resultados; no repitas tareas finalizadas ni sobreescribas cambios ajenos.
- No fusiones, publiques, despliegues ni borres datos sin autorización expresa. No te detengas por obstáculos subsanables; busca alternativas reales compatibles con las herramientas disponibles. Detente únicamente ante bloqueo auténtico, conflicto no resoluble sin riesgo, recurso imprescindible ausente o autorización que aún falte.
- No prometas trabajo fuera de esta sesión, no inventes accesos, fechas, porcentajes ni pruebas.

SALIDA
Di en pocas líneas si esta conversación es el chat original, un continuador verificado o un destino aún no acreditado; cita rama/commit/PR que sustenten la decisión y reanuda la tarea sin una respuesta puramente administrativa. Si no puedes verificar el vínculo, explica exactamente qué evidencia falta y cuál sería el paso seguro siguiente.
```

## 2. PREPARAR TRASPASO WORK
**Cuándo:** Work está cerca de su límite o quieres protegerte antes de perder acceso.

```text
PREPARAR TRASPASO WORK. Antes de cualquier aviso de fin de créditos, verifica y guarda los avances reales; actualiza docs/CONTINUIDAD.md, CONTINUIDAD_WORK_A_CHAT_NORMAL.md y PROMPT_CONTINUAR_SIN_WORK.md donde corresponda. Incluye repositorios, ramas, commits, PR, imágenes aprobadas, decisiones, pruebas, bloqueos y la primera tarea pendiente. Comprueba que los documentos sean accesibles y entrega aquí el prompt completo, autocontenido y copiable para continuar desde un chat normal. Si no puedes guardar en GitHub, entrega la recuperación en esta conversación y declara qué no quedó persistido. Solo emite «DESARROLLO FIN DE CRÉDITOS WORK» si realmente no puedes continuar y después de entregar la recuperación disponible.
```

## 3. TRASPASAR WORK AGOTADO A CHAT DE CONTINUACIÓN (V3)

**Auditoría de duplicidad:** se ha comprobado que la función pedida ya estaba cubierta parcialmente por la orden 03 «RECUPERAR VISURA EN NUEVO CHAT», y que la 01 reactiva **en el mismo chat**, la 02 prepara el traspaso **antes** de agotar Work y la 08 informa del estado **sin desarrollar**. **No se crea una orden 09**: se amplía la 03 existente.

**Uso:** selecciona el **chat Work que se detuvo** como origen. Después indica el chat que continuará, sea uno existente o uno nuevo con **nombre propio obligatorio**. Un enlace al origen o al destino es opcional. Puedes anotar la tarea prioritaria (por ejemplo, «agente virtual») sin confundirla con el nombre de chat. Copia la orden y pégala en el chat de destino.

**Limitación:** el desplegable es una lista manual de chats conocidos y la web no puede consultar la lista completa de conversaciones, crear o renombrar chats directamente, pegar la orden o certificar acceso al historial del chat elegido. Para un chat nuevo, el usuario debe crear la conversación y darle el nombre solicitado; para uno existente, un enlace directo opcional permite abrirlo.

**Garantías:** no se presume acceso al chat Work agotado; se reconstruye desde evidencia verificable. No se reinicia, no se duplican tareas, se detectan solapamientos, se continúa con la primera tarea segura si la conversación es de desarrollo y se bloquean cambios si el chat de destino está reservado a pruebas. La orden no autoriza fusionar ni publicar.

**Campos:** `{{ORIGEN}}`, `{{ENLACE_ORIGEN}}`, `{{TIPO_DESTINO}}`, `{{DESTINO}}`, `{{ENLACE_DESTINO}}`, `{{FOCO}}`.

```text
TRASPASAR Y CONTINUAR DESARROLLO VISURA / EXCELL TRAS AGOTAR WORK.

CHAT WORK DE ORIGEN: {{ORIGEN}}
ENLACE AL CHAT DE ORIGEN: {{ENLACE_ORIGEN}}
TIPO DE DESTINO: {{TIPO_DESTINO}}
CHAT RESPONSABLE DE LA CONTINUACIÓN: {{DESTINO}}
ENLACE DEL CHAT DE DESTINO: {{ENLACE_DESTINO}}
FOCO O TAREA PRIORITARIA (OPCIONAL): {{FOCO}}

MISIÓN
Retoma EXCLUSIVAMENTE el desarrollo que estaba ejecutándose en el chat Work de origen y continúa desde el punto realmente alcanzado, sin empezar de cero, repetir tareas ni trasladar por error trabajo de otros chats. Work agotó su tiempo o créditos; este nuevo chat debe hacerse cargo de la continuación con sus herramientas actuales. El origen es la conversación que se desea recuperar; el destino es la conversación en la que SE PEGA ESTA ORDEN. No confundas ambos nombres.

0. IDENTIDAD Y PROTECCIÓN CONTRA SOLAPAMIENTOS
- Comprueba qué historial del chat de origen puedes consultar de verdad; el nombre o URL por sí solos NO demuestran acceso. Si no es accesible, decláralo y apóyate en evidencias de GitHub, documentos, archivos y pruebas que sí puedas leer. No atribuyas a un chat concreto avances no verificables.
- Comprueba que este chat es el destino indicado. Si es una conversación reservada a pruebas, NO realices cambios reales. Para chat nuevo, el nombre indicado es el TÍTULO DESEADO; solicita o explica el cambio manual si no puedes renombrarlo automáticamente. No afirmes haberlo renombrado sin comprobarlo.
- Antes de crear cualquier prompt, orden o flujo nuevo, consulta el catálogo docs/VISURA_CENTRO_DE_MANDO.md y compara propósito, entradas, resultados y riesgos con las órdenes existentes. Si ya hay una equivalente, REUTILÍZALA O AMPLÍALA; no dupliques botones ni instrucciones. Solo crea otra cuando una necesidad realmente distinta lo justifique, y documenta por qué.

1. RECONSTRUIR EL ESTADO MÁS AVANZADO
- Identifica el repositorio y subproyecto realmente vinculados al chat Work elegido; revisa todas las ramas relevantes, commits, PR abiertos/cerrados, archivos actuales y documentación de continuidad. Cuando existan, revisa docs/CONTINUIDAD.md, CONTINUIDAD_WORK_A_CHAT_NORMAL.md, PROMPT_CONTINUAR_SIN_WORK.md y documentos específicos, pero comprueba que estén actualizados.
- NO presupongas que main ni un documento antiguo representan el estado más avanzado. Contrasta fechas y pruebas y explica los conflictos. Identifica qué quedó implementado, qué se verificó, qué está a medias, qué imágenes fueron aprobadas o integradas, los bloqueos y la siguiente tarea de desarrollo pendiente.
- Comprueba colisiones con VISURA WORK, VISURA 0.1, VISURA 0.2, PROMPT E IMÁGENES y otras líneas implicadas. No sobrescribas commits o cambios ajenos ni ocupes archivos bajo responsabilidad de otro chat sin comprobarlo.

2. CONTINUAR, NO RECONSTRUIR
- Presenta brevemente el último hito REALMENTE verificado, la rama/commit y la tarea exacta que vas a reanudar. Respeta el foco prioritario indicado arriba si es compatible con la evidencia; si no se ha definido, sigue la prioridad verificada en la continuidad.
- Ejecuta de forma autónoma la PRIMERA tarea segura y autorizada con las herramientas de ESTE chat, usando la rama de desarrollo adecuada. Si faltan herramientas exclusivas de Work, busca alternativas legítimas y compatibles; no prometas ejecución en segundo plano ni digas que una herramienta está disponible sin comprobarlo.
- Después de cada avance, verifica los cambios y pruebas disponibles, guarda commits en la rama adecuada y actualiza la documentación de continuidad para un próximo traspaso. Continúa con el siguiente paso seguro mientras no exista un bloqueo real.

3. AUTORIZACIONES Y CONDICIONES DE PARADA
- No fusiones, publiques/despliegues a producción, borres datos, sustituyas recursos aprobados ni modifiques ramas ajenas sin autorización explícita. Si el destino es un chat de PRUEBAS, toda la ejecución es solo lectura.
- No hagas cambios destructivos por el mero hecho de que el origen use datos de prueba. No repitas intentos idénticos ante un error y no des por terminada una integración solo porque creaste un ZIP o documentos.
- Solicita intervención únicamente cuando falte el recurso imprescindible, haya un conflicto imposible de resolver de forma segura, se requieran permisos o exista una decisión de negocio indispensable. Explica el bloqueo concreto y deja lista la siguiente acción.

4. SALIDA DE CONTROL
Al iniciar: informa en pocas líneas del ORIGEN, DESTINO, repositorio, rama/commit verificados, última tarea terminada, siguiente tarea y riesgo de solapamiento.
Tras cada hito: indica prueba realizada, commit/documentación guardados y primera tarea todavía pendiente. Distingue lo comprobado, lo inferido y lo que no has podido verificar.
No inventes porcentajes, plazos, actividades, enlaces ni acceso al chat Work original.

OBJETIVO FINAL: continuidad real del desarrollo del origen en el destino indicado, con avances comprobables y sin reinicios, duplicaciones ni operaciones no autorizadas.
```

## 4. CONTINUAR IMÁGENES VISURA
**Cuándo:** reactivar el trabajo del chat «PROMPT E IMÁGENES».

```text
CONTINUAR IMÁGENES VISURA. Recupera la evolución de «PROMPT E IMÁGENES» mediante el contexto accesible, los archivos gráficos y los registros verificables de GitHub. Identifica qué imágenes están solo diseñadas, cuáles aprobadas, cuáles integradas y cuáles verificadas. Conserva el estilo tridimensional acordado y adapta cada imagen al módulo, pantalla o función correspondiente dentro de VISURA. No reutilices imágenes indiscriminadamente ni sustituyas recursos aprobados. Detecta la última tarea visual pendiente, evita modificaciones concurrentes y continúa su implementación sin alterar funciones existentes. Documenta asignaciones, rutas, pruebas y recursos finales. Mantén preparado el traspaso de Work a chat normal antes de cualquier límite.
```

## 5. AUDITAR SOLAPAMIENTOS
**Cuándo:** sospechas que varios chats trabajan sobre la misma parte del proyecto.

```text
AUDITAR SOLAPAMIENTOS VISURA. Compara las tareas de VISURA WORK, PROMPT E IMÁGENES y los demás chats relacionados mediante ramas, commits, PR, documentos de continuidad y estados accesibles. Identifica coincidencias de archivos o funciones, separa los responsables y propone la siguiente tarea independiente para cada línea. No modifiques ni fusiones nada durante esta auditoría. Si algún chat no es accesible, indica la incertidumbre en vez de asumir su estado.
```

## 6. GENERAR IMAGEN O ICONO VISURA

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

## 7. INTEGRAR IMAGEN APROBADA EN VISURA — V2

**Cuándo:** una vez aprobada una imagen concreta, para integrarla en el destino correcto; se mantiene separada de la orden 06 que genera tres propuestas.

**Modo de ejecución obligatorio:** «PRUEBA / SIMULACIÓN» (valor por defecto, sin escrituras) o «INTEGRACIÓN EN RAMA» (solo en un chat de desarrollo autorizado, sin publicar, desplegar ni fusionar). El panel solo prepara y copia una orden; no ejecuta por sí mismo sus instrucciones.

**Cómo usar:** identifica aplicación/panel, ubicación exacta, imagen aprobada y su archivo original o enlace directo verificable. Si procede, adjunta el archivo en el chat de implementación. Pulsa «Copiar orden V2». El prompt exige comprobar recursos ya accesibles y agotar alternativas técnicas, incluida GitHub Git Data API con blobs Base64, antes de declarar un bloqueo.

**Continuidad del caso Centro de mando:** repositorio `josegude-ux/KONTROLA`, rama de panel `visura-panel`; existe la rama de trabajo `feat/visura-centro-mando-icono-b-20261026` con referencias y documentación preparadas, pero los binarios aún requieren verificación. No crear otra rama por defecto ni dar por terminada la instalación por crear un ZIP.

**Variables generadas por el panel:** `{{MODO}}`, `{{DESTINO}}`, `{{UBICACION}}`, `{{SELECCION}}`, `{{RECURSO}}`, `{{OBSERVACIONES}}`.

```text
VISURA — ORDEN 07 V2: INTEGRAR IMAGEN APROBADA SIN INTERRUPCIONES EVITABLES

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

## Menú actual — Accesos directos V4.3 (2026-10-26)

El diseño anterior de desplegable único con flechas fue descartado. **La interfaz actual V4.3** utiliza una portada con **ocho accesos directos en una cuadrícula de dos columnas** y abre solo el formulario seleccionado.

- Cada vista ofrece **«Volver al menú»**. Los enlaces `#orden-1` a `#orden-8` abren la tarea correspondiente y `#inicio` vuelve a la portada.
- El botón **«↻ Actualizar»** continúa en la cabecera. La marca **V4.3** distingue la versión nueva de las copias antiguas que puede servir el alojamiento externo.
- La información complementaria de GitHub sigue plegada y cerrada al cargar la página.
- Las siete órdenes anteriores, sus campos y protecciones se conservan. Se incorpora únicamente la **orden 08 — Estado de desarrollo de un chat del proyecto EXCELL**, siempre de solo lectura.
- Los archivos del panel son `docs/index.html` y `docs/VISURA_ORDENES.html`, junto con este documento maestro en la rama `visura-panel`. No se autoriza modificar `main`, aplicaciones ni datos.
- El apartado de menú compacto V3 de más abajo es un antecedente histórico superado, no la interfaz actual.

## Evolución de navegación móvil — Panel compacto (2026-10-26)

**Objetivo:** evitar el desplazamiento vertical por siete órdenes completas en iPhone. El panel web conserva las siete órdenes sin variar sus prompts y muestra solo una a la vez.

- Cabecera breve y **selector de orden** con las siete opciones; controles Anterior y Siguiente y contador visible. Se puede entrar directamente con un enlace `#orden-1` a `#orden-7`; la selección no modifica el contenido ni la copia de los prompts.
- Accesos y documentación secundaria plegados, no ocupan la pantalla inicial. El menú debe mantener contraste, tamaño táctil cómodo y funcionar en móvil sin dependencias externas.
- Orden 07: añade **«Elegir imagen en el dispositivo»** mediante un `<input type="file">` que abre el selector nativo de iOS (Archivos/Fotos, según dispositivo) y muestra nombre y vista previa local cuando sea posible. Mantiene la opción alternativa de URL pública.
- **Limitación explícita:** por seguridad del navegador, seleccionar un archivo en una web independiente NO lo adjunta automáticamente a ChatGPT ni concede al asistente acceso a su ruta local. El prompt copiado incluye el nombre del archivo seleccionado e indica que el usuario debe adjuntarlo al chat receptor. Nunca inventar una URL local accesible al agente.
- La herramienta de elección es totalmente local: no transmite bytes a servidores ni a GitHub desde el panel. La orden 07 V2 sigue respetando PRUEBA / SIMULACIÓN predeterminado y los permisos de integración en rama.

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

## 8. ESTADO DE DESARROLLO DE UN CHAT — Proyecto EXCELL

**Cuándo:** cuando quieras seleccionar un chat concreto del proyecto Excel/EXCELL y obtener una evaluación de qué construye, último hito confirmado, cuánto queda para terminar y siguientes pasos, sin reactivar el desarrollo.

**Selector:** «Chat del proyecto que quiero analizar», con nombres conocidos de chats del ecosistema VISURA y opción «Otro chat» para cualquier conversación del proyecto Excel/EXCELL. No se pretende enumerar automáticamente todas las conversaciones: la lista del panel es manual y puede ampliarse. Se permiten un enlace de referencia y una aclaración opcionales.

**Funcionamiento:** el botón 08 prepara y copia un prompt específico al chat seleccionado, que debe pegarse en una conversación donde el historial o las fuentes verificables sean accesibles. **El panel no tiene permisos para consultar todos los chats, ni un nombre o enlace por sí solo aporta acceso**. La orden exige no inventar avances ni porcentajes. En especial, las estimaciones de tiempo o % solo se entregan si el alcance y las evidencias lo justifican; en otro caso señala «no estimable».

**Prohibición:** evaluación en **solo lectura**; no cambiar GitHub, PR, códigos, imágenes, bases de datos ni la aplicación. La orden 08 no reactiva trabajo y no sustituye las órdenes 01 y 03.

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

## Regla permanente 0 — Comprobar duplicados ANTES de crear un prompt

Antes de redactar, guardar, proponer o añadir un prompt/botón al Centro de mando:
1. Consultar este catálogo maestro en GitHub (rama vigente `visura-panel`) y los prompts/funciones existentes; identificar su finalidad real, datos de entrada, destino, acciones y efectos.
2. Comparar si el requerimiento nuevo es **idéntico, similar, complementario o diferente**. Si ya existe una orden que cumple lo solicitado, usarla; si le faltan parámetros o reglas, **modificar y evolucionar esa orden** sin abrir otra numeración.
3. Crear botón nuevo solo cuando su propósito y resultados sean materialmente distintos, y documentar en el registro por qué no se reutilizó otro. Revisar que no haya contradicciones y no replicar el mismo prompt bajo varios nombres.
4. Probar el generador con al menos dos opciones diferentes y con opciones vacías; verificar que cambia correctamente origen/destino y que no mezcla chats ni ejecuta acciones desde el panel.
5. Mantener las dos copias HTML, el documento maestro y la numeración sincronizados. No tocar `main`, no fusionar ni desplegar aplicaciones sin autorización.

**Separación de funciones actual:** 01 Reactivar mismo chat; 02 Preparar Work antes del límite; 03 Trasladar el desarrollo de un chat Work agotado a otro; 08 Consultar el estado de un chat sin modificarlo. Son funciones relacionadas pero no duplicadas.

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
