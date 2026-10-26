// Proyección de lectura de KONTROLA. El lector de Business Central se conserva intacto.
export function ordenarCargas(rows) {
  return [...rows].sort((a,b)=>Number(b.peso_kg||0)-Number(a.peso_kg||0)||String(a.codigo).localeCompare(String(b.codigo),"es"));
}
// Huecos para palés del camión, no palés reales a preparar.
// Si el PDF solo indica grandes, no deducir que los pequeños son cero.
export function formatearHuecosPalets(grandes,pequenos,total,europeos=null){
 const valido=v=>v!==null&&v!==undefined&&v!==""&&Number.isInteger(Number(v))&&Number(v)>=0;
 const g=valido(grandes)?Number(grandes):null;
 const p=valido(pequenos)?Number(pequenos):null;
 const e=valido(europeos)?Number(europeos):null;
 if(g!==null||p!==null||e!==null)return [g===null?null:g+" G",e===null?null:e+" E",p===null?null:p+" P"].filter(Boolean).join(" · ");
 return valido(total)?Number(total)+" huecos":"—";
}
// El panel no es una fuente comprobada de huecos; solo la revisión vigente
// o una lectura local del PDF original de la misma carga son fuentes válidas.
// Sin dato no significa cero.
const HUECOS_FIELDS=["huecos_palets_grandes","huecos_palets_europeos","huecos_palets_pequenos","huecos_palets_total"];
const huecoValido=value=>value!==null&&value!==undefined&&/^(0|[1-9]\d{0,2})$/.test(String(value));

export function combinarHuecosConOrigen(load={},revision=null,pdfLeido=null){
 const result={...load};
 let origin="sin_dato";
 for(const key of HUECOS_FIELDS){
  if(huecoValido(revision?.[key])){
   result[key]=revision[key];origin="revision";
  }else if(huecoValido(pdfLeido?.[key])){
   result[key]=pdfLeido[key];if(origin!=="revision")origin="pdf_leido";
  }else result[key]=null;
 }
 const observation=revision?.observaciones??pdfLeido?.observaciones;
 if(observation!==undefined&&observation!==null)result.observaciones=observation;
 result.huecos_origen=origin;
 return result;
}
export function textoHuecosConOrigen(load={}){
 if(!load.huecos_origen||load.huecos_origen==="sin_dato")return "Sin dato";
 const present=HUECOS_FIELDS.map(key=>load[key]).filter(huecoValido).map(Number);
 if(load.huecos_origen==="pdf_leido"&&present.length&&present.every(x=>x===0))
  return "0 en PDF · confirmar";
 return formatearHuecosPalets(load.huecos_palets_grandes,load.huecos_palets_pequenos,load.huecos_palets_total,load.huecos_palets_europeos);
}

// Dentro de cada pasillo: primero cajas, después botellas; en cada formato,
// más bultos primero. Otros formatos se mantienen a continuación.
export function ordenarLineasPasillo(lines=[]){
  const formato=line=>{
    const unit=String(line?.unit||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
    if(/^(CAJA|CAJAS|CJ|CJA|BOX|BOXES)$/.test(unit))return 0;
    if(/^(BOTELLA|BOTELLAS|BOT|BT|BTS|BOTTLE|BOTTLES)$/.test(unit))return 1;
    return 2;
  };
  return [...lines].sort((a,b)=>formato(a)-formato(b)
    ||Number(b.qty||0)-Number(a.qty||0)
    ||String(a.location||"").localeCompare(String(b.location||""),"es",{numeric:true})
    ||String(a.sku||"").localeCompare(String(b.sku||""),"es"));
}
export function agruparPasillos(products = []) {
  const grupos = new Map();
  for (const p of products) {
    const qty = Number(p?.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const location = String(p.location||"").trim().toUpperCase();
    const pasillo = location==="ZFRIO" ? "FRÍO" : location ? location[0] : "SIN UBICACIÓN";
    if(!grupos.has(pasillo)) grupos.set(pasillo,[]);
    grupos.get(pasillo).push({
      sku: String(p.sku||""),
      description: String(p.description||""),
      location, qty, unit: String(p.unit||"")
    });
  }
  const sortKey = (s) => s==="SIN UBICACIÓN" ? "ZZZ" : s==="FRÍO" ? "ZZY" : s;
  return [...grupos.entries()].sort((a,b)=>sortKey(a[0]).localeCompare(sortKey(b[0]),"es")).map(([nombre,lineas])=>({nombre,lineas:ordenarLineasPasillo(lineas)}));
}
export function validacionPublicacion(parsed) {
  if(!parsed || !parsed.id || !Array.isArray(parsed.products)||!parsed.products.length) return "El PDF no contiene líneas de mercancía reconocidas.";
  if(parsed.verified!==true) return "No se publicará un PDF cuyo contenido no se haya podido contrastar. "+(parsed.warnings||[]).join(" · ");
  if(parsed.products.some(p=>!Number.isFinite(Number(p.qty))||Number(p.qty)<0)) return "Una cantidad no es válida.";
  return "";
}
export function normalizarCarga(parsed, hash, ruta, userId) {
  return {
    codigo: parsed.id,
    fecha: fechaISO(parsed.date),
    matricula: parsed.plate||null,
    ruta: parsed.route||null,
    repartidor: parsed.driver||null,
    peso_kg: parsed.weight ?? null,
    referencias: parsed.refs ?? null,
    productos: parsed.products.map(p=>({
      sku:String(p.sku||""),description:String(p.description||""),
      location:String(p.location||""),qty:Number(p.qty),unit:String(p.unit||"")
    })),
    documento_ruta:ruta,documento_hash:hash,publicado_por:userId
  };
}
export function fechaISO(raw) {
  const s=String(raw||"");
  const m=s.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if(m)return (m[3].length===2?"20":"")+m[3]+"-"+m[2]+"-"+m[1];
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;
}
export function rutaArchivo(codigo,hash){
  if(!/^[A-Za-z0-9_-]{3,40}$/.test(String(codigo)))throw Error("Código de carga no permitido para almacenamiento");
  if(!/^[a-f0-9]{64}$/.test(String(hash)))throw Error("Huella del PDF inválida");
  return "documentos/"+codigo+"/"+hash+".pdf";
}
