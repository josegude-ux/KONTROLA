import {fechaAlmacen} from "./business-date.mjs";
import {filtrarArchivoLogico} from "./archive-view.mjs";
import {SUPABASE_URL,SUPABASE_KEY,PDF_BUCKET,APP_VERSION} from "./config.mjs";
import {agruparPasillos,ordenarCargas} from "./logic.mjs";
import {buildVerificationLines,parseCheckedQuantity,summarizeVerification} from "./verification.mjs";
import {buildPreparationReport,filterProducts,desglosarBultos,totalBultosDelDesglose} from "./report.mjs";
import {filtrarHistorial,resumenHistorial,formatoFechaCarga,csvHistorial,htmlResumenHistorial} from "./history.mjs";
import {createAdminController} from "./admin.mjs";
const $=id=>document.getElementById(id);
let client=null,user=null,profile=null,loads=[],current=null,currentPreparation=null,groups=[],selectedAisle="TODOS",busy=false,opening=false;
let reviewLoads=[],currentVerification=null,verificationLines=[];
let warehouses=[],selectedWarehouse=localStorage.getItem("kontrola-warehouse")||"COR_01_COR",adminController=null;
let loadsParent="homeView",reviewLoadsParent="homeView",loadsMode="preparacion",currentReadOnly=false,detailBackView="loadsView",historyRows=[],historyReady=false,adminParent="homeView",prepTimerId=null;
$("appVersion").textContent=APP_VERSION;
$("loginVersion").textContent=APP_VERSION;
const visible=(element,show)=>{element.hidden=!show;};
const status=(id,message="",level="")=>{const el=$(id);el.textContent=message;el.className="status "+level;};
const global=(message="",level="")=>status("globalMessage",message,level);
const fmt=n=>n==null?"—":Number(n).toLocaleString("es-ES",{maximumFractionDigits:3});
const validRequest=(warehouse,userId)=>selectedWarehouse===warehouse&&user?.id===userId;
const errorText=e=>{const msg=String(e?.message||e||"Error");if(/relation .* does not exist|schema cache|could not find the function|PGRST202|PGRST205/i.test(msg))return "KONTROLA aún no tiene instalada la migración de base de datos. Contacta con administración.";return msg;};
const escapeHtml=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function switchView(id,{force=false}={}){
  if(!force&&(busy||opening)){
    global("Hay una operación en curso. Espera a que termine antes de cambiar de pantalla.","error");
    return false;
  }
  for(const element of document.querySelectorAll(".view"))visible(element,element.id===id);
  // El único botón visible de retorno se mantiene en la barra superior fija.
  $("globalBack").hidden=id==="homeView";
  if(id!=="detailView")stopPreparationClock();
  global();
  window.scrollTo({top:0,behavior:"instant"});
  return true;
}
function loggedOut(message=""){
  user=null;profile=null;loads=[];historyRows=[];historyReady=false;current=null;currentPreparation=null;currentReadOnly=false;reviewLoads=[];currentVerification=null;verificationLines=[];
  stopPreparationClock();
  $("globalBack").hidden=true;
  adminController?.clearSensitive?.();
  // El mismo móvil puede utilizarse por varios trabajadores: eliminar también
  // datos anteriores de vistas ocultas y deshabilitar descargas del historial.
  for(const id of ["userName","profileName","profileRole","globalMessage",
    "operatorSummary","operatorSummaryStatus","operatorActivity","loadsList","reviewLoadsList",
    "historyList","historySummary","historyStatusMessage","productList",
    "verificationLines","detailFacts","detailTitle","detailSubtitle",
    "prepStatus","aisleTabs","reviewDetailTitle","reviewDetailSubtitle",
    "reviewStatus","reviewProgress","reportTitle","reportPaper","settingsStatus"]){
    const node=$(id);if(node)node.replaceChildren();
  }
  $("loginPassword").value="";
  $("historyDownload").disabled=true;$("historyPrint").disabled=true;
  visible($("reportView"),false);
  document.body.classList.remove("report-open");
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
  visible($("cargasAdministrar"),ownProfile.rol==="administrador");
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
  for(const id of ["homeWarehouse","adminWarehouse","historyWarehouse"]){
    const select=$(id);select.replaceChildren();
    for(const warehouse of warehouses){const option=document.createElement("option");option.value=warehouse.codigo;option.textContent=warehouse.nombre;select.appendChild(option);}
    select.value=selectedWarehouse;
  }
  renderWarehouseTabs("prepWarehouseTabs");
  renderWarehouseTabs("reviewWarehouseTabs");
  updateWarehouseLabels();
}
function warehouseLabel(){return warehouses.find(w=>w.codigo===selectedWarehouse)?.nombre||selectedWarehouse;}
function updateWarehouseLabels(){
  $("loadsWarehouseHint").textContent="Almacén seleccionado: "+warehouseLabel()+". Solo se muestran las cargas de este almacén.";
  $("reviewWarehouseHint").textContent="Almacén seleccionado: "+warehouseLabel()+". Se muestran cargas preparadas por otro operario.";
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
  $("homeWarehouse").value=code;$("adminWarehouse").value=code;$("historyWarehouse").value=code;
  renderWarehouseTabs("prepWarehouseTabs");renderWarehouseTabs("reviewWarehouseTabs");
  updateWarehouseLabels();
  if(context==="review")await refreshReviewLoads();
  else if(context==="preparation")await refreshLoads();
  else if(context==="history")await refreshHistory();
  await refreshOperatorDashboard().catch(()=>{});
}
async function refreshOperatorDashboard(){
  if(!client||!user||!selectedWarehouse)return;
  const warehouse=selectedWarehouse,userId=user.id;
  const summaryStatus=$("operatorSummaryStatus");
  const warehouseName=warehouses.find(item=>item.codigo===warehouse)?.nombre||warehouse;
  summaryStatus.className="status";
  summaryStatus.textContent="Consultando datos de "+warehouseName+"…";
  const {data:summary,error}=await client.rpc("kontrola_resumen_zona",{p_almacen:warehouse,p_dia:fechaAlmacen()});
  if(!validRequest(warehouse,userId))return;
  if(error){
    $("operatorSummary").replaceChildren();
    summaryStatus.className="status error";
    summaryStatus.textContent="No se han podido consultar las cargas de "+warehouseName+": "+errorText(error)+". Los datos del servidor no se han borrado.";
    return;
  }
  const values=Array.isArray(summary)?summary[0]:summary;
  if(!values){
    $("operatorSummary").replaceChildren();
    summaryStatus.className="status error";
    summaryStatus.textContent="El servidor no ha devuelto el resumen de "+warehouseName+". Comprueba la conexión y pulsa Actualizar.";
    return;
  }
  const target=$("operatorSummary");target.replaceChildren();
  const counters=[["Disponibles","publicadas"],["En preparación","en_preparacion"],["Por verificar","pendientes_verificacion"],["Cerradas","cerradas"]];
  let sum=0;
  for(const [label,key] of counters){
    const value=Number(values[key]||0);
    sum+=value;
    const card=document.createElement("div");card.className="fact";const small=document.createElement("small"),strong=document.createElement("b");
    small.textContent=label;strong.textContent=value;card.append(small,strong);target.appendChild(card);
  }
  summaryStatus.className="status"+(sum===0?" warning":"");
  summaryStatus.textContent=sum===0
    ?"Sin cargas en "+warehouseName+" con estos estados. Comprueba el almacén seleccionado: mostrar cero no significa que los datos se hayan eliminado."
    :"Mostrando datos de "+warehouseName+".";
}
async function initialize(){
  status("authMessage","Conectando con el servidor…");
  try{
    const {createClient}=await import("../vendor/supabase.mjs");
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
  const warehouse=selectedWarehouse,userId=user?.id;
  loads=[];$("loadsList").textContent="Consultando cargas disponibles…";
  const [panel,archivo]=await Promise.all([client.rpc("kontrola_panel_cargas_v2",{p_almacen:warehouse}),client.rpc("kontrola_codigos_archivados",{p_almacen:warehouse})]);
  if(!validRequest(warehouse,userId))return;
  if(panel.error||archivo.error){const err=panel.error||archivo.error;$("loadsList").textContent="No se pueden cargar los documentos: "+errorText(err);throw err;}
  const archivados=new Set((archivo.data||[]).map(r=>r.codigo));
  loads=ordenarCargas(filtrarArchivoLogico((panel.data||[]).map(r=>({...r,archivado:archivados.has(r.codigo)})),{vista:"activas"}));
  renderLoadList();
}
function renderLoadList(){
  const target=$("loadsList");target.replaceChildren();
  const search=$("loadSearch").value.trim().toLocaleLowerCase("es-ES");
  const records=loads.filter(r=>[r.codigo,r.ruta,r.matricula,r.repartidor].some(v=>String(v||"").toLocaleLowerCase("es-ES").includes(search)));
  if(!records.length){const p=document.createElement("p");p.className="muted";p.textContent=!loads.length?"No hay cargas publicadas en "+warehouseLabel()+". Comprueba el almacén seleccionado arriba.":"No hay cargas de "+warehouseLabel()+" que coincidan con el filtro. Borra la búsqueda.";target.appendChild(p);return;}
  for(const r of records){
    const b=document.createElement("button");b.type="button";b.className="load-card";
    const a=document.createElement("span"),id=document.createElement("strong"),meta=document.createElement("span");
    id.className="load-title";id.textContent=r.codigo;
    meta.className="load-meta";meta.textContent=[r.repartidor,r.ruta,r.estado].filter(Boolean).join(" · ")||"Sin datos de ruta";
    const plate=document.createElement("span");plate.className="load-plate";
    const plateLabel=document.createElement("span");plateLabel.className="load-plate-label";plateLabel.textContent="MATRÍCULA";
    const plateValue=document.createElement("strong");plateValue.className="load-plate-value";plateValue.textContent=r.matricula||"—";
    plate.append(plateLabel,plateValue);
    // El campo "huecos de palés del camión" no equivale a palés que hay que preparar.
    // El espacio queda previsto, sin derivar cantidades de capacidad del vehículo.
    const vehicle=document.createElement("span");vehicle.className="load-vehicle";
    const pallets=document.createElement("span");pallets.className="load-pallets";
    const palletsLabel=document.createElement("span");palletsLabel.className="load-pallets-label";palletsLabel.textContent="PALÉS PARA CARGA";
    const palletsValue=document.createElement("strong");palletsValue.className="load-pallets-value";
    const palletsCount=r.palets_para_carga;
    const hasPallets=palletsCount!==null&&palletsCount!==undefined&&palletsCount!==""&&Number.isInteger(Number(palletsCount))&&Number(palletsCount)>=0;
    palletsValue.textContent=hasPallets?fmt(palletsCount):"—";
    if(!hasPallets)pallets.title="Pendiente de identificar el número real de palés para preparar la carga";
    pallets.append(palletsLabel,palletsValue);vehicle.append(plate,pallets);
    const bundles=document.createElement("span");bundles.className="load-bundles";
    // Reutiliza el desglose por unidades de la hoja de preparación.
    const breakdown=desglosarBultos(r.productos);
    bundles.textContent="Bultos desglosados: "+(breakdown.length
      ?breakdown.map(({cantidad,unidad})=>fmt(cantidad)+" "+unidad).join(" · ")
      :"Sin desglose disponible");
    // Total únicamente de líneas válidas, calculado sobre ese mismo desglose.
    // Nunca mostrar cero cuando no existe desglose.
    const totalBultos=totalBultosDelDesglose(breakdown);
    a.append(id,meta,vehicle,bundles);
    const summary=document.createElement("span");summary.className="load-card-summary";
    const total=document.createElement("span");total.className="load-bundles-total";
    total.textContent=totalBultos===null?"— bultos":fmt(totalBultos)+" bultos";
    const weight=document.createElement("span");weight.className="load-weight";weight.textContent=fmt(r.peso_kg)+" kg";
    summary.append(total,weight);
    b.append(a,summary);
    b.addEventListener("click",()=>openLoad(r.codigo));
    target.appendChild(b);
  }
}
// Historial de lectura; los datos proceden del mismo RPC con permisos por almacén.
async function refreshHistory(){
  if(!client||!user)return;
  const warehouse=selectedWarehouse,requestUser=user.id;
  historyRows=[];historyReady=false;
  $("historyDownload").disabled=true;$("historyPrint").disabled=true;
  $("historyList").replaceChildren();$("historySummary").replaceChildren();
  status("historyStatusMessage","Cargando el historial autorizado…");
  try{
    const [panel,archivo]=await Promise.all([client.rpc("kontrola_panel_cargas",{p_almacen:warehouse}),client.rpc("kontrola_codigos_archivados",{p_almacen:warehouse})]);
    if(panel.error||archivo.error)throw panel.error||archivo.error;
    if(!validRequest(warehouse,requestUser))return;
    const archivados=new Set((archivo.data||[]).map(r=>r.codigo));
    historyRows=filtrarArchivoLogico((panel.data||[]).map(r=>({...r,archivado:archivados.has(r.codigo)})),{vista:"todas"});historyReady=true;
    renderHistory();
  }catch(error){
    if(!validRequest(warehouse,requestUser))return;
    historyRows=[];historyReady=false;
    status("historyStatusMessage","No se pudo consultar el historial: "+errorText(error),"error");
  }
}
const historyFilters=()=>({fecha:$("historyDate").value,estado:$("historyStatus").value,busqueda:$("historySearch").value});
function filteredHistory(){return filtrarHistorial(historyRows,historyFilters());}
function renderHistory(){
  const filtered=filteredHistory();
  $("historyDownload").disabled=!historyReady||!filtered.length;
  $("historyPrint").disabled=!historyReady||!filtered.length;
  const summary=resumenHistorial(filtered),stats=$("historySummary");stats.replaceChildren();
  for(const [label,value] of [
    ["Cargas",summary.cargas],["Peso total",fmt(summary.pesoKg)+" kg"],
    ["Referencias",fmt(summary.referencias)],["Cerradas",summary.cerradas],
    ["Incidencias pendientes",summary.incidencias]
  ]){
    const fact=document.createElement("div");fact.className="fact";
    const small=document.createElement("small"),strong=document.createElement("b");
    small.textContent=label;strong.textContent=String(value);
    fact.append(small,strong);stats.appendChild(fact);
  }
  const list=$("historyList");list.replaceChildren();
  status("historyStatusMessage",filtered.length===historyRows.length
    ?filtered.length+" carga(s) del almacén seleccionado."
    :filtered.length+" de "+historyRows.length+" carga(s) según los filtros.");
  if(!filtered.length){
    const empty=document.createElement("p");empty.className="muted";
    empty.textContent=historyRows.length?"No hay cargas que coincidan con los filtros.":"Todavía no hay cargas publicadas en este almacén.";
    list.appendChild(empty);return;
  }
  for(const load of filtered){
    const button=document.createElement("button");button.type="button";button.className="load-card";
    const left=document.createElement("span"),title=document.createElement("strong"),details=document.createElement("span");
    title.className="load-title";title.textContent=String(load.codigo||"Sin código");
    details.className="load-meta";
    details.textContent=[formatoFechaCarga(load.fecha),load.estado,load.ruta,load.repartidor,load.matricula]
      .filter(Boolean).join(" · ");
    left.append(title,details);
    const weight=document.createElement("span");weight.className="load-weight";
    weight.textContent=fmt(load.peso_kg)+" kg";
    button.append(left,weight);
    button.addEventListener("click",()=>openLoad(load.codigo,{
      source:historyRows,returnTo:"cargasHistoryView",readOnly:true
    }));
    list.appendChild(button);
  }
}
for(const id of ["historyDate","historyStatus","historySearch"]){
  $(id).addEventListener("input",renderHistory);
}
$("historyClear").addEventListener("click",()=>{
  $("historyDate").value="";$("historyStatus").value="";$("historySearch").value="";
  renderHistory();
});
$("historyRefresh").addEventListener("click",()=>refreshHistory().catch(()=>{}));
$("historyDownload").addEventListener("click",()=>{
  if(!historyReady||!historyRows.length)return;
  const records=filteredHistory();if(!records.length)return;
  const text=csvHistorial(records,selectedWarehouse);
  const blob=new Blob([text],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="KONTROLA_Cargas_"+selectedWarehouse+"_"+(historyFilters().fecha||"historial")+".csv";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("historyPrint").addEventListener("click",()=>{
  if(!historyReady||!historyRows.length)return;
  const records=filteredHistory();if(!records.length)return;
  $("reportPaper").innerHTML=htmlResumenHistorial(records,{
    almacen:warehouses.find(w=>w.codigo===selectedWarehouse)?.nombre||selectedWarehouse,...historyFilters()
  });
  $("reportTitle").textContent="Resumen de cargas · "+selectedWarehouse;
  $("reportView").hidden=false;document.body.classList.add("report-open");window.scrollTo(0,0);
});

$("historyWarehouse").addEventListener("change",event=>selectWarehouse(event.target.value,"history").catch(err=>status("historyStatusMessage",errorText(err),"error")));

$("loadSearch").addEventListener("input",renderLoadList);
$("reloadLoads").addEventListener("click",()=>refreshLoads().catch(()=>{}));
function openLoadsMenu(parent="homeView",mode="preparacion"){
  if(!switchView("loadsView"))return;
  loadsParent=parent;loadsMode=mode;
  $("loadSearch").value="";
  $("loadsHeading").textContent=mode==="consulta"?"Consulta de cargas":"Preparación de cargas";
  $("loadsDescription").textContent=mode==="consulta"
    ?"Modo de solo lectura: consulta la mercancía y los PDF sin modificar los tiempos de preparación."
    :"Al seleccionar una carga publicada, la preparación y el reloj comienzan automáticamente. Para consultar sin iniciar, utiliza Control de Cargas → Consultar cargas.";
  refreshLoads().catch(()=>{});
}
function openReviewMenu(parent="homeView"){
  if(!switchView("reviewLoadsView"))return;
  reviewLoadsParent=parent;
  $("reviewSearch").value="";
  refreshReviewLoads().catch(()=>{});
}
async function openAdminMenu(parent="homeView"){
  if(profile?.rol!=="administrador"||!switchView("adminView"))return;
  adminParent=parent;
  await adminController.open().catch(error=>global(errorText(error),"error"));
}
$("openPreparation").addEventListener("click",()=>openLoadsMenu());
$("openReview").addEventListener("click",()=>openReviewMenu());
$("openCargas").addEventListener("click",()=>switchView("cargasMenuView"));
$("cargasConsultar").addEventListener("click",()=>openLoadsMenu("cargasMenuView","consulta"));
$("cargasPreparar").addEventListener("click",()=>openLoadsMenu("cargasMenuView"));
$("cargasVerificar").addEventListener("click",()=>openReviewMenu("cargasMenuView"));
$("cargasHistorial").addEventListener("click",()=>{if(switchView("cargasHistoryView"))refreshHistory().catch(()=>{});});
$("backFromHistory").addEventListener("click",()=>switchView("cargasMenuView"));
$("cargasAdministrar").addEventListener("click",()=>openAdminMenu("cargasMenuView"));
$("openAdmin").addEventListener("click",()=>openAdminMenu("homeView"));
$("backFromLoads").addEventListener("click",()=>switchView(loadsParent));
$("backFromReviewLoads").addEventListener("click",()=>switchView(reviewLoadsParent));
$("openSettings").addEventListener("click",()=>switchView("settingsView"));
$("goHome").addEventListener("click",()=>switchView("homeView"));
document.querySelectorAll("[data-back='home']").forEach(b=>b.addEventListener("click",()=>switchView("homeView")));
$("backToLoads").addEventListener("click",()=>switchView(detailBackView));
$("backToReviewLoads").addEventListener("click",()=>switchView("reviewLoadsView"));
$("globalBack").addEventListener("click",()=>{
  const view=document.querySelector("#shell .view:not([hidden])")?.id;
  const backButtons={
    cargasHistoryView:"backFromHistory",
    loadsView:"backFromLoads",
    detailView:"backToLoads",
    reviewLoadsView:"backFromReviewLoads",
    reviewDetailView:"backToReviewLoads"
  };
  if(view==="cargasMenuView"||view==="settingsView")switchView("homeView");
  else if(view==="adminView")switchView(adminParent);
  else if(backButtons[view])$(backButtons[view]).click();
});
function stopPreparationClock(){
  if(prepTimerId!==null){clearInterval(prepTimerId);prepTimerId=null;}
}
function formatPreparationDuration(start,end=Date.now()){
  const began=new Date(start).getTime();
  const ended=typeof end==="number"?end:new Date(end).getTime();
  if(!Number.isFinite(began)||!Number.isFinite(ended))return "—";
  const seconds=Math.max(0,Math.floor((ended-began)/1000));
  const hours=String(Math.floor(seconds/3600)).padStart(2,"0");
  const minutes=String(Math.floor(seconds%3600/60)).padStart(2,"0");
  return hours+":"+minutes+":"+String(seconds%60).padStart(2,"0");
}
function renderPreparationClock(){
  const clock=$("prepClock");
  if(currentReadOnly||!current||!current.preparacion_inicio){clock.hidden=true;return;}
  clock.hidden=false;
  if(currentPreparation?.active)clock.textContent="Tiempo de preparación · "+formatPreparationDuration(current.preparacion_inicio);
  else if(currentPreparation?.finalized&&current.preparacion_fin)
    clock.textContent="Tiempo de preparación finalizado · "+formatPreparationDuration(current.preparacion_inicio,current.preparacion_fin);
  else clock.hidden=true;
}
function startPreparationClock(){
  stopPreparationClock();
  renderPreparationClock();
  if(currentPreparation?.active)prepTimerId=setInterval(()=>{
    if(!document.hidden)renderPreparationClock();
  },1000);
}
async function startCurrentPreparation(){
  if(busy||!current||currentReadOnly||currentPreparation?.active||currentPreparation?.finalized||current.estado==="cerrada")return;
  const code=current.codigo,requestUser=user?.id;
  busy=true;$("startPreparation").disabled=true;
  $("prepStatus").textContent="Iniciando automáticamente la preparación con hora del servidor…";
  global("Registrando el inicio de "+code+" en Supabase…");
  try{
    const {data,error}=await client.rpc("kontrola_iniciar_preparacion",{p_codigo:code,p_request_id:crypto.randomUUID()});
    if(error)throw error;
    if(user?.id!==requestUser||current?.codigo!==code)return;
    const result=Array.isArray(data)?data[0]:data;
    if(!result?.inicio)throw Error("El servidor no ha confirmado la hora de inicio.");
    // Las cargas finalizadas no vuelven a abrirse ni crean relojes nuevos.
    if(current.preparacion_fin){
      currentPreparation={active:false,finalized:true};
      $("prepStatus").textContent="Esta preparación ya estaba finalizada.";
      visible($("startPreparation"),false);
      return;
    }
    currentPreparation={active:true,finalized:false};
    current.preparador_id=requestUser;current.preparacion_inicio=result.inicio;current.estado="preparacion_en_curso";
    visible($("startPreparation"),false);visible($("finishPreparation"),true);
    $("prepStatus").className="info-bar";
    $("prepStatus").textContent="Preparación activa. Inicio registrado por el servidor; el tiempo continúa al salir de esta pantalla.";
    startPreparationClock();
    global("Preparación de "+code+" iniciada correctamente.","success");
    refreshOperatorDashboard().catch(()=>{});
  }catch(error){
    if(user?.id!==requestUser||current?.codigo!==code)return;
    $("prepStatus").className="info-bar warning";
    $("prepStatus").textContent="No se pudo iniciar la preparación. No se ha confirmado ningún cambio en el servidor.";
    $("startPreparation").textContent="Reintentar inicio de preparación";
    visible($("startPreparation"),true);
    global("No se pudo iniciar "+code+": "+errorText(error),"error");
  }finally{busy=false;$("startPreparation").disabled=false;}
}
async function openLoad(code,{source=loads,returnTo="loadsView",readOnly=loadsMode==="consulta"}={}){
  if(opening||busy||!user)return;
  const load=source.find(x=>x.codigo===code);if(!load)return;
  // Consultar y revisar nunca inicia ni interrumpe relojes de preparación.
  const assignedToOther=Boolean(load.preparador_id&&load.preparador_id!==user.id);
  currentReadOnly=readOnly||assignedToOther||["cerrada","verificacion_en_curso"].includes(load.estado);
  detailBackView=returnTo;
  current=load;selectedAisle="TODOS";$("productSearch").value="";
  currentPreparation={
    active:load.preparador_id===user.id&&Boolean(load.preparacion_inicio)&&!load.preparacion_fin,
    finalized:Boolean(load.preparacion_fin)
  };
  $("detailModeLabel").textContent=currentReadOnly?"CONSULTA DE CARGA":"PREPARACIÓN POR PASILLOS";
  $("detailTitle").textContent=load.codigo;
  $("detailSubtitle").textContent=[load.repartidor,load.ruta,load.almacen].filter(Boolean).join(" · ")||"Preparación por pasillos";
  const notice=$("prepStatus");
  notice.className="info-bar"+(currentPreparation.finalized?" complete":"");
  notice.textContent=assignedToOther?"Carga asignada a otro preparador. Puedes consultar sin modificar el reloj."
    :currentReadOnly?"Solo lectura: consultar no inicia, finaliza ni cambia preparaciones."
    :currentPreparation.active?"Preparación ya iniciada. Tiempo registrado en Supabase."
    :currentPreparation.finalized?"Preparación finalizada; la consulta no cambia los horarios."
    :"Se registrará automáticamente el inicio al abrir esta carga.";
  visible($("startPreparation"),false);
  visible($("finishPreparation"),!currentReadOnly&&currentPreparation.active);
  $("startPreparation").textContent="Reintentar inicio de preparación";
  const facts=$("detailFacts");facts.replaceChildren();
  const entries=[["Matrícula",load.matricula||"—"],["Peso",fmt(load.peso_kg)+" kg"],["Referencias",fmt(load.referencias)],["Estado",load.estado||"—"]];
  for(const [label,value] of entries){
    const d=document.createElement("div");d.className="fact";
    const small=document.createElement("small");small.textContent=label;
    const strong=document.createElement("b");strong.textContent=value;d.append(small,strong);facts.appendChild(d);
  }
  renderAisles();
  if(!switchView("detailView"))return;
  startPreparationClock();
  // Sólo las cargas aún publicadas, no asignadas ni finalizadas, arrancan al seleccionarlas.
  if(!currentReadOnly&&!currentPreparation.active&&!currentPreparation.finalized&&load.estado==="publicada"){
    await startCurrentPreparation();
  }
}
$("startPreparation").addEventListener("click",()=>startCurrentPreparation());
$("finishPreparation").addEventListener("click",async()=>{
  if(busy||!current||currentReadOnly||!currentPreparation?.active)return;
  busy=true;$("finishPreparation").disabled=true;global("Finalizando la preparación de "+current.codigo+"…");
  try{
    const {error}=await client.rpc("kontrola_finalizar_preparacion",{p_codigo:current.codigo});
    if(error)throw error;
    currentPreparation={active:false,finalized:true};current.preparacion_fin=new Date().toISOString();current.estado="preparada";visible($("finishPreparation"),false);
    stopPreparationClock();renderPreparationClock();refreshOperatorDashboard().catch(()=>{});
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
  const warehouse=selectedWarehouse,userId=user?.id;
  reviewLoads=[];$("reviewLoadsList").textContent="Consultando cargas preparadas por otros operarios…";
  const {data,error}=await client.rpc("kontrola_panel_cargas",{p_almacen:warehouse});
  if(!validRequest(warehouse,userId))return;
  if(error){$("reviewLoadsList").textContent="No se pueden cargar las verificaciones: "+errorText(error);throw error;}
  reviewLoads=ordenarCargas((data||[]).filter(load=>
    load.preparador_id&&load.preparador_id!==userId&&
    ["preparacion_en_curso","preparada","verificacion_en_curso","cerrada"].includes(load.estado)&&
    (!load.verificador_id||load.verificador_id===userId)
  ));
  renderReviewLoads();
}
function renderReviewLoads(){
  const target=$("reviewLoadsList");target.replaceChildren();
  const search=$("reviewSearch").value.trim().toLocaleLowerCase("es-ES");
  const records=reviewLoads.filter(r=>[r.codigo,r.ruta,r.matricula,r.repartidor].some(v=>String(v||"").toLocaleLowerCase("es-ES").includes(search)));
  if(!records.length){const p=document.createElement("p");p.className="muted";p.textContent=!reviewLoads.length?"No hay cargas verificables por este usuario en "+warehouseLabel()+". Selecciona otro almacén si corresponde.":"Ninguna carga verificable coincide con el filtro de búsqueda.";target.appendChild(p);return;}
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
$("refreshHomeSummary").addEventListener("click",()=>refreshOperatorDashboard().catch(error=>{
  status("operatorSummaryStatus","No se puede actualizar: "+errorText(error),"error");
}));
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
  if(busy||opening||adminController?.isBusy?.())return status("settingsStatus","Espera a que finalice la operación en curso antes de cerrar sesión.","error");
  if(!client)return;
  try{
    const {error}=await client.auth.signOut();
    if(error)throw error;
    loggedOut();
  }catch(error){
    status("settingsStatus","No se pudo cerrar la sesión en el servidor: "+errorText(error),"error");
  }
});
function renderConnection(){
  const target=$("connectionStatus");target.textContent=navigator.onLine?"En línea":"Sin conexión · no se guardará";
  target.className="connection-status"+(navigator.onLine?"":" offline");
}
window.addEventListener("online",()=>{
  renderConnection();global("Conexión recuperada. Actualiza la pantalla para recuperar el trabajo guardado.","success");
  if(user)refreshOperatorDashboard().catch(()=>{});
});
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&user){
    if(document.querySelector("#homeView:not([hidden])"))refreshOperatorDashboard().catch(()=>{});
    if(currentPreparation?.active)renderPreparationClock();
  }
});
window.addEventListener("offline",()=>{renderConnection();global("Sin conexión. KONTROLA no confirmará operaciones hasta recuperar la red.","error");});
renderConnection();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
initialize();
