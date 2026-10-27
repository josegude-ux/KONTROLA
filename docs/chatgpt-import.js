/* VISURA Centro de Mando — Importación local de exportaciones ChatGPT, MVP sin red.
 * No sube datos. Conserva únicamente ID/título en el registro existente.
 */
(function () {
  "use strict";
  const MAX_BYTES = 35 * 1024 * 1024;
  const MAX_CHATS = 10000;
  const MAX_REGISTRY = 300;
  const ID_RX = /^[A-Za-z0-9_-]{16,128}$/;
  const FOCUS_RX = /visura|excell|moventa|kontrola|inventa/i;
  const safeText = value => typeof value === "string" ? value.trim().normalize("NFC") : "";
  const nameKey = value => safeText(value).toLocaleLowerCase("es");
  function extractChatList(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && Array.isArray(value.conversations)) return value.conversations;
    throw new Error("Formato no reconocido: elige conversations.json de tu exportación oficial de ChatGPT.");
  }
  function extractMetadata(value) {
    const items = extractChatList(value);
    if (items.length > MAX_CHATS) throw new Error("Esta exportación supera el límite de chats de la primera versión.");
    const byId = new Map();
    let invalid = 0;
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {invalid++;continue;}
      const id = safeText(item.id || item.conversation_id);
      const title = safeText(item.title);
      if (!ID_RX.test(id) || !title || /[\r\n<>]/.test(title)) {invalid++;continue;}
      const stamp = Number(item.update_time ?? item.create_time ?? 0);
      const update = Number.isFinite(stamp) ? stamp : 0;
      const old = byId.get(id);
      if (!old || update >= old.update) byId.set(id, { id, title: title.slice(0, 512), update });
    }
    return { chats: [...byId.values()].sort((a, b) => b.update - a.update || a.title.localeCompare(b.title, "es")), invalid };
  }
  function shortId(id) { return String(id).slice(0, 8); }
  function availableName(title, id, used) {
    let candidate = title.slice(0, 140);
    if (!used.has(nameKey(candidate))) return candidate;
    const suffix = " · [" + shortId(id) + "]";
    candidate = title.slice(0, 140 - suffix.length) + suffix;
    let n = 2;
    while (used.has(nameKey(candidate))) {
      const tagged = suffix.replace("]", "-" + n + "]");
      candidate = title.slice(0, 140 - tagged.length) + tagged;
      n++;
    }
    return candidate;
  }
  function planImport(existing, incoming) {
    // Un ID verificado identifica una conversación. Nunca asociar ID solo por título.
    const next = existing.map(c => ({...c}));
    const requested = new Map();
    for (const candidate of incoming) {
      if (candidate && ID_RX.test(candidate.id) && safeText(candidate.title)) requested.set(candidate.id, candidate);
    }
    const idIndex = new Map();
    next.forEach((item, i) => {if (ID_RX.test(item.conversationId || "")) idIndex.set(item.conversationId, i);});
    let added = 0, renamed = 0, same = 0, collisions = 0;
    for (const item of requested.values()) {
      let existingIndex = idIndex.get(item.id);
      if (existingIndex !== undefined) {
        const row = next[existingIndex];
        const oldTitle = safeText(row.sourceTitle || row.name);
        if (oldTitle !== item.title) {
          row.name = item.title.slice(0, 140);
          row.sourceTitle = item.title;
          renamed++;
        } else same++;
        row.conversationId = item.id;
      } else {
        next.push({name:item.title.slice(0,140),sourceTitle:item.title,conversationId:item.id,state:"sin_verificar",link:""});
        idIndex.set(item.id,next.length - 1);
        added++;
      }
    }
    if (next.length > MAX_REGISTRY) throw new Error("El gestor admite un máximo de 300 chats. Selecciona menos registros.");
    // Los nombres de menú se distinguen sin alterar el título real procedente del export.
    // Primero se preservan los nombres de entradas no importadas.
    const updatedIds = new Set(requested.keys());
    const used = new Set();
    for (const row of next) if (!updatedIds.has(row.conversationId)) used.add(nameKey(row.name));
    for (const row of next) {
      if (!updatedIds.has(row.conversationId)) continue;
      const chosen = availableName(row.sourceTitle || row.name, row.conversationId, used);
      if (chosen !== (row.sourceTitle || row.name)) collisions++;
      row.name = chosen;
      used.add(nameKey(chosen));
    }
    return {next,added,renamed,same,collisions,selected:requested.size};
  }
  // Testable helpers, exported in Node only; not registered on window.
  if (typeof module !== "undefined" && module.exports) module.exports = {extractMetadata,planImport,availableName};
  if (typeof document === "undefined") return;

  function setupUI() {
    const manager = document.getElementById("chat-manager");
    const backup = manager && manager.querySelector(".manager-backup");
    if (!manager || !backup || !document.getElementById("manager-list")) return;
    const section = document.createElement("section");
    section.className = "manager-backup";
    section.id = "chatgpt-import-section";
    // HTML estático de la interfaz propia, sin interpolar datos del archivo.
    section.innerHTML = `
      <h3>Importar chats reales de ChatGPT</h3>
      <p><strong>Sin teclear títulos.</strong> Importa una copia oficial de <code>conversations.json</code>. Solo se conservarán título e identificador; el contenido de los mensajes no se guarda ni se envía a nadie.</p>
      <p class="manager-small">No es sincronización en directo. Los chats nuevos o renombrados se detectan en una <strong>nueva exportación</strong>, no automáticamente. Primera versión: archivos JSON de hasta 35 MB; ZIP pendiente.</p>
      <div class="manager-actions"><label class="manager-import" for="chatgpt-import-files">Elegir conversations.json</label><input id="chatgpt-import-files" type="file" class="visually-hidden" accept=".json,application/json" multiple></div>
      <p id="chatgpt-import-status" class="manager-small" role="status" aria-live="polite">Ningún archivo leído. Los archivos se procesan localmente.</p>
      <div id="chatgpt-import-review" hidden>
        <div class="manager-actions">
          <button type="button" class="secondary" id="chatgpt-import-select-focus">Seleccionar VISURA y relacionados</button>
          <button type="button" class="secondary" id="chatgpt-import-select-all">Seleccionar todos</button>
          <button type="button" class="secondary" id="chatgpt-import-select-none">Deseleccionar</button>
        </div>
        <label class="field-label" for="chatgpt-import-search">Filtrar lista (opcional)</label>
        <input id="chatgpt-import-search" type="search" placeholder="Buscar entre los títulos importados" autocomplete="off">
        <p id="chatgpt-import-count" class="manager-small"></p>
        <div id="chatgpt-import-list" class="manager-list" style="max-height:320px;overflow:auto"></div>
        <div class="manager-actions"><button id="chatgpt-import-apply" type="button" class="primary">Revisar y guardar seleccionados</button><button id="chatgpt-import-cancel" type="button" class="secondary">Descartar importación</button></div>
      </div>`;
    backup.parentNode.insertBefore(section, backup);
    const selectFile = section.querySelector("#chatgpt-import-files");
    const status = section.querySelector("#chatgpt-import-status");
    const review = section.querySelector("#chatgpt-import-review");
    const list = section.querySelector("#chatgpt-import-list");
    const search = section.querySelector("#chatgpt-import-search");
    const count = section.querySelector("#chatgpt-import-count");
    const apply = section.querySelector("#chatgpt-import-apply");
    let pending = [], chosen = new Set(), invalid = 0;
    function discard() {
      pending = []; chosen.clear(); invalid = 0; selectFile.value = ""; search.value = "";
      review.hidden = true; list.replaceChildren();
    }
    function render() {
      const needle = nameKey(search.value);
      const filtered = pending.filter(x => !needle || nameKey(x.title).includes(needle));
      count.textContent = "Seleccionados: " + chosen.size + " de " + pending.length + ". Coinciden con filtro: " + filtered.length + ". Mostrando hasta 80; seleccionar todos funciona aunque no se muestren todos.";
      apply.disabled = chosen.size === 0;
      list.replaceChildren();
      const frag = document.createDocumentFragment();
      for (const row of filtered.slice(0,80)) {
        const label = document.createElement("label");
        label.style.cssText = "display:flex;align-items:flex-start;gap:9px;padding:9px;border-bottom:1px solid var(--border)";
        const check = document.createElement("input"); check.type = "checkbox"; check.checked = chosen.has(row.id);
        check.addEventListener("change", () => {if(check.checked) chosen.add(row.id);else chosen.delete(row.id);render();});
        const span = document.createElement("span"); span.textContent = row.title;
        label.append(check,span); frag.appendChild(label);
      }
      list.appendChild(frag);
    }
    selectFile.addEventListener("change", async () => {
      const files = [...(selectFile.files || [])];
      discard();
      if (!files.length) return;
      try {
        status.textContent = "Leyendo archivos localmente; no cierres esta pantalla…";
        const combined = new Map();
        let bad = 0;
        for (const file of files) {
          if (!/\.json$/i.test(file.name) || file.size > MAX_BYTES || file.size === 0) throw new Error("Selecciona archivos .json válidos, de hasta 35 MB cada uno.");
          const text = await file.text();
          let input;
          try {input = JSON.parse(text);} catch (_) {throw new Error("El archivo no contiene JSON válido.");}
          const result = extractMetadata(input);
          bad += result.invalid;
          for (const row of result.chats) {
            const old = combined.get(row.id);
            if (!old || row.update >= old.update) combined.set(row.id,row);
          }
        }
        pending = [...combined.values()].sort((a,b) => b.update-a.update || a.title.localeCompare(b.title,"es"));
        invalid = bad;
        if (!pending.length) throw new Error("No se encontraron títulos e identificadores válidos en estos archivos.");
        chosen = new Set(pending.filter(x=>FOCUS_RX.test(x.title)).map(x=>x.id));
        review.hidden = false;
        status.textContent = "Instantánea importada: " + pending.length + " chats identificados, " + invalid + " entradas omitidas. Sin acceder a ChatGPT en directo.";
        render();
      } catch (err) {discard();status.textContent = "No se ha cambiado nada: " + (err?.message || "error leyendo el archivo");}
    });
    section.querySelector("#chatgpt-import-select-focus").addEventListener("click",()=>{chosen=new Set(pending.filter(x=>FOCUS_RX.test(x.title)).map(x=>x.id));render();});
    section.querySelector("#chatgpt-import-select-all").addEventListener("click",()=>{chosen=new Set(pending.map(x=>x.id));render();});
    section.querySelector("#chatgpt-import-select-none").addEventListener("click",()=>{chosen.clear();render();});
    section.querySelector("#chatgpt-import-cancel").addEventListener("click",()=>{discard();status.textContent="Importación descartada sin guardar cambios.";});
    search.addEventListener("input",render);
    apply.addEventListener("click",()=>{
      try {
        const subset = pending.filter(x=>chosen.has(x.id));
        if (!subset.length) return;
        const result = planImport(registry,subset);
        const question = "Confirmar " + subset.length + " chats de una exportación de ChatGPT:\n" +
          result.added + " altas, " + result.renamed + " renombrados, " + result.same + " sin cambios.\n" +
          result.collisions + " títulos requieren sufijo de identificación.\n" +
          "No se eliminarán chats existentes. Solo se guardarán metadatos; no se enviarán mensajes. ¿Guardar?";
        if (!window.confirm(question)) {status.textContent="Sin cambios: operación cancelada.";return;}
        if (!saveRegistry(result.next)) {status.textContent="No se pudo guardar; el registro existente sigue disponible.";return;}
        renderChatManager();refreshAllChatSelectors();
        status.textContent = "Guardados: " + result.added + " nuevos, " + result.renamed + " renombrados, " + result.same + " existentes sin cambio. Los títulos reflejan esta exportación, NO ChatGPT en tiempo real. Exporta tu copia VISURA si quieres conservarlos en otro dispositivo.";
        discard();
      } catch (err) {status.textContent="Sin cambios: " + (err?.message || "no se pudo importar");}
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",setupUI,{once:true});
  else setupUI();
})();