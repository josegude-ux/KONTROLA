import {buildPreparationReport} from "./report.mjs";
import {comprobarLoteActualizado} from "./archive-snapshot.mjs";
import {fechaAlmacen} from "./business-date.mjs";
import {nombreSugeridoArchivo,portadaLoteArchivo,MAX_HOJAS_ARCHIVO} from "./archive-period.mjs";
import {destinoAcreditado,ordenarCargasR7,seleccionarNuevasR7,totalMercanciaAcreditado} from "./visura-print-r7-core.mjs";

// Solo lectura; crea una vista imprimible a partir de las cargas autorizadas.
// No incluye los PDF originales ni publica/actualiza documentos.
const $=id=>document.getElementById(id);
export function configurarLoteImpresion({client,getUser,getWarehouse,errorText}){
  let rows=[],allRows=[],selected=new Set(),currentWarehouse="",currentSession=null,seq=0,nextGroupStart=0,previewing=false,printCounts=new Map(),reprintMode=false,searchTerm="";
  const status=$("batchPrintStatus"),list=$("batchPrintList"),button=$("batchPrintOpen");
  function reset(){
    rows=[];allRows=[];selected.clear();printCounts.clear();reprintMode=false;$("batchPrintReprint").checked=false;nextGroupStart=0;list.replaceChildren();button.disabled=true;
    $("batchArchiveName").textContent="";
    $("batchPrintSelectVisible").hidden=true;
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
    rows=ordenarCargasR7(rows);
    selected=new Set([...selected].filter(id=>rows.some(row=>row.codigo===id)));
    const todays=allRows.filter(row=>publicadaHoy(row,today));
    const generated=todays.filter(row=>(printCounts.get(row.codigo)||0)>0).length;
    $("batchPrintNewCount").textContent=String(todays.length-generated);
    $("batchPrintDoneCount").textContent=String(generated);
    $("batchPrintSelectionCount").textContent=String(selected.size);
    const visibleRows=rows.filter(row=>[row.codigo,row.matricula,row.repartidor,row.ruta]
      .some(value=>String(value??"").toLocaleLowerCase("es-ES").includes(searchTerm)));
    button.disabled=selected.size===0;
    $("batchArchiveName").textContent=!rows.length
      ?""
      :!selected.size?"Selecciona las cargas para ver el nombre recomendado del PDF."
      :"Nombre sugerido para guardar el PDF: "+nombreSugeridoArchivo(
        currentWarehouse,today,today,today,[...selected]
      );
    $("batchPrintSelectVisible").hidden=rows.length===0;
    $("batchPrintOpen").hidden=rows.length===0;
    $("batchPrintReprint").closest("label").hidden=!allRows.some(row=>publicadaHoy(row,today)&&(printCounts.get(row.codigo)||0)>0);
    if(!visibleRows.length){
      const empty=document.createElement("p");empty.className="vprint-empty";
      empty.textContent=searchTerm?"No hay cargas que coincidan con la búsqueda.":"No hay cargas en esta vista.";
      list.append(empty);
    }
    for(const load of visibleRows){
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
        $("batchPrintSelectionCount").textContent=String(selected.size);
        status.textContent=selected.size+" hoja(s) seleccionada(s) de "+rows.length+".";
      });
      const info=document.createElement("span");
      const title=document.createElement("span");title.className="vprint-row-title";
      const heading=document.createElement("b");heading.textContent=load.codigo||"Carga sin código";
      const badge=document.createElement("span");badge.className="vprint-tag"+(reprintMode?" reprint":"");
      badge.textContent=reprintMode?"Listado generado":"Nueva";
      title.append(heading,badge);
      const destino=destinoAcreditado(load),total=totalMercanciaAcreditado(load);
      const detail=document.createElement("small");
      detail.textContent=[
        load.matricula?"Matrícula: "+load.matricula:null,
        load.repartidor,load.fecha,
        load.peso_kg!=null?"Peso: "+Number(load.peso_kg).toLocaleString("es-ES")+" kg":null,
        destino?"Destino: "+destino:null,
        destino==="FERROL"&&total!==null?"TOTAL: "+total.toLocaleString("es-ES"):null,
        reprintMode?"Generaciones anteriores: "+printCounts.get(load.codigo):null
      ].filter(Boolean).join(" · ");
      info.append(title,detail);label.append(check,info);list.append(label);
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
      const today=fechaAlmacen();
      selected=new Set(seleccionarNuevasR7(
        ordenarCargasR7(allRows.filter(row=>publicadaHoy(row,today))),printCounts,MAX_HOJAS_ARCHIVO));
      render();
      status.textContent=rows.length?
        selected.size+" carga(s) nuevas seleccionadas automáticamente. «Generado» no confirma impresión física.":
        "No hay cargas nuevas publicadas hoy. Activa la reimpresión si necesitas recuperar una anterior.";
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
      // Componer el documento completo ANTES de registrar la generación en el servidor.
      const html=cover+verified.map(row=>'<section class="report-batch-sheet">'+buildPreparationReport(row)+"</section>").join("");
      if(!html.includes('class="preparation-report"'))throw Error("No se han generado hojas de carga.");
      const {error:registerError}=await client.rpc("kontrola_registrar_lote_impresion",{p_almacen:warehouse,p_codigos:codes,p_reimprimir:reprintMode});
      if(registerError)throw registerError;
      if(request!==seq||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      $("reportPaper").innerHTML=html;
      $("batchDuplexSave").hidden=false;
      $("reportTitle").textContent="Lote verificado para archivo · "+verified.length+" hojas · "+warehouse;
      status.textContent="Generación registrada y compartida entre ordenadores. Para doble cara utiliza «Guardar PDF dúplex por LP». La impresión física no está confirmada.";
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
  $("batchPrintSearch").addEventListener("input",event=>{
    searchTerm=String(event.target.value||"").toLocaleLowerCase("es-ES").trim();render();
  });
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
