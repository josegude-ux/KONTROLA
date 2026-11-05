import {SUPABASE_URL,SUPABASE_KEY,PDF_BUCKET,APP_VERSION} from "./config.mjs";
import {parseDocumentPages} from "./core.mjs";
import {agruparPasillos,ordenarCargas,validacionPublicacion,normalizarCarga,rutaArchivo} from "./logic.mjs";
const $=id=>document.getElementById(id);
let client=null,user=null,profile=null,loads=[],current=null,groups=[],selectedAisle="TODOS",busy=false,opening=false;
$("appVersion").textContent=APP_VERSION;
const visible=(element,show)=>{element.hidden=!show;};
const status=(id,message="",level="")=>{const el=$(id);el.textContent=message;el.className="status "+level;};
const global=(message="",level="")=>status("globalMessage",message,level);
const fmt=n=>n==null?"—":Number(n).toLocaleString("es-ES",{maximumFractionDigits:3});
const errorText=e=>{const msg=String(e?.message||e||"Error");if(/relation .* does not exist|schema cache|could not find the function|PGRST202|PGRST205/i.test(msg))return "KONTROLA aún no tiene instalada la migración de base de datos. Contacta con administración.";return msg;};
const escapeHtml=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function switchView(id,{force=false}={}){
  if(!force&&(busy||opening)){
    global("Hay una operación en curso. Espera a que termine antes de cambiar de pantalla.","error");
    return false;
  }
  for(const element of document.querySelectorAll(".view"))visible(element,element.id===id);
  global();
  window.scrollTo({top:0,behavior:"instant"});
  return true;
}
function loggedOut(message=""){
  user=null;profile=null;loads=[];current=null;
  visible($("shell"),false);visible($("loginView"),true);
  status("authMessage",message,message?"error":"");
}
async function authorize(authUser){
  const {data,error}=await client.from("usuarios_app").select("id,nombre,rol,activo").eq("id",authUser.id).maybeSingle();
  if(error)throw error;
  if(!data?.activo||!["operario","administrador"].includes(data.rol))throw Error("Cuenta no habilitada. Solicita acceso a administración.");
  user=authUser;profile=data;
  $("userName").textContent=data.nombre||authUser.email||"Usuario";
  $("profileName").textContent=data.nombre||authUser.email||"";
  $("profileRole").textContent=data.rol;
  visible($("openAdmin"),data.rol==="administrador");
  visible($("loginView"),false);visible($("shell"),true);switchView("homeView");
}
async function initialize(){
  status("authMessage","Conectando con el servidor…");
  try{
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await client.auth.getUser();
    if(error && !/session missing|auth session missing/i.test(error.message||""))throw error;
    if(data?.user) {
      try{await authorize(data.user)}catch(e){loggedOut(errorText(e));}
    } else loggedOut();
    client.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"||!session)loggedOut();
    });
  }catch(e){loggedOut("No se ha podido conectar con Supabase: "+errorText(e));}
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!client)return status("authMessage","No hay conexión con Supabase.","error");
  const email=$("loginEmail").value.trim(),password=$("loginPassword").value;
  if(!email||!password)return;
  const button=$("loginButton");button.disabled=true;
  status("authMessage","Comprobando credenciales…");
  try{
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw error;
    await authorize(data.user);
    $("loginPassword").value="";
  }catch(err){
    const msg=errorText(err);
    await client.auth.signOut().catch(()=>{});
    status("authMessage",msg,"error");
  }finally{button.disabled=false;}
});
async function refreshLoads(){
  $("loadsList").textContent="Consultando cargas disponibles…";
  const {data,error}=await client.from("kontrola_cargas")
    .select("codigo,fecha,matricula,ruta,repartidor,peso_kg,referencias,productos,documento_ruta,documento_hash,publicado_en")
    .order("peso_kg",{ascending:false}).limit(500);
  if(error){$("loadsList").textContent="No se pueden cargar los documentos: "+errorText(error);throw error;}
  loads=ordenarCargas(data||[]);
  renderLoadList();
}
function renderLoadList(){
  const target=$("loadsList");target.replaceChildren();
  const search=$("loadSearch").value.trim().toLocaleLowerCase("es-ES");
  const records=loads.filter(r=>[r.codigo,r.ruta,r.matricula].some(v=>String(v||"").toLocaleLowerCase("es-ES").includes(search)));
  if(!records.length){const p=document.createElement("p");p.className="muted";p.textContent="No hay cargas publicadas que coincidan con la búsqueda.";target.appendChild(p);return;}
  for(const r of records){
    const b=document.createElement("button");b.type="button";b.className="load-card";
    const a=document.createElement("span"),id=document.createElement("strong"),meta=document.createElement("span");
    id.className="load-title";id.textContent=r.codigo;
    meta.className="load-meta";meta.textContent=[r.repartidor,r.ruta,r.matricula].filter(Boolean).join(" · ")||"Sin datos de ruta";
    a.append(id,meta);
    const weight=document.createElement("span");weight.className="load-weight";weight.textContent=fmt(r.peso_kg)+" kg";
    b.append(a,weight);
    b.addEventListener("click",()=>openLoad(r.codigo));
    target.appendChild(b);
  }
}
$("loadSearch").addEventListener("input",renderLoadList);
$("reloadLoads").addEventListener("click",()=>refreshLoads().catch(()=>{}));
$("openPreparation").addEventListener("click",async()=>{switchView("loadsView");await refreshLoads().catch(()=>{});});
$("openReview").addEventListener("click",()=>{});
$("openAdmin").addEventListener("click",()=>{if(profile?.rol==="administrador")switchView("adminView");});
$("openSettings").addEventListener("click",()=>switchView("settingsView"));
$("goHome").addEventListener("click",()=>switchView("homeView"));
document.querySelectorAll("[data-back='home']").forEach(b=>b.addEventListener("click",()=>switchView("homeView")));
$("backToLoads").addEventListener("click",()=>switchView("loadsView"));
async function openLoad(code){
  if(opening||!user)return;
  const load=loads.find(x=>x.codigo===code);if(!load)return;
  opening=true;global("Registrando el inicio de preparación de "+code+"…");
  try{
    const {data,error}=await client.rpc("kontrola_abrir_carga",{p_codigo:code});
    if(error)throw error;
    current=load;groups=agruparPasillos(load.productos||[]);selectedAisle="TODOS";
    $("detailTitle").textContent=load.codigo;
    $("detailSubtitle").textContent=[load.repartidor,load.ruta].filter(Boolean).join(" · ")||"Preparación por pasillos";
    const notice=$("prepStatus");
    const result=Array.isArray(data)?data[0]:data;
    const alreadyDone=Boolean(result?.finalizada);
    notice.className="info-bar"+(alreadyDone?" complete":"");
    notice.textContent=alreadyDone?"Preparación ya cerrada. Esta consulta no modifica los horarios.":result?.ya_iniciada?"Preparación en curso. Se conserva la hora de inicio original.":"Preparación iniciada. El cambio a otra carga cerrará automáticamente esta preparación.";
    const facts=$("detailFacts");facts.replaceChildren();
    const entries=[["Matrícula",load.matricula||"—"],["Peso",fmt(load.peso_kg)+" kg"],["Referencias",fmt(load.referencias)],["Fecha",load.fecha||"—"]];
    for(const [label,value] of entries){
      const d=document.createElement("div");d.className="fact";
      const small=document.createElement("small");small.textContent=label;
      const strong=document.createElement("b");strong.textContent=value;d.append(small,strong);facts.appendChild(d);
    }
    renderAisles();switchView("detailView",{force:true});
  }catch(err){global("No se pudo abrir esta carga: "+errorText(err),"error");}finally{opening=false;}
}
function renderAisles(){
  const tabs=$("aisleTabs");tabs.replaceChildren();
  for(const name of ["TODOS",...groups.map(x=>x.nombre)]){
    const b=document.createElement("button");b.type="button";b.className="pill"+(name===selectedAisle?" active":"");
    const n=name==="TODOS"?groups.reduce((a,g)=>a+g.lineas.length,0):(groups.find(g=>g.nombre===name)?.lineas.length||0);
    b.textContent=(name==="TODOS"?"Todos":name)+" · "+n;
    b.setAttribute("aria-pressed",String(name===selectedAisle));
    b.addEventListener("click",()=>{selectedAisle=name;renderAisles();});
    tabs.appendChild(b);
  }
  const list=$("productList");list.replaceChildren();
  const relevant=groups.filter(x=>selectedAisle==="TODOS"||selectedAisle===x.nombre);
  if(!relevant.length){const p=document.createElement("p");p.className="muted";p.textContent="Sin líneas de mercancía para este filtro.";list.appendChild(p);}
  for(const group of relevant){
    const title=document.createElement("h2");title.textContent="Pasillo "+group.nombre;
    list.appendChild(title);
    for(const p of group.lineas){
      const row=document.createElement("div");row.className="product";
      const left=document.createElement("div");
      const sku=document.createElement("b");sku.textContent=p.sku;
      const desc=document.createElement("span");desc.className="description";desc.textContent=p.description||"Sin descripción";
      const loc=document.createElement("small");loc.textContent="Ubicación: "+(p.location||"SIN UBICACIÓN");
      left.append(sku,desc,loc);
      const qty=document.createElement("div");qty.className="qty";qty.append(document.createTextNode(fmt(p.qty)));
      const unit=document.createElement("small");unit.textContent=p.unit||"Sin unidad";qty.appendChild(unit);
      row.append(left,qty);list.appendChild(row);
    }
  }
}
$("viewPdf").addEventListener("click",async()=>{
  if(!current?.documento_ruta)return global("No existe un PDF publicado para esta carga.","error");
  // Abrir la pestaña como consecuencia directa del clic, antes de solicitar la URL firmada.
  const popup=window.open("about:blank","_blank");
  if(popup)popup.opener=null;
  try{
    const {data,error}=await client.storage.from(PDF_BUCKET).createSignedUrl(current.documento_ruta,120);
    if(error)throw error;
    if(!data?.signedUrl)throw Error("No se ha obtenido la URL del documento.");
    if(popup&&!popup.closed)popup.location.replace(data.signedUrl);
    else window.location.assign(data.signedUrl);
  }catch(err){if(popup&&!popup.closed)popup.close();global("PDF no disponible: "+errorText(err),"error");}
});
let pdfjsPromise;
async function pdfEngine(){
  if(!pdfjsPromise)pdfjsPromise=import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs").then(m=>{
    m.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";return m;
  }).catch(e=>{pdfjsPromise=null;throw e;});
  return pdfjsPromise;
}
async function parsePDF(file){
  const m=await pdfEngine();
  const pdf=await m.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),cont=await page.getTextContent(),v=page.getViewport({scale:1});
    const items=cont.items.filter(i=>typeof i.str==="string").map(i=>({text:i.str,x:i.transform?.[4]??0,y:v.height-(i.transform?.[5]??0)}));
    pages.push({number:n,width:v.width,items});
  }
  return parseDocumentPages(pages,file.name);
}
$("importPdf").addEventListener("click",async()=>{
  if(profile?.rol!=="administrador"||busy)return;
  const file=$("pdfInput").files?.[0];if(!file)return status("importStatus","Selecciona un PDF.","error");
  if(!/\.pdf$/i.test(file.name)||file.type && file.type!=="application/pdf")return status("importStatus","El archivo debe ser PDF.","error");
  if(file.size>25*1024*1024)return status("importStatus","El PDF supera el límite de 25 MB.","error");
  busy=true;const button=$("importPdf");button.disabled=true;
  try{
    status("importStatus","Analizando las páginas de mercancía…");
    const parsed=await parsePDF(file);
    const reason=validacionPublicacion(parsed);
    if(reason)throw Error(reason);
    const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
    const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
    const {data:old,error:oldError}=await client.from("kontrola_cargas").select("codigo,documento_hash").eq("codigo",parsed.id).maybeSingle();
    if(oldError)throw oldError;
    if(old){
      if(old.documento_hash===hash){status("importStatus","La carga "+parsed.id+" ya está publicada con este mismo PDF.","success");return;}
      throw Error("La carga "+parsed.id+" ya está publicada con otro PDF. No se reemplaza automáticamente; la revisión de documentos corregidos se implementará de forma controlada.");
    }
    const path=rutaArchivo(parsed.id,hash);
    status("importStatus","Publicando PDF privado de "+parsed.id+"…");
    const {error:uploadError}=await client.storage.from(PDF_BUCKET).upload(path,file,{contentType:"application/pdf",upsert:false});
    if(uploadError)throw uploadError;
    const data=normalizarCarga(parsed,hash,path,user.id);
    const {error:insertError}=await client.from("kontrola_cargas").insert(data);
    if(insertError){
      // Solo intenta retirar el objeto que esta operación acaba de subir; la carga previa no se toca.
      await client.storage.from(PDF_BUCKET).remove([path]).catch(()=>{});
      throw insertError;
    }
    status("importStatus","Carga "+parsed.id+" publicada correctamente. Ya puede consultarse desde las cuentas autorizadas.","success");
    $("pdfInput").value="";
  }catch(err){status("importStatus","No publicada: "+errorText(err),"error");}
  finally{busy=false;button.disabled=false;}
});
$("checkUpdates").addEventListener("click",async()=>{
  try{
    status("settingsStatus","Buscando actualización…");
    const res=await fetch("./version.json?t="+Date.now(),{cache:"no-store"});
    if(!res.ok)throw Error("No se pudo consultar la versión.");
    const data=await res.json();
    if(data.version!==APP_VERSION){
      status("settingsStatus","Versión "+data.version+" publicada. Actualiza la aplicación para instalarla.");
      const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.update();
    }else status("settingsStatus","La versión "+APP_VERSION+" es la última publicada.","success");
  }catch(e){status("settingsStatus",errorText(e),"error");}
});
$("logout").addEventListener("click",async()=>{
  if(busy||opening)return status("settingsStatus","Espera a que finalice la operación en curso antes de cerrar sesión.","error");
  if(!client)return;
  await client.auth.signOut().catch(e=>status("settingsStatus",errorText(e),"error"));
  loggedOut();
});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
initialize();
