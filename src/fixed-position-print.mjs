/* Documento imprimible independiente del DOM: preparado para paginar en A4. */
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const names={sin_fija:"Artículos sin posición fija",cero:"Posiciones fijas con stock cero",
  negativo:"Posiciones fijas con stock negativo",insuficientes:"Datos insuficientes"};
const categories=["negativo","cero","sin_fija","insuficientes"];
export function buildFixedPrintHtml({report,rows,filters={},generatedAt=new Date().toISOString(),pageSize=18}){
  if(!report||!Array.isArray(rows)||!report.meta||!report.warehouse)
    throw Error("Informe sin origen acreditado.");
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>50)
    throw Error("Tamaño de página inválido.");
  const headers=["Artículo","Descripción","Ubicación fija","Pasillo / zona","Stock fijo",
    "Stock almacén","Otras ubic.","Unidad","Reposición / ubicaciones reales"];
  const cells=row=>[row.code,row.description,row.location||"SIN POSICIÓN FIJA",
    [row.aisle,row.zone].filter(Boolean).join(" / "),row.positionQuantity??"SIN DATOS",
    row.warehouseQuantity??"SIN DATOS",row.otherQuantity??"SIN DATOS",row.unit,
    row.location?row.replenishment?"Posible reposición":"—":
      (row.locations||[]).map(p=>p.location+": "+p.quantity).join("; ")||"Sin líneas disponibles"];
  const allRefs=new Set(rows.map(r=>r.code)).size;
  const positions=new Set(rows.filter(r=>r.location).map(r=>JSON.stringify([r.code,r.location]))).size;
  const summary=categories.map(cat=>{
    const x=rows.filter(r=>r.category===cat);
    return names[cat]+": "+new Set(x.map(r=>r.code)).size+" referencias; "+
      new Set(x.filter(r=>r.location).map(r=>JSON.stringify([r.code,r.location]))).size+" posiciones";
  }).join(" · ");
  const pages=[];
  for(const category of categories){
    const set=rows.filter(r=>r.category===category);
    for(let start=0;start<set.length;start+=pageSize){
      const segment=set.slice(start,start+pageSize);
      pages.push({category,rows:segment,ordinal:Math.floor(start/pageSize)+1});
    }
  }
  if(!pages.length)pages.push({category:null,rows:[],ordinal:1});
  const markup=pages.map((page,index)=>{
    const header="<header><h1>VISURA · Control de posiciones fijas</h1>"+
      "<p><b>Almacén:</b> "+esc(report.warehouse)+
      " · <b>Excel BC:</b> "+esc(report.meta.sourceFile||"No consta")+
      " · <b>Exportación BC:</b> "+esc(report.meta.exportedAt||"Sin fecha")+
      " · <b>Importación:</b> "+esc(report.meta.importedAt||"Sin fecha")+
      " · <b>Publicación:</b> "+esc(report.meta.publishedAt||"Sin fecha")+
      " · <b>Generación:</b> "+esc(generatedAt)+"</p>"+
      "<p><b>Estado:</b> "+esc(report.meta.stale===true?"DESACTUALIZADO":report.complete?"Validado según origen":"DATOS INSUFICIENTES")+
      " · <b>Filtros:</b> "+esc(Object.entries(filters).filter(([,v])=>v!==""&&v!==null).map(([k,v])=>k+"="+v).join(" · ")||"Todos")+"</p>"+
      (index===0?"<p><b>Resumen:</b> "+esc(summary)+"</p>":"")+"</header>";
    const lines=page.rows.map(row=>"<tr>"+cells(row).map(value=>"<td>"+esc(value)+"</td>").join("")+"</tr>").join("");
    return "<section class='sheet'>"+header+
      "<h2>"+esc(page.category?names[page.category]:"Sin incidencias en los filtros aplicados")+"</h2>"+
      "<p><b>Total del listado filtrado:</b> "+rows.length+" incidencias · "+allRefs+
      " referencias únicas · "+positions+" posiciones · <b>Sección, hoja:</b> "+page.ordinal+"</p>"+
      "<table><thead><tr>"+headers.map(h=>"<th>"+esc(h)+"</th>").join("")+
      "</tr></thead><tbody>"+lines+"</tbody></table>"+
      (index===pages.length-1?"<div class='notes'>Observaciones: ________________________________________</div>":"")+
      "<footer>VISURA PREPARA · Informe de solo lectura · Página "+(index+1)+" de "+pages.length+"</footer></section>";
  }).join("");
  return "<!doctype html><html lang='es'><head><meta charset='utf-8'>"+
    "<meta name='viewport' content='width=device-width,initial-scale=1'>"+
    "<title>VISURA PREPARA · Control de posiciones fijas</title><style>"+
    "@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172f46;margin:0}"+
    ".sheet{position:relative;break-after:page;page-break-after:always;min-height:176mm;padding-bottom:15mm}"+
    ".sheet:last-child{break-after:auto;page-break-after:auto}header{border-bottom:2px solid #203f65;padding-bottom:6px}"+
    "h1{font-size:19px;margin:0 0 7px}h2{font-size:14px;margin:11px 0 7px}p{font-size:9px;line-height:1.4;margin:4px 0}"+
    "table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:8px}th,td{border:1px solid #b7c5d5;padding:5px 4px;overflow-wrap:anywhere;vertical-align:top}"+
    "th{background:#edf3f9}th:first-child{width:10%}th:nth-child(2){width:19%}th:last-child{width:18%}"+
    "thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}"+
    ".notes{font-size:10px;margin-top:14px}.sheet footer{position:absolute;bottom:0;right:0;font-size:9px;color:#4f6172}"+
    ".actions{padding:15px}.actions button{padding:12px}"+
    "@media print{.actions{display:none}body{margin:0}}</style></head><body>"+
    "<div class='actions'><button type='button' onclick='window.print()'>Imprimir / Guardar PDF</button></div>"+
    markup+"</body></html>";
}
