import {buildPreparationReport} from "./report.mjs";
import {filtrarFilasImpresion,seleccionarTodasImpresion,marcarVisiblesImpresion,conciliarSeleccionImpresion,evaluarLoteImpresion} from "./batch-selection-v056.mjs";
import {comprobarLoteActualizado} from "./archive-snapshot.mjs";
import {fechaAlmacen} from "./business-date.mjs";
import {nombreSugeridoArchivo,portadaLoteArchivo,MAX_HOJAS_ARCHIVO} from "./archive-period.mjs";

// Solo lectura; crea una vista imprimible a partir de las cargas autorizadas.
// No incluye los PDF originales ni publica/actualiza documentos.
const $=id=>document.getElementById(id);
export function configurarLoteImpresion({client,getUser,getWarehouse,errorText}){
  let rows=[],allRows=[],selected=new Set(),currentWarehouse="",currentSession=null,seq=0,nextGroupStart=0,previewing=false,printCounts=new Map(),reprintMode=false,searchTerm="";
  const status=$("batchPrintStatus"),list=$("batchPrintList"),button=$("batchPrintOpen");
  function reset(){
    rows=[];allRows=[];selected.clear();printCounts.clear();reprintMode=false;searchTerm="";$("batchPrintSearch").value="";$("batchPrintReprint").checked=false;nextGroupStart=0;list.replaceChildren();button.disabled=true;
    $("batchArchiveName").textContent="";
    $("batchPrintSelectVisible").hidden=true;
    for(const id of ["batchPrintSelectAll","batchPrintMarkVisible","batchPrintClear"])$(id).hidden=true;
    $("batchPrintOpen").hidden=true;
    $("batchPrintReprint").closest("label").hidden=true;
  }
  // Fecha operativa: publicación en Madrid, nunca la fecha documental de BC.
  const publicadaHoy=(row,today)=>row.estado==="publicada"&&row.publicado_en&&
    new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(row.publicado_en))===today;
  function render(){
    list.replaceChildren();
    const today=fechaAlmacen();
    try{rows=allRows.filter(row=>publicadaHoy(row,today)).filter(row=>reprintMode?(printCounts.get(row.codigo)||0)>0:!(printCounts.get(row.codigo)||0));}
    catch(error){
      rows=[];selected.clear();button.disabled=true;
      status.textContent=error.message;return;
    }
    selected=conciliarSeleccionImpresion(selected,rows);
    const visibleRows=filtrarFilasImpresion(rows,searchTerm);
    const estado=evaluarLoteImpresion(selected,MAX_HOJAS_ARCHIVO);
    button.disabled=!estado.puedePreparar;
    button.textContent="Preparar impresión de hojas seleccionadas ("+estado.cantidad+")";
    $("batchArchiveName").textContent=!rows.length
      ?""
      :!estado.cantidad?"Selecciona las cargas para ver el nombre recomendado del PDF."
      :estado.superaLimite
        ?"Seleccionadas "+estado.cantidad+" cargas. El servidor permite "+MAX_HOJAS_ARCHIVO+
          " por lote: usa «Siguiente grupo» o desmarca hasta el límite. No se imprimirá un lote incompleto."
        :"Nombre sugerido para guardar el PDF: "+nombreSugeridoArchivo(
          currentWarehouse,today,today,today,[...selected]
        );
    for(const id of ["batchPrintSelectAll","batchPrintMarkVisible","batchPrintClear"])$(id).hidden=rows.length===0;
    $("batchPrintSelectVisible").hidden=rows.length===0;
    $("batchPrintOpen").hidden=rows.length===0;
    $("batchPrintReprint").closest("label").hidden=!allRows.some(row=>publicadaHoy(row,today)&&(printCounts.get(row.codigo)||0)>0);
    for(const load of visibleRows){
      const label=document.createElement("label");label.className="batch-print-row";
      const check=document.createElement("input");check.type="checkbox";
      check.checked=selected.has(load.codigo);
      check.addEventListener("change",()=>{
        if(check.checked)selected.add(load.codigo);else selected.delete(load.codigo);
        render();
        status.textContent=selected.size+" seleccionada(s) de "+rows.length+
          (selected.size>MAX_HOJAS_ARCHIVO?" · Máximo "+MAX_HOJAS_ARCHIVO+" por lote; usa «Siguiente grupo».":"")+".";
      });
      const info=document.createElement("span");
      const heading=document.createElement("b");heading.textContent=load.codigo||"Carga sin código";
      const detail=document.createElement("small");
      detail.textContent=[load.fecha,load.ruta,load.repartidor,reprintMode?"Intentos anteriores: "+printCounts.get(load.codigo):""].filter(Boolean).join(" · ");
      info.append(heading,detail);label.append(check,info);list.append(label);
    }
  }
  async function refresh(){
    const warehouse=getWarehouse(),session=getUser()?.id,req=++seq;
    reset();currentWarehouse=warehouse;currentSession=session;
    if(!warehouse||!session){status.textContent="Selecciona almacén e inicia sesión.";return;}
    $("batchPrintRefresh").disabled=true;status.textContent="Consultando hojas procesadas…";
    try{
      const {data,error}=await client.rpc("kontrola_panel_cargas_impresion",{p_almacen:warehouse});
      if(req!==seq||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      if(error)throw error;
      const {data:prints,error:printError}=await client.rpc("kontrola_estado_impresion",{p_almacen:warehouse});
      if(printError)throw printError;
      if(req!==seq||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      printCounts=new Map((prints||[]).map(x=>[x.codigo,Number(x.intentos)]));
      allRows=(data||[]).filter(x=>x&&x.codigo&&Array.isArray(x.productos));
      render();
      status.textContent=rows.length?rows.length+" carga(s) publicadas hoy disponibles para impresión.":"No hay cargas publicadas hoy disponibles para imprimir. Las importaciones pendientes de revisión no aparecen aquí.";
    }catch(error){
      if(req!==seq||getUser()?.id!==session)return;
      reset();status.textContent="No se pudieron consultar las cargas: "+errorText(error);
    }finally{
      if(req===seq)$("batchPrintRefresh").disabled=false;
    }
  }
  async function preview(){
    if(previewing)return;
    if(!selected.size||!rows.length||getUser()?.id!==currentSession
      ||getWarehouse()!==currentWarehouse){
      status.textContent="Actualiza la lista antes de preparar la impresión.";return;
    }
    const warehouse=currentWarehouse,session=currentSession,request=seq;
    const codes=[...selected],chosen=rows.filter(row=>selected.has(row.codigo));
    if(chosen.length!==codes.length||!chosen.length||chosen.length>MAX_HOJAS_ARCHIVO){
      status.textContent="Elige entre 1 y "+MAX_HOJAS_ARCHIVO+" hojas válidas.";return;
    }
    const today=fechaAlmacen();
    previewing=true;button.disabled=true;
    status.textContent="Verificando en el servidor que las "+chosen.length+" cargas no han cambiado…";
    try{
      const {data,error}=await client.rpc("kontrola_panel_cargas_impresion",{p_almacen:warehouse});
      if(request!==seq||getUser()?.id!==session||getWarehouse()!==warehouse
        ||fechaAlmacen()!==today
        ||selected.size!==codes.length||codes.some(id=>!selected.has(id)))return;
      if(error)throw error;
      const verified=comprobarLoteActualizado(chosen,data||[],warehouse);
      const date=fechaAlmacen();
      const cover=portadaLoteArchivo(verified,{
        almacen:warehouse,desde:today,hasta:today,fechaGeneracion:date
      });
      const {error:registerError}=await client.rpc("kontrola_registrar_lote_impresion",{p_almacen:warehouse,p_codigos:codes,p_reimprimir:reprintMode});
      if(registerError)throw registerError;
      if(request!==seq||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      $("reportPaper").innerHTML=cover+verified
        .map(row=>'<section class="report-batch-sheet">'+buildPreparationReport(row)+"</section>").join("");
      $("reportTitle").textContent="Lote verificado para archivo · "+verified.length+" hojas · "+warehouse;
      status.textContent="Generación registrada. Usa «Imprimir / Guardar PDF». Si falla, activa Reimprimir para repetir sin duplicar la carga.";
      $("reportView").hidden=false;document.body.classList.add("report-open");
      window.scrollTo(0,0);
      await refresh();
    }catch(error){
      if(request!==seq||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      $("reportPaper").replaceChildren();
      selected.clear();
      render();
      status.textContent="No se ha generado el PDF: "+errorText(error)+
        " Pulsa Actualizar y selecciona de nuevo las cargas.";
    }finally{
      previewing=false;
      if(request===seq)button.disabled=!evaluarLoteImpresion(selected,MAX_HOJAS_ARCHIVO).puedePreparar;
    }
  }
  $("batchPrintRefresh").addEventListener("click",refresh);
  $("batchPrintReprint").addEventListener("change",event=>{reprintMode=event.target.checked;selected.clear();nextGroupStart=0;render();status.textContent=reprintMode?"Reimpresión: elige cargas ya generadas.":"Impresión normal: solo cargas sin generar.";});
  $("batchPrintSearch").addEventListener("input",event=>{
    searchTerm=event.target.value;nextGroupStart=0;render();
    status.textContent=filtrarFilasImpresion(rows,searchTerm).length+" carga(s) visibles; "+selected.size+
      " seleccionada(s) en total. La búsqueda no desmarca cargas ocultas.";
  });
  $("batchPrintSelectAll").addEventListener("click",()=>{
    selected=seleccionarTodasImpresion(rows);render();
    status.textContent=selected.size+" cargas seleccionadas del almacén. "+
      (selected.size>MAX_HOJAS_ARCHIVO?"Para imprimir, elige grupos de hasta "+MAX_HOJAS_ARCHIVO+
       " o desmarca las sobrantes. No se trunca la selección.":"Puedes preparar el lote.");
  });
  $("batchPrintMarkVisible").addEventListener("click",()=>{
    selected=marcarVisiblesImpresion(selected,filtrarFilasImpresion(rows,searchTerm));render();
    status.textContent=selected.size+" cargas seleccionadas, incluidas las marcadas previamente fuera del filtro."+
      (selected.size>MAX_HOJAS_ARCHIVO?" Usa «Siguiente grupo» para imprimir en bloques de hasta "+MAX_HOJAS_ARCHIVO+".":"");
  });
  $("batchPrintClear").addEventListener("click",()=>{
    selected.clear();render();status.textContent="Selección desmarcada. No se han modificado las cargas.";
  });
  $("batchPrintSelectVisible").addEventListener("click",()=>{
    const visibles=filtrarFilasImpresion(rows,searchTerm);
    if(!visibles.length){status.textContent="No hay hojas visibles para seleccionar.";return;}
    // Cada pulsación avanza al siguiente grupo del filtro. No se considera archivado.
    if(nextGroupStart>=visibles.length)nextGroupStart=0;
    const start=nextGroupStart;
    selected=seleccionarTodasImpresion(visibles.slice(start,start+MAX_HOJAS_ARCHIVO));
    nextGroupStart=Math.min(visibles.length,start+MAX_HOJAS_ARCHIVO);
    render();
    const totalGroups=Math.ceil(visibles.length/MAX_HOJAS_ARCHIVO);
    const group=Math.floor(start/MAX_HOJAS_ARCHIVO)+1;
    status.textContent="Grupo "+group+" de "+totalGroups+": "+selected.size+
      " hoja(s) seleccionada(s). Genera y guarda este PDF antes de pasar al siguiente grupo.";
  });
  button.addEventListener("click",preview);
  return {refresh,clear:()=>{
    seq++;reset();status.textContent="";currentWarehouse="";currentSession=null;
    $("batchPrintRefresh").disabled=false;
  }};
}
