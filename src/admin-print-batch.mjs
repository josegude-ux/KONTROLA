import {buildPreparationReport} from "./report.mjs";
import {fechaAlmacen} from "./business-date.mjs";
import {filtrarCargasArchivo,validarPeriodoArchivo,nombreSugeridoArchivo,portadaLoteArchivo} from "./archive-period.mjs";

// Solo lectura; crea una vista imprimible a partir de las cargas autorizadas.
// No incluye los PDF originales ni publica/actualiza documentos.
const $=id=>document.getElementById(id);
export function configurarLoteImpresion({client,getUser,getWarehouse,errorText}){
  let rows=[],allRows=[],selected=new Set(),currentWarehouse="",currentSession=null,seq=0;
  const status=$("batchPrintStatus"),list=$("batchPrintList"),button=$("batchPrintOpen");
  function reset(){
    rows=[];allRows=[];selected.clear();list.replaceChildren();button.disabled=true;
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
    $("batchArchiveName").textContent=rows.length
      ?"Nombre sugerido para guardar el PDF: "+nombreSugeridoArchivo(currentWarehouse,from,to,fechaAlmacen())
      :"No hay hojas para el periodo seleccionado.";
    for(const load of rows){
      const label=document.createElement("label");label.className="batch-print-row";
      const check=document.createElement("input");check.type="checkbox";
      check.checked=selected.has(load.codigo);
      check.addEventListener("change",()=>{
        if(check.checked&&selected.size>=10){
          check.checked=false;status.textContent="Puedes imprimir como máximo 10 hojas por lote.";return;
        }
        if(check.checked)selected.add(load.codigo);else selected.delete(load.codigo);
        button.disabled=selected.size===0;
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
  function preview(){
    if(!selected.size||!rows.length||getUser()?.id!==currentSession
      ||getWarehouse()!==currentWarehouse){
      status.textContent="Actualiza la lista antes de preparar la impresión.";return;
    }
    const chosen=rows.filter(row=>selected.has(row.codigo));
    if(!chosen.length||chosen.length>10){status.textContent="Elige entre 1 y 10 hojas.";return;}
    const from=$("batchPrintFrom").value,to=$("batchPrintTo").value;
    try{validarPeriodoArchivo(from,to);}catch(error){status.textContent=error.message;return;}
    const date=fechaAlmacen();
    const cover=portadaLoteArchivo(chosen,{almacen:currentWarehouse,desde:from,hasta:to,fechaGeneracion:date});
    $("reportPaper").innerHTML=cover+chosen
      .map(row=>'<section class="report-batch-sheet">'+buildPreparationReport(row)+"</section>").join("");
    $("reportTitle").textContent="Lote preparado para archivo · "+chosen.length+" hojas · "+currentWarehouse;
    status.textContent="Informe preparado. Usa «Imprimir / Guardar PDF» y después muévelo a OneDrive desde Archivos.";
    $("reportView").hidden=false;document.body.classList.add("report-open");
    window.scrollTo(0,0);
  }
  $("batchPrintRefresh").addEventListener("click",refresh);
  for(const id of ["batchPrintFrom","batchPrintTo"]){
    $(id).addEventListener("change",()=>{
      if(allRows.length){
        render();
        status.textContent=rows.length+" carga(s) en el periodo seleccionado.";
      }
    });
  }
  $("batchPrintSelectVisible").addEventListener("click",()=>{
    if(!rows.length){status.textContent="No hay hojas visibles para seleccionar.";return;}
    selected=new Set(rows.slice(0,10).map(row=>row.codigo));
    render();
    status.textContent=selected.size+" hoja(s) seleccionada(s)."+
      (rows.length>10?" Prepara otro lote para las "+(rows.length-10)+" restantes.":"");
  });
  button.addEventListener("click",preview);
  return {refresh,clear:()=>{
    seq++;reset();status.textContent="";currentWarehouse="";currentSession=null;
    $("batchPrintRefresh").disabled=false;
  }};
}
