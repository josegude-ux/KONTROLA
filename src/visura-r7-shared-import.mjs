import {fechaAlmacen} from "./business-date.mjs";
import {prepararSincronizacionR7} from "./visura-r7-sync-preflight.mjs";
// VISURA PREPARA · Adaptador mínimo de SOLO LECTURA hacia el motor original R7.
// La fuente de cargas es la RPC autorizada, no localStorage. R7 sigue procesando
// los PDF con su importador original. No registra impresión ni altera Supabase.
const MAX_FILES=5;
const MAX_FILE_BYTES=25*1024*1024;
const MAX_BATCH_BYTES=40*1024*1024;
const CODE=/^LP\d{2}-\d{4,6}$/;
const PDF_PATH=/^documentos\/(LP\d{2}-\d{4,6})\/([a-f0-9]{64})\.pdf$/;
const $=id=>document.getElementById(id);

export function validarOriginalCompartidoR7(row,warehouse){
  if(warehouse!=="COR_01_COR"||row?.almacen!=="COR_01_COR"||
    row?.estado!=="publicada"||!CODE.test(String(row.codigo??"")))
    throw Error("La LP no está publicada en el almacén COR1 autorizado.");
  const match=PDF_PATH.exec(String(row.documento_ruta??""));
  if(!match||match[1]!==row.codigo)
    throw Error("La ruta del PDF original de "+row.codigo+" no es acreditable.");
  return {codigo:row.codigo,path:row.documento_ruta,hash:match[2]};
}
export function seleccionarCargasSinGenerarR7(rows,counts,{incluirGeneradas=false,max=MAX_FILES}={}){
  if(!Array.isArray(rows)||!(counts instanceof Map)||max<1||max>MAX_FILES)
    throw Error("Selección compartida inválida.");
  const seen=new Set(),out=[];
  for(const r of rows){
    if(!r?.codigo||seen.has(r.codigo)||r.estado!=="publicada")continue;
    seen.add(r.codigo);
    if(!incluirGeneradas&&(Number(counts.get(r.codigo))||0)>0)continue;
    out.push(r.codigo);
    if(out.length>=max)break;
  }
  return out;
}
export function crearImportadorCompartidoR7({client,getUser,getWarehouse,bucket}){
  const status=$("visuraR7SharedStatus"),list=$("visuraR7SharedList");
  const refreshButton=$("visuraR7SharedRefresh"),importButton=$("visuraR7SharedImport");
  const include=$("visuraR7IncludeGenerated"),frame=$("visuraR7PrintFrame");
  const compareButton=$("visuraR7Compare"),compareStatus=$("visuraR7CompareStatus"),
    compareList=$("visuraR7CompareList");
  let serial=0,compareSerial=0,current=[],counts=new Map(),selected=new Set(),busy=false;
  const errorText=e=>String(e?.message||e||"Error").slice(0,240);
  const snapshot=()=>({user:getUser()?.id||null,warehouse:getWarehouse()||""});
  const valid=ctx=>ctx.user&&ctx.user===getUser()?.id&&ctx.warehouse===getWarehouse()&&
    !$("adminSection2").hidden;
  function reset(){
    serial++;compareSerial++;current=[];counts=new Map();selected.clear();busy=false;
    list.replaceChildren();importButton.disabled=true;refreshButton.disabled=false;include.disabled=false;
    compareButton.disabled=false;compareList.replaceChildren();
    compareStatus.textContent="Sin comparar: abre Impresión y consulta el servidor.";
    status.textContent="Abre Impresión y selecciona un almacén para consultar las LP compartidas.";
  }
  function render(){
    list.replaceChildren();
    const available=current.filter(r=>r.estado==="publicada");
    const printed=available.filter(r=>(Number(counts.get(r.codigo))||0)>0).length;
    const show=available.filter(r=>include.checked||(Number(counts.get(r.codigo))||0)===0);
    status.textContent=available.length+" LP compartidas · "+printed+" con listado generado en el servidor. "+
      "Los PDF importados por R7 siguen siendo locales.";
    importButton.disabled=busy||!selected.size;
    if(!show.length){
      const p=document.createElement("p");p.className="hint";
      p.textContent=available.length?"No hay LP nuevas. Marca «Mostrar generadas» para revisarlas.":"No hay LP publicadas disponibles en esta consulta.";
      list.append(p);return;
    }
    for(const row of show.slice(0,150)){
      const label=document.createElement("label");label.className="vprint-shared-item";
      const checkbox=document.createElement("input");checkbox.type="checkbox";
      checkbox.checked=selected.has(row.codigo);
      checkbox.disabled=busy;
      checkbox.addEventListener("change",()=>{
        if(checkbox.checked){
          if(selected.size>=MAX_FILES){checkbox.checked=false;status.textContent="Máximo "+MAX_FILES+" PDF por importación.";return;}
          selected.add(row.codigo);
        }else selected.delete(row.codigo);
        importButton.disabled=!selected.size||busy;
      });
      const body=document.createElement("span");
      const heading=document.createElement("strong");heading.textContent=row.codigo;
      const meta=document.createElement("small");
      const gen=Number(counts.get(row.codigo))||0;
      meta.textContent=[row.matricula,row.repartidor,gen?"Listado generado ("+gen+")":"Pendiente de generar"].filter(Boolean).join(" · ");
      body.append(heading,meta);label.append(checkbox,body);list.append(label);
    }
    if(show.length>150){
      const note=document.createElement("p");note.className="hint";
      note.textContent="Se muestran las primeras 150 LP. Selecciona hasta cinco por lote.";
      list.append(note);
    }
  }
  async function query(ctx){
    const [p,s]=await Promise.all([
      client.rpc("kontrola_panel_cargas_impresion",{p_almacen:ctx.warehouse}),
      client.rpc("kontrola_estado_impresion",{p_almacen:ctx.warehouse})
    ]);
    if(p.error)throw p.error;
    if(s.error)throw s.error;
    return {
      rows:(p.data||[]).filter(r=>r&&r.almacen===ctx.warehouse&&r.estado==="publicada"&&CODE.test(String(r.codigo))),
      counts:new Map((s.data||[]).filter(r=>r&&CODE.test(String(r.codigo))).map(r=>[r.codigo,Number(r.intentos)||0]))
    };
  }
  async function refresh(){
    if(busy)return;
    compareSerial++;compareButton.disabled=false;compareList.replaceChildren();
    compareStatus.textContent="Actualiza la comparación cuando termine la consulta.";
    const id=++serial,ctx=snapshot();
    selected.clear();list.replaceChildren();importButton.disabled=true;
    if(!valid(ctx)||ctx.warehouse!=="COR_01_COR"){
      status.textContent="El motor original R7 admite únicamente originales COR_01_COR. El sistema de impresión compartido permanece disponible para otros almacenes.";
      return;
    }
    status.textContent="Consultando LP compartidas autorizadas…";
    try{
      const result=await query(ctx);
      if(id!==serial||!valid(ctx))return;
      current=result.rows;counts=result.counts;
      selected=new Set(seleccionarCargasSinGenerarR7(current,counts));
      render();
    }catch(error){
      if(id!==serial||!valid(ctx))return;
      status.textContent="No se pudieron consultar las cargas compartidas: "+errorText(error);
    }
  }
  async function importar(){
    if(busy||selected.size<1||selected.size>MAX_FILES)return;
    const id=++serial,ctx=snapshot(),codes=[...selected];
    if(!valid(ctx)||ctx.warehouse!=="COR_01_COR")return;
    busy=true;compareSerial++;importButton.disabled=true;refreshButton.disabled=true;include.disabled=true;compareButton.disabled=true;
    let finalMessage="";
    render();
    status.textContent="Comprobando permisos, estado y huella de "+codes.length+" PDF…";
    const active=()=>id===serial&&valid(ctx);
    try{
      // Revalidar EN SERVIDOR justo antes de descargar, no usar un listado en caché.
      const fresh=await query(ctx);
      if(!active())return;
      const rows=codes.map(code=>fresh.rows.find(r=>r.codigo===code));
      if(rows.some(row=>!row))throw Error("Una LP ha dejado de estar publicada; actualiza el listado.");
      if(rows.some(row=>(fresh.counts.get(row.codigo)||0)>0)){
        if(!include.checked)throw Error("Una LP ya tiene listado generado en el servidor. Actualiza antes de continuar.");
        if(!window.confirm("Estas LP ya tienen listado generado en VISURA. ¿Importar para revisar/reimprimir? No se modificará el servidor."))return;
      }
      const files=[],seen=new Set();let total=0;
      for(const row of rows){
        if(!active())return;
        const origin=validarOriginalCompartidoR7(row,ctx.warehouse);
        if(seen.has(origin.codigo))throw Error("LP repetida.");
        seen.add(origin.codigo);
        const {data,error}=await client.storage.from(bucket).download(origin.path);
        if(error)throw error;
        if(!data?.size||data.size>MAX_FILE_BYTES)throw Error("Archivo original ausente o demasiado grande: "+origin.codigo);
        total+=data.size;
        if(total>MAX_BATCH_BYTES)throw Error("El conjunto excede 40 MB. Importa lotes menores.");
        const file=new File([data],origin.codigo+".pdf",{type:"application/pdf"});
        const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
        const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,"0")).join("");
        if(hash!==origin.hash)throw Error("La huella del original no coincide: "+origin.codigo);
        files.push(file);
      }
      if(!active())return;
      const expected=await crypto.subtle.digest("SHA-256",
        new TextEncoder().encode("visura-prepara-r7:"+ctx.user+":"+ctx.warehouse));
      const expectedScope=[...new Uint8Array(expected).slice(0,12)]
        .map(n=>n.toString(16).padStart(2,"0")).join("");
      if(!active()||frame.dataset.scope!==expectedScope||
        frame.contentWindow?.location.search!=="?visura_scope="+expectedScope)
        throw Error("El motor R7 aún no está cargado con el usuario y almacén actuales.");
      const input=frame.contentDocument?.getElementById("pdfs");
      if(!input||input.disabled)throw Error("Abre el motor R7 y espera a que termine de cargarse.");
      if(typeof DataTransfer!=="function")throw Error("El navegador no permite entregar archivos al importador R7.");
      const transfer=new DataTransfer();
      files.forEach(file=>transfer.items.add(file));
      input.files=transfer.files;
      input.dispatchEvent(new Event("change",{bubbles:true}));
      selected.clear();
      finalMessage="Importación de "+files.length+" PDF iniciada en R7. Comprueba su resultado en el panel inferior. No se ha registrado ninguna impresión en Supabase.";
    }catch(error){
      if(active())finalMessage="Importación no iniciada: "+errorText(error);
    }finally{
      if(id===serial){busy=false;refreshButton.disabled=false;include.disabled=false;compareButton.disabled=false;render();if(finalMessage)status.textContent=finalMessage;}
    }
  }
  // Esta conciliación lee el estado local del iframe desde el MISMO ORIGEN
  // y lo contrasta con dos RPC autorizadas. Nunca ejecuta registrar_lote_impresion.
  async function comparar(){
    const ctx=snapshot(),id=++compareSerial;
    compareList.replaceChildren();
    if(busy||!valid(ctx)||ctx.warehouse!=="COR_01_COR"){
      compareStatus.textContent="Accede a Impresión COR1 con una sesión válida para comparar.";
      return;
    }
    compareButton.disabled=true;
    compareStatus.textContent="Comparando marcas locales con el historial compartido…";
    const active=()=>id===compareSerial&&valid(ctx)&&!busy;
    try{
      const digest=await crypto.subtle.digest("SHA-256",
        new TextEncoder().encode("visura-prepara-r7:"+ctx.user+":"+ctx.warehouse));
      const scope=[...new Uint8Array(digest).slice(0,12)]
        .map(n=>n.toString(16).padStart(2,"0")).join("");
      if(!active()||frame.dataset.scope!==scope||
         frame.contentWindow?.location.search!=="?visura_scope="+scope)
        throw Error("Abre primero el motor R7 del usuario y almacén actuales.");
      // Nunca leer datos de otro ámbito ni emitir datos de R7 hacia el servidor.
      const localJSON=window.localStorage.getItem("visura_prepara_r7_cargas_"+scope);
      const remote=await query(ctx);
      if(!active())return;
      const plan=prepararSincronizacionR7({
        localJSON,compartidas:remote.rows,impresiones:remote.counts,hoy:fechaAlmacen()
      });
      const result=plan.audit;
      if(!active())return;
      const c=result.counts;
      compareStatus.textContent=c.pendientes+" generadas localmente, no registradas en VISURA · "+
        c.bloqueoFecha+" bloqueadas por fecha documental · "+c.revisionDistinta+
        " con PDF distinto o ruta no acreditada · "+c.servidorSinHash+
        " con historial compartido sin huella · "+c.soloServidor+" solo en el servidor. "+
        plan.candidatos.length+" candidata(s) preparadas para un futuro registro seguro. "+
        "ESCRITURA DESACTIVADA EN LAB: ninguna impresión se ha registrado.";
      const priorities={revisionDistinta:0,localInvalidado:1,bloqueoFecha:2,pendientes:3,
        fueraDePanel:4,servidorSinHash:5,soloServidor:6};
      const ordered=[...result.items].sort((a,b)=>
        (priorities[a.estado]??9)-(priorities[b.estado]??9)||a.codigo.localeCompare(b.codigo,"es"));
      for(const item of ordered.slice(0,60)){
        const el=document.createElement("div");el.className="vprint-compare-item";
        const strong=document.createElement("strong");strong.textContent=item.codigo;
        const explanation=document.createElement("span");explanation.textContent=item.detail;
        el.append(strong,explanation);compareList.append(el);
      }
      if(ordered.length>60){
        const p=document.createElement("p");p.className="hint";
        p.textContent="Se muestran 60 de "+ordered.length+" incidencias. Ninguna se ha enviado al servidor.";
        compareList.append(p);
      }
    }catch(error){
      if(active())compareStatus.textContent="No se pudo conciliar: "+errorText(error)+
        ". No se han modificado los estados de impresión.";
    }finally{
      if(id===compareSerial){
        compareButton.disabled=false;
        if(!active())compareStatus.textContent="Comparación cancelada por cambio de usuario, almacén o sesión.";
      }
    }
  }
  compareButton.addEventListener("click",comparar);
  refreshButton.addEventListener("click",refresh);
  importButton.addEventListener("click",importar);
  include.addEventListener("change",()=>{
    selected.clear();render();
  });
  return {refresh,reset};
}
