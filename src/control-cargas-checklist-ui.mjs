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
const MODE_KEY="visura_prepara_verificacion_modo_v1";
export function createChecklistUI(root,scope,storage=localStorage){
 let selected=null,filter="all",query="",undo=null,undoTimer=null,resizeObserver=null,disposed=false;
 let viewMode="list",oneCursor=null,oneLockUntil=0;
 try{viewMode=storage.getItem(MODE_KEY)==="single"?"single":"list";}catch{}
 const exitTimers=new Set(),manuallyCollapsed=new Set(),manuallyExpanded=new Set(),previousPending=new Map();

 // Solo clicks breves sin desplazamiento. Nada de touchstart: el scroll no confirma.
 const pointerGestures=new Map(),pointerVerdicts=new WeakMap();
 const guardedButtons="button[data-toggle],button[data-single-ok],button[data-incident],button[data-single-incident]";
 const gestureTarget=e=>e.target?.closest?.(guardedButtons);
 function gestureDown(e){
  const button=gestureTarget(e);
  if(!button||!root.contains(button))return;
  pointerGestures.set(e.pointerId,{button,x:e.clientX,y:e.clientY,start:performance.now(),moved:false});
 }
 function gestureMove(e){
  const touch=pointerGestures.get(e.pointerId);
  if(touch&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touch.moved=true;
 }
 function gestureEnd(e){
  const touch=pointerGestures.get(e.pointerId);if(!touch)return;
  pointerGestures.delete(e.pointerId);
  if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touch.moved=true;
  pointerVerdicts.set(touch.button,!touch.moved&&performance.now()-touch.start<=600);
 }
 function gestureCancel(e){
  const touch=pointerGestures.get(e.pointerId);if(!touch)return;
  pointerGestures.delete(e.pointerId);pointerVerdicts.set(touch.button,false);
 }
 function isShortClick(event){
  const button=event.currentTarget;
  // El dictamen del gesto tiene prioridad incluso si Safari emite click con detail=0.
  if(pointerVerdicts.has(button)){
   const accepted=pointerVerdicts.get(button)===true;
   pointerVerdicts.delete(button);
   return accepted;
  }
  // Sin gesto táctil previo: solo teclado o tecnologías de asistencia.
  return event.detail===0;
 }
 root.addEventListener("pointerdown",gestureDown,{passive:true});
 root.addEventListener("pointermove",gestureMove,{passive:true});
 root.addEventListener("pointerup",gestureEnd,{passive:true});
 root.addEventListener("pointercancel",gestureCancel,{passive:true});

 const read=()=>readLoads(storage,scope);
 const set=content=>{root.innerHTML=content;};
 function clearUndo(){
  if(undoTimer!==null)clearTimeout(undoTimer);
  undoTimer=null;undo=null;
 }
 function clearExits(){for(const t of exitTimers)clearTimeout(t);exitTimers.clear();}
 function resetDisplay(){clearUndo();clearExits();manuallyCollapsed.clear();manuallyExpanded.clear();previousPending.clear();oneCursor=null;oneLockUntil=0;}
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
    },4000);
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
  const quantity=String(product.qty??"—")+(product.unit?" "+String(product.unit):"");
  const attrs=enabled?"":" disabled";
  const note=incident?'<div class="cc-incident-note">Comprobado: '+esc(review.lines[index]?.actualQty)+
   (review.lines[index]?.note?" · "+esc(review.lines[index].note):"")+'</div>':"";
  const details='<div class="cc-item-details">'+
   '<span class="cc-location">'+esc(location)+'</span>'+
   '<span class="cc-product"><small class="cc-sku">'+esc(product.sku||"")+'</small><span class="cc-description">'+esc(description)+'</span></span>'+
   '</div>';
  // El botón de cantidad reutiliza data-toggle y el guardado local existente.
  const confirm='<button type="button" class="cc-quantity-action" data-toggle="'+index+
   '" aria-pressed="'+(checked?"true":"false")+'" aria-label="'+
   esc((checked?"Deshacer correcto: ":"Marcar correcto: ")+(product.sku||description)+" · "+quantity)+'"'+attrs+'>'+
   (checked?'<span class="cc-qty-check" aria-hidden="true">✓</span>':"")+
   '<span class="cc-qty-label">'+esc(quantity)+'</span></button>';
  const incidentButton='<button type="button" class="cc-incident-action" data-incident="'+index+
   '" title="Registrar incidencia" aria-label="Incidencia de '+esc(product.sku||description)+'"'+attrs+'>!</button>';
  return '<div class="cc-row cc-state-'+esc(state)+'" data-line-index="'+index+'">'+
   '<div class="cc-row-main">'+details+confirm+incidentButton+'</div>'+note+'</div>';
 }

 function buildOneByOne(load,review,summary,allowed,toast){
  const items=load.products.map((product,index)=>({product,index}))
   .filter(({index})=>filter==="all"||statusOf(review,index)===filter);
  if(summary.pending===0){
   return '<section class="cc-single-summary"><strong>Revisión completada</strong>'+
    '<p>'+summary.total+' artículos comprobados · '+summary.incidents+' incidencias.</p>'+
    '<button type="button" data-mode="list" class="cc-one-return">Volver a la lista</button></section>'+
    (toast?'<div class="cc-single-toast-inline">'+toast+'</div>':"");
  }
  if(!items.length){
   return '<section class="cc-single-summary"><strong>Sin artículos en este filtro</strong>'+
    '<p>Elige otro filtro o vuelve a la lista.</p>'+
    '<button type="button" data-mode="list" class="cc-one-return">Volver a la lista</button></section>';
  }
  const position=oneCursor===null?0:items.findIndex(item=>item.index>=oneCursor);
  const active=items[position<0?0:position];
  oneCursor=active.index;
  const product=active.product,state=statusOf(review,active.index),checked=state==="ok";
  const quantity=String(product.qty??"—")+(product.unit?" "+String(product.unit):"");
  const disabled=allowed&&!review.closedAt?"":" disabled";
  return '<div class="cc-single-area">'+
   '<section class="cc-single-card cc-state-'+esc(state)+'" aria-label="Artículo '+(active.index+1)+'">'+
    '<div class="cc-single-position">Artículo '+(items.findIndex(item=>item.index===active.index)+1)+' de '+items.length+'</div>'+
    '<div class="cc-single-location">'+esc(product.location||"SIN UBICACIÓN")+'</div>'+
    '<div class="cc-single-sku">'+esc(product.sku||"")+'</div>'+
    '<div class="cc-single-description">'+esc(product.description||"Sin descripción")+'</div>'+
    '<div class="cc-single-quantity">'+esc(quantity)+'</div></section>'+
   '<div class="cc-single-nav">'+
    '<button type="button" data-one-nav="prev">← Anterior</button>'+
    '<button type="button" data-one-nav="next">Saltar →</button></div>'+
   '<div class="cc-single-dock">'+toast+
    '<div class="cc-single-actions">'+
     '<button type="button" class="cc-single-primary" data-single-ok="'+active.index+
      '" aria-pressed="'+checked+'" aria-label="'+esc((checked?"Deshacer correcto de ":"Confirmar correcto de ")+(product.sku||product.description)+" · "+quantity)+'"'+disabled+'>'+
      '<span>'+(checked?"Deshacer ✓":"✓ Correcto")+'</span><strong>'+esc(quantity)+'</strong></button>'+
     '<button type="button" class="cc-single-incident" data-single-incident="'+active.index+
      '" aria-label="Incidencia de '+esc(product.sku||product.description)+'"'+disabled+'>!<small>Incidencia</small></button>'+
    '</div></div></div>';
 }
 function requestIncident(load,index,advance=false){
  const product=load.products[index];
  const raw=prompt("Cantidad comprobada para "+product.sku+" (esperada "+product.qty+"):");
  if(raw===null)return;
  const normalized=raw.trim().replace(",",".");
  if(!/^\d+(?:\.\d+)?$/.test(normalized)){message("Introduce una cantidad válida");return;}
  const note=prompt("Observaciones (opcional):")??"";
  if(advance){oneCursor=index+1;oneLockUntil=performance.now()+400;}
  apply(load,index,"incident",Number(normalized),note);
 }

 function render(){
  if(disposed)return;
  try{
   const loads=read();
   root.classList.toggle("cc-active",Boolean(selected));
   root.classList.toggle("cc-mode-single",Boolean(selected)&&viewMode==="single");
   root.closest("#controlChecklistView")?.classList.toggle("cc-detail-open",Boolean(selected));
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
    // La cabecera solo aporta valor cuando hay dos o más artículos VISIBLES en este filtro.
    const visibleItems=group.items.filter(({index})=>filter==="all"||statusOf(review,index)===filter);
    if(!visibleItems.length)continue;
    const showHeader=FEATURES.groups&&visibleItems.length>=2;
    const collapsed=showHeader&&(
     manuallyCollapsed.has(group.key)||
     (!manuallyExpanded.has(group.key)&&filter==="all"&&group.pending===0)
    );
    const header=showHeader
     ?'<button type="button" class="cc-aisle-head" data-group="'+esc(group.key)+'" aria-expanded="'+(!collapsed)+'">'+
       '<span>'+esc(group.key)+' · '+group.pending+' '+(group.pending===1?'pendiente':'pendientes')+'</span><span class="cc-chevron" aria-hidden="true">'+(collapsed?"▸":"▾")+'</span></button>'
     :"";
    const rows=collapsed?"":visibleItems.map(({product,index})=>buildRow(load,review,product,index,allowed)).join("");
    sections.push('<section class="cc-aisle">'+header+rows+'</section>');
   }
   const filters=[["all","Todas"],["pending","Pendientes"],["incident","Incidencias"]].map(([value,label])=>
    '<button type="button" class="cc-filter'+(filter===value?" active":"")+'" data-filter="'+value+'" aria-pressed="'+(filter===value)+'">'+label+'</button>').join("");
   const modes=[["list","Lista"],["single","Uno a uno"]].map(([value,label])=>
    '<button type="button" class="cc-mode-button'+(viewMode===value?" active":"")+'" data-mode="'+value+
    '" aria-pressed="'+(viewMode===value)+'">'+label+'</button>').join("");
   const toolbar='<div class="cc-toolbar'+(FEATURES.sticky?" is-sticky":"")+'">'+
    '<div class="cc-heading"><strong>'+esc(load.id)+'</strong><span class="cc-heading-label">Verificación física</span></div>'+
    '<div class="cc-progress"><strong>'+summary.checked+'/'+summary.total+
     (viewMode==="single"?"":" comprobadas")+'</strong><span>'+summary.incidents+' incidencias'+
     (viewMode==="single"?"":" · "+summary.pending+" pendientes")+'</span></div>'+
    '<div class="cc-filters" role="group" aria-label="Filtrar comprobaciones">'+filters+'</div>'+
    '<div class="cc-mode-switch" role="group" aria-label="Modo de presentación">'+modes+'</div></div>';
   const toast=FEATURES.pending&&undo?.loadId===load.id
    ?'<div class="cc-toast" role="status"><span>✓ Artículo comprobado</span><button type="button" data-undo>Deshacer</button></div>'
    :"";
   const body=viewMode==="single"
    ?buildOneByOne(load,review,summary,allowed,toast)
    :'<div class="cc-groups" id="ccLines">'+sections.join("")+'</div>';
   set((warning?'<p role="alert" class="status error">'+esc(warning)+'</p>':"")+
    (review.closedAt?'<p class="status">Revisión cerrada: '+esc(review.closedAt)+'</p>':"")+
    toolbar+body+
    (viewMode==="list"&&allowed&&!review.closedAt?'<button id="ccClose" class="primary" type="button" '+(summary.pending?"disabled":"")+'>Cerrar revisión</button>':"")+
    '<p id="ccMessage" role="status" class="status"></p>'+(viewMode==="list"?toast:""));
   updateStickyOffset();
   root.querySelectorAll("[data-mode]").forEach(button=>button.onclick=()=>{
    const next=button.dataset.mode==="single"?"single":"list";
    if(viewMode===next)return;
    viewMode=next;oneCursor=null;oneLockUntil=0;
    manuallyCollapsed.clear();manuallyExpanded.clear();previousPending.clear();
    try{storage.setItem(MODE_KEY,viewMode);}catch{}
    render();
   });
   root.querySelectorAll("[data-filter]").forEach(button=>button.onclick=()=>{
    filter=button.dataset.filter;oneCursor=null;manuallyCollapsed.clear();manuallyExpanded.clear();render();
   });
   root.querySelectorAll("[data-group]").forEach(button=>button.onclick=()=>{
    const key=button.dataset.group;
    const expanded=button.getAttribute("aria-expanded")==="true";
    if(expanded){manuallyExpanded.delete(key);manuallyCollapsed.add(key);}
    else{manuallyCollapsed.delete(key);manuallyExpanded.add(key);}
    render();
   });
   root.querySelectorAll("[data-toggle]").forEach(button=>button.onclick=event=>{
    if(!isShortClick(event))return;
    const index=Number(button.dataset.toggle);
    const status=statusOf(getReview(storage,scope,load).review,index);
    apply(load,index,status==="ok"?"pending":"ok",null,"",true);
   });
   root.querySelectorAll("[data-ok]").forEach(button=>button.onclick=()=>apply(load,Number(button.dataset.ok),"ok",null,"",true));
   root.querySelectorAll("[data-reset]").forEach(button=>button.onclick=()=>apply(load,Number(button.dataset.reset),"pending"));
   root.querySelectorAll("[data-incident]").forEach(button=>button.onclick=event=>{
    if(!isShortClick(event))return;
    requestIncident(load,Number(button.dataset.incident));
   });
   root.querySelectorAll("[data-single-ok]").forEach(button=>button.onclick=event=>{
    if(!isShortClick(event)||performance.now()<oneLockUntil)return;
    const index=Number(button.dataset.singleOk);
    const state=statusOf(getReview(storage,scope,load).review,index);
    oneCursor=index+1;oneLockUntil=performance.now()+400;
    apply(load,index,state==="ok"?"pending":"ok",null,"",false);
   });
   root.querySelectorAll("[data-single-incident]").forEach(button=>button.onclick=event=>{
    if(!isShortClick(event)||performance.now()<oneLockUntil)return;
    requestIncident(load,Number(button.dataset.singleIncident),true);
   });
   root.querySelectorAll("[data-one-nav]").forEach(button=>button.onclick=()=>{
    const eligible=load.products.map((_,index)=>index)
     .filter(index=>filter==="all"||statusOf(review,index)===filter);
    if(!eligible.length)return;
    const position=Math.max(0,eligible.indexOf(oneCursor));
    const delta=button.dataset.oneNav==="prev"?-1:1;
    oneCursor=eligible[(position+delta+eligible.length)%eligible.length];
    render();
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
  disposed=true;resetDisplay();resizeObserver?.disconnect();pointerGestures.clear();
   root.removeEventListener("pointerdown",gestureDown);root.removeEventListener("pointermove",gestureMove);
   root.removeEventListener("pointerup",gestureEnd);root.removeEventListener("pointercancel",gestureCancel);
   root.classList.remove("cc-active","cc-mode-single");
  root.style.removeProperty("--cc-sticky-top");root.closest("#controlChecklistView")?.classList.remove("cc-detail-open");selected=null;root.replaceChildren();
 }};
}
