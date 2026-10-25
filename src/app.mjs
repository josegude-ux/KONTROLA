import {SUPABASE_URL,SUPABASE_KEY,PDF_BUCKET,APP_VERSION} from "./config.mjs";
import {agruparPasillos,ordenarCargas} from "./logic.mjs";
import {buildVerificationLines,parseCheckedQuantity,summarizeVerification} from "./verification.mjs";
import {buildPreparationReport,filterProducts} from "./report.mjs";
import {createAdminController} from "./admin.mjs";
const $=id=>document.getElementById(id);
let client=null,user=null,profile=null,loads=[],current=null,currentPreparation=null,groups=[],selectedAisle="TODOS",busy=false,opening=false;
let reviewLoads=[],currentVerification=null,verificationLines=[];
let warehouses=[],selectedWarehouse=localStorage.getItem("kontrola-warehouse")||"COR_01_COR",adminController=null;
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
  user=null;profile=null;loads=[];current=null;currentPreparation=null;reviewLoads=[];currentVerification=null;verificationLines=[];
  visible($("shell"),false);visible($("loginView"),true);
  status("authMessage",message,message?"error":"");
}
async function authorize(authUser){
  const {data,error}=await client.rpc("kontrola_mi_perfil");
  if(error)throw error;
  const ownProfile=Array.isArray(data)?data[0]:data;
  if(!ownProfile?.activo||ownProfile.id!==authUser.id||!["operario","administrador"].includes(ownProfile.rol))throw Error("Cuenta no habilitada. Solicita acceso a administración.");
  user=authUser;profile=ownProfile;
  $("userName").textContent=ownProfile.nombre||authUser.email||"Usuario";
  $("profileName").textContent=ownProfile.nombre||authUser.email||"";
  $("profileRole").textContent=ownProfile.rol;
  visible($("openAdmin"),ownProfile.rol==="administrador");
  visible($("loginView"),false);visible($("shell"),true);switchView("homeView");
  await loadWarehouses();
  await refreshOperatorDashboard().catch(()=>{});
}
async function loadWarehouses(){
  const {data,error}=await client.rpc("kontrola_mis_almacenes");
  if(error)throw error;
  warehouses=data||[];
  if(!warehouses.some(item=>item.codigo===selectedWarehouse))selectedWarehouse=warehouses[0]?.codigo||"COR_01_COR";
  localStorage.setItem("kontrola-warehouse",selectedWarehouse);
  for(const id of ["homeWarehouse","adminWarehouse"]){
    const select=$(id);select.replaceChildren();
    for(const warehouse of warehouses){const option=document.createElement("option");option.value=warehouse.codigo;option.textContent=warehouse.nombre;select.appendChild(option);}
    select.value=selectedWarehouse;
  }
  renderWarehouseTabs("prepWarehouseTabs");
  renderWarehouseTabs("reviewWarehouseTabs");
}
function renderWarehouseTabs(id){
  const target=$(id);target.replaceChildren();
  for(const warehouse of warehouses){
    const button=document.createElement("button");button.type="button";button.textContent=warehouse.nombre;
    button.className=warehouse.codigo===selectedWarehouse?"active":"";
    button.setAttribute("aria-selected",String(warehouse.codigo===selectedWarehouse));
    button.addEventListener("click",()=>selectWarehouse(warehouse.codigo,id.startsWith("review")?"review":"preparation"));
    target.appendChild(button);
  }
}
async function selectWarehouse(code,context="home"){
  selectedWarehouse=code;localStorage.setItem("kontrola-warehouse",code);
  $("homeWarehouse").value=code;$("adminWarehouse").value=code;
  renderWarehouseTabs("prepWarehouseTabs");renderWarehouseTabs("reviewWarehouseTabs");
  if(context==="review")await refreshReviewLoads();
  else if(context==="preparation")await refreshLoads();
  await refreshOperatorDashboard().catch(()=>{});
}
async function refreshOperatorDashboard(){
  if(!client||!user||!selectedWarehouse)return;
  const [{data:summary,error},{data:activity,error:activityError}]=await Promise.all([
    client.rpc("kontrola_resumen_zona",{p_almacen:selectedWarehouse,p_dia:new Date().toISOString().slice(0,10)}),
    client.from("kontrola_actividad").select("tipo,codigo,creado_en,detalle").eq("almacen",selectedWarehouse).order("creado_en",{ascending:false}).limit(20)
  ]);
  if(error)throw error;
  const values=Array.isArray(summary)?summary[0]:summary,target=$("operatorSummary");target.replaceChildren();
  for(const [label,key] of [["Disponibles","publicadas"],["En preparación","en_preparacion"],["Por verificar","pendientes_verificacion"],["Cerradas","cerradas"]]){
    const card=document.createElement("div");card.className="fact";const small=document.createElement("small"),strong=document.createElement("b");
    small.textContent=label;strong.textContent=Number(values?.[key]||0);card.append(small,strong);target.appendChild(card);
  }
  const log=$("operatorActivity");log.replaceChildren();
  if(activityError){log.textContent=errorText(activityError);return;}
  if(!activity?.length){log.textContent="Todavía no hay actividad registrada.";return;}
  for(const event of activity){const row=document.createElement("p");row.textContent=new Date(event.creado_en).toLocaleString("es-ES")+" · "+event.tipo+" · "+(event.codigo||"");log.appendChild(row);}
}
async function initialize(){
  status("authMessage","Conectando con el servidor…");
  try{
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    adminController=createAdminController({
      client,getUser:()=>user,bucket:PDF_BUCKET,global,errorText,
      onPublished:()=>Promise.all([refreshLoads(),refreshOperatorDashboard()])
    });
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
  const {data,error}=await client.rpc("kontrola_panel_cargas",{p_almacen:selectedWarehouse});
  if(error){$("loadsList").textContent="No se pueden cargar los documentos: "+errorText(error);throw error;}
  loads=ordenarCargas(data||[]);
  renderLoadList();
}
function renderLoadList(){
  const target=$("loadsList");target.replaceChildren();
  const search=$("loadSearch").value.trim().toLocaleLowerCase("es-ES");
  const records=loads.filter(r=>[r.codigo,r.ruta,r.matricula,r.repartidor].some(v=>String(v||"").toLocaleLowerCase("es-ES").includes(search)));
  if(!records.length){const p=document.createElement("p");p.className="muted";p.textContent="No hay cargas publicadas que coincidan con la búsqueda.";target.appendChild(p);return;}
  for(const r of records){
    const b=document.createElement("button");b.type="button";b.className="load-card";
    const a=document.createElement("span"),id=document.createElement("strong"),meta=document.createElement("span");
    id.className="load-title";id.textContent=r.codigo;
    meta.className="load-meta";meta.textContent=[r.repartidor,r.ruta,r.matricula,r.estado].filter(Boolean).join(" · ")||"Sin datos de ruta";
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
$("openReview").addEventListener("click",async()=>{switchView("reviewLoadsView");await refreshReviewLoads().catch(()=>{});});
$("openAdmin").addEventListener("click",async()=>{if(profile?.rol==="administrador"&&switchView("adminView"))await adminController.open().catch(error=>global(errorText(error),"error"));});
$("openSettings").addEventListener("click",()=>switchView("settingsView"));
$("goHome").addEventListener("click",()=>switchView("homeView"));
document.querySelectorAll("[data-back='home']").forEach(b=>b.addEventListener("click",()=>switchView("homeView")));
$("backToLoads").addEventListener("click",()=>switchView("loadsView"));
$("backToReviewLoads").addEventListener("click",()=>switchView("reviewLoadsView"));
async function openLoad(code){
  if(opening||!user)return;
  const load=loads.find(x=>x.codigo===code);if(!load)return;
  current=load;selectedAisle="TODOS";$("productSearch").value="";
  currentPreparation={
    active:load.preparador_id===user.id&&!load.preparacion_fin,
    finalized:Boolean(load.preparacion_fin)
  };
  $("detailTitle").textContent=load.codigo;
  $("detailSubtitle").textContent=[load.repartidor,load.ruta,load.almacen].filter(Boolean).join(" · ")||"Preparación por pasillos";
  const notice=$("prepStatus");
  notice.className="info-bar"+(currentPreparation.finalized?" complete":"");
  notice.textContent=currentPreparation.active?"Preparación en curso. Los cambios confirmados están guardados en el servidor."
    :currentPreparation.finalized?"Preparación finalizada. La consulta no modifica los horarios."
    :"Modo consulta: el reloj no está iniciado.";
  visible($("startPreparation"),!currentPreparation.active&&!currentPreparation.finalized&&load.estado!=="cerrada");
  visible($("finishPreparation"),currentPreparation.active);
  const facts=$("detailFacts");facts.replaceChildren();
  const entries=[["Matrícula",load.matricula||"—"],["Peso",fmt(load.peso_kg)+" kg"],["Referencias",fmt(load.referencias)],["Estado",load.estado||"—"]];
  for(const [label,value] of entries){
    const d=document.createElement("div");d.className="fact";
    const small=document.createElement("small");small.textContent=label;
    const strong=document.createElement("b");strong.textContent=value;d.append(small,strong);facts.appendChild(d);
  }
  renderAisles();switchView("detailView",{force:true});
}
$("startPreparation").addEventListener("click",async()=>{
  if(busy||!current||currentPreparation?.active)return;
  busy=true;$("startPreparation").disabled=true;global("Iniciando preparación…");
  try{
    const {data,error}=await client.rpc("kontrola_iniciar_preparacion",{p_codigo:current.codigo,p_request_id:crypto.randomUUID()});
    if(error)throw error;
    const result=Array.isArray(data)?data[0]:data;
    currentPreparation={active:true,finalized:false};current.preparador_id=user.id;current.preparacion_inicio=result.inicio;current.estado="preparacion_en_curso";
    visible($("startPreparation"),false);visible($("finishPreparation"),true);
    $("prepStatus").textContent="Preparación iniciada con hora del servidor.";global("Preparación guardada en el servidor.","success");
  }catch(error){global("No se pudo iniciar: "+errorText(error),"error");}
  finally{busy=false;$("startPreparation").disabled=false;}
});
$("finishPreparation").addEventListener("click",async()=>{
  if(busy||!current||!currentPreparation?.active)return;
  busy=true;$("finishPreparation").disabled=true;global("Finalizando la preparación de "+current.codigo+"…");
  try{
    const {error}=await client.rpc("kontrola_finalizar_preparacion",{p_codigo:current.codigo});
    if(error)throw error;
    currentPreparation={active:false,finalized:true};current.preparacion_fin=new Date().toISOString();current.estado="preparada";visible($("finishPreparation"),false);
    $("prepStatus").className="info-bar complete";
    $("prepStatus").textContent="Preparación finalizada. La carga ya puede ser verificada por otra persona.";
    global("Preparación finalizada con hora del servidor.","success");
  }catch(error){global("No se pudo finalizar la preparación: "+errorText(error),"error");}
  finally{busy=false;$("finishPreparation").disabled=false;}
});
function renderAisles(){
  const products=filterProducts(current?.productos||[],$("productSearch").value);
  groups=agruparPasillos(products);
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
$("productSearch").addEventListener("input",()=>{selectedAisle="TODOS";renderAisles();});
async function refreshReviewLoads(){
  $("reviewLoadsList").textContent="Consultando cargas preparadas por otros operarios…";
  const {data,error}=await client.rpc("kontrola_panel_cargas",{p_almacen:selectedWarehouse});
  if(error){$("reviewLoadsList").textContent="No se pueden cargar las verificaciones: "+errorText(error);throw error;}
  reviewLoads=ordenarCargas((data||[]).filter(load=>
    load.preparador_id&&load.preparador_id!==user.id&&
    ["preparacion_en_curso","preparada","verificacion_en_curso","cerrada"].includes(load.estado)&&
    (!load.verificador_id||load.verificador_id===user.id)
  ));
  renderReviewLoads();
}
function renderReviewLoads(){
  const target=$("reviewLoadsList");target.replaceChildren();
  const search=$("reviewSearch").value.trim().toLocaleLowerCase("es-ES");
  const records=reviewLoads.filter(r=>[r.codigo,r.ruta,r.matricula,r.repartidor].some(v=>String(v||"").toLocaleLowerCase("es-ES").includes(search)));
  if(!records.length){const p=document.createElement("p");p.className="muted";p.textContent="No hay preparaciones ajenas finalizadas disponibles para verificar.";target.appendChild(p);return;}
  for(const load of records){
    const button=document.createElement("button");button.type="button";button.className="load-card";
    const left=document.createElement("span"),title=document.createElement("strong"),meta=document.createElement("span");
    title.className="load-title";title.textContent=load.codigo;
    const incidents=Number(load.incidencias_pendientes||0);
    const progress=load.estado==="cerrada"?"Finalizada · "+incidents+" incidencia(s)":load.estado==="verificacion_en_curso"?"Continuar verificación":"Pendiente de iniciar";
    meta.className="load-meta";meta.textContent=[load.ruta,load.matricula,progress].filter(Boolean).join(" · ");
    left.append(title,meta);
    const weight=document.createElement("span");weight.className="load-weight";weight.textContent=fmt(load.peso_kg)+" kg";
    button.append(left,weight);button.addEventListener("click",()=>openVerification(load.codigo));target.appendChild(button);
  }
}
$("reviewSearch").addEventListener("input",renderReviewLoads);
$("reloadReviewLoads").addEventListener("click",()=>refreshReviewLoads().catch(()=>{}));
async function openVerification(code){
  if(opening||!user)return;
  const load=reviewLoads.find(item=>item.codigo===code);if(!load)return;
  current=load;currentVerification=null;verificationLines=buildVerificationLines(load.productos||[]);
  $("reviewDetailTitle").textContent=load.codigo;
  $("reviewDetailSubtitle").textContent=[load.repartidor,load.ruta,load.matricula,load.almacen].filter(Boolean).join(" · ")||"Carga preparada";
  switchView("reviewDetailView",{force:true});
  if(!load.verificador_id){renderVerification();return;}
  opening=true;global("Recuperando el trabajo guardado de "+code+"…");
  try{
    await startOrResumeVerification(load);
  }catch(err){global("No se pudo recuperar esta verificación: "+errorText(err),"error");}
  finally{opening=false;}
}
async function startOrResumeVerification(load){
    const {data,error}=await client.rpc("kontrola_iniciar_verificacion",{p_codigo:load.codigo,p_request_id:crypto.randomUUID()});
    if(error)throw error;
    const started=Array.isArray(data)?data[0]:data,id=started.id;
    const {data:lines,error:linesError}=await client.from("kontrola_verificacion_lineas")
      .select("linea,sku,descripcion,ubicacion,prevista_cantidad,unidad,comprobada_cantidad,comprobada_en")
      .eq("verificacion_id",id).order("linea",{ascending:true});
    if(linesError)throw linesError;
    load.estado=started.estado==="finalizada"?"cerrada":"verificacion_en_curso";load.verificador_id=user.id;
    currentVerification={id,load,finished:started.estado==="finalizada"};
    verificationLines=(lines||[]).map(line=>({
      lineNumber:Number(line.linea),sku:line.sku,description:line.descripcion,location:line.ubicacion,
      expectedQuantity:Number(line.prevista_cantidad),unit:line.unidad,
      checkedQuantity:line.comprobada_cantidad===null?null:Number(line.comprobada_cantidad),
      checkedAt:line.comprobada_en
    }));
    renderVerification();
}
$("startVerification").addEventListener("click",async()=>{
  if(busy||currentVerification||!current)return;
  busy=true;$("startVerification").disabled=true;global("Iniciando verificación…");
  try{await startOrResumeVerification(current);global("Verificación iniciada y guardada en el servidor.","success");}
  catch(error){global("No se pudo iniciar: "+errorText(error),"error");}
  finally{busy=false;$("startVerification").disabled=false;renderVerification();}
});
function renderVerification(){
  const summary=summarizeVerification(verificationLines);
  const reviewStatus=$("reviewStatus");
  reviewStatus.className="info-bar"+(currentVerification?.finished?" complete":summary.differences?" warning":"");
  reviewStatus.textContent=!currentVerification?"Modo consulta: inicia explícitamente la verificación para registrar cantidades.":currentVerification.finished
    ?"Verificación finalizada. La carga está cerrada en KONTROLA; las regularizaciones pendientes se realizan manualmente en Business Central."
    :summary.pending
      ?"Verificación en curso. Faltan "+summary.pending+" línea(s)."
      :"Todas las líneas están comprobadas. Puedes cerrar la carga aunque existan diferencias.";
  const progress=$("reviewProgress");progress.replaceChildren();
  for(const [label,value] of [["Líneas",summary.total],["Comprobadas",summary.checked],["Pendientes",summary.pending],["Diferencias",summary.differences]]){
    const fact=document.createElement("div");fact.className="fact";
    const small=document.createElement("small");small.textContent=label;
    const strong=document.createElement("b");strong.textContent=String(value);fact.append(small,strong);progress.appendChild(fact);
  }
  const target=$("verificationLines");target.replaceChildren();
  for(const line of verificationLines){
    const checked=line.checkedQuantity!==null;
    const difference=checked?line.checkedQuantity-line.expectedQuantity:null;
    const card=document.createElement("article");
    card.className="verification-line"+(checked?" is-checked":"")+(difference?" has-difference":"");
    const heading=document.createElement("div");heading.className="verification-line-head";
    const info=document.createElement("div"),sku=document.createElement("b"),description=document.createElement("span"),location=document.createElement("small");
    sku.textContent=line.sku;description.className="description";description.textContent=line.description||"Sin descripción";
    location.textContent="Ubicación: "+(line.location||"SIN UBICACIÓN");info.append(sku,description,location);
    const expected=document.createElement("span");expected.className="expected";expected.textContent=fmt(line.expectedQuantity)+" "+(line.unit||"");
    heading.append(info,expected);card.appendChild(heading);
    const form=document.createElement("form");form.className="verification-entry";
    const label=document.createElement("label");label.textContent="Cantidad física";
    const input=document.createElement("input");input.type="text";input.inputMode="decimal";input.required=true;
    input.autocomplete="off";input.value=checked?String(line.checkedQuantity).replace(".",","):"";
    input.setAttribute("aria-label","Cantidad física de "+line.sku);input.disabled=!currentVerification||currentVerification.finished;
    const save=document.createElement("button");save.type="submit";save.className="secondary";
    save.textContent=checked?"Actualizar":"Registrar";save.disabled=!currentVerification||currentVerification.finished;
    label.appendChild(input);form.append(label,save);
    form.addEventListener("submit",event=>{event.preventDefault();saveVerificationLine(line,input.value);});
    card.appendChild(form);
    if(checked){
      const note=document.createElement("p");note.className=difference?"difference-note":"match-note";
      note.textContent=difference
        ?"Diferencia: "+(difference>0?"+":"")+fmt(difference)+" "+(line.unit||"")
        :"Cantidad conforme";
      card.appendChild(note);
    }
    target.appendChild(card);
  }
  visible($("startVerification"),!currentVerification);
  $("finishVerification").disabled=!currentVerification||!summary.canFinish||currentVerification.finished||busy;
}
async function saveVerificationLine(line,rawQuantity){
  if(busy||currentVerification?.finished)return;
  let quantity;
  try{quantity=parseCheckedQuantity(rawQuantity);}catch(error){return global(errorText(error),"error");}
  busy=true;renderVerification();global("Registrando "+line.sku+"…");
  try{
    const {error}=await client.rpc("kontrola_registrar_linea",{
      p_verificacion:currentVerification.id,p_linea:line.lineNumber,p_cantidad:quantity
    });
    if(error)throw error;
    line.checkedQuantity=quantity;line.checkedAt=new Date().toISOString();
    global("Cantidad registrada con hora del servidor.","success");
  }catch(error){global("No se pudo registrar la línea: "+errorText(error),"error");}
  finally{busy=false;renderVerification();}
}
$("finishVerification").addEventListener("click",async()=>{
  if(busy||currentVerification?.finished)return;
  const summary=summarizeVerification(verificationLines);if(!summary.canFinish)return;
  busy=true;renderVerification();global("Cerrando la verificación…");
  try{
    const {data,error}=await client.rpc("kontrola_finalizar_verificacion",{p_verificacion:currentVerification.id});
    if(error)throw error;
    const result=Array.isArray(data)?data[0]:data;
    currentVerification.finished=true;
    currentVerification.load.estado="cerrada";
    currentVerification.load.incidencias_pendientes=Number(result?.incidencias_pendientes||0);
    global("Carga cerrada. Incidencias pendientes: "+Number(result?.incidencias_pendientes||0)+".","success");
  }catch(error){global("No se pudo finalizar: "+errorText(error),"error");}
  finally{busy=false;renderVerification();}
});
async function openCurrentPdf(){
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
}
function showCurrentReport(){
  if(!current)return;
  $("reportPaper").innerHTML=buildPreparationReport(current);
  $("reportTitle").textContent="Hoja procesada · "+current.codigo;
  $("reportView").hidden=false;document.body.classList.add("report-open");window.scrollTo(0,0);
}
$("viewPdf").addEventListener("click",openCurrentPdf);
$("reviewPdf").addEventListener("click",openCurrentPdf);
$("viewPreparationSheet").addEventListener("click",showCurrentReport);
$("reviewSheet").addEventListener("click",showCurrentReport);
$("homeWarehouse").addEventListener("change",event=>selectWarehouse(event.target.value,"home"));
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
function renderConnection(){
  const target=$("connectionStatus");target.textContent=navigator.onLine?"En línea":"Sin conexión · no se guardará";
  target.className="connection-status"+(navigator.onLine?"":" offline");
}
window.addEventListener("online",()=>{renderConnection();global("Conexión recuperada. Actualiza la pantalla para recuperar el trabajo guardado.","success");});
window.addEventListener("offline",()=>{renderConnection();global("Sin conexión. KONTROLA no confirmará operaciones hasta recuperar la red.","error");});
renderConnection();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
initialize();
