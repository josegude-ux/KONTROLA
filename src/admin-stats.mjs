import {fechaAlmacen} from "./business-date.mjs";

// Estadísticas estrictamente de lectura. La RPC exige rol administrativo.
const $=id=>document.getElementById(id);
const dom=(tag,value,className="")=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  el.textContent=String(value??"");
  return el;
};
export function duracionOperario(seconds){
  const secs=Math.max(0,Math.floor(Number(seconds)||0));
  const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60);
  return h+" h "+String(m).padStart(2,"0")+" min";
}
export function configurarEstadisticasOperarios({client,getUser,errorText,getWarehouse}){
  let requestId=0;
  const date=$("operatorStatsDate"),status=$("operatorStatsStatus"),root=$("operatorStatsList");
  date.value=fechaAlmacen();
  function clear(){root.replaceChildren();}
  async function refresh(){
    const warehouse=getWarehouse(),day=date.value,session=getUser()?.id,request=++requestId;
    clear();
    if(!session||!warehouse||!/^\d{4}-\d{2}-\d{2}$/.test(day)){
      status.textContent="Selecciona un almacén y una fecha válidos.";return;
    }
    $("operatorStatsRefresh").disabled=true;
    status.textContent="Consultando estadísticas autorizadas…";
    try{
      const {data,error}=await client.rpc("kontrola_estadisticas_operarios",{p_almacen:warehouse,p_dia:day});
      if(request!==requestId||getUser()?.id!==session||getWarehouse()!==warehouse||date.value!==day)return;
      if(error)throw error;
      clear();
      if(!data?.length){status.textContent="No hay operaciones iniciadas ese día en este almacén.";return;}
      status.textContent=data.length+" operario(s) con actividad registrada el "+day+".";
      const table=document.createElement("table");table.className="operator-stats-table";
      const header=document.createElement("thead"),tr=document.createElement("tr");
      for(const value of ["Operario","Preparaciones","Verificaciones","Tiempo prep.","Tiempo ver.","Abiertas"]){
        tr.appendChild(dom("th",value));
      }
      header.append(tr);table.append(header);
      const body=document.createElement("tbody");
      for(const entry of data){
        const row=document.createElement("tr");
        const fields=[
          entry.nombre||"Sin nombre",entry.preparaciones||0,entry.verificaciones||0,
          duracionOperario(entry.segundos_preparacion),duracionOperario(entry.segundos_verificacion),
          (Number(entry.preparaciones_abiertas)||0)+(Number(entry.verificaciones_abiertas)||0)
        ];
        for(const field of fields)row.appendChild(dom("td",field));
        body.appendChild(row);
      }
      table.appendChild(body);
      const wrap=document.createElement("div");wrap.className="operator-stats-scroll";wrap.append(table);
      root.appendChild(wrap);
      root.appendChild(dom("p","Los tiempos solo incluyen operaciones finalizadas; las abiertas se muestran aparte.","hint"));
    }catch(error){
      if(request!==requestId||getUser()?.id!==session)return;
      clear();status.textContent="No se pudo consultar: "+errorText(error);
    }finally{
      if(request===requestId)$("operatorStatsRefresh").disabled=false;
    }
  }
  date.addEventListener("change",refresh);
  $("operatorStatsRefresh").addEventListener("click",refresh);
  return {refresh,clear:()=>{
    requestId++;clear();status.textContent="";
    date.value=fechaAlmacen();$("operatorStatsRefresh").disabled=false;
  }};
}
