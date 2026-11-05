import {auditarCopiaCargas} from "./legacy-audit.mjs";
const $=id=>document.getElementById(id);
const paragraph=(label,value)=>{
  const p=document.createElement("p");p.className="legacy-audit-line";
  const strong=document.createElement("b");strong.textContent=label+": ";
  p.append(strong,document.createTextNode(String(value)));return p;
};
export function configurarAuditoriaLegacy({getUser,errorText}){
  const input=$("legacyBackupFile"),button=$("legacyAuditStart");
  const root=$("legacyAuditResults"),status=$("legacyAuditStatus");
  let active=0;
  async function audit(){
    const file=input.files?.[0],session=getUser()?.id,request=++active;
    root.replaceChildren();
    if(!session)return void(status.textContent="La sesión ha caducado.");
    if(!file)return void(status.textContent="Selecciona primero la copia JSON.");
    if(file.size>12*1024*1024)return void(status.textContent="La copia supera el máximo de 12 MB para revisar en el móvil.");
    button.disabled=true;status.textContent="Analizando la copia únicamente en este dispositivo…";
    try{
      const audit=auditarCopiaCargas(await file.text());
      if(active!==request||getUser()?.id!==session)return;
      const values=[
        ["Versión original",audit.version||"No indicada"],
        ["Fecha de la copia",audit.created||"No indicada"],
        ["Cargas",audit.total],["Operarios declarados",audit.operarios],
        ["Códigos inválidos",audit.invalidCode],["Códigos duplicados",audit.duplicatedCodes.length],
        ["Mismo PDF en varias cargas",audit.crossHashes.length],
        ["Cargas sin fecha",audit.missingDate],["Lecturas no verificadas",audit.unverified],
        ["Tiempos incompletos",audit.incompleteTimes],["Sin SHA-256 válido",audit.missingHash],
        ["Registros no interpretables",audit.unknownRows]
      ];
      for(const [name,val]of values)root.appendChild(paragraph(name,val));
      root.appendChild(paragraph("Estados",Object.entries(audit.estados).map(([k,v])=>k+" ("+v+")").join(", ")||"Ninguno"));
      for(const item of audit.duplicatedCodes.slice(0,15))root.appendChild(paragraph("Repetida",item.codigo+" ("+item.ocurrencias+")"));
      for(const item of audit.crossHashes.slice(0,15))root.appendChild(paragraph("PDF asignado a varias cargas",item.hashCorto+" "+item.codigos.join(", ")));
      root.appendChild(paragraph("Atención",audit.advertenciaPdf));
      status.textContent="Análisis local terminado. No se ha enviado, restaurado ni modificado ningún dato.";
    }catch(error){
      if(active!==request||getUser()?.id!==session)return;
      status.textContent="No se pudo analizar la copia: "+errorText(error);
    }finally{
      if(active===request){button.disabled=false;input.value="";}
    }
  }
  button.addEventListener("click",audit);
  return {clear:()=>{
    active++;input.value="";root.replaceChildren();status.textContent="";
    button.disabled=false;
  }};
}
