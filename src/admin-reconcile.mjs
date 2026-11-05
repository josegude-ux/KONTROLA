import {auditarCopiaCargas} from "./legacy-audit.mjs";
import {conciliarCargasLegacy} from "./legacy-reconcile.mjs";

const $=id=>document.getElementById(id);
const paragraph=(message,cls="")=>{
  const p=document.createElement("p");if(cls)p.className=cls;
  p.textContent=String(message);return p;
};
export function configurarConciliacionLegacy({client,getUser,getWarehouse,errorText}){
  let requestId=0;
  const button=$("legacyCompareStart"),status=$("legacyCompareStatus"),root=$("legacyCompareResults");
  async function compare(){
    const file=$("legacyBackupFile").files?.[0],session=getUser()?.id;
    const warehouse=getWarehouse(),req=++requestId;
    root.replaceChildren();
    if(!session||!warehouse)return void(status.textContent="Elige almacén e inicia sesión de administrador.");
    if(!file)return void(status.textContent="Selecciona primero una copia JSON antigua.");
    if(file.size>12*1024*1024)return void(status.textContent="La copia supera 12 MB; revísala primero fuera del móvil.");
    button.disabled=true;status.textContent="Comparando exclusivamente en este dispositivo…";
    try{
      const raw=await file.text();
      const local=JSON.parse(raw);
      auditarCopiaCargas(local); // formato auténtico y límite, sin mutar el backup
      if(req!==requestId||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      const {data,error}=await client.rpc("kontrola_panel_cargas",{p_almacen:warehouse});
      if(req!==requestId||getUser()?.id!==session||getWarehouse()!==warehouse)return;
      if(error)throw error;
      const result=conciliarCargasLegacy(local.loads,data||[]);
      root.appendChild(paragraph("Almacén consultado: "+warehouse));
      root.appendChild(paragraph("Cargas en copia antigua: "+result.totalAntiguas+" · En panel autorizado: "+result.totalActuales));
      const labels=[
        ["coincidencia_metadatos","Coinciden los datos disponibles"],
        ["revisar","Revisar diferencias o datos incompletos"],
        ["no_encontrada","No encontradas en este almacén"],
        ["duplicado_legacy","Códigos repetidos en copia"],
        ["duplicado_kontrola","Códigos repetidos en panel"],
        ["codigo_invalido","Códigos de copia inválidos"]
      ];
      for(const [key,label] of labels)root.appendChild(paragraph(label+": "+(result.porTipo[key]||0),"legacy-audit-line"));
      root.appendChild(paragraph("Solo en KONTROLA (almacén consultado): "+result.soloEnKontrola.length));
      root.appendChild(paragraph(result.advertencia,"hint"));
      const problems=result.elementos.filter(item=>item.tipo!=="coincidencia_metadatos");
      const list=document.createElement("ul");list.className="legacy-compare-issues";
      for(const item of problems.slice(0,30)){
        const li=document.createElement("li");
        li.textContent=item.codigo+" — "+item.detalles.join("; ");list.appendChild(li);
      }
      if(problems.length)root.append(
        paragraph("Incidencias de conciliación (primeras "+Math.min(30,problems.length)+" de "+problems.length+"):"),
        list
      );
      status.textContent="Conciliación de lectura terminada. No se ha enviado la copia ni modificado ningún registro.";
    }catch(error){
      if(req!==requestId||getUser()?.id!==session)return;
      root.replaceChildren();status.textContent="No se pudo conciliar: "+errorText(error);
    }finally{
      if(req===requestId)button.disabled=false;
    }
  }
  button.addEventListener("click",compare);
  return {clear:()=>{requestId++;button.disabled=false;root.replaceChildren();status.textContent="";}};
}
