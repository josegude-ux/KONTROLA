# VISURA — CENTRO DE MANDO
**Versión:** 2026-10-26  
**Objetivo:** conservar órdenes copiables de desarrollo y recuperación de contexto para VISURA.

> Este archivo es una **copia maestra de instrucciones**, no un informe del estado actual del software. Antes de cualquier cambio hay que contrastar ramas, commits, PR y documentación con GitHub. No fusionar, desplegar ni borrar datos sin autorización. No se puede garantizar un proceso en segundo plano ni superar límites de Work.

## 1. REACTIVAR VISURA
**Cuándo:** se para el desarrollo pero sigues en el mismo chat.

```text
REACTIVAR VISURA. Retoma el desarrollo desde la última tarea realmente comprobada, respetando las decisiones y el prompt maestro de este chat. Antes de modificar código, verifica la rama, los commits, los PR y docs/CONTINUIDAD.md de los repositorios implicados. No repitas tareas finalizadas, no sobrescribas cambios ajenos y evita solapamientos entre chats. Continúa con la siguiente tarea autorizada y segura. Después de cada hito, comprueba, guarda y documenta los cambios. No te detengas salvo bloqueo real o necesidad de autorización.
```

## 2. PREPARAR TRASPASO WORK
**Cuándo:** Work está cerca de su límite o quieres protegerte antes de perder acceso.

```text
PREPARAR TRASPASO WORK. Antes de cualquier aviso de fin de créditos, verifica y guarda los avances reales; actualiza docs/CONTINUIDAD.md, CONTINUIDAD_WORK_A_CHAT_NORMAL.md y PROMPT_CONTINUAR_SIN_WORK.md donde corresponda. Incluye repositorios, ramas, commits, PR, imágenes aprobadas, decisiones, pruebas, bloqueos y la primera tarea pendiente. Comprueba que los documentos sean accesibles y entrega aquí el prompt completo, autocontenido y copiable para continuar desde un chat normal. Si no puedes guardar en GitHub, entrega la recuperación en esta conversación y declara qué no quedó persistido. Solo emite «DESARROLLO FIN DE CRÉDITOS WORK» si realmente no puedes continuar y después de entregar la recuperación disponible.
```

## 3. RECUPERAR VISURA EN NUEVO CHAT
**Cuándo:** continuar desde otra conversación, especialmente al agotar Work.

```text
RECUPERAR VISURA. Debes continuar el desarrollo previo, no reiniciarlo. Localiza y lee en GitHub los documentos actualizados docs/CONTINUIDAD.md, CONTINUIDAD_WORK_A_CHAT_NORMAL.md y PROMPT_CONTINUAR_SIN_WORK.md disponibles, además de ramas, commits, PR y archivos relacionados. Contrasta su contenido con el estado real y prioriza la versión verificada más avanzada, aunque no esté en main. Recupera decisiones, imágenes y tareas pendientes. No inventes información inaccesible. No repitas ni sobrescribas avances. Evita solapamientos con los demás chats. Ejecuta la primera tarea segura y autorizada con las herramientas disponibles en este chat; informa de cualquier herramienta exclusiva de Work que falte. Mantén actualizados los registros de continuidad. No fusiones, publiques ni borres información sin la autorización que corresponda.
```

**Nota:** si Work generó un prompt más reciente y específico, usa ese prompt con preferencia a este comando genérico.

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
