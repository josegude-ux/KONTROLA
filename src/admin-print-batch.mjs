import {buildPreparationReport} from "./report.mjs";
import {comprobarLoteActualizado} from "./archive-snapshot.mjs";
import {fechaAlmacen} from "./business-date.mjs";
import {filtrarCargasArchivo,nombreSugeridoArchivo,portadaLoteArchivo,MAX_HOJAS_ARCHIVO} from "./archive-period.mjs";

// Solo lectura; crea una vista imprimible a partir de las cargas autorizadas.
// No incluye los PDF originales ni publica/actualiza documentos.
const $=id=>document.getElementById(id);
export function configurarLoteImpresion({client,getUser,getWarehouse,errorText}){
  let rows=[],allRows=[],selected=new Set(),currentWarehouse="",currentSession=null,seq=0,nextGroupStart=0,previewing=false,printCounts=new Map(),reprintMode=false;
  const status=$("batchPrintStatus"),list=$("batchPrintList"),button=$("batchPrintOpen");
  function reset(){
    rows=[];allRows=[];selected.clear();printCounts.clear();reprintMode=false;$("batchPrintReprint").checked=false;nextGroupStart=0;list.replaceChildren();button.disabled=true;
    $("batchArchiveName").textContent="";
    $("batchPrintSelectVisible").hidden=true;
    $("batchPrintOpen").hidden=true;
    $("batchPrintReprint").closest("label").hidden=true;
  }
  function render(){
    list.replaceChildren();
    const today=fechaAlmacen();
    try{rows=filtrarCargasArchivo(allRows,today,today).filter(row=>reprintMode?(printCounts.get(row.codigo)||0)>0:!(printCounts.get(row.codigo)||0));}
    catch(error){
      rows=[];selected.clear();button.disabled=true;
      status.textContent=error.message;return;
    }
    selected=new Set([...selected].filter(id=>rows.some(row=>row.codigo===id)));
    button.disabled=selected.size===0;
    $("batchArchiveName").textContent=!rows.length
      ?""
      :!selected.size?"Selecciona las cargas para ver el nombre recomendado del PDF."
      :"Nombre sugerido para guardar el PDF: "+nombreSugeridoArchivo(
        currentWarehouse,today,today,today,[...selected]
      );
    $("batchPrintSelectVisible").hidden=rows.length===0;
    $("batchPrintOpen").hidden=rows.length===0;
    $("batchPrintReprint").closest("label").hidden=rows.length===0&&!reprintMode;
    for(const load of rows){
      const label=document.createElement("label");label.className="batch-print-row";
      const check=document.createElement("input");check.type="checkbox";
      check.checked=selected.has(load.codigo);
      check.addEventListener("change",()=>{
        if(check.checked&&selected.size>=MAX_HOJAS_ARCHIVO){
          check.checked=false;status.textContent="Puedes imprimir como máximo "+MAX_HOJAS_ARCHIVO+" hojas por lote.";return;
        }
        if(check.checked)selected.add(load.codigo);else selected.delete(load.codigo);
        button.disabled=selected.size===0;
        $("batchArchiveName").textContent=selected.size
          ?"Nombre sugerido para guardar el PDF: "+nombreSugeridoArchivo(
            currentWarehouse,fechaAlmacen(),fechaAlmacen(),fechaAlmacen(),[...selected])
          :"Selecciona las cargas para ver el nombre recomendado del PDF.";
        status.textContent=selected.size+" hoja(s) seleccionada(s) de "+rows.length+".";
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
      const {data,error}=await client.rpc("kontrola_panel_cargas",{p_almacen:warehouse});
      if(req!==seq||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      if(error)throw error;
      const {data:prints,error:printError}=await client.rpc("kontrola_estado_impresion",{p_almacen:warehouse});
      if(printError)throw printError;
      if(req!==seq||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      printCounts=new Map((prints||[]).map(x=>[x.codigo,Number(x.intentos)]));
      allRows=(data||[]).filter(x=>x&&x.codigo&&Array.isArray(x.productos));
      render();
      status.textContent=rows.length?rows.length+" carga(s) de hoy disponibles para impresión.":"No hay cargas publicadas de hoy disponibles para imprimir. Las importaciones pendientes de revisión no aparecen aquí.";
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
      const {data,error}=await client.rpc("kontrola_panel_cargas",{p_almacen:warehouse});
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
      if(request===seq)button.disabled=selected.size===0;
    }
  }
  $("batchPrintRefresh").addEventListener("click",refresh);
  $("batchPrintReprint").addEventListener("change",event=>{reprintMode=event.target.checked;selected.clear();nextGroupStart=0;render();status.textContent=reprintMode?"Reimpresión: elige cargas ya generadas.":"Impresión normal: solo cargas sin generar.";});
  $("batchPrintSelectVisible").addEventListener("click",()=>{
    if(!rows.length){status.textContent="No hay hojas visibles para seleccionar.";return;}
    // Cada pulsación avanza al siguiente grupo. No se considera archivado.
    if(nextGroupStart>=rows.length)nextGroupStart=0;
    const start=nextGroupStart;
    selected=new Set(rows.slice(start,start+MAX_HOJAS_ARCHIVO).map(row=>row.codigo));
    nextGroupStart=Math.min(rows.length,start+MAX_HOJAS_ARCHIVO);
    render();
    const totalGroups=Math.ceil(rows.length/MAX_HOJAS_ARCHIVO);
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
