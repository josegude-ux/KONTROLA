import {readLoads,getReview,saveReview,markLine,reviewSummary,closeReview,verificationAllowed} from "./control-cargas-checklist.mjs";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function createChecklistUI(root,scope,storage=localStorage){
 let selected=null,filter="all",query="";
 const set=(html)=>{root.innerHTML=html;};
 const read=()=>readLoads(storage,scope);
 function render(){
  try{
   const loads=read();
   if(!selected){
    set('<div class="line"><h2>Cargas importadas ('+loads.length+')</h2><button type="button" id="ccRefresh" class="secondary">Actualizar</button></div><p class="muted">Origen: hojas ya importadas en Preparación · PRUEBA_3, en este dispositivo.</p><label>Buscar carga<input id="ccSearch" type="search" placeholder="LP, ruta o matrícula" value="'+esc(query)+'"></label><div class="loads-list">'+loads.filter(l=>(l.id+" "+(l.route||"")+" "+(l.plate||"")).toLowerCase().includes(query.toLowerCase())).map(l=>{const {review,stale}=getReview(storage,scope,l),s=reviewSummary(review,l);return '<button type="button" class="submenu-card" data-load="'+esc(l.id)+'"><span><b>'+esc(l.id)+'</b><small>'+esc(l.route||"Sin ruta")+' · '+s.checked+'/'+s.total+' comprobadas'+(stale?' · Hoja modificada':'')+(review.closedAt?' · Cerrada':'')+'</small></span><span>›</span></button>'}).join("")+'</div>');
    root.querySelector("#ccRefresh").onclick=render;
    root.querySelector("#ccSearch").oninput=e=>{query=e.target.value;render();const input=root.querySelector("#ccSearch");input.focus();input.setSelectionRange(query.length,query.length);};
    root.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{selected=b.dataset.load;filter="all";render()});
    return;
   }
   const load=loads.find(l=>l.id===selected);
   if(!load){selected=null;render();return;}
   const {review,stale}=getReview(storage,scope,load),s=reviewSummary(review,load),allowed=verificationAllowed(load)&&!stale;
   const warning=stale?"La hoja de origen ha cambiado. Esta revisión queda bloqueada para evitar validar cantidades anteriores.":!verificationAllowed(load)?"La extracción de PRUEBA_3 no está verificada. Revisa la hoja original antes de continuar.":"";
   set('<button type="button" id="ccBack" class="back-button">← Todas las cargas</button><h2>'+esc(load.id)+'</h2><p>'+s.checked+'/'+s.total+' comprobadas · '+s.pending+' pendientes · '+s.incidents+' incidencias</p>'+(warning?'<p role="alert" class="status error">'+esc(warning)+'</p>':'')+(review.closedAt?'<p class="status">Revisión cerrada: '+esc(review.closedAt)+'</p>':'')+'<div class="actions"><button type="button" data-filter="all">Todas</button><button type="button" data-filter="pending">Pendientes</button><button type="button" data-filter="incident">Incidencias</button></div><div id="ccLines">'+load.products.map((p,i)=>{const state=review.lines[i]?.status||"pending";if(filter!=="all"&&filter!==state)return "";return '<div class="panel" style="margin:10px 0"><div><b>'+esc(p.sku)+'</b> · '+esc(p.description||"")+'</div><p class="muted">'+esc(p.location||"")+" · Esperado: "+esc(p.qty)+" "+esc(p.unit)+'</p><p>Estado: '+(state==="ok"?"Correcto":state==="incident"?"Incidencia":"Pendiente")+'</p>'+(state==="incident"?'<p>Comprobado: '+esc(review.lines[i].actualQty)+' · '+esc(review.lines[i].note||"")+'</p>':'')+(!allowed||review.closedAt?'':'<div class="actions"><button type="button" data-ok="'+i+'">✓ Correcto</button><button type="button" data-incident="'+i+'">Incidencia</button><button type="button" data-reset="'+i+'">Pendiente</button></div>')+'</div>'}).join("")+'</div>'+(!allowed||review.closedAt?'':'<button id="ccClose" class="primary" type="button" '+(s.pending?'disabled':'')+'>Cerrar revisión</button>')+'<p id="ccMessage" role="status" class="status"></p>');
   root.querySelector("#ccBack").onclick=()=>{selected=null;render()};
   root.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});
   const apply=(i,status,qty=null,note="")=>{try{saveReview(storage,scope,markLine(review,load,i,status,qty,note));render()}catch(e){root.querySelector("#ccMessage").textContent=e.message}};
   root.querySelectorAll("[data-ok]").forEach(b=>b.onclick=()=>apply(Number(b.dataset.ok),"ok"));
   root.querySelectorAll("[data-reset]").forEach(b=>b.onclick=()=>apply(Number(b.dataset.reset),"pending"));
   root.querySelectorAll("[data-incident]").forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.incident),p=load.products[i];
    const raw=prompt("Cantidad comprobada para "+p.sku+" (esperada "+p.qty+"):");
    if(raw===null)return;
    const normalized=raw.trim().replace(",",".");
    if(!/^\d+(?:\.\d+)?$/.test(normalized)){root.querySelector("#ccMessage").textContent="Introduce una cantidad válida";return}
    const note=prompt("Observaciones (opcional):")??"";
    apply(i,"incident",Number(normalized),note);
   });
   const close=root.querySelector("#ccClose");
   if(close)close.onclick=()=>{
    const accept=s.incidents>0?confirm("Hay "+s.incidents+" incidencias. ¿Aceptar expresamente y cerrar la revisión?"):confirm("¿Cerrar la revisión de esta carga?");
    if(!accept)return;
    try{saveReview(storage,scope,closeReview(review,load,{acceptIncidents:s.incidents>0}));render()}catch(e){root.querySelector("#ccMessage").textContent=e.message}
   };
  }catch(e){set('<p role="alert" class="status error">No se pudieron leer las hojas: '+esc(e.message)+'</p>')}
 }
 render();return {refresh:render,clear:()=>{selected=null;root.replaceChildren()}};
}
