import {createClient} from "../vendor/supabase.mjs";
import {SUPABASE_URL,SUPABASE_KEY} from "./config.mjs";

// PRUEBA_3: isolated records. Never modify kontrola_cargas or kontrola_preparaciones.
const W="COR_01_COR";
const lp=/^LP[0-9]{2}-[0-9]{4,6}$/;
const hash=/^[a-f0-9]{64}$/;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const t=(a,b)=>{if(!a)return "";const ms=Math.max(0,new Date(b||Date.now())-new Date(a));const m=Math.floor(ms/60000);return Math.floor(m/60)+" h "+String(m%60).padStart(2,"0")+" min";};
const key=r=>[r.almacen||W,r.codigo||r.id,r.pdf_hash||r.pdfHash].join("|");
const numberOrNull=v=>v==null||v===""||!Number.isFinite(Number(v))||Number(v)<0?null:Number(v);
const integerOrNull=v=>{const n=numberOrNull(v);return Number.isInteger(n)?n:null;};
const metadata=r=>({peso:numberOrNull(r.weight??r.peso_kg),
 visitas:integerOrNull(r.visits??r.visitas),
 referencias:integerOrNull(r.refs??r.referencias),
 ruta:String(r.route??r.ruta??"").slice(0,120),matricula:String(r.plate??r.matricula??"").slice(0,40)});
function openQueue(scope){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open("visura_p3_tiempos_"+scope,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("cola"))req.result.createObjectStore("cola",{keyPath:"id"});if(!req.result.objectStoreNames.contains("cache"))req.result.createObjectStore("cache");};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function dbAction(db,store,method,value){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,method==="put"||method==="delete"?"readwrite":"readonly");
  const object=tx.objectStore(store);
  const request=method==="getAll"?object.getAll():method==="get"?object.get(value):method==="delete"?object.delete(value):store==="cache"?object.put(value,"rows"):object.put(value);
  let result;request.onsuccess=()=>{result=request.result;};request.onerror=()=>reject(request.error);tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error);
 });
}
export async function iniciarTiemposPrueba3({scope,getLoads,render,openLocal,readOriginal,notice}){
 const client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const identity=await client.auth.getUser();
 const user=identity.data?.user;
 if(identity.error||!user)throw Error("Inicia sesión en VISURA PREPARA para utilizar los tiempos compartidos.");
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(user.id));
 const own=Array.from(new Uint8Array(digest).slice(0,12),n=>n.toString(16).padStart(2,"0")).join("");
 if(own!==scope)throw Error("El contexto del usuario ya no coincide. Abre de nuevo PREPARA.");
 const db=await openQueue(scope);
 const state=new Map(), pending=new Map(), blocked=new Map();
 let operators=[],busy=false,dialog=null,admin=false,lastSync=0;
 for(const item of await dbAction(db,"cola","getAll"))pending.set(item.id,item);
 for(const row of (await dbAction(db,"cache","get","rows")||[]))state.set(key(row),row);
 const isAuthenticated=async()=>{const u=await client.auth.getUser();return !u.error&&u.data?.user?.id===user.id;};
 async function getHash(r){
  if(hash.test(String(r.pdfHash||r.pdf_hash||"")))return String(r.pdfHash||r.pdf_hash);
  if(!r.id||r._p3remote)return "";
  try{const file=await readOriginal(r.id);if(!file)return "";const bytes=await file.arrayBuffer();const d=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("");}catch{return "";}
 }
 function rowOf(r){return state.get(key(r));}
 function status(r){
  const entry=rowOf(r);
  if(entry?.estado==="finalizada"||(!entry&&(r.finished||r.status==="Finalizada")))return "Finalizada";
  if(entry?.estado==="en_preparacion")return "En preparación";
  return "Sin iniciar";
 }
 function payload(r){return {p_almacen:W,p_codigo:r.id||r.codigo,p_pdf_hash:r.pdfHash||r.pdf_hash,p_datos:metadata(r)};}
 function pendFor(r){return [...pending.values()].find(p=>p.args.p_codigo===(r.id||r.codigo)&&p.args.p_pdf_hash===(r.pdfHash||r.pdf_hash));}
 function badge(r){
  const row=rowOf(r),s=status(r),pend=pendFor(r);
  const style=s==="Finalizada"?"done":s==="En preparación"?"running":"new";
  const name=row?.operario_nombre||"";
  const clock=row?.inicio?t(row.inicio,row.fin):"";
  const old=!row&&(r.started||r.finished)?" · Registro histórico local no importado":"";
  return '<span class="p3-label '+style+'">'+esc(s)+'</span> <span class="p3-meta">'+esc(name)+(clock?' · <span data-p3-elapsed data-start="'+esc(row.inicio)+'" data-end="'+esc(row.fin||"")+'">'+esc(clock)+'</span>':"")+(row?.revisar?" · REVISAR":"")+(pend?" · PENDIENTE DE SINCRONIZAR":"")+esc(old)+'</span>';
 }
 function remoteRows(){
  const known=new Set(getLoads().map(r=>key({...r,almacen:W})));
  return [...state.values()].filter(r=>r.almacen===W&&!known.has(key(r))).map(r=>({...r,id:r.codigo,pdfHash:r.pdf_hash,weight:r.peso_kg,refs:r.referencias,visits:r.visitas,route:r.ruta,plate:r.matricula,_p3remote:true}));
 }
 function remoteCard(r){
  return '<div class="list-btn p3-remote" data-p3-remote="'+esc(r.id)+'" role="button" tabindex="0"><div class="line"><strong>'+esc(r.codigo)+'</strong><strong>'+esc(r.peso_kg??"—")+' kg</strong></div><div class="mini">'+esc(r.ruta||"Sin ruta")+' · '+esc(r.matricula||"Sin matrícula")+' · Copia compartida (PDF no presente en este dispositivo)</div><div class="footrow">'+badge(r)+'</div></div>';
 }
 async function refresh(){
  if(!navigator.onLine||!await isAuthenticated())return;
  const [loads,ops]=await Promise.all([
   client.from("visura_p3_cargas").select("id,almacen,codigo,pdf_hash,peso_kg,visitas,referencias,ruta,matricula,estado,operario_id,operario_nombre,inicio,fin,cierre_tipo,revisar,revision").eq("almacen",W).limit(2000),
   client.from("visura_p3_operarios").select("id,almacen,nombre,activo").eq("almacen",W).eq("activo",true).order("nombre")
  ]);
  if(loads.error)throw loads.error;if(ops.error)throw ops.error;
  state.clear();for(const row of loads.data||[])state.set(key(row),row);
  operators=ops.data||[];
  await dbAction(db,"cache","put",[...state.values()]);
  lastSync=Date.now();render();
 }
 async function register(r){
  const code=r.id||r.codigo,sha=await getHash(r);
  if(!lp.test(String(code))||!hash.test(sha))throw Error("Carga "+code+": se necesita código LP y huella PDF válida.");
  if(blocked.has(W+"|"+code+"|"+sha))throw Error(blocked.get(W+"|"+code+"|"+sha));
  r.pdfHash=sha;
  if(rowOf(r))return true;
  if(!navigator.onLine)throw Error("Sin conexión: la copia quedará pendiente de registro.");
  const {error}=await client.rpc("visura_p3_registrar_copia",{p_almacen:W,p_codigo:code,p_pdf_hash:sha,p_datos:metadata(r),p_cerrada_local:!!(r.finished||r.status==="Finalizada")});
  if(error){if(/COINCIDE_CON_CARGA_CENTRAL/.test(error.message))blocked.set(W+"|"+code+"|"+sha,"Esta carga coincide exactamente con una carga central; no se duplican sus tiempos.");throw error;}
  return true;
 }
 async function syncCopies(){
  if(!navigator.onLine||busy)return;busy=true;
  try{
   if(!await isAuthenticated())return;
   let errors=0;
   for(const r of getLoads()){
    if(r._p3remote||(!lp.test(String(r.id))))continue;
    const sha=await getHash(r);
    if(!hash.test(sha))continue;
    r.pdfHash=sha;
    if(rowOf(r)||blocked.has(W+"|"+r.id+"|"+sha))continue;
    try{await register(r);}catch(err){errors++;if(errors<=1)notice("Una carga no se ha incorporado al estado compartido: "+(err.message||err),"warn");}
   }
   await refresh();
  }finally{busy=false;}
 }
 async function saveCommand(item){
  await dbAction(db,"cola","put",item);
  pending.set(item.id,item);render();
 }
 async function removeCommand(item){
  await dbAction(db,"cola","delete",item.id);pending.delete(item.id);render();
 }
 async function send(item){
  if(!navigator.onLine)return false;
  if(!await isAuthenticated())throw Error("La sesión ha cambiado; conserva la operación pendiente y vuelve a entrar.");
  const r=item.local;
  if(!state.has(key(r))){
   await register(r);
  }
  let {data,error}=await client.rpc("visura_p3_comando",item.args);
  if(error&&/CONFIRMAR_(CIERRE_ANTERIOR|REASIGNACION)/.test(error.message)){
   const ok=confirm("Hay otra asignación activa. ¿Confirmas el cierre anterior y el nuevo inicio en una sola operación?");
   if(!ok){await removeCommand(item);return false;}
   item.args.p_confirmar=true;await saveCommand(item);
   ({data,error}=await client.rpc("visura_p3_comando",item.args));
  }
  if(error)throw error;
  await removeCommand(item);await refresh();
  return !!data;
 }
 async function command(r,type,operator=null,confirmation=false){
  const code=r.id||r.codigo,sha=await getHash(r);
  if(!lp.test(String(code))||!hash.test(sha)){alert("Para controlar esta carga deben constar un LP y una huella de PDF verificables.");return false;}
  r.pdfHash=sha;
  const args={p_operacion:crypto.randomUUID(),p_tipo:type,p_almacen:W,p_codigo:code,p_pdf_hash:sha,p_operario:operator,p_datos:metadata(r),p_confirmar:confirmation};
  const item={id:args.p_operacion,args,local:{id:code,pdfHash:sha,weight:r.weight??r.peso_kg??null,visits:r.visits??r.visitas??null,refs:r.refs??r.referencias??null,route:r.route??r.ruta??"",plate:r.plate??r.matricula??"",finished:r.finished??null,status:r.status??null},at:Date.now()};
  await saveCommand(item);
  if(!navigator.onLine){notice("Operación guardada en cola de este dispositivo; el servidor aún no ha confirmado el tiempo.","warn");return true;}
  try{return await send(item);}
  catch(error){
   const msg=String(error?.message||error);
   if(/Failed to fetch|fetch failed|network|timeout|Load failed/i.test(msg)){notice("Sin conexión confirmada: operación conservada con su ID para reenviar al reconectar.","warn");return true;}
   await removeCommand(item);alert("El servidor no ha aceptado la operación: "+msg);return false;
  }
 }
 async function flush(){
  if(!navigator.onLine||busy||!pending.size)return;
  busy=true;try{
   for(const p of [...pending.values()].sort((a,b)=>a.at-b.at)){
    try{await send(p);}catch(error){
     notice("Pendiente de confirmación: "+String(error?.message||error)+". No se ha duplicado el registro.","warn");
     break;
    }
   }
  }finally{busy=false;}
 }
 async function picker(){
  return new Promise(resolve=>{
   if(dialog){dialog.remove();dialog=null;}
   const dlg=document.createElement("dialog");dlg.className="p3-pick";
   dlg.innerHTML='<h3>Selecciona el operario</h3><p>Un toque para iniciar esta carga. La hora la registra Supabase.</p><div class="p3-pick-list"></div><button type="button" class="p3-cancel">Cancelar</button>';
   const list=dlg.querySelector(".p3-pick-list");
   for(const o of operators){
    const btn=document.createElement("button");btn.type="button";btn.textContent=o.nombre;btn.addEventListener("click",()=>{dlg.close();resolve(o.id);});list.append(btn);
   }
   const add=document.createElement("button");add.type="button";add.textContent="＋ Añadir operario (administración)";
   add.addEventListener("click",async()=>{
    const name=prompt("Nombre del nuevo operario");if(!name)return;
    const {data,error}=await client.rpc("visura_p3_crear_operario",{p_almacen:W,p_nombre:name.trim()});
    if(error){alert("Solo administración puede crear operarios: "+error.message);return;}
    await refresh();dlg.close();resolve(data?.[0]?.id||null);
   });list.append(add);
   dlg.querySelector(".p3-cancel").addEventListener("click",()=>{dlg.close();resolve(null);});
   dlg.addEventListener("close",()=>{dlg.remove();if(dialog===dlg)dialog=null;resolve(null);},{once:true});
   document.body.append(dlg);dialog=dlg;dlg.showModal();
  });
 }
 async function beforeOpen(r,open){
  const s=status(r);
  if(s==="Finalizada"||s==="En preparación"){open();return;}
  const op=await picker();if(!op)return;
  const other=[...state.values()].find(x=>x.almacen===W&&x.operario_id===op&&x.estado==="en_preparacion"&&x.codigo!==r.id);
  const confirmSwitch=!!other;
  if(other&&!confirm("Este operario tiene activa "+other.codigo+". Se cerrará al empezar "+r.id+". ¿Continuar?"))return;
  const ok=await command(r,"iniciar",op,confirmSwitch);
  if(ok)open();
 }
 async function reassign(r){
  if(status(r)!=="En preparación"){alert("Solo se puede reasignar una carga en preparación.");return;}
  const op=await picker();if(!op)return;
  const current=rowOf(r);
  if(current?.operario_id===op)return;
  if(!confirm("Se cerrará el registro del operario anterior y se iniciará uno nuevo. ¿Confirmar?"))return;
  await command(r,"iniciar",op,true);
 }
 async function controlled(r){
  if(!r||status(r)==="Finalizada")return;
  if(!confirm("¿Confirmas que la carga está controlada? Se cerrará su tiempo de preparación con la hora del servidor."))return;
  await command(r,"controlada");
 }
 function remoteOpen(r){
  alert("Copia compartida "+r.codigo+"\nEstado: "+status(r)+"\nOperario: "+(r.operario_nombre||"Sin asignar")+"\nPeso: "+(r.peso_kg??"—")+" kg · "+(r.visitas??"—")+" visitas · "+(r.referencias??"—")+" referencias\n\nEl PDF original está en el otro dispositivo. Impórtalo aquí para comprobar mercancía e imprimir.");
 }
 function initialize(){
  const style=document.createElement("style");
  style.textContent=".p3-pick{border:0;border-radius:18px;padding:22px;max-width:min(94vw,440px);max-height:85vh;color:#173b57;box-shadow:0 18px 90px #101e3a66}.p3-pick::backdrop{background:#0b243b99}.p3-pick h3{font-size:22px;margin:0 0 8px}.p3-pick p{color:#647a8b}.p3-pick-list{display:grid;gap:9px;max-height:55vh;overflow:auto}.p3-pick button{min-height:56px;border:1px solid #cadbe9;border-radius:12px;background:#e5f1fa;color:#163f5d;font-size:17px;font-weight:750;padding:10px}.p3-pick .p3-cancel{margin-top:12px;width:100%;background:#f2f4f7}";
  document.head.append(style);
  setInterval(()=>{
   for(const el of document.querySelectorAll("[data-p3-elapsed]")){
    if(el.dataset.start)el.textContent=t(el.dataset.start,el.dataset.end||null);
   }
  },1000);
  window.addEventListener("online",()=>{void flush().then(syncCopies).catch(e=>notice(String(e.message||e),"warn"));});
  window.addEventListener("focus",()=>{if(Date.now()-lastSync>10000)void refresh().catch(()=>{});});
  setInterval(()=>{if(document.visibilityState==="visible"&&navigator.onLine&&!busy)void refresh().catch(()=>{});},15000);
 }
 initialize();
 try{await refresh();}catch(e){notice("Modo sin conexión: "+String(e.message||e),"warn");}
 await syncCopies().catch(e=>notice(String(e.message||e),"warn"));
 await flush().catch(e=>notice(String(e.message||e),"warn"));
 return {status,badge,remoteRows,remoteCard,beforeOpen,remoteOpen,controlled,reassign,syncCopies,refresh};
}
