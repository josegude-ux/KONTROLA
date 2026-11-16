import {readLoads,getReview,saveReview,markLine,reviewSummary,closeReview,verificationAllowed} from "./control-cargas-checklist.mjs";

// Solo presentación: no se altera el contrato local ni el formato de las revisiones.
const FEATURES=Object.freeze({compact:true,tap:true,pending:true,groups:true,sticky:true});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusOf=(review,index)=>review.lines[index]?.status||"pending";
const aisleOf=product=>{
 const location=String(product?.location||"").trim().toUpperCase();
 const match=location.match(/^([A-Z]{1,4}\d{2,3})(?=$|[-\s])/);
 return match?.[1]||(location.startsWith("ZFRIO")?"FRÍO":location?"OTRAS UBICACIONES":"SIN UBICACIÓN");
};
export function createChecklistUI(root,scope,storage=localStorage){
 let selected=null,filter="all",query="",undo=null,undoTimer=null,resizeObserver=null,disposed=false;
 const exitTimers=new Set(),manuallyCollapsed=new Set(),manuallyExpanded=new Set(),previousPending=new Map();
 const read=()=>readLoads(storage,scope);
 const set=content=>{root.innerHTML=content;};
 function clearUndo(){
  if(undoTimer!==null)clearTimeout(undoTimer);
  undoTimer=null;undo=null;
 }
 function clearExits(){for(const t of exitTimers)clearTimeout(t);exitTimers.clear();}
 function resetDisplay(){clearUndo();clearExits();manuallyCollapsed.clear();manuallyExpanded.clear();previousPending.clear();}
 function updateStickyOffset(){
  if(!FEATURES.sticky)return;
  const topbar=document.querySelector(".topbar");
  root.style.setProperty("--cc-sticky-top",Math.ceil(topbar?.getBoundingClientRect().height||74)+"px");
 }
 if(typeof ResizeObserver!=="undefined"){
  const topbar=document.querySelector(".topbar");
  if(topbar){resizeObserver=new ResizeObserver(updateStickyOffset);resizeObserver.observe(topbar);}
 }
 function message(error){
  const el=root.querySelector("#ccMessage");
  if(el){el.textContent=String(error?.message||error);el.classList.add("error");}
 }
 function apply(load,index,status,quantity=null,note="",animate=false){
  try{
   const actual=getReview(storage,scope,load);
   if(actual.stale)throw Error("La hoja de origen ha cambiado.");
   const before=actual.review.lines[index]||null;
   const next=markLine(actual.review,load,index,status,quantity,note);
   saveReview(storage,scope,next);
   if(FEATURES.pending&&status==="ok"){
    clearUndo();
    undo={loadId:load.id,index,from:before?.status||"pending",quantity:before?.actualQty??null,note:before?.note||""};
    undoTimer=setTimeout(()=>{
     undo=null;undoTimer=null;
     root.querySelector(".cc-toast")?.remove();
    },5000);
   }else if(undo?.index===index&&undo?.loadId===load.id){clearUndo();}
   if(FEATURES.pending&&animate&&status==="ok"&&filter==="pending"&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
    const row=root.querySelector('[data-line-index="'+index+'"]');
    if(row){row.classList.add("cc-exit");row.querySelectorAll("button").forEach(button=>button.disabled=true);}
    const token=setTimeout(()=>{exitTimers.delete(token);render();},155);
    exitTimers.add(token);
   }else render();
  }catch(error){message(error);}
 }
 function buildRow(load,review,product,index,allowed){
  const state=statusOf(review,index);
  if(filter!=="all"&&state!==filter)return "";
  const enabled=allowed&&!review.closedAt;
  const checked=state==="ok",incident=state==="incident";
  const location=product.location||"SIN UBICACIÓN",description=product.description||"Sin descripción";
  const stateIcon=checked?"✓":incident?"!":"○";
  const face='<span class="cc-location">'+esc(location)+'</span>'+
    '<span class="cc-product"><small class="cc-sku">'+esc(product.sku||"")+'</small><span class="cc-description">'+esc(description)+'</span></span>'+
    '<strong class="cc-quantity">'+esc(product.qty)+" "+esc(product.unit||"")+'</strong>'+
    '<span class="cc-state-icon" aria-hidden="true">'+stateIcon+'</span>';
  const attrs=enabled?"":" disabled";
  const note=incident?'<div class="cc-incident-note">Comprobado: '+esc(review.lines[index]?.actualQty)+
    (review.lines[index]?.note?" · "+esc(review.lines[index].note):"")+'</div>':"";
  let controls;
  if(FEATURES.tap){
   controls='<button type="button" class="cc-tap" data-toggle="'+index+'" aria-label="'+
    esc((checked?"Deshacer correcto de ":"Marcar correcto: ")+(product.sku||description))+'"'+attrs+'>'+face+'</button>'+
    '<button type="button" class="cc-incident-action" data-incident="'+index+'" title="Registrar incidencia" aria-label="Incidencia de '+esc(product.sku||description)+'"'+attrs+'>!</button>';
  }else{
   controls='<div class="cc-tap cc-static">'+face+'</div><div class="cc-old-actions">'+
    '<button type="button" data-ok="'+index+'"'+attrs+'>✓ Correcto</button>'+
    '<button type="button" data-incident="'+index+'"'+attrs+'>! Incidencia</button>'+
    '<button type="button" data-reset="'+index+'"'+attrs+'>Pendiente</button></div>';
  }
  return '<div class="cc-row cc-state-'+esc(state)+'" data-line-index="'+index+'">'+
    '<div class="cc-row-main">'+controls+'</div>'+note+'</div>';
 }
 function render(){
  if(disposed)return;
  try{
   const loads=read();
   root.classList.toggle("cc-active",Boolean(selected));
   if(!selected){
    set('<div class="line"><h2>Cargas importadas ('+loads.length+')</h2><button type="button" id="ccRefresh" class="secondary">Actualizar</button></div>'+
     '<p class="muted">Origen: hojas ya importadas en Preparación · PRUEBA_3, en este dispositivo.</p>'+
     '<label>Buscar carga<input id="ccSearch" type="search" placeholder="LP, ruta o matrícula" value="'+esc(query)+'"></label>'+
     '<div class="loads-list">'+loads.filter(load=>(load.id+" "+(load.route||"")+" "+(load.plate||"")).toLowerCase().includes(query.toLowerCase())).map(load=>{
      const {review,stale}=getReview(storage,scope,load),summary=reviewSummary(review,load);
      return '<button type="button" class="submenu-card" data-load="'+esc(load.id)+'"><span><b>'+esc(load.id)+'</b><small>'+esc(load.route||"Sin ruta")+
       ' · '+summary.checked+'/'+summary.total+' comprobadas'+(stale?' · Hoja modificada':'')+(review.closedAt?' · Cerrada':'')+'</small></span><span>›</span></button>';
     }).join("")+'</div>');
    root.querySelector("#ccRefresh").onclick=render;
    root.querySelector("#ccSearch").oninput=event=>{
     query=event.target.value;render();
     const input=root.querySelector("#ccSearch");
     input.focus();input.setSelectionRange(query.length,query.length);
    };
    root.querySelectorAll("[data-load]").forEach(button=>button.onclick=()=>{
     selected=button.dataset.load;filter=FEATURES.pending?"pending":"all";resetDisplay();render();
    });
    return;
   }
   const load=loads.find(item=>item.id===selected);
   if(!load){selected=null;resetDisplay();render();return;}
   const {review,stale}=getReview(storage,scope,load),summary=reviewSummary(review,load);
   const allowed=verificationAllowed(load)&&!stale;
   const warning=stale
    ?"La hoja de origen ha cambiado. Esta revisión queda bloqueada para evitar validar cantidades anteriores."
    :!verificationAllowed(load)
     ?"La extracción de PRUEBA_3 no está verificada. Revisa la hoja original antes de continuar.":"";
   const groups=new Map();
   load.products.forEach((product,index)=>{
    const key=FEATURES.groups?aisleOf(product):"ARTÍCULOS";
    if(!groups.has(key))groups.set(key,{key,items:[],pending:0,incidents:0});
    const group=groups.get(key);
    group.items.push({product,index});
    const state=statusOf(review,index);
    if(state==="pending")group.pending++;
    if(state==="incident")group.incidents++;
   });
   const sections=[];
   for(const group of groups.values()){
    const prev=previousPending.get(group.key);
    if(FEATURES.groups&&prev>0&&group.pending===0){
     manuallyExpanded.delete(group.key);manuallyCollapsed.add(group.key);
    }
    if(FEATURES.groups&&prev===0&&group.pending>0)manuallyCollapsed.delete(group.key);
    previousPending.set(group.key,group.pending);
    if(FEATURES.groups&&filter==="pending"&&group.pending===0)continue;
    if(FEATURES.groups&&filter==="incident"&&group.incidents===0)continue;
    const collapsed=FEATURES.groups&&(
     manuallyCollapsed.has(group.key)||
     (!manuallyExpanded.has(group.key)&&filter==="all"&&group.pending===0)
    );
    const header=FEATURES.groups
     ?'<button type="button" class="cc-aisle-head" data-group="'+esc(group.key)+'" aria-expanded="'+(!collapsed)+'">'+
       '<span>'+esc(group.key)+' · '+group.pending+' pendientes</span><span class="cc-chevron" aria-hidden="true">'+(collapsed?"▸":"▾")+'</span></button>'
     :"";
    const rows=collapsed?"":group.items.map(({product,index})=>buildRow(load,review,product,index,allowed)).join("");
    if(FEATURES.groups||rows)sections.push('<section class="cc-aisle">'+header+rows+'</section>');
   }
   const filters=[["all","Todas"],["pending","Pendientes"],["incident","Incidencias"]].map(([value,label])=>
    '<button type="button" class="cc-filter'+(filter===value?" active":"")+'" data-filter="'+value+'" aria-pressed="'+(filter===value)+'">'+label+'</button>').join("");
   const toolbar='<div class="cc-toolbar'+(FEATURES.sticky?" is-sticky":"")+'">'+
    '<div class="cc-progress"><strong>'+summary.checked+'/'+summary.total+' comprobadas</strong><span>'+summary.incidents+' incidencias · '+summary.pending+' pendientes</span></div>'+
    '<div class="cc-filters" role="group" aria-label="Filtrar comprobaciones">'+filters+'</div></div>';
   const toast=FEATURES.pending&&undo?.loadId===load.id
    ?'<div class="cc-toast" role="status"><span>✓ Artículo comprobado</span><button type="button" data-undo>Deshacer</button></div>'
    :"";
   set('<div class="cc-heading"><button type="button" id="ccBack" class="back-button">← Todas las cargas</button><strong>'+esc(load.id)+'</strong></div>'+
    (warning?'<p role="alert" class="status error">'+esc(warning)+'</p>':"")+
    (review.closedAt?'<p class="status">Revisión cerrada: '+esc(review.closedAt)+'</p>':"")+
    toolbar+'<div class="cc-groups" id="ccLines">'+sections.join("")+'</div>'+
    (!allowed||review.closedAt?"":'<button id="ccClose" class="primary" type="button" '+(summary.pending?"disabled":"")+'>Cerrar revisión</button>')+
    '<p id="ccMessage" role="status" class="status"></p>'+toast);
   updateStickyOffset();
   root.querySelector("#ccBack").onclick=()=>{selected=null;resetDisplay();render();};
   root.querySelectorAll("[data-filter]").forEach(button=>button.onclick=()=>{
    filter=button.dataset.filter;manuallyCollapsed.clear();manuallyExpanded.clear();render();
   });
   root.querySelectorAll("[data-group]").forEach(button=>button.onclick=()=>{
    const key=button.dataset.group;
    const expanded=button.getAttribute("aria-expanded")==="true";
    if(expanded){manuallyExpanded.delete(key);manuallyCollapsed.add(key);}
    else{manuallyCollapsed.delete(key);manuallyExpanded.add(key);}
    render();
   });
   root.querySelectorAll("[data-toggle]").forEach(button=>button.onclick=()=>{
    const index=Number(button.dataset.toggle);
    const status=statusOf(getReview(storage,scope,load).review,index);
    apply(load,index,status==="ok"?"pending":"ok",null,"",true);
   });
   root.querySelectorAll("[data-ok]").forEach(button=>button.onclick=()=>apply(load,Number(button.dataset.ok),"ok",null,"",true));
   root.querySelectorAll("[data-reset]").forEach(button=>button.onclick=()=>apply(load,Number(button.dataset.reset),"pending"));
   root.querySelectorAll("[data-incident]").forEach(button=>button.onclick=()=>{
    const index=Number(button.dataset.incident),product=load.products[index];
    const raw=prompt("Cantidad comprobada para "+product.sku+" (esperada "+product.qty+"):");
    if(raw===null)return;
    const normalized=raw.trim().replace(",",".");
    if(!/^\d+(?:\.\d+)?$/.test(normalized)){message("Introduce una cantidad válida");return;}
    const note=prompt("Observaciones (opcional):")??"";
    apply(load,index,"incident",Number(normalized),note);
   });
   root.querySelector("[data-undo]")?.addEventListener("click",()=>{
    if(!undo||undo.loadId!==load.id)return;
    const action=undo;clearUndo();
    const latest=getReview(storage,scope,load);
    if(latest.review.lines[action.index]?.status!=="ok"){render();return;}
    apply(load,action.index,action.from,action.quantity,action.note);
   });
   const close=root.querySelector("#ccClose");
   if(close)close.onclick=()=>{
    const accept=summary.incidents>0
     ?confirm("Hay "+summary.incidents+" incidencias. ¿Aceptar expresamente y cerrar la revisión?")
     :confirm("¿Cerrar la revisión de esta carga?");
    if(!accept)return;
    try{
     const latest=getReview(storage,scope,load);
     saveReview(storage,scope,closeReview(latest.review,load,{acceptIncidents:summary.incidents>0}));
     clearUndo();render();
    }catch(error){message(error);}
   };
  }catch(error){set('<p role="alert" class="status error">No se pudieron leer las hojas: '+esc(error.message)+'</p>');}
 }
 render();
 return {refresh:render,back:()=>{
  if(disposed||!selected)return false;
  selected=null;resetDisplay();render();return true;
 },clear:()=>{
  disposed=true;resetDisplay();resizeObserver?.disconnect();root.classList.remove("cc-active");
  root.style.removeProperty("--cc-sticky-top");selected=null;root.replaceChildren();
 }};
}
