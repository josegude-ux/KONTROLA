import {classifyFixedPositions,filterFixedRows,fixedReportCsv} from "./fixed-position-report.mjs";
import {buildFixedPrintHtml} from "./fixed-position-print.mjs";
const $=id=>document.getElementById(id);
const tags={sin_fija:"Sin posición fija",cero:"Fija con stock cero",negativo:"Fija con stock negativo",insuficientes:"Datos insuficientes"};
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const element=(tag,value,cls="")=>{const el=document.createElement(tag);el.textContent=String(value??"");if(cls)el.className=cls;return el;};
const labels=["Categoría","Artículo","Descripción","Ubicación fija","Pasillo","Zona","BC posición","BC total","BC otras","Unidad","Reposición","Ubicaciones reales / lotes sumados"];
const cells=r=>[tags[r.category],r.code,r.description,r.location||"SIN POSICIÓN FIJA",r.aisle,r.zone,
  r.positionQuantity??"SIN DATOS",r.warehouseQuantity??"SIN DATOS",r.otherQuantity??"SIN DATOS",r.unit,r.replenishment?"Posible":"No",
  (r.locations||[]).map(x=>x.location+": "+x.quantity).join(" · ")||"Sin líneas registradas"];
const style=[
  "#adminSection9 .fixed-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}",
  "#adminSection9 label{display:grid;gap:5px;min-width:0}",
  "#adminSection9 input,#adminSection9 select{min-height:44px;width:100%;max-width:100%}",
  "#adminSection9 .fixed-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:15px 0}",
  "#adminSection9 .fixed-metrics button{min-height:84px;text-align:left;border:1px solid #abc4dc;background:#e9f1f8;color:#153350;border-radius:12px;padding:10px}",
  "#adminSection9 .fixed-metrics button[aria-pressed=true]{outline:2px solid #225b96}",
  "#adminSection9 .fixed-metrics strong{display:block;font-size:24px}",
  "#adminSection9 .fixed-table{overflow-x:auto;width:100%}",
  "#adminSection9 .fixed-table table{width:100%;min-width:1090px;border-collapse:collapse;font-size:13px}",
  "#adminSection9 .fixed-table td,#adminSection9 .fixed-table th{padding:9px;border-bottom:1px solid #d0dce9;text-align:left}",
  "#adminSection9 .fixed-table th{background:#edf3f9}",
  "#adminSection9 .fixed-cards{display:none}",
  "#adminSection9 .fixed-cards article{border:1px solid #b9c9da;border-radius:12px;padding:13px;margin:10px 0}",
  "#adminSection9 .fixed-cards dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
  "#adminSection9 .fixed-cards dt{font-size:11px;color:#456}",
  "#adminSection9 .fixed-cards dd{margin:0;overflow-wrap:anywhere;font-weight:600}",
  "#adminSection9 .fixed-nav{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px}",
  "#adminSection9 .fixed-provenance{font-size:13px;line-height:1.6;overflow-wrap:anywhere}",
  "@media(max-width:1050px){#adminSection9 .fixed-filters{grid-template-columns:repeat(2,minmax(0,1fr))}#adminSection9 .fixed-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}",
  "@media(max-width:650px){#adminSection9 .fixed-filters{grid-template-columns:1fr}#adminSection9 .fixed-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#adminSection9 .fixed-table{display:none}#adminSection9 .fixed-cards{display:block}}"
].join("\n");
export function configureAdminFixedPositions({client,getUser,errorText}){
  let report=null,serial=0,active="todos",page=0,loading=false;
  const pageSize=50;
  function mount(){
    const nav=document.querySelector("#adminView .admin-tabs");
    const button=element("button","Posiciones fijas","admin-tab");
    button.type="button";button.dataset.adminTab="9";button.setAttribute("aria-controls","adminSection9");
    button.setAttribute("role","tab");button.setAttribute("aria-selected","false");nav.append(button);
    const panel=element("section","","panel");panel.id="adminSection9";panel.hidden=true;panel.setAttribute("role","tabpanel");
    panel.innerHTML=[
      "<h2>Control de posiciones fijas</h2><p class='muted'>Solo lectura: stock calculado BC de Excel completo y validado.</p>",
      "<div class='fixed-filters'>",
      "<label>Almacén<select id='fixedWarehouse'></select></label>",
      "<label>Artículo, descripción o ubicación<input id='fixedSearch' type='search' autocomplete='off'></label>",
      "<label>Pasillo<select id='fixedAisle'><option value=''>Todos</option></select></label>",
      "<label>Zona<select id='fixedZone'><option value=''>Todas</option></select></label>",
      "<label>Mercancía en otras ubicaciones<select id='fixedOther'><option value='todos'>Todas</option><option value='si'>Sí</option><option value='no'>No</option></select></label>",
      "<label>Orden<select id='fixedSort'><option value='severity'>Gravedad</option><option value='code'>Código</option><option value='location'>Ubicación</option><option value='quantity'>Cantidad</option></select></label>",
      "</div><div class='actions'><button id='fixedRefresh' type='button'>Consultar</button>",
      "<button id='fixedExport' type='button' disabled>Descargar CSV</button>",
      "<button id='fixedPrint' type='button' disabled>Imprimir / Guardar PDF</button></div>",
      "<p id='fixedStatus' role='status' aria-live='polite' class='status'></p>",
      "<div id='fixedProvenance' class='fixed-provenance'></div>",
      "<div id='fixedMetrics' class='fixed-metrics'></div><p id='fixedCount'></p>",
      "<div id='fixedTable' class='fixed-table'></div><div id='fixedCards' class='fixed-cards'></div>",
      "<div class='fixed-nav'><button type='button' id='fixedPrev'>← Anterior</button><span id='fixedPage'></span>",
      "<button type='button' id='fixedNext'>Siguiente →</button></div>"
    ].join("");
    $("adminView").append(panel);
    const sheet=element("style",style);document.head.append(sheet);
    $("fixedRefresh").addEventListener("click",refresh);
    $("fixedWarehouse").addEventListener("change",()=>{clear();refresh();});
    ["fixedSearch","fixedAisle","fixedZone","fixedOther","fixedSort"].forEach(id=>{
      $(id).addEventListener(id==="fixedSearch"?"input":"change",()=>{page=0;render();});
    });
    $("fixedExport").addEventListener("click",exportCSV);
    $("fixedPrint").addEventListener("click",print);
    $("fixedPrev").addEventListener("click",()=>{page=Math.max(0,page-1);render();});
    $("fixedNext").addEventListener("click",()=>{page++;render();});
  }
  function syncWarehouse(){
    const original=$("adminWarehouse"),selector=$("fixedWarehouse"),chosen=selector.value;
    const permitted=[...original.options].map(o=>({value:o.value,label:o.textContent}));
    selector.replaceChildren();
    for(const option of permitted){const node=element("option",option.label);node.value=option.value;selector.append(node);}
    selector.value=permitted.some(x=>x.value===chosen)?chosen:original.value;
  }
  function emptyDisplay(){
    ["fixedProvenance","fixedMetrics","fixedCount","fixedTable","fixedCards","fixedPage"].forEach(id=>$(id).replaceChildren());
    $("fixedExport").disabled=true;$("fixedPrint").disabled=true;
  }
  function clear(){serial++;report=null;active="todos";page=0;emptyDisplay();$("fixedStatus").textContent="";}
  async function refresh(){
    syncWarehouse();
    const warehouse=$("fixedWarehouse").value,userId=getUser()?.id,request=++serial;
    report=null;emptyDisplay();loading=true;$("fixedRefresh").disabled=true;
    $("fixedStatus").textContent="Consultando la fuente central autorizada…";
    try{
      if(!warehouse||!userId)throw Error("No existe almacén autorizado ni sesión válida.");
      // La RPC no se instala aquí. La ausencia de fuente central se comunica, nunca se sustituye por otro proyecto.
      const {data,error}=await client.rpc("kontrola_admin_posiciones_fijas",{p_almacen:warehouse});
      if(error)throw error;
      if(request!==serial||getUser()?.id!==userId||$("fixedWarehouse").value!==warehouse)return;
      if(!data||data.meta?.warehouse!==warehouse||data.meta?.truncated!==false)
        throw Error("La fuente no acredita almacén ni paginación completa.");
      report=classifyFixedPositions({...data,warehouse});
      active="todos";page=0;
      for(const [id,field] of [["fixedAisle","aisle"],["fixedZone","zone"]]){
        $(id).replaceChildren();
        const all=element("option",id==="fixedAisle"?"Todos":"Todas");all.value="";$(id).append(all);
        for(const val of [...new Set(report.rows.map(x=>x[field]).filter(Boolean))].sort()){
          const option=element("option",val);option.value=val;$(id).append(option);
        }
      }
      $("fixedExport").disabled=false;$("fixedPrint").disabled=false;
      $("fixedStatus").textContent=report.complete?
        "Informe calculado. Comprueba la antigüedad de los datos.":"Datos insuficientes: no se ha supuesto stock a cero.";
      render();
    }catch(error){
      if(request===serial&&getUser()?.id===userId)$("fixedStatus").textContent=
        "Informe no disponible: "+errorText(error)+". No se ha activado la fuente central segura.";
    }finally{if(request===serial){loading=false;$("fixedRefresh").disabled=false;}}
  }
  function filtered(){
    if(!report)return [];
    const list=filterFixedRows(report.rows,{category:active==="positions"?"todos":active,search:$("fixedSearch").value,
      aisle:$("fixedAisle").value,zone:$("fixedZone").value,other:$("fixedOther").value,sort:$("fixedSort").value});
    return active==="positions"?list.filter(item=>item.location!==null):list;
  }
  function render(){
    if(!report)return;
    const meta=report.meta,importedAt=meta.importedAt,
      days=importedAt?Math.max(0,Math.floor((Date.now()-new Date(importedAt).valueOf())/86400000)):null;
    $("fixedProvenance").textContent="Almacén: "+report.warehouse+" · Excel BC: "+(meta.sourceFile||"Sin archivo")+
      " · Importado: "+(importedAt||"Sin fecha")+" · Antigüedad: "+(days===null?"desconocida":days+" día(s)")+
      " · Estado: "+(meta.stale===true?"exportación desactualizada":report.complete?"completo según fuente":"datos incompletos")+
      " · Generado: "+new Date().toLocaleString("es-ES");
    const metrics=[["sin_fija","Sin posición fija"],["cero","Stock fijo cero"],
      ["negativo","Stock fijo negativo"],["positions","Posiciones afectadas"],["insuficientes","Sin datos fiables"]];
    const summary=$("fixedMetrics");summary.replaceChildren();
    for(const [type,label] of metrics){
      const value=type==="positions"?report.affectedPositions:report.byCategory[type].references;
      const button=element("button","");button.type="button";button.setAttribute("aria-pressed",String(active===type));
      button.append(element("strong",value),element("span",label));
      button.addEventListener("click",()=>{active=type;page=0;render();});summary.append(button);
    }
    const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,pages-1);
    const visible=rows.slice(page*pageSize,(page+1)*pageSize);
    $("fixedCount").textContent=rows.length+" incidencias · "+new Set(rows.map(x=>x.code)).size+
      " referencias únicas · "+rows.filter(x=>x.location).length+" posiciones afectadas. La exportación incluye TODOS los registros filtrados.";
    $("fixedPage").textContent="Página "+(page+1)+" / "+pages;
    $("fixedPrev").disabled=page===0;$("fixedNext").disabled=page>=pages-1;
    const table=element("table"),head=element("thead"),hr=element("tr");
    for(const label of labels)hr.append(element("th",label));head.append(hr);table.append(head);
    const body=element("tbody"),cards=$("fixedCards");cards.replaceChildren();
    for(const record of visible){
      const row=element("tr");for(const value of cells(record))row.append(element("td",value));body.append(row);
      const card=element("article");card.append(element("strong",record.code+" · "+tags[record.category]),element("p",record.description));
      const dl=element("dl");
      for(let n=3;n<labels.length;n++){const data=element("div");data.append(element("dt",labels[n]),element("dd",cells(record)[n]));dl.append(data);}
      card.append(dl,element("small",record.reason));cards.append(card);
    }
    table.append(body);$("fixedTable").replaceChildren(table);
  }
  function exportCSV(){
    if(!report||loading||!getUser()?.id)return;
    const generatedAt=new Date().toISOString();
    const csv=fixedReportCsv(filtered(),{warehouse:report.warehouse,sourceFile:report.meta.sourceFile,
      importedAt:report.meta.importedAt,generatedAt,filters:{category:active,search:$("fixedSearch").value,
        aisle:$("fixedAisle").value,zone:$("fixedZone").value,other:$("fixedOther").value}});
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const link=element("a");link.href=url;link.download="VISURA_PREPARA_fijas_"+report.warehouse+"_"+generatedAt.slice(0,10)+".csv";
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  function print(){
    if(!report||loading||!getUser()?.id)return;
    const win=window.open("","_blank");if(!win){$("fixedStatus").textContent="Ventana de impresión bloqueada. Utiliza Safari.";return;}
    const rows=filtered();
    const html=buildFixedPrintHtml({
      report,rows,generatedAt:new Date().toISOString(),
      filters:{category:active,search:$("fixedSearch").value,aisle:$("fixedAisle").value,
        zone:$("fixedZone").value,other:$("fixedOther").value,sort:$("fixedSort").value}
    });
    win.document.open();win.document.write(html);win.document.close();
  }
  return {mount,refresh,clear};
}
