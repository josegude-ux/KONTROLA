import {analyzeDocument,applyLineCorrection,publicationReadiness,warehouseZone} from "./document-review.mjs";
import {fechaISO} from "./logic.mjs";
import {parsePdfFile} from "./pdf.mjs";
import {buildPreparationReport} from "./report.mjs";

const $=id=>document.getElementById(id);
const fmt=value=>value==null?"—":Number(value).toLocaleString("es-ES",{maximumFractionDigits:3});
const hashFile=async file=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()))]
  .map(value=>value.toString(16).padStart(2,"0")).join("");
const asPayload=parsed=>({
  codigo:parsed.id,fecha:fechaISO(parsed.date),matricula:parsed.plate||null,ruta:parsed.route||null,
  repartidor:parsed.driver||null,peso_kg:parsed.weight??null,referencias:parsed.refs??null,
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
  let busy=false,draft=null;
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
  async function processPdf(){
    if(busy)return;
    const file=$("pdfInput").files?.[0];
    if(!file)return setStatus("Selecciona un PDF.","error");
    if(!/\.pdf$/i.test(file.name)||file.type&&file.type!=="application/pdf")return setStatus("El archivo debe ser PDF.","error");
    if(file.size>25*1024*1024)return setStatus("El PDF supera 25 MB.","error");
    setBusy(true);
    try{
      setStatus("Procesando el documento con el motor de Control de Cargas…");
      const parsed=await parsePdfFile(file);
      const hash=await hashFile(file);
      const findings=analyzeDocument(parsed);
      const {data,error}=await client.rpc("kontrola_reservar_importacion",{
        p_codigo:parsed.id,p_hash:hash,p_archivo:file.name,p_tamano:file.size
      });
      if(error)throw error;
      const reservation=Array.isArray(data)?data[0]:data;
      if(reservation?.repetida){
        if(reservation.estado==="reservada"){
          setStatus("Recuperando la importación interrumpida…");
          await persistParsedImport(reservation,file,parsed,findings,hash);
          return;
        }
        setStatus("Este documento ya fue importado. Se conserva la importación existente ("+reservation.estado+").","success");
        await loadImport(reservation.id);
        return;
      }
      await persistParsedImport(reservation,file,parsed,findings,hash);
    }catch(error){
      setStatus("No se pudo completar la importación: "+errorText(error),"error");
    }finally{setBusy(false);}
  }
  async function loadImport(id){
    const {data,error}=await client.from("kontrola_importaciones")
      .select("id,documento_hash,documento_ruta,estado,carga_datos,hallazgos,correcciones,advertencias_confirmadas")
      .eq("id",id).single();
    if(error)throw error;
    if(!data.carga_datos)return setStatus("La importación está reservada pero todavía no fue procesada.","error");
    const payload=data.carga_datos;
    draft={
      id:data.id,hash:data.documento_hash,path:data.documento_ruta,state:data.estado,
      parsed:{
        id:payload.codigo,date:payload.fecha,plate:payload.matricula,route:payload.ruta,driver:payload.repartidor,
        weight:payload.peso_kg,refs:payload.referencias,warehouse:payload.almacen,products:payload.productos,
        declaredTotal:payload.declared_total,actualTotal:payload.actual_total,
        verified:payload.parser_metadata?.verified,warnings:payload.parser_metadata?.warnings||[],
        mixedWarehouse:payload.parser_metadata?.mixed_warehouse,
        availableWarehouses:payload.parser_metadata?.available_warehouses||[],
        corrections:data.correcciones||[]
      },
      findings:data.hallazgos||[],acknowledged:data.advertencias_confirmadas?(data.hallazgos||[]).filter(item=>item.severity==="warning").map(item=>item.id):[]
    };
    renderDraft();
  }
  function renderDraft(){
    const root=$("documentReview");root.replaceChildren();
    if(!draft){root.textContent="Procesa un PDF para iniciar la revisión.";return;}
    const zone=warehouseZone(draft.parsed.warehouse);
    const heading=document.createElement("div");heading.className="review-heading";
    const title=document.createElement("h3");title.textContent=draft.parsed.id+" · "+zone.label;
    const state=document.createElement("span");state.className="state-badge";state.textContent=draft.state;
    const warehouse=document.createElement("select");warehouse.className="warehouse-select";warehouse.setAttribute("aria-label","Clasificar almacén");
    for(const [value,label] of [["","Pendiente de clasificar"],["COR_01_COR","A Coruña"],["COR_02_NAR","Ferrol"]]){
      const option=document.createElement("option");option.value=value;option.textContent=label;warehouse.appendChild(option);
    }
    warehouse.value=zone.known?zone.code:"";
    warehouse.addEventListener("change",async()=>{
      const before=draft.parsed.warehouse||"";
      try{
        const file=await downloadDraftFile();
        const reparsed=await parsePdfFile(file,{warehouse:warehouse.value});
        const next={
          ...reparsed,
          products:draft.parsed.products,
          actualTotal:draft.parsed.actualTotal,
          corrections:draft.parsed.corrections||[]
        };
        next.corrections=[...(draft.parsed.corrections||[]),{line:null,field:"warehouse",before,after:warehouse.value,by:getUser().id,at:new Date().toISOString()}];
        draft.parsed=next;draft.findings=analyzeDocument(next);draft.state="revision_requerida";renderDraft();
      }catch(error){setStatus("No se pudo reclasificar: "+errorText(error),"error");}
    });
    heading.append(title,warehouse,state);root.appendChild(heading);
    const findings=document.createElement("div");findings.className="findings";
    if(!draft.findings.length){const ok=document.createElement("p");ok.className="status success";ok.textContent="Sin hallazgos.";findings.appendChild(ok);}
    for(const item of draft.findings){
      const row=document.createElement("label");row.className="finding "+item.severity;
      const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.disabled=item.severity==="error";
      checkbox.checked=draft.acknowledged.includes(item.id);
      checkbox.addEventListener("change",()=>{
        draft.acknowledged=checkbox.checked?[...new Set([...draft.acknowledged,item.id])]:draft.acknowledged.filter(id=>id!==item.id);
        updateActions();
      });
      const text=document.createElement("span");text.textContent=(item.line?"Línea "+item.line+" · ":"")+item.message+(item.context?" · "+item.context:"");
      row.append(checkbox,text);findings.appendChild(row);
    }
    root.appendChild(findings);
    const table=document.createElement("div");table.className="review-lines";
    draft.parsed.products.forEach((product,index)=>{
      const line=document.createElement("article");line.className="review-line";
      const code=document.createElement("b");code.textContent=(index+1)+" · "+product.sku;
      line.appendChild(code);
      for(const [field,label,type] of [["description","Descripción","text"],["location","Ubicación","text"],["qty","Cantidad","number"],["unit","Unidad","text"]]){
        const wrapper=document.createElement("label");wrapper.textContent=label;
        const input=document.createElement("input");input.type=type;input.value=product[field]??"";
        if(type==="number"){input.min="0";input.step="0.001";input.inputMode="decimal";}
        input.addEventListener("change",()=>{
          try{
            draft.parsed=applyLineCorrection(draft.parsed,index+1,{[field]:input.value},getUser().id);
            draft.findings=analyzeDocument(draft.parsed);draft.state="revision_requerida";renderDraft();
          }catch(error){setStatus(errorText(error),"error");}
        });
        wrapper.appendChild(input);line.appendChild(wrapper);
      }
      table.appendChild(line);
    });
    root.appendChild(table);updateActions();
  }
  function updateActions(){
    const readiness=draft?publicationReadiness(draft.findings,draft.acknowledged):{ready:false};
    $("saveDocumentReview").disabled=busy||!draft;
    $("generateSheet").disabled=busy||!draft;
    $("publishReviewedLoad").disabled=busy||!draft||draft.state!=="aprobada"||!readiness.ready;
    $("reviewReadiness").textContent=!draft?"":readiness.ready?"Documento listo para aprobar y publicar.":readiness.errors?.length
      ?readiness.errors.length+" error(es) bloqueante(s).":"Confirma todas las advertencias para continuar.";
  }
  async function saveReview(){
    if(busy||!draft)return;
    const readiness=publicationReadiness(draft.findings,draft.acknowledged);
    const warnings=draft.findings.filter(item=>item.severity==="warning");
    const confirmed=warnings.every(item=>draft.acknowledged.includes(item.id));
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
  function showReport(){
    if(!draft)return;
    $("reportPaper").innerHTML=buildPreparationReport(asPayload(draft.parsed));
    $("reportTitle").textContent="Hoja procesada · "+draft.parsed.id;
    $("reportView").hidden=false;document.body.classList.add("report-open");window.scrollTo(0,0);
  }
  async function publish(){
    if(busy||!draft)return;
    setBusy(true);
    try{
      const {data,error}=await client.rpc("kontrola_publicar_importacion",{p_importacion:draft.id});
      if(error)throw error;
      const result=Array.isArray(data)?data[0]:data;
      draft.state="publicada";renderDraft();
      setStatus("Carga "+result.codigo+" publicada en "+result.almacen+".","success");
      await Promise.all([refreshAttention(),refreshSummary()]);
      onPublished?.();
    }catch(error){setStatus("No se pudo publicar: "+errorText(error),"error");}
    finally{setBusy(false);updateActions();}
  }
  async function refreshAttention(){
    const {data,error}=await client.rpc("kontrola_necesitan_atencion",{p_almacen:$("adminWarehouse").value||null});
    const target=$("attentionList");target.replaceChildren();
    if(error){target.textContent=errorText(error);return;}
    if(!data?.length){target.textContent="No hay elementos pendientes.";return;}
    for(const item of data){
      const button=document.createElement("button");button.type="button";button.className="attention-card";
      const title=document.createElement("b");title.textContent=item.titulo+" · "+(item.codigo||"");
      const detail=document.createElement("span");detail.textContent=item.detalle;button.append(title,detail);
      if(item.tipo==="importacion")button.addEventListener("click",()=>loadImport(item.entidad_id).catch(error=>setStatus(errorText(error),"error")));
      target.appendChild(button);
    }
  }
  async function refreshSummary(){
    const warehouse=$("adminWarehouse").value;
    if(!warehouse)return;
    const [{data:summary,error},{data:activity,error:activityError}]=await Promise.all([
      client.rpc("kontrola_resumen_zona",{p_almacen:warehouse,p_dia:new Date().toISOString().slice(0,10)}),
      client.from("kontrola_actividad").select("tipo,creado_en,detalle,codigo,actor_id").eq("almacen",warehouse).order("creado_en",{ascending:false}).limit(50)
    ]);
    if(error)global(errorText(error),"error");
    const values=Array.isArray(summary)?summary[0]:summary;
    const target=$("adminSummary");target.replaceChildren();
    for(const [label,key] of [["Publicadas","publicadas"],["En preparación","en_preparacion"],["Pendientes verificación","pendientes_verificacion"],["En verificación","en_verificacion"],["Cerradas","cerradas"],["Incidencias","incidencias_pendientes"],["Días anteriores","anteriores_pendientes"]]){
      const card=document.createElement("div");card.className="fact";card.innerHTML="<small>"+label+"</small><b>"+Number(values?.[key]||0)+"</b>";target.appendChild(card);
    }
    const log=$("adminActivity");log.replaceChildren();
    if(activityError){log.textContent=errorText(activityError);return;}
    for(const event of activity||[]){
      const row=document.createElement("p");row.textContent=new Date(event.creado_en).toLocaleString("es-ES")+" · "+event.tipo+" · "+(event.codigo||"");log.appendChild(row);
    }
  }
  async function refreshIncidents(){
    const target=$("incidentList");target.textContent="Consultando incidencias…";
    const {data,error}=await client.rpc("kontrola_incidencias_pendientes");
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
  async function open(){
    await Promise.all([refreshAttention(),refreshSummary(),refreshIncidents()]);
  }
  $("processPdf").addEventListener("click",processPdf);
  $("saveDocumentReview").addEventListener("click",saveReview);
  $("generateSheet").addEventListener("click",showReport);
  $("publishReviewedLoad").addEventListener("click",publish);
  $("adminWarehouse").addEventListener("change",()=>Promise.all([refreshAttention(),refreshSummary()]));
  $("reloadAttention").addEventListener("click",refreshAttention);
  $("reloadIncidents").addEventListener("click",refreshIncidents);
  $("printReport").addEventListener("click",()=>window.print());
  $("downloadReport").addEventListener("click",()=>{
    const blob=new Blob([buildReportDownloadHtml($("reportTitle").textContent,$("printStyles").textContent,$("reportPaper").outerHTML)],{type:"text/html;charset=utf-8"});
    const safeName=$("reportTitle").textContent.replace(/[^A-Za-z0-9_-]+/g,"_");
    const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=(safeName||"kontrola")+".html";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
  $("closeReport").addEventListener("click",()=>{$("reportView").hidden=true;document.body.classList.remove("report-open");});
  return {open,refreshSummary,refreshAttention};
}
