# VISURA Centro de Mando — Catálogo de chats reales SIN tecleo
**Fecha:** 2026-10-27  
**Responsable:** 03.1 - VISURA - Desarrollo Centro de Mando  
**Orden recibida de:** 01 - Laboratorio de desarrollos  
**Estado:** DIAGNÓSTICO Y DISEÑO; no implementado, no fusionado y no publicado.  
**Base examinada:** `visura-panel` @ `e8b4b177ee172b50ba0a96ee8f1d8819ce53344e`.

## 1. Conclusión sobre acceso oficial

A la fecha de la investigación **NO se encontró ninguna API pública oficial ni permiso OAuth de ChatGPT personal que permita a una web externa enumerar periódicamente todas las conversaciones y leer sus títulos e identificadores actuales, incluidas altas y renombrados**.

- La API de OpenAI para desarrolladores («Conversations API» / Responses API) gestiona **conversaciones creadas por aplicaciones mediante la API**, no equivale al historial personal de la interfaz ChatGPT.
- La **exportación de datos de ChatGPT**, disponible a través de ajustes o Privacy Portal para cuentas elegibles, es la fuente oficial más viable para obtener una **instantánea** de conversaciones; la exportación puede tardar hasta siete días. No es una suscripción a cambios en tiempo real.
- El paquete puede incluir `conversations.json` y fragmentos numerados; los enlaces compartidos tienen su propio fichero de metadatos y una URL `/share/` **no es un enlace privado equivalente a** `/c/`.
- Fuentes oficiales: https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data ; https://help.openai.com/es-es/articles/9106926-transfer-exported-conversations-between-chatgpt-accounts ; https://help.openai.com/es-es/articles/7925741-sharing-conversations-and-scheduled-tasks-in-chatgpt ; https://developers.openai.com/api/docs/guides/conversation-state .
- Se deberá revisar este diagnóstico si OpenAI publica en el futuro un conector/API oficialmente autorizado para gestionar el historial personal. Nunca usar endpoints internos, sesiones extraídas, contraseñas, scraping autenticado ni cookies.

**REGLA INNEGOCIABLE:** «sincronizar el catálogo privado VISURA entre dispositivos» NO es «leer el historial de ChatGPT de forma automática».

## 2. Auditoría de lo existente y no duplicación

El panel ya tiene **«⚙ Mis chats VISURA»** con editor manual, enlaces privados opcionales, selectores para órdenes 01/07/08 y otros, almacenamiento `localStorage`, exportación/importación de un formato propio `visura-chat-registry-v1` (máximo 1 MB, hasta 300 entradas), y copia manual desde Archivos/OneDrive.

Actualmente el registro es `{name,state,link}`, el almacenamiento es `visura-centro-chats-v1`, y la coincidencia para editar/importar se hace por `name` normalizado. Por eso un **renombrado** no queda identificado como el mismo chat y los favoritos iniciales pueden quedar obsoletos. El importador existente acepta solo JSON VISURA, no la exportación ChatGPT. No se debe reemplazar ni romper su contrato sin migración.

La sincronización OneDrive existente **es una copia manual del catálogo**; no concede acceso a los datos de ChatGPT ni detecta nuevos títulos.

Se conservarán panel, funciones **01 a 10**, órdenes completas, botones de copia, gestor, import/export de OneDrive, icono B, manifest y enlaces ya guardados.

## 3. Solución priorizada sin teclear nombres

### A — Importación masiva LOCAL desde exportación autorizada (principal)

1. El usuario obtiene la exportación oficial de ChatGPT (Ajustes > Controles de datos > Exportar, cuando esté disponible).
2. En «Mis chats VISURA», el usuario pulsa **«Importar chats de ChatGPT»** y elige `conversations.json` o varios archivos numerados. Segunda etapa: permitir ZIP local con descompresión segura incluida en el paquete, sin servicios externos. Nunca enviar el ZIP a un servidor, GitHub ni una conversación de ChatGPT.
3. Todo ocurre localmente en navegador/dispositivo. Extraer **exclusivamente** `id/conversation_id`, `title` y, si viene, marcas temporales. No guardar `mapping`, `messages`, adjuntos ni texto conversacional. Aclarar al usuario que abrir un archivo que contiene mensajes requiere leerlo temporalmente en memoria; no se conservarán, transmitirán ni sincronizarán esos mensajes.
4. Presentar lista con búsqueda y selección múltiple: **todos / relacionados con VISURA / elegidos**; nombres obtenidos automáticamente del archivo, sin escritura.
5. Previsualizar número de altas, renombrados, coincidencias, entradas descartadas y conflictos ANTES de guardar. Confirmación explícita. No borrar automáticamente ningún chat ausente de un fichero, porque la exportación puede ser parcial o anterior.
6. Refrescar los selectores existentes usando el registro actualizado. Etiquetar el origen y la fecha: «Exportación ChatGPT del DD/MM/AAAA» y «última comprobación real: desconocida». **No presentar los títulos importados como actuales en tiempo real**.

**Límites:** actualización solo al importar otra exportación. Tiempo hasta recibirla variable. Su estructura puede cambiar; usar esquema tolerante y validación con una exportación real autorizada antes de implementar.

### B — Registro de enlace copiado (sin teclear)

Un botón «Pegar enlace del chat» lee el portapapeles únicamente por gesto del usuario y tras permiso de Safari o permite pegar de manera estándar. Validar URL `https://chatgpt.com/c/{id}` o `https://chat.openai.com/c/{id}`; extraer ID y deduplicar. No solicitar enlace público `/share/` como sustituto del enlace privado. Si el ID ya apareció en una exportación, completar título automáticamente; **si no**, mostrar «Título pendiente de verificar» y opción de asociarlo por selección a un registro existente, sin inventar títulos. Registrar link por sí solo no detecta renombrados ni altas ajenas.

### C — Selección entre chats existentes

Tras importar: buscar por nombre real del último archivo importado, ordenar por actividad o favoritos del catálogo, seleccionar uno o varios sin tecleo, reutilizar su ID estable y enlace privado verificado para las órdenes 01/07/08. Sin importación, este selector no añade conocimiento nuevo: es solo el catálogo local.

### D — Sincronización privada entre dispositivos

Conservar primero **exportar/importar copia JSON de VISURA** y OneDrive manual. Etapa posterior, **solo con autorización**, evaluar una solución privada autenticada con cifrado adecuado, control de acceso, sincronización incremental y resolución de conflictos por `id` estable. Nunca alojar IDs/nombres de chats en el repositorio público ni en una URL pública. La sincronización de esta base entre dispositivos **no consulta ChatGPT**.

## 4. Modelo propuesto y migración segura

```json
{
  "format": "visura-chat-catalog-v2",
  "version": 2,
  "source": { "kind": "chatgpt-export", "importedAt": "2026-10-27T00:00:00Z", "isLive": false },
  "chats": [
    {
      "id": "ID_ESTABLE_DEL_CHAT_SI_ESTA_VERIFICADO",
      "title": "03.1 - VISURA - Desarrollo Centro de Mando",
      "privateUrl": "",
      "state": "activo",
      "titleSource": "chatgpt-export",
      "userNotes": "",
      "verifiedAt": null
    }
  ]
}
```

- El **ID** es la clave primaria para importaciones verificadas; un cambio de título **actualiza la misma ficha**, no crea un duplicado.
- Mantener estados y enlaces introducidos por el usuario; no sustituirlos automáticamente por datos incompletos del archivo.
- De `visura-chat-registry-v1` migrar con respaldo previo; registros sin ID quedan `legacy-unverified`, **no vinculados automáticamente por coincidencia de nombre** salvo revisión expresa. Tras el enlace inicial, el ID será la clave estable.
- IDs duplicados y títulos incompatibles: detección, vista de diferencias y resolución; orden temporal solo cuando sus campos sean confiables.
- `privateUrl` únicamente validado y explícito; no dar por sentado que un ID exportado produce una URL navegable para cualquier chat/espacio de trabajo.
- Validar límites de memoria en Safari e importaciones fragmentadas; no forzar `JSON.parse` de un archivo enorme en el hilo principal. Establecer límites y un tratamiento de errores antes de activar la funcionalidad.
- Los JSON exportados de VISURA nunca deben contener mensajes, adjuntos, tokens ni cookies.

## 5. Garantías de seguridad y privacidad

- Elegir archivos mediante selector local; nunca pedir contraseña, token, cookies ni credenciales de ChatGPT.
- Sin envío de `conversations.json` original a servidores o servicios de analítica; operar sin red sobre su contenido.
- Mostrar una advertencia clara: exportación de ChatGPT contiene mensajes privados, aunque VISURA solo conserve metadatos.
- No mostrar títulos privados en logs, URL de analítica ni GitHub. Tests exclusivamente con datos sintéticos.
- Cambios sobre `localStorage` solamente mediante transacción con copia de seguridad y confirmación; recuperación ante fallo y límite de cuota.
- Enlaces `/share/` pueden mostrar contenido a terceros: no generarlos ni requerirlos para registrar chats.

## 6. Matriz real de automatización

| Alternativa | Cero escritura de nombres | Detecta renombrados | Actualización automática respecto a ChatGPT |
|---|---|---|---|
| Exportación + importación local | Sí, tras elegir archivo | Sí, si conserva ID y el export es posterior al renombrado | **No**. Nueva exportación/importación manual |
| Copiar enlace `/c/` + botón Pegar | Sí para el ID; título solo si se conoce por exportación | No por sí solo | **No** |
| Selección de catálogo importado | Sí | Solo los incluidos en última importación | **No** |
| Copia privada entre dispositivos | Sí después de importar | Replica cambios ya registrados | **No** |
| Hipotética API oficial futura | Potencialmente | Potencialmente | **Solo si existe y se autoriza; no disponible/documentada hoy** |

## 7. Casos de prueba y criterios de aceptación (pendientes de implementación)

1. **Alta:** un archivo con tres entradas nuevas añade exactamente tres registros tras confirmación, sin tecleo.
2. **Renombrado:** mismo ID, nuevo título → una sola ficha, conserva estado y enlace verificado.
3. **Colisión de título:** dos IDs distintos con título igual → dos fichas diferenciadas, nunca se fusionan por nombre.
4. **Fichero anterior:** ausencia de chat no lo elimina; aviso de instantánea no actual.
5. **Incompleto/JSON inválido:** abortar sin alterar almacenamiento.
6. **Sin mensajes:** exportación de VISURA resultante no incluye texto de conversaciones, mapping ni adjuntos.
7. **Migración:** copia v1 se conserva; datos manuales no se pierden; solo se asocian IDs con validación.
8. **Enlace privado correcto:** rechazar dominio ajeno, HTTP y `/share/` como si fuese URL privada.
9. **iPhone:** importar y seleccionar en Safari real; respetar permisos de portapapeles y diferencias entre navegador y acceso a pantalla de inicio.
10. **Regresión:** funciones 01–10, prompts, botón copiar todo, icono B y copia OneDrive siguen funcionando.
11. **Privacidad:** ausencia de peticiones de red con contenidos o metadatos privados.
12. **Sincronización:** una importación/copia en dispositivo B no se etiqueta jamás como actualización automática de ChatGPT.

## 8. Orden de desarrollo posterior

1. Validar con exportación real de un usuario que autorice su uso, preferentemente proporcionando **solo una muestra sintética o anonimizada de estructura**; no solicitar subir historiales completos al chat.
2. Diseñar convertidor de `conversations.json` a catálogo mínimo, ejecutado localmente, con pruebas sintéticas.
3. Migración no destructiva del gestor v1 a IDs estables, con previsualización y selección múltiple.
4. Registro por portapapeles con validación y vinculación a ID existente.
5. Reforzar sincronización privada opcional entre dispositivos, sin atribuirle acceso a ChatGPT.
6. Mantener todo en rama/PR aislados y probar en iPhone y escritorio. Integrar/publicar solo después de aprobación específica.

**ESTADO FINAL DE ESTA ENTREGA: solo diagnóstico y diseño. No se implementó interfaz/importador ni se modificó `visura-panel` o `main`.**
