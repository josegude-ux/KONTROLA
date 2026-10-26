// Archivo manual de hojas NUEVAS: filtra por fechas de carga y genera carátula
// imprimible. No guarda marcas de archivo ni escribe en OneDrive/Supabase.
export const MAX_HOJAS_ARCHIVO=20;
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));
const dateISO=value=>{
  const text=String(value??"").trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  return m?m[3]+"-"+m[2]+"-"+m[1]:"";
};
const validDate=value=>{
  const s=dateISO(value);
  if(!s)return false;
  const parsed=new Date(s+"T12:00:00Z");
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===s;
};
export function validarPeriodoArchivo(desde="",hasta=""){
  const from=String(desde||""),to=String(hasta||"");
  if(from&&!validDate(from))throw Error("La fecha de inicio del archivo no es válida.");
  if(to&&!validDate(to))throw Error("La fecha de fin del archivo no es válida.");
  if(from&&to&&from>to)throw Error("La fecha de inicio no puede ser posterior a la fecha de fin.");
  return {desde:from,hasta:to};
}
export function filtrarCargasArchivo(cargas=[],desde="",hasta=""){
  const periodo=validarPeriodoArchivo(desde,hasta);
  if(!Array.isArray(cargas))throw Error("Las cargas deben ser una lista.");
  return cargas.filter(carga=>{
    const date=dateISO(carga?.fecha||carga?.date);
    if(!periodo.desde&&!periodo.hasta)return true;
    // Si se filtra por fechas, no inventar fechas faltantes o incorrectas.
    if(!validDate(date))return false;
    return (!periodo.desde||date>=periodo.desde)&&(!periodo.hasta||date<=periodo.hasta);
  });
}
export function nombreSugeridoArchivo(almacen,desde="",hasta="",hoy="",codigos=[]){
  validarPeriodoArchivo(desde,hasta);
  const safe=value=>String(value??"").replace(/[^A-Za-z0-9_-]/g,"_").slice(0,24)||"SIN_DATO";
  const period=desde&&hasta?desde+"_"+hasta:desde?"desde_"+desde:hasta?"hasta_"+hasta:hoy||"sin_fecha";
  if(!Array.isArray(codigos)||codigos.length>MAX_HOJAS_ARCHIVO)throw Error("El nombre de archivo admite hasta "+MAX_HOJAS_ARCHIVO+" códigos de carga.");
  const ids=codigos.map(value=>String(value??"").trim().toUpperCase());
  if(ids.some(id=>!/^LP[0-9]{2}-[0-9]{4,6}$/.test(id))||new Set(ids).size!==ids.length)
    throw Error("Los códigos del lote son inválidos o repetidos.");
  // Se incluyen todos los códigos ordenados sin LP ni guion: es reversible
  // (año + número de carga), evita colisiones y mantiene nombres cortos incluso
  // con 20 documentos, sin depender del orden en que se marcaron.
  const suffix=ids.length?"_"+ids.map(id=>id.slice(2,4)+id.slice(5)).sort().join("_"):"";
  const filename="KONTROLA_HOJAS_"+safe(almacen)+"_"+safe(period)+suffix+".pdf";
  if(filename.length>255)throw Error("El nombre del PDF supera el límite de longitud.");
  return filename;
}
export function portadaLoteArchivo(cargas,{almacen="",desde="",hasta="",fechaGeneracion=""}={}){
  validarPeriodoArchivo(desde,hasta);
  if(!Array.isArray(cargas)||!cargas.length||cargas.length>MAX_HOJAS_ARCHIVO)
    throw Error("El archivo debe contener entre 1 y "+MAX_HOJAS_ARCHIVO+" hojas.");
  const ids=new Set();
  for(const carga of cargas){
    const id=String(carga?.codigo||"");
    if(!id||ids.has(id))throw Error("El lote contiene códigos de carga vacíos o repetidos.");
    ids.add(id);
  }
  const range=desde||hasta?[desde||"Inicio",hasta||"Actual"].join(" a "):"Sin filtro de fechas";
  const filename=nombreSugeridoArchivo(almacen,desde,hasta,fechaGeneracion,cargas.map(x=>x.codigo));
  const body=cargas.map((row,i)=>'<tr><td>'+String(i+1)+'</td><td>'+esc(row.codigo)+
    '</td><td>'+esc(row.fecha||"Sin fecha")+'</td><td>'+esc(row.ruta||"—")+
    '</td></tr>').join("");
  return '<section class="archive-cover"><h1>RELACIÓN DE HOJAS DE PREPARACIÓN</h1>'+
    '<p><b>Almacén:</b> '+esc(almacen)+'</p>'+
    '<p><b>Periodo seleccionado:</b> '+esc(range)+'</p>'+
    '<p><b>Fecha de generación:</b> '+esc(fechaGeneracion||"—")+'</p>'+
    '<p><b>Total de cargas:</b> '+cargas.length+'</p>'+
    '<p><b>Nombre sugerido al guardar en Archivos:</b> '+esc(filename)+'</p>'+
    '<table><thead><tr><th>N.º</th><th>Carga</th><th>Fecha</th><th>Ruta</th></tr></thead><tbody>'+body+
    '</tbody></table><p class="archive-disclaimer">Documento generado por KONTROLA. El traslado a OneDrive se realiza manualmente y debe verificarse. No constituye justificante de archivo efectuado.</p></section>';
}
