import {buildPreparationReport} from "./report.mjs";
import {comprobarLoteActualizado} from "./archive-snapshot.mjs";
import {fechaAlmacen} from "./business-date.mjs";
import {filtrarCargasArchivo,validarPeriodoArchivo,nombreSugeridoArchivo,portadaLoteArchivo,MAX_HOJAS_ARCHIVO} from "./archive-period.mjs";

// Solo lectura; crea una vista imprimible a partir de las cargas autorizadas.
// No incluye los PDF originales ni publica/actualiza documentos.
const $=id=>document.getElementById(id);
export function configurarLoteImpresion({client,getUser,getWarehouse,errorText}){
  let rows=[],allRows=[],selected=new Set(),currentWarehouse="",currentSession=null,seq=0,nextGroupStart=0,previewing=false;
  const status=$("batchPrintStatus"),list=$("batchPrintList"),button=$("batchPrintOpen");
  function reset(){
    rows=[];allRows=[];selected.clear();nextGroupStart=0;list.replaceChildren();button.disabled=true;
    $("batchArchiveName").textContent="";
  }
  function render(){
    list.replaceChildren();
    const from=$("batchPrintFrom").value,to=$("batchPrintTo").value;
    try{rows=filtrarCargasArchivo(allRows,from,to);}
    catch(error){
      rows=[];selected.clear();button.disabled=true;
      status.textContent=error.message;return;
    }
    selected=new Set([...selected].filter(id=>rows.some(row=>row.codigo===id)));
    button.disabled=selected.size===0;
    $("batchArchiveName").textContent=!rows.length
      ?"No hay hojas para el periodo seleccionado."
      :!selected.size?"Selecciona las cargas para ver el nombre recomendado del PDF."
      :"Nombre sugerido para guardar el PDF: "+nombreSugeridoArchivo(
        currentWarehouse,from,to,fechaAlmacen(),[...selected]
      );
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
            currentWarehouse,$("batchPrintFrom").value,$("batchPrintTo").value,fechaAlmacen(),[...selected])
          :"Selecciona las cargas para ver el nombre recomendado del PDF.";
        status.textContent=selected.size+" hoja(s) seleccionada(s) de "+rows.length+".";
      });
      const info=document.createElement("span");
      const heading=document.createElement("b");heading.textContent=load.codigo||"Carga sin código";
      const detail=document.createElement("small");
      detail.textContent=[load.fecha,load.ruta,load.repartidor].filter(Boolean).join(" · ");
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
      allRows=(data||[]).filter(x=>x&&x.codigo&&Array.isArray(x.productos));
      render();
      status.textContent=rows.length+" carga(s) en el periodo seleccionado. Selecciona las hojas para guardar.";
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
    const from=$("batchPrintFrom").value,to=$("batchPrintTo").value;
    try{validarPeriodoArchivo(from,to);}catch(error){status.textContent=error.message;return;}
    previewing=true;button.disabled=true;
    status.textContent="Verificando en el servidor que las "+chosen.length+" cargas no han cambiado…";
    try{
      const {data,error}=await client.rpc("kontrola_panel_cargas",{p_almacen:warehouse});
      if(request!==seq||getUser()?.id!==session||getWarehouse()!==warehouse
        ||$("batchPrintFrom").value!==from||$("batchPrintTo").value!==to
        ||selected.size!==codes.length||codes.some(id=>!selected.has(id)))return;
      if(error)throw error;
      const verified=comprobarLoteActualizado(chosen,data||[],warehouse);
      const date=fechaAlmacen();
      const cover=portadaLoteArchivo(verified,{
        almacen:warehouse,desde:from,hasta:to,fechaGeneracion:date
      });
      $("reportPaper").innerHTML=cover+verified
        .map(row=>'<section class="report-batch-sheet">'+buildPreparationReport(row)+"</section>").join("");
      $("reportTitle").textContent="Lote verificado para archivo · "+verified.length+" hojas · "+warehouse;
      status.textContent="Lote comprobado contra el servidor. Usa «Imprimir / Guardar PDF» y después muévelo a OneDrive desde Archivos.";
      $("reportView").hidden=false;document.body.classList.add("report-open");
      window.scrollTo(0,0);
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
  for(const id of ["batchPrintFrom","batchPrintTo"]){
    $(id).addEventListener("change",()=>{
      if(allRows.length){
        nextGroupStart=0;render();
        status.textContent=rows.length+" carga(s) en el periodo seleccionado.";
      }
    });
  }
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
