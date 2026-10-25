import {compararRevisiones} from "./revision-diff.mjs";

const $=id=>document.getElementById(id);
const text=(tag,value,className="")=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  el.textContent=String(value??"");
  return el;
};
const display=value=>value==null||value===""?"—":String(value);
const validCode=code=>/^LP[0-9]{2}-[0-9]{4,6}$/.test(code);

export function configureRevisionHistory({client,bucket,getUser,errorText}){
  let rows=[],requestId=0,requestedUser=null;
  const status=(message="",failure=false)=>{
    $("revisionStatus").textContent=message;
    $("revisionStatus").className="status"+(failure?" error":"");
  };
  function clear(){
    rows=[];$("revisionList").replaceChildren();$("revisionDiff").replaceChildren();
    $("revisionBefore").replaceChildren();$("revisionAfter").replaceChildren();
    $("revisionControls").hidden=true;
  }
  async function openPdf(revision){
    if(!requestedUser||getUser()?.id!==requestedUser)return status("La sesión ha cambiado. Vuelve a consultar.",true);
    // Abrir pestaña durante el clic; iOS puede bloquear ventanas abiertas tras esperar a Supabase.
    const popup=window.open("about:blank","_blank");
    if(popup)popup.opener=null;
    try{
      const {data,error}=await client.storage.from(bucket).createSignedUrl(revision.documento_ruta,120);
      if(error)throw error;
      if(!data?.signedUrl)throw Error("No se pudo crear un enlace temporal.");
      if(getUser()?.id!==requestedUser)throw Error("La sesión ha cambiado.");
      if(popup&&!popup.closed)popup.location.replace(data.signedUrl);
      else window.location.assign(data.signedUrl);
    }catch(error){
      if(popup&&!popup.closed)popup.close();
      status("No se pudo abrir el PDF: "+errorText(error),true);
    }
  }
  function renderComparison(){
    const root=$("revisionDiff");root.replaceChildren();
    const before=rows.find(r=>String(r.revision)===$("revisionBefore").value);
    const after=rows.find(r=>String(r.revision)===$("revisionAfter").value);
    if(!before||!after||before.revision>=after.revision){
      root.appendChild(text("p","Elige una revisión anterior y otra posterior.","muted"));return;
    }
    const result=compararRevisiones(before,after);
    root.appendChild(text("h3","Cambios de la revisión "+before.revision+" a la "+after.revision));
    root.appendChild(text("p",result.totalCambios===0
      ?"No hay diferencias en los campos comparados."
      :result.campos.length+" dato(s) generales, "+result.anadidos.length+" producto(s) añadido(s), "+
       result.eliminados.length+" eliminado(s) y "+result.modificados.length+" modificado(s).","muted"));
    function group(title,items,describe){
      if(!items.length)return;
      const section=document.createElement("section");section.className="revision-changes";
      section.appendChild(text("h4",title));
      const list=document.createElement("ul");
      for(const item of items)list.appendChild(text("li",describe(item)));
      section.appendChild(list);root.appendChild(section);
    }
    group("Datos generales",result.campos,item=>
      item.etiqueta+": "+display(item.anterior)+" → "+display(item.actual));
    group("Productos añadidos",result.anadidos,item=>
      display(item.sku)+" · "+display(item.description)+" · "+display(item.location)+" · "+display(item.qty)+" "+display(item.unit));
    group("Productos eliminados",result.eliminados,item=>
      display(item.sku)+" · "+display(item.description)+" · "+display(item.location)+" · "+display(item.qty)+" "+display(item.unit));
    group("Productos modificados",result.modificados,item=>
      display(item.sku)+(item.ocurrencia>1?" (línea "+item.ocurrencia+")":"")+
      ": "+item.cambios.map(change=>change.etiqueta+" "+display(change.anterior)+" → "+display(change.actual)).join("; "));
    root.appendChild(text("p","La comparación es informativa: no restaura ni modifica revisiones.","hint"));
  }
  function render(){
    const list=$("revisionList");list.replaceChildren();
    for(const revision of rows){
      const card=document.createElement("div");card.className="revision-entry";
      const info=document.createElement("div");
      const date=revision.publicada_en?new Date(revision.publicada_en).toLocaleString("es-ES"):"Fecha no disponible";
      info.append(text("b","Revisión "+revision.revision+(revision.vigente?" · Vigente":" · Histórica")),
        text("small",date+" · "+display(revision.carga_datos?.almacen),"muted"));
      const button=text("button","Abrir PDF original");button.type="button";button.className="secondary";
      button.addEventListener("click",()=>openPdf(revision));
      card.append(info,button);list.appendChild(card);
    }
    if(rows.length===1){
      list.appendChild(text("p","Esta carga solo tiene una revisión publicada.","muted"));
      $("revisionControls").hidden=true;return;
    }
    for(const id of ["revisionBefore","revisionAfter"]){
      const select=$(id);select.replaceChildren();
      for(const revision of rows){
        const option=document.createElement("option");
        option.value=String(revision.revision);
        option.textContent="Revisión "+revision.revision+(revision.vigente?" (vigente)":"");
        select.appendChild(option);
      }
    }
    $("revisionBefore").value=String(rows[1].revision);
    $("revisionAfter").value=String(rows[0].revision);
    $("revisionControls").hidden=false;
    renderComparison();
  }
  async function load(){
    const code=$("revisionCode").value.trim().toUpperCase();
    const id=++requestId,session=getUser()?.id;
    clear();
    if(!validCode(code))return status("Introduce un código válido, por ejemplo LP26-12345.",true);
    if(!session)return status("Inicia sesión de nuevo para consultar las revisiones.",true);
    requestedUser=session;
    $("revisionSearch").disabled=true;
    status("Consultando revisiones autorizadas…");
    try{
      const {data,error}=await client.from("kontrola_carga_revisiones")
        .select("codigo,revision,documento_ruta,publicada_en,publicada_por,vigente,carga_datos")
        .eq("codigo",code).order("revision",{ascending:false}).limit(200);
      if(id!==requestId||getUser()?.id!==session)return;
      if(error)throw error;
      rows=data||[];
      if(!rows.length)return status("No hay revisiones accesibles para esta carga.");
      status(rows.length+" revisión(es) conservada(s).");
      render();
    }catch(error){
      if(id===requestId){clear();status("No se pudieron consultar las revisiones: "+errorText(error),true);}
    }finally{
      if(id===requestId)$("revisionSearch").disabled=false;
    }
  }
  $("revisionSearch").addEventListener("click",load);
  $("revisionCode").addEventListener("input",()=>{
    requestId++;clear();requestedUser=null;
    $("revisionSearch").disabled=false;status();
  });
  $("revisionCode").addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();load();}
  });
  $("revisionBefore").addEventListener("change",renderComparison);
  $("revisionAfter").addEventListener("change",renderComparison);
}
