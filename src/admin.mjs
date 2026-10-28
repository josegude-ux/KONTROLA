import {fechaAlmacen} from "./business-date.mjs";
import {validarLotePdf,resumenLotePdf} from "./import-batch.mjs";
import {configurarEstadisticasOperarios} from "./admin-stats.mjs";
import {configurarLoteImpresion} from "./admin-print-batch.mjs";
import {configureAdminFixedPositions} from "./admin-fixed-positions.mjs";
import {analyzeDocument,applyLineCorrection,publicationReadiness,warehouseZone,normalizeReviewFindings} from "./document-review.mjs";
import {fechaISO} from "./logic.mjs";
import {parsePdfFile} from "./pdf.mjs";
import {buildPreparationReport} from "./report.mjs";
import {crearListadoPasillosA4} from "./aisle-matrix.mjs";
import {generarPdfHojas,extraerHojasDeInforme,nombrePdfInforme} from "./print-pdf.mjs";
import {unirPaginasCor1YDetalle} from "./mixed-print.mjs";
import {revisarSustitucion} from "./import-policy.mjs";
import {configureRevisionHistory} from "./admin-revisions.mjs";

const $=id=>document.getElementById(id);
const fmt=value=>value==null?"—":Number(value).toLocaleString("es-ES",{maximumFractionDigits:3});
const hashFile=async file=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()))]
  .map(value=>value.toString(16).padStart(2,"0")).join("");
const asPayload=parsed=>({
  codigo:parsed.id,fecha:fechaISO(parsed.date),matricula:parsed.plate||null,ruta:parsed.route||null,
  repartidor:parsed.driver||null,peso_kg:parsed.weight??null,referencias:parsed.refs??null,
  bultos:parsed.bultos??null,
  observaciones:parsed.observations?.trim()||null,
  huecos_palets_grandes:parsed.palletsLarge??null,huecos_palets_pequenos:parsed.palletsSmall??null,
  huecos_palets_total:parsed.palletsTotal??null,
  almacen:parsed.warehouse,declared_total:parsed.declaredTotal??null,actual_total:parsed.actualTotal??null,
  parser_metadata:{
    verified:parsed.verified===true,warnings:Array.isArray(parsed.warnings)?parsed.warnings:[],
    mixed_warehouse:parsed.mixedWarehouse===true,available_warehouses:parsed.availableWarehouses||[]
  },productos:(parsed.products||[]).map(product=>({
    sku:String(product.sku||""),description:String(product.description||""),
    location:String(product.location||""),qty:Number(product.qty),unit:String(product.unit||""),
    sourceContext:String(product.sourceContext||""),pdfOriginal:product.pdfOriginal||null
  }))
});
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,character=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[character]));

export function buildReportDownloadHtml(title,styles,content){
  return "<!doctype html><meta charset=utf-8><title>"+escapeHtml(title)+"</title><style>"+styles+"</style>"+content;
}

export function createAdminController({client,getUser,bucket,global,errorText,onPublished}){
  const revisionControl=configureRevisionHistory({client,getUser,bucket,errorText});
  const operatorStats=configurarEstadisticasOperarios({client,getUser,errorText,getWarehouse:()=>document.getElementById("adminWarehouse").value});
  const printBatch=configurarLoteImpresion({client,getUser,errorText,getWarehouse:()=>document.getElementById("adminWarehouse").value});
  const fixedPositions=configureAdminFixedPositions({client,getUser,errorText});
  fixedPositions.mount();
  let busy=false,draft=null;
  let archiveGeneration=0;
  const setStatus=(message="",level="")=>{
    const target=$("importStatus");target.textContent=message;target.className="status "+level;
  };
  const setBusy=value=>{
    busy=value;
    for(const id of ["processPdf","saveDocumentReview","generateSheet","publishReviewedLoad"]){
      const button=$(id);if(button)button.disabled=value;
    }
  };
  async function persistParsedImport(reservation,file,parsed,findings,hash){
    const {error:uploadError}=await client.storage.from(bucket).upload(reservation.documento_ruta,file,{
      contentType:"application/pdf",upsert:false
    });
    if(uploadError&&!/already exists|duplicate/i.test(String(uploadError.message||uploadError))
      &&Number(uploadError.statusCode||uploadError.status)!==409)throw uploadError;
    const {error:completeError}=await client.rpc("kontrola_completar_importacion",{
      p_importacion:reservation.id,p_carga:asPayload(parsed),p_hallazgos:findings
    });
    if(completeError)throw completeError;
    draft={id:reservation.id,file,hash,path:reservation.documento_ruta,parsed,findings,acknowledged:[],state:"revision_requerida"};
    renderDraft();
    setStatus("PDF conservado y procesado. Revisa los hallazgos antes de publicar.","success");
    await refreshAttention();
  }
  async function downloadDraftFile(){
    if(draft.file)return draft.file;
    const {data,error}=await client.storage.from(bucket).download(draft.path);
    if(error)throw error;
    draft.file=new File([data],draft.parsed.id+".pdf",{type:"application/pdf"});
    return draft.file;
  }
  async function processSinglePdf(file,seenCodes){
    setStatus("Analizando únicamente COR1 de "+file.name+"…");
    // F designa el destino Ferrol, no autoriza preparar mercancía COR2.
    const parsed=await parsePdfFile(file,{warehouse:"COR_01_COR"});
    if(!/^LP\d{2}-\d{4,6}$/.test(parsed.id)){
      throw Error("No se pudo identificar el código LP de este PDF ("+file.name+"). Comprueba que el documento incluye un código LP válido y que no está escaneado; no se reservará una importación con un identificador deducido del nombre.");
    }
    if(seenCodes.has(parsed.id))throw Error("El lote contiene más de un PDF para la carga "+parsed.id+". Importa las revisiones de esa carga por separado.");
    seenCodes.add(parsed.id);
    const hash=await hashFile(file);
    // La UI solicita permiso antes de reservar. La autoridad final permanece en la RPC.
    const {data:existing,error:lookupError}=await client.from("kontrola_cargas")
      .select("codigo,revision,documento_hash,estado,almacen")
      .eq("codigo",parsed.id).maybeSingle();
    if(lookupError)throw lookupError;
    const decision=revisarSustitucion(existing,hash);
    if(decision.tipo==="bloqueada")throw Error(decision.mensaje);
    if(decision.tipo==="confirmar"&&!window.confirm(decision.mensaje))return "cancelado";
    const findings=analyzeDocument(parsed);
    const {data,error}=await client.rpc("kontrola_reservar_importacion",{
      p_codigo:parsed.id,p_hash:hash,p_archivo:file.name,p_tamano:file.size
    });
    if(error)throw error;
    const reservation=Array.isArray(data)?data[0]:data;
    if(!reservation?.id||!reservation.documento_ruta)throw Error("Reserva documental incompleta.");
    if(reservation.repetida){
      if(reservation.estado==="reservada"){
        setStatus("Recuperando importación interrumpida: "+file.name+"…");
        await persistParsedImport(reservation,file,parsed,findings,hash);
        return "recuperado";
      }
      await loadImport(reservation.id);
      return "repetido";
    }
    await persistParsedImport(reservation,file,parsed,findings,hash);
    return "nuevo";
  }
  async function processPdf(){
    if(busy)return;
    let files;
    try{files=validarLotePdf($("pdfInput").files);}
    catch(error){return setStatus(errorText(error),"error");}
    if(draft&&!window.confirm(
      "Hay una revisión abierta. Antes de importar otros PDF, comprueba que has pulsado Guardar revisión. "+
      "Los cambios que no hayas guardado se perderán. ¿Continuar con la importación?"
    ))return setStatus("Importación cancelada. Conservas la revisión que estabas consultando.");
    setBusy(true);
    $("importResultDetails").hidden=true;
    $("importResultList").replaceChildren();
    const outcomes=[],seenCodes=new Set();
    try{
      for(let i=0;i<files.length;i++){
        const file=files[i];
        setStatus("Procesando PDF "+(i+1)+" de "+files.length+": "+file.name+"…");
        try{
          const estado=await processSinglePdf(file,seenCodes);
          outcomes.push({archivo:file.name,estado});
        }catch(error){
          outcomes.push({archivo:file.name,estado:"error",mensaje:errorText(error)});
        }
      }
      const total=resumenLotePdf(outcomes);
      const summary="Importación terminada: "+total.nuevos+" nuevo(s), "+total.recuperados+
        " recuperado(s), "+total.repetidos+" repetido(s), "+total.cancelados+
        " cancelado(s), "+total.errores+" error(es)."+
        " Los documentos admitidos quedan pendientes de revisión; ninguno se publica automáticamente.";
      // Resultado compacto: los errores detallados quedan disponibles bajo demanda.
      setStatus(summary,total.hayErrores?"error":"success");
      const details=$("importResultDetails"),list=$("importResultList");
      list.replaceChildren();
      const errors=outcomes.filter(item=>item.estado==="error");
      details.hidden=errors.length===0;
      if(errors.length){
        details.querySelector("summary").textContent="Ver "+errors.length+" archivo(s) con error";
        for(const item of errors){
          const row=document.createElement("p");
          const name=document.createElement("strong");name.textContent=item.archivo+": ";
          row.append(name,document.createTextNode(item.mensaje));list.appendChild(row);
        }
      }
    }finally{
      setBusy(false);
      $("pdfInput").value="";
      // El resultado del lote no borra la selección pendiente, se vuelve a consultar.
      try{await Promise.all([refreshReviewSelector(),refreshPendingPublish()]);}
      catch(error){global("Importación finalizada, pero no se pudo actualizar el listado: "+errorText(error),"error");}
    }
  }
  async function loadImport(id){
    const session=getUser()?.id;
    const {data,error}=await client.from("kontrola_importaciones")
      .select("id,documento_hash,documento_ruta,estado,carga_datos,hallazgos,correcciones,advertencias_confirmadas")
      .eq("id",id).single();
    if(getUser()?.id!==session)return;
    if(error)throw error;
    if(!data.carga_datos)return setStatus("La importación está reservada pero todavía no fue procesada.","error");
    const payload=data.carga_datos;
    draft={
      id:data.id,hash:data.documento_hash,path:data.documento_ruta,state:data.estado,
      parsed:{
        id:payload.codigo,date:payload.fecha,plate:payload.matricula,route:payload.ruta,driver:payload.repartidor,
        weight:payload.peso_kg,refs:payload.referencias,bultos:payload.bultos??payload.declared_total,warehouse:payload.almacen,products:payload.productos,
        observations:payload.observaciones||null,palletsLarge:payload.huecos_palets_grandes??null,
        palletsSmall:payload.huecos_palets_pequenos??null,palletsTotal:payload.huecos_palets_total??null,
        declaredTotal:payload.declared_total,actualTotal:payload.actual_total,
        verified:payload.parser_metadata?.verified,warnings:payload.parser_metadata?.warnings||[],
        mixedWarehouse:payload.parser_metadata?.mixed_warehouse,
        availableWarehouses:payload.parser_metadata?.available_warehouses||[],
        corrections:data.correcciones||[]
      },
      findings:normalizeReviewFindings(data.hallazgos||[]),acknowledged:data.advertencias_confirmadas?normalizeReviewFindings(data.hallazgos||[]).filter(item=>item.severity==="warning").map(item=>item.id):[]
    };
    renderDraft();
    $("reviewLoadSelect").value=data.id;
  }
  async function refreshReviewSelector(){
    const select=$("reviewLoadSelect"),message=$("reviewLoadMessage");
    const previous=select.value||draft?.id||"";
    const warehouse=$("adminWarehouse").value,session=getUser()?.id;
    message.textContent="Consultando cargas pendientes…";
    const {data,error}=await client.from("kontrola_importaciones")
      .select("id,codigo,estado,almacen_detectado,actualizado_en")
      .in("estado",["revision_requerida","aprobada","publicada"])
      .order("actualizado_en",{ascending:false}).limit(150);
    if(getUser()?.id!==session||$("adminWarehouse").value!==warehouse)return;
    select.replaceChildren();
    const initial=document.createElement("option");initial.value="";initial.textContent="Seleccionar carga…";select.appendChild(initial);
    if(error){message.textContent="No se pudieron consultar las cargas: "+errorText(error);return;}
    const rows=(data||[]).filter(row=>!warehouse||row.almacen_detectado===warehouse||!row.almacen_detectado);
    for(const row of rows){
      const option=document.createElement("option");option.value=row.id;
      option.textContent=row.codigo+" · "+(row.estado==="publicada"?"Publicada":row.estado==="aprobada"?"Aprobada":"Pendiente de revisión");
      select.appendChild(option);
    }
    if(rows.some(row=>row.id===previous))select.value=previous;
    message.textContent=rows.length+" carga(s) disponibles para revisar o imprimir.";
  }
  $("reviewLoadSelect").addEventListener("change",async()=>{
    const id=$("reviewLoadSelect").value;
    if(!id||busy)return;
    if(draft?.id===id)return;
    if(draft&&draft.state!=="publicada"&&!window.confirm(
      "Si has realizado cambios sin guardar en esta revisión, se perderán al cambiar de carga. ¿Continuar?"
    )){$("reviewLoadSelect").value=draft.id||"";return;}
    $("reviewLoadSelect").disabled=true;
    try{
      await loadImport(id);
      setStatus("Revisión cargada. Puedes continuar sin salir de este menú.","success");
    }catch(error){setStatus("No se pudo cambiar de carga: "+errorText(error),"error");}
    finally{$("reviewLoadSelect").disabled=false;}
  });
  $("reviewLoadRefresh").addEventListener("click",refreshReviewSelector);
  // La importación ya reservada conserva su PDF original y su hash.
  // Reprocesar es solo lectura hasta que administración pulse Guardar revisión.
  async function reprocessReviewWarehouse(target){
    if(busy||!draft||draft.state==="publicada")return;
    if(target!=="COR_01_COR")return setStatus("Solo COR1 puede pasar a preparación. COR2 dispone de hoja detalle independiente.","error");
    const previous=draft.parsed;
    if((previous.corrections||[]).length&&!window.confirm(
      "Al reprocesar desde el PDF original se sustituirá la revisión local actual, incluidas sus correcciones manuales. El original y los datos guardados no se borrarán. ¿Continuar?"
    )){renderDraft();return;}
    setBusy(true);
    try{
      const original=await downloadDraftFile();
      const next=await parsePdfFile(original,{warehouse:target});
      if(next.id!==previous.id||next.warehouse!==target||next.mixedWarehouse||!next.products.length)
        throw Error("No se puede aislar con seguridad el almacén y su mercancía. No se ha cambiado la revisión.");
      next.corrections=[{line:null,field:"warehouse",before:previous.warehouse||"",after:target,
        by:getUser().id,at:new Date().toISOString()}];
      draft.parsed=next;
      draft.findings=analyzeDocument(next);
      draft.state="revision_requerida";
      renderDraft();
      setStatus("Reprocesado solo "+warehouseZone(target).label+": "+next.products.length+
        " referencias. El PDF original sigue intacto. Pulsa Guardar revisión para actualizar la carga pendiente.","success");
    }catch(error){
      renderDraft();
      setStatus("No se pudo separar el documento: "+errorText(error),"error");
    }finally{setBusy(false);updateActions();}
  }
  function renderDraft(){
    const root=$("documentReview");root.replaceChildren();
    if(!draft){root.textContent="Procesa un PDF para iniciar la revisión.";return;}
    const zone=warehouseZone(draft.parsed.warehouse);
    const heading=document.createElement("div");heading.className="review-heading";
    const title=document.createElement("h3");title.textContent=draft.parsed.id+" · "+zone.label;
    const state=document.createElement("span");state.className="state-badge";state.textContent=draft.state;
    const warehouse=document.createElement("select");warehouse.className="warehouse-select";warehouse.setAttribute("aria-label","Clasificar almacén");
    for(const [value,label] of [["","Pendiente de clasificar"],["COR_01_COR","A Coruña"],["COR_02_NAR","Ferrol (solo consulta)"]]){
      const option=document.createElement("option");option.value=value;option.textContent=label;
      if(value==="COR_02_NAR")option.disabled=true;
      warehouse.appendChild(option);
    }
    warehouse.value=zone.known?zone.code:"";
    warehouse.disabled=busy||draft.state==="publicada";
    warehouse.addEventListener("change",()=>reprocessReviewWarehouse(warehouse.value));
    heading.append(title,warehouse,state);root.appendChild(heading);
    if(draft.state!=="publicada"&&draft.parsed.warehouse!=="COR_01_COR"){
      const reprocess=document.createElement("button");
      reprocess.type="button";reprocess.className="secondary";
      reprocess.textContent="Reprocesar SOLO COR1 (A Coruña) para preparación";
      reprocess.disabled=busy;
      reprocess.addEventListener("click",()=>reprocessReviewWarehouse("COR_01_COR"));
      root.appendChild(reprocess);
      const help=document.createElement("p");help.className="hint";
      help.textContent="El PDF puede contener también COR2, pero nunca se enviará a preparación. La hoja COR2 se genera aparte.";
      root.appendChild(help);
    }
    const locationIssues=draft.findings.filter(item=>item.code==="missing_location");
    const otherFindings=draft.findings.filter(item=>item.code!=="missing_location");
    const summary=document.createElement("p");summary.className="muted";
    summary.textContent=draft.parsed.products.length+" referencias detectadas · "+
      locationIssues.length+" sin ubicación · "+otherFindings.length+" otros avisos.";
    root.appendChild(summary);
    if(locationIssues.length){
      const notice=document.createElement("p");notice.className="hint";
      notice.textContent="Ubicaciones pendientes de corregir en Business Central. No bloquean la operativa; disponibles en el informe bajo demanda.";
      root.appendChild(notice);
    }
    const findings=document.createElement("div");findings.className="findings";
    const critical=otherFindings.filter(item=>item.severity==="error");
    if(!critical.length){
      const ok=document.createElement("p");ok.className="status success";
      ok.textContent="Sin errores bloqueantes. Los avisos no críticos quedan registrados para su revisión posterior.";
      findings.appendChild(ok);
    }
    for(const item of critical){
      const row=document.createElement("p");row.className="finding error";
      row.textContent=(item.line?"Línea "+item.line+" · ":"")+item.message+(item.context?" · "+item.context:"");
      findings.appendChild(row);
    }
    root.appendChild(findings);
    updateActions();
  }
  function updateActions(){
    const readiness=draft?publicationReadiness(draft.findings,draft.findings.filter(item=>item.severity==="warning").map(item=>item.id)):{ready:false};
    $("saveDocumentReview").disabled=busy||!draft;
    const isCor1=draft?.parsed?.warehouse==="COR_01_COR";
    $("generateSheet").disabled=busy||!draft||draft.state!=="publicada"||!isCor1;
    $("saveCompactA4Admin").disabled=busy||!draft||draft.state!=="publicada"||!isCor1;
    $("warehousePrintActions").hidden=!draft;
    $("printCor1Pack").disabled=busy||!draft||draft.state!=="publicada"||!isCor1;
    $("previewCor2Detail").disabled=busy||!draft||!(draft.parsed.availableWarehouses||[]).includes("COR_02_NAR");
    $("postPublishActions").hidden=!draft||draft.state!=="publicada";
    $("locationReport").disabled=busy||!draft;
    $("publishReviewedLoad").disabled=busy||!draft||draft.state!=="aprobada"||!readiness.ready||!isCor1;
    $("publishReviewedLoad").hidden=!!draft&&draft.state==="publicada";
    $("saveDocumentReview").hidden=!!draft&&draft.state==="publicada";
    $("reviewReadiness").textContent=draft?.state==="publicada"?"Carga publicada. Continúa con la hoja de preparación.":!draft?"":readiness.ready?"Sin errores graves: puedes guardar y publicar.":readiness.errors?.length
      ?readiness.errors.length+" error(es) bloqueante(s).":"Confirma todas las advertencias para continuar.";
  }
  async function saveReview(){
    if(busy||!draft)return;
    if(draft.parsed.warehouse!=="COR_01_COR")return setStatus("Solo se puede guardar para preparación COR1. Reprocesa la parte de A Coruña primero.","error");
    const readiness=publicationReadiness(draft.findings,draft.findings.filter(item=>item.severity==="warning").map(item=>item.id));
    // Los avisos no críticos se registran sin requerir confirmación línea a línea.
    const confirmed=true;
    setBusy(true);
    try{
      const {data,error}=await client.rpc("kontrola_corregir_importacion",{
        p_importacion:draft.id,p_carga:asPayload({...draft.parsed,verified:readiness.errors.length===0&&confirmed}),p_hallazgos:draft.findings,
        p_correcciones:draft.parsed.corrections||[],p_confirmar_advertencias:confirmed
      });
      if(error)throw error;
      draft.state=data;renderDraft();
      setStatus(readiness.errors.length?"Correcciones guardadas; persisten errores bloqueantes.":"Revisión guardada en el servidor.","success");
      await refreshAttention();
    }catch(error){setStatus("No se pudo guardar la revisión: "+errorText(error),"error");}
    finally{setBusy(false);updateActions();}
  }
  function showLocationReport(){
    if(!draft)return;
    const issues=draft.findings.filter(item=>item.code==="missing_location");
    const paper=$("reportPaper");paper.replaceChildren();
    const heading=document.createElement("h2");heading.textContent="Incidencias de ubicación · "+draft.parsed.id;
    const note=document.createElement("p");note.textContent="Informe para revisar y corregir manualmente en Business Central. KONTROLA no modifica BC.";
    const count=document.createElement("p");count.textContent="Almacén: "+warehouseZone(draft.parsed.warehouse).label+" · Referencias sin ubicación: "+issues.length;
    paper.append(heading,note,count);
    const table=document.createElement("table");
    const head=document.createElement("thead"),hr=document.createElement("tr");
    for(const label of ["Línea","Referencia","Descripción","Cantidad","Unidad","Ubicación en BC / observaciones"]){
      const th=document.createElement("th");th.textContent=label;hr.appendChild(th);
    }
    head.appendChild(hr);table.appendChild(head);
    const body=document.createElement("tbody");
    for(const issue of issues){
      const product=draft.parsed.products[issue.line-1]||{};
      const tr=document.createElement("tr");
      for(const value of [issue.line,product.sku||"",product.description||"",product.qty??"",product.unit||"","________________"]){
        const td=document.createElement("td");td.textContent=String(value);tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    table.appendChild(body);paper.appendChild(table);
    if(!issues.length){const p=document.createElement("p");p.textContent="No hay ubicaciones pendientes en esta revisión.";paper.appendChild(p);}
    $("reportTitle").textContent="Ubicaciones pendientes · "+draft.parsed.id;
    $("onedriveArchiveHelp").hidden=true;
    $("reportView").hidden=false;document.body.classList.add("report-open");window.scrollTo(0,0);
  }
  function showReport(){
    if(!draft||draft.state!=="publicada"||draft.parsed.warehouse!=="COR_01_COR")return;
    $("reportPaper").innerHTML=buildPreparationReport(asPayload(draft.parsed));
    $("reportTitle").textContent="Hoja procesada · "+draft.parsed.id;
    $("onedriveArchiveHelp").hidden=false;
    $("reportView").hidden=false;document.body.classList.add("report-open");window.scrollTo(0,0);
  }
  async function saveAdminA4(){
    if(busy||!draft||draft.state!=="publicada"||draft.parsed.warehouse!=="COR_01_COR")return;
    try{
      const bytes=generarPdfHojas([crearListadoPasillosA4(asPayload(draft.parsed))]);
      const name="VISURA_"+draft.parsed.id+"_COR1_LISTADO_PASILLOS_A4.pdf";
      const file=new File([bytes],name,{type:"application/pdf"});
      const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent||"");
      if(ios&&navigator.share&&(typeof navigator.canShare!=="function"||navigator.canShare({files:[file]}))){
        await navigator.share({files:[file],title:"Listado A4 COR1 · "+draft.parsed.id});
        setStatus("Listado A4 generado. Revisa el contenido antes de imprimir.","success");
      }else{
        const url=URL.createObjectURL(file);
        const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        setStatus("Listado A4 COR1 descargado, sin alterar la hoja detallada ni COR2.","success");
      }
    }catch(error){
      if(error?.name!=="AbortError")setStatus("No se pudo generar el listado A4: "+errorText(error),"error");
    }
  }
  // Documento nuevo de impresión, sin tocar el PDF original ni la importación.
  async function printCor1Bundle(){
    if(busy||!draft||draft.state!=="publicada"||draft.parsed.warehouse!=="COR_01_COR")return;
    const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent||"");
    // Reservar pestaña antes de la lectura asíncrona para evitar el bloqueo de ventanas.
    const preview=ios?null:window.open("about:blank","_blank");
    if(preview)preview.opener=null;
    setBusy(true);
    try{
      const original=await downloadDraftFile();
      const parsed=await parsePdfFile(original,{warehouse:"COR_01_COR"});
      if(parsed.id!==draft.parsed.id||parsed.warehouse!=="COR_01_COR"||parsed.mixedWarehouse||
        !parsed.pageNumbers?.length||parsed.products.length!==draft.parsed.products.length)
        throw Error("El original no coincide con las referencias COR1 publicadas. No se imprimirá.");
      const temporary=document.createElement("div");
      temporary.innerHTML=buildPreparationReport(asPayload(draft.parsed));
      const detailBytes=generarPdfHojas(extraerHojasDeInforme(temporary));
      const bytes=await unirPaginasCor1YDetalle({
        original:new Uint8Array(await original.arrayBuffer()),
        numeroPaginasCor1:parsed.pageNumbers,
        detalle:detailBytes
      });
      const file=new File([bytes],"VISURA_"+draft.parsed.id+"_COR1_ORIGINAL_Y_DETALLE.pdf",{type:"application/pdf"});
      if(ios&&typeof navigator.share==="function"&&
        (typeof navigator.canShare!=="function"||navigator.canShare({files:[file]}))){
        await navigator.share({files:[file],title:"Impresión COR1 · "+draft.parsed.id});
        setStatus("Se preparó el PDF COR1. Selecciona imprimir o guardar en el menú de compartir.","success");
      }else{
        const url=URL.createObjectURL(file);
        if(preview&&!preview.closed)preview.location.href=url;
        else{
          const link=document.createElement("a");link.href=url;link.download=file.name;link.click();
        }
        // Mantener el documento disponible mientras el usuario abre el diálogo de impresión.
        setTimeout(()=>URL.revokeObjectURL(url),30*60*1000);
        setStatus("PDF listo: páginas originales COR1 y después nuestra hoja detalle COR1. No incluye COR2.","success");
      }
    }catch(error){
      if(preview&&!preview.closed)preview.close();
      if(error?.name!=="AbortError")setStatus("No se pudo preparar el PDF COR1: "+errorText(error),"error");
    }finally{setBusy(false);updateActions();}
  }
  async function showCor2Detail(){
    if(busy||!draft||!(draft.parsed.availableWarehouses||[]).includes("COR_02_NAR"))return;
    setBusy(true);
    try{
      const original=await downloadDraftFile();
      const parsed=await parsePdfFile(original,{warehouse:"COR_02_NAR"});
      if(parsed.id!==draft.parsed.id||parsed.warehouse!=="COR_02_NAR"||parsed.mixedWarehouse||
        !parsed.products.length)throw Error("No se pudo aislar la parte COR2 del PDF original.");
      // Nunca se guarda ni publica como carga procesable.
      $("reportPaper").innerHTML=buildPreparationReport(asPayload(parsed),{informativoCor2:true});
      $("reportTitle").textContent="Hoja detalle COR2 · "+parsed.id+" · SOLO INFORMATIVA";
      $("onedriveArchiveHelp").hidden=true;
      $("reportView").hidden=false;document.body.classList.add("report-open");window.scrollTo(0,0);
      setStatus("Hoja independiente COR2 generada solo para consulta; no entra en preparación ni procesamiento.","success");
    }catch(error){setStatus("No se pudo generar el detalle COR2: "+errorText(error),"error");}
    finally{setBusy(false);updateActions();}
  }
  async function publish(){
    if(busy||!draft)return;
    if(draft.parsed.warehouse!=="COR_01_COR")return setStatus("No se puede publicar COR2 en preparación. Solo se publica COR1.","error");
    setBusy(true);
    try{
      const {data,error}=await client.rpc("kontrola_publicar_importacion",{p_importacion:draft.id});
      if(error)throw error;
      const result=Array.isArray(data)?data[0]:data;
      draft.state="publicada";renderDraft();
      setStatus("Carga "+result.codigo+" publicada en "+result.almacen+".","success");
      await Promise.all([refreshAttention(),refreshPendingPublish(),refreshSummary()]);
      onPublished?.();
    }catch(error){setStatus("No se pudo publicar: "+errorText(error),"error");}
    finally{setBusy(false);updateActions();}
  }
  let pendingRows=[],pendingSelected=new Set();
  function updatePendingSelection(){
    $("pendingPublishSelected").disabled=busy||pendingSelected.size===0;
    $("pendingPublishSelected").textContent="Publicar seleccionadas ("+pendingSelected.size+")";
  }
  async function refreshPendingPublish(){
    const warehouse=$("adminWarehouse").value,session=getUser()?.id;
    const target=$("pendingPublishList");
    target.textContent="Consultando cargas sin publicar…";
    const {data,error}=await client.from("kontrola_importaciones")
      .select("id,codigo,estado,almacen_detectado,carga_datos,hallazgos")
      .in("estado",["revision_requerida","aprobada"])
      .order("codigo",{ascending:true}).limit(500);
    if(getUser()?.id!==session||$("adminWarehouse").value!==warehouse)return;
    target.replaceChildren();pendingSelected.clear();pendingRows=[];
    if(error){$("pendingPublishSummary").textContent="No se pudieron consultar las pendientes: "+errorText(error);return;}
    pendingRows=(data||[]).filter(row=>row.almacen_detectado===warehouse);
    const approved=pendingRows.filter(row=>row.estado==="aprobada"&&!(row.hallazgos||[]).some(f=>f.severity==="error"));
    $("pendingPublishSummary").textContent=pendingRows.length+" carga(s) pendientes de publicar, de cualquier fecha · "+approved.length+" lista(s).";
    const notice=$("pendingPrintNotice");
    notice.hidden=pendingRows.length===0;
    notice.textContent=pendingRows.length+" carga(s) pendientes de publicar · Revisar";
    notice.onclick=()=>{selectAdminTab(1);refreshPendingPublish();};
    for(const row of pendingRows){
      const ready=approved.some(item=>item.id===row.id);
      const label=document.createElement("label");label.className="batch-print-row";
      const check=document.createElement("input");check.type="checkbox";check.disabled=!ready;
      check.addEventListener("change",()=>{if(check.checked)pendingSelected.add(row.id);else pendingSelected.delete(row.id);updatePendingSelection();});
      const info=document.createElement("span");
      const title=document.createElement("b");title.textContent=row.codigo+" · "+(ready?"Lista para publicar":"Necesita revisión");
      const detail=document.createElement("small");detail.textContent="Fecha BC: "+(row.carga_datos?.fecha||"—")+(ready?"":" · "+(row.hallazgos||[]).filter(f=>f.severity==="error").map(f=>f.message||f.id).join(", "));
      const open=document.createElement("button");open.type="button";open.className="secondary";open.textContent="Revisar";
      open.addEventListener("click",async()=>{selectAdminTab(0);try{await loadImport(row.id);$("documentReview").scrollIntoView({behavior:"smooth",block:"start"});}catch(e){setStatus(errorText(e),"error");}});
      info.append(title,detail,open);label.append(check,info);target.appendChild(label);
    }
    updatePendingSelection();
  }
  $("pendingSelectAll").addEventListener("click",()=>{
    const ready=pendingRows.filter(row=>row.estado==="aprobada"&&!(row.hallazgos||[]).some(f=>f.severity==="error"));
    const allSelected=ready.length>0&&ready.every(row=>pendingSelected.has(row.id));
    pendingSelected=new Set(allSelected?[]:ready.map(row=>row.id));
    $("pendingPublishList").querySelectorAll('input[type="checkbox"]').forEach(input=>{
      if(!input.disabled)input.checked=!allSelected;
    });
    updatePendingSelection();
  });
  $("pendingPublishSelected").addEventListener("click",async()=>{
    if(busy||!pendingSelected.size)return;
    const chosen=pendingRows.filter(row=>pendingSelected.has(row.id)&&row.estado==="aprobada"&&!(row.hallazgos||[]).some(f=>f.severity==="error"));
    if(!chosen.length)return;
    if(!window.confirm("¿Publicar "+chosen.length+" carga(s) aprobadas seleccionadas?"))return;
    setBusy(true);$("pendingPublishSelected").disabled=true;
    const results=[];
    try{
      for(const row of chosen){
        const {error}=await client.rpc("kontrola_publicar_importacion",{p_importacion:row.id});
        results.push(row.codigo+": "+(error?"No publicada: "+errorText(error):"Publicada"));
      }
      $("pendingPublishResult").textContent=results.join(" · ");
      await Promise.all([refreshPendingPublish(),refreshAttention(),refreshSummary(),refreshReviewSelector(),printBatch.refresh()]);
      if(results.some(r=>r.endsWith(": Publicada")))onPublished?.();
    }finally{setBusy(false);updatePendingSelection();}
  });
  async function refreshAttention(){
    const warehouse=$("adminWarehouse").value,session=getUser()?.id;
    const target=$("attentionList");target.textContent="Consultando avisos…";
    const {data,error}=await client.rpc("kontrola_necesitan_atencion",{p_almacen:warehouse||null});
    if($("adminWarehouse").value!==warehouse||getUser()?.id!==session)return;
    target.replaceChildren();
    if(error){target.textContent=errorText(error);return;}
    if(!data?.length){target.textContent="No hay elementos pendientes.";return;}
    for(const item of data){
      const button=document.createElement("button");button.type="button";button.className="attention-card";
      const title=document.createElement("b");title.textContent=item.titulo+" · "+(item.codigo||"");
      const detail=document.createElement("span");detail.textContent=item.detalle;button.append(title,detail);
      if(item.tipo==="importacion")button.addEventListener("click",async()=>{
        // Abrir realmente la revisión seleccionada; no dejarla oculta en otra pestaña.
        selectAdminTab(0);
        setStatus("Cargando revisión de "+(item.codigo||"la carga")+"…");
        try{
          await loadImport(item.entidad_id);
          $("documentReview").scrollIntoView({behavior:"smooth",block:"start"});
        }catch(error){setStatus("No se pudo abrir la revisión: "+errorText(error),"error");}
      });
      target.appendChild(button);
    }
  }
  async function refreshSummary(){
    const warehouse=$("adminWarehouse").value,session=getUser()?.id;
    if(!warehouse||!session)return;
    const target=$("adminSummary"),log=$("adminActivity");
    target.textContent="Actualizando resumen…";log.replaceChildren();
    const [{data:summary,error},{data:activity,error:activityError}]=await Promise.all([
      client.rpc("kontrola_resumen_zona",{p_almacen:warehouse,p_dia:fechaAlmacen()}),
      client.from("kontrola_actividad").select("tipo,creado_en,detalle,codigo,actor_id").eq("almacen",warehouse).order("creado_en",{ascending:false}).limit(50)
    ]);
    if($("adminWarehouse").value!==warehouse||getUser()?.id!==session)return;
    if(error){target.textContent="No se pudo cargar el resumen.";global(errorText(error),"error");return;}
    const values=Array.isArray(summary)?summary[0]:summary;
    target.replaceChildren();
    for(const [label,key] of [["Publicadas","publicadas"],["En preparación","en_preparacion"],["Pendientes verificación","pendientes_verificacion"],["En verificación","en_verificacion"],["Cerradas","cerradas"],["Incidencias","incidencias_pendientes"],["Días anteriores","anteriores_pendientes"]]){
      const card=document.createElement("div");card.className="fact";card.innerHTML="<small>"+label+"</small><b>"+Number(values?.[key]||0)+"</b>";target.appendChild(card);
    }
    log.replaceChildren();
    if(activityError){log.textContent=errorText(activityError);return;}
    for(const event of activity||[]){
      const row=document.createElement("p");row.textContent=new Date(event.creado_en).toLocaleString("es-ES")+" · "+event.tipo+" · "+(event.codigo||"");log.appendChild(row);
    }
  }
  async function refreshIncidents(){
    const session=getUser()?.id,target=$("incidentList");
    target.textContent="Consultando incidencias…";
    const {data,error}=await client.rpc("kontrola_incidencias_pendientes");
    if(getUser()?.id!==session)return;
    target.replaceChildren();if(error){target.textContent=errorText(error);return;}
    const groups=new Map();
    for(const incident of data||[]){if(!groups.has(incident.codigo))groups.set(incident.codigo,[]);groups.get(incident.codigo).push(incident);}
    if(!groups.size){target.textContent="No hay incidencias pendientes.";return;}
    for(const [code,items] of groups){
      const group=document.createElement("section");group.className="incident-group";
      const title=document.createElement("h3");title.textContent=code+" · "+items.length+" pendiente(s)";group.appendChild(title);
      for(const incident of items){
        const row=document.createElement("div");row.className="incident-row";
        const text=document.createElement("span");text.textContent=incident.sku+" · "+fmt(incident.prevista_cantidad)+" → "+fmt(incident.comprobada_cantidad);
        const button=document.createElement("button");button.className="secondary";button.textContent="Regularizada en BC";
        button.addEventListener("click",async()=>{
          button.disabled=true;
          const {error}=await client.rpc("kontrola_regularizar_incidencia",{p_incidencia:incident.id});
          if(error)global(errorText(error),"error");else{global("Regularización registrada; Business Central no fue modificado.","success");await refreshIncidents();}
          button.disabled=false;
        });
        row.append(text,button);group.appendChild(row);
      }
      target.appendChild(group);
    }
  }
  function selectAdminTab(index){
    for(const button of document.querySelectorAll("[data-admin-tab]")){
      const active=Number(button.dataset.adminTab)===index;
      button.classList.toggle("active",active);
      button.setAttribute("aria-selected",String(active));
      $("adminSection"+button.dataset.adminTab).hidden=!active;
    }
  }
  // Cada acceso inicia su acción de consulta; importar abre Archivos, nunca publica automáticamente.
  const adminActions=[
    ()=>{if(!busy)$("pdfInput").click();},
    ()=>Promise.all([refreshAttention(),refreshPendingPublish()]),
    ()=>printBatch.refresh(),
    ()=>operatorStats.refresh(),
    ()=>refreshIncidents(),
    ()=>{$("revisionCode").focus();},
    ()=>{},
    ()=>refreshSummary(),
    ()=>refreshArchivedLoads(),
    ()=>fixedPositions.refresh()
  ];
  for(const button of document.querySelectorAll("[data-admin-tab]"))button.addEventListener("click",async()=>{
    const index=Number(button.dataset.adminTab);
    selectAdminTab(index);
    try{await adminActions[index]();}catch(error){global(errorText(error),"error");}
  });
  async function changeArchive(archivar){
    const code=$("archiveCode").value.trim();
    const status=$("archiveStatus");
    const generation=archiveGeneration;
    if(!code){status.textContent="Introduce un código de carga.";return;}
    if(!window.confirm(archivar?"¿Archivar esta carga? No se eliminará.":"¿Restaurar esta carga al listado activo?"))return;
    const buttons=[$("archiveLoad"),$("restoreLoad")];buttons.forEach(b=>b.disabled=true);
    try{
      const {data,error}=await client.rpc("kontrola_cambiar_archivo",{p_codigo:code,p_archivar:archivar});
      if(generation!==archiveGeneration)return;
      if(error)throw error;
      status.textContent=data===false?"La carga ya estaba en ese estado.":archivar?"Carga archivada correctamente.":"Carga restaurada correctamente.";
      await refreshArchivedLoads();
    }catch(error){if(generation===archiveGeneration)status.textContent="No se ha realizado la operación: "+errorText(error);}
    finally{buttons.forEach(b=>b.disabled=false);}
  }
  $("archiveLoad").addEventListener("click",()=>changeArchive(true));
  $("restoreLoad").addEventListener("click",()=>changeArchive(false));
  async function refreshArchivedLoads(){
    const generation=archiveGeneration;
    const target=$("archivedLoadsList");target.textContent="Consultando cargas archivadas…";
    try{
      const {data,error}=await client.rpc("kontrola_listar_archivadas");
      if(generation!==archiveGeneration)return;
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      if(!rows.length){target.textContent="No hay cargas archivadas disponibles para este almacén.";return;}
      const table=document.createElement("table");const head=document.createElement("tr");
      for(const label of ["Código","Fecha","Almacén","Archivada el"]){const th=document.createElement("th");th.textContent=label;head.appendChild(th);}const thead=document.createElement("thead");thead.appendChild(head);table.appendChild(thead);
      const tbody=document.createElement("tbody");for(const row of rows){const tr=document.createElement("tr");for(const value of [row.codigo,row.fecha,row.almacen,row.archivado_en]){const td=document.createElement("td");td.textContent=value==null?"":String(value);tr.appendChild(td);}tbody.appendChild(tr);}table.appendChild(tbody);target.replaceChildren(table);
    }catch(error){if(generation===archiveGeneration)target.textContent="No se pudieron consultar las archivadas: "+errorText(error);}
  }
  $("refreshArchived").addEventListener("click",refreshArchivedLoads);
  async function open(){
    selectAdminTab(0);
    await Promise.all([refreshAttention(),refreshPendingPublish(),refreshReviewSelector(),refreshSummary(),refreshIncidents(),operatorStats.refresh(),printBatch.refresh()]);
  }
  function clearSensitive(){
    archiveGeneration++;
    draft=null;busy=false;
    $("archiveCode").value="";
    $("archiveStatus").textContent="";
    $("archivedLoadsList").replaceChildren();
    revisionControl.clear();operatorStats.clear();printBatch.clear();fixedPositions.clear();
    for(const id of ["documentReview","attentionList","adminSummary","adminActivity",
      "incidentList","reviewReadiness","reportPaper"]){
      const element=$(id);if(element)element.replaceChildren();
    }
    $("pdfInput").value="";
    $("importResultDetails").hidden=true;$("importResultList").replaceChildren();
    $("reportView").hidden=true;document.body.classList.remove("report-open");
    $("onedriveArchiveHelp").hidden=false;
    setStatus("");updateActions();
  }
  $("processPdf").addEventListener("click",processPdf);
  $("saveDocumentReview").addEventListener("click",saveReview);
  $("generateSheet").addEventListener("click",showReport);
  $("saveCompactA4Admin").addEventListener("click",saveAdminA4);
  $("printCor1Pack").addEventListener("click",printCor1Bundle);
  $("previewCor2Detail").addEventListener("click",showCor2Detail);
  $("goToBatchPrint").addEventListener("click",()=>{selectAdminTab(2);printBatch.refresh();});
  $("locationReport").addEventListener("click",showLocationReport);
  $("publishReviewedLoad").addEventListener("click",publish);
  $("adminWarehouse").addEventListener("change",()=>Promise.all([refreshAttention(),refreshPendingPublish(),refreshReviewSelector(),refreshSummary(),operatorStats.refresh(),printBatch.refresh()]));
  $("reloadAttention").addEventListener("click",()=>Promise.all([refreshAttention(),refreshPendingPublish(),refreshReviewSelector()]));
  $("reloadIncidents").addEventListener("click",refreshIncidents);
  // iOS 27 can silently ignore window.print() from a standalone installed PWA.
  $("printReport").addEventListener("click",async()=>{
    const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent||"")&&
      (navigator.standalone===true||window.matchMedia?.("(display-mode: standalone)")?.matches===true);
    if(!ios){window.print();return;}
    const button=$("printReport"),notice=$("reportPrintStatus");
    button.disabled=true;
    try{
      const bytes=generarPdfHojas(extraerHojasDeInforme($("reportPaper")));
      const file=new File([bytes],nombrePdfInforme($("reportTitle").textContent),{type:"application/pdf"});
      if(!navigator.share||typeof navigator.canShare==="function"&&!navigator.canShare({files:[file]})){
        notice.textContent="Este dispositivo no permite compartir el PDF desde la app. Abre VISURA PREPARA en Safari para imprimir.";
        return;
      }
      notice.textContent="PDF generado en el iPhone. Elige «Guardar en Archivos» y comprueba que la copia se ha guardado.";
      await navigator.share({files:[file],title:$("reportTitle").textContent});
    }catch(error){
      if(error?.name!=="AbortError"){
        notice.textContent="No se pudo compartir el PDF: "+errorText(error)+". Abre VISURA PREPARA en Safari para imprimir.";
      }
    }finally{button.disabled=false;}
  });
  $("downloadReport").addEventListener("click",()=>{
    const blob=new Blob([buildReportDownloadHtml($("reportTitle").textContent,$("printStyles").textContent,$("reportPaper").outerHTML)],{type:"text/html;charset=utf-8"});
    const safeName=$("reportTitle").textContent.replace(/[^A-Za-z0-9_-]+/g,"_");
    const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=(safeName||"kontrola")+".html";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
  $("closeReport").addEventListener("click",()=>{$("reportView").hidden=true;document.body.classList.remove("report-open");});
  return {open,refreshSummary,refreshAttention,clearSensitive,isBusy:()=>busy};
}
