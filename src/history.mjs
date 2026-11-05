// Historial de consulta. No altera el estado de las cargas ni llama a RPC de escritura.
const clean=value=>String(value??"").trim();
const isDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(clean(value));
const number=value=>value===null||value===undefined||value===""?0:Number(value);
const validNumber=value=>Number.isFinite(number(value))?number(value):0;

export function filtrarHistorial(rows=[],{fecha="",estado="",busqueda=""}={}){
  const query=clean(busqueda).toLocaleLowerCase("es-ES");
  const date=clean(fecha),status=clean(estado);
  return rows.filter(row=>{
    if(date&&(!isDate(row.fecha)||row.fecha!==date))return false;
    if(status&&row.estado!==status)return false;
    if(!query)return true;
    return [row.codigo,row.ruta,row.matricula,row.repartidor]
      .some(value=>clean(value).toLocaleLowerCase("es-ES").includes(query));
  }).sort((a,b)=>{
    const aDate=isDate(a.fecha)?a.fecha:"";
    const bDate=isDate(b.fecha)?b.fecha:"";
    return bDate.localeCompare(aDate)||validNumber(b.peso_kg)-validNumber(a.peso_kg)
      ||clean(a.codigo).localeCompare(clean(b.codigo),"es");
  });
}

export function resumenHistorial(rows=[]){
  return rows.reduce((total,row)=>{
    total.cargas++;
    total.pesoKg+=validNumber(row.peso_kg);
    total.referencias+=validNumber(row.referencias);
    total.incidencias+=validNumber(row.incidencias_pendientes);
    if(row.estado==="cerrada")total.cerradas++;
    return total;
  },{cargas:0,pesoKg:0,referencias:0,cerradas:0,incidencias:0});
}

export function formatoFechaCarga(fecha){
  if(!isDate(fecha))return "Sin fecha";
  const [year,month,day]=fecha.split("-");
  return `${day}/${month}/${year}`;
}

const safeHtml=value=>clean(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
// Hoja para Excel en España: punto y coma, BOM UTF-8 y cadenas potencialmente peligrosas como texto.
// Nunca tratar metadatos procedentes de un PDF como fórmulas ejecutables en Excel.
function csvField(value){
  let v=String(value??"");
  if(/^[\s\u0000-\u001f]*[=+@\-]/u.test(v))v="'"+v;
  return '"'+v.replace(/"/g,'""')+'"';
}
export function csvHistorial(rows=[],almacen=""){
  const columns=[
    ["Almacén",()=>almacen],["Código",r=>r.codigo],["Fecha de carga",r=>r.fecha],
    ["Estado",r=>r.estado],["Ruta",r=>r.ruta],["Repartidor",r=>r.repartidor],
    ["Matrícula",r=>r.matricula],["Peso (kg)",r=>r.peso_kg],
    ["Referencias",r=>r.referencias],["Incidencias pendientes",r=>r.incidencias_pendientes]
  ];
  const lines=[columns.map(([header])=>csvField(header)).join(";")];
  for(const row of rows)lines.push(columns.map(([,get])=>csvField(get(row))).join(";"));
  return "\uFEFF"+lines.join("\r\n")+"\r\n";
}
export function htmlResumenHistorial(rows=[],{almacen="",fecha="",estado="",busqueda=""}={}){
  const resumen=resumenHistorial(rows);
  const filtros=[
    ["Almacén",almacen],["Fecha",fecha||"Todas"],["Estado",estado||"Todos"],
    ["Búsqueda",busqueda||"Sin filtro"]
  ];
  const facts=[
    ["Cargas",resumen.cargas],["Peso total",resumen.pesoKg.toLocaleString("es-ES")+" kg"],
    ["Referencias",resumen.referencias],["Cerradas",resumen.cerradas],
    ["Incidencias pendientes",resumen.incidencias]
  ];
  const detail=rows.map(r=>"<tr>"+
    [r.codigo,formatoFechaCarga(r.fecha),r.estado,r.ruta,r.repartidor,r.matricula,
      r.peso_kg==null?"—":Number(r.peso_kg).toLocaleString("es-ES"),
      r.referencias==null?"—":r.referencias,r.incidencias_pendientes??0]
      .map(cell=>"<td>"+safeHtml(cell)+"</td>").join("")+"</tr>").join("");
  return '<article class="preparation-report history-print">'+
    "<header><h2>KONTROLA · Resumen de cargas</h2><p>Listado de consulta; no sustituye documentos de Business Central.</p></header>"+
    "<dl>"+filtros.map(([label,value])=>"<div><dt>"+safeHtml(label)+"</dt><dd>"+safeHtml(value)+"</dd></div>").join("")+"</dl>"+
    "<dl>"+facts.map(([label,value])=>"<div><dt>"+safeHtml(label)+"</dt><dd>"+safeHtml(value)+"</dd></div>").join("")+"</dl>"+
    '<div class="history-table-scroll"><table><thead><tr>'+
    ["Carga","Fecha","Estado","Ruta","Repartidor","Matrícula","Kg","Refs.","Incidencias"]
      .map(v=>"<th>"+safeHtml(v)+"</th>").join("")+
    "</tr></thead><tbody>"+(detail||'<tr><td colspan="9">No hay cargas para estos filtros.</td></tr>')+
    "</tbody></table></div></article>";
}
