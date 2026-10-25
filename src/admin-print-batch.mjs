import {buildPreparationReport} from "./report.mjs";

// Solo lectura; crea una vista imprimible a partir de las cargas autorizadas.
// No incluye los PDF originales ni publica/actualiza documentos.
const $=id=>document.getElementById(id);
export function configurarLoteImpresion({client,getUser,getWarehouse,errorText}){
  let rows=[],selected=new Set(),currentWarehouse="",currentSession=null,seq=0;
  const status=$("batchPrintStatus"),list=$("batchPrintList"),button=$("batchPrintOpen");
  function reset(){
    rows=[];selected.clear();list.replaceChildren();button.disabled=true;
  }
  function render(){
    list.replaceChildren();
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
      rows=(data||[]).filter(x=>x&&x.codigo&&Array.isArray(x.productos));
      status.textContent=rows.length+" carga(s) disponibles. Selecciona las hojas que necesites.";
      render();
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
    if(chosen.length>10){status.textContent="El lote supera 10 hojas.";return;}
    $("reportPaper").innerHTML=chosen
      .map(row=>'<section class="report-batch-sheet">'+buildPreparationReport(row)+"</section>").join("");
    $("reportTitle").textContent="Hojas procesadas · "+currentWarehouse+" · "+chosen.length+" cargas";
    $("reportView").hidden=false;document.body.classList.add("report-open");
    window.scrollTo(0,0);
  }
  $("batchPrintRefresh").addEventListener("click",refresh);
  button.addEventListener("click",preview);
  return {refresh};
}
