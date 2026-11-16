// Contrato de corte visual Control de Cargas v0.5.6 para laboratorio VISURA PREPARA ALMACEN.
// Sin IO, red, credenciales ni operaciones sobre datos empresariales.
// Fail-closed: si no se identifica con certeza el final de MERCANCIA, no se prepara impresión.
import {normalizeWarehouseCode} from "./core.mjs";

const normalizar=text=>String(text??"").toUpperCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
const ITEM_Y_TOLERANCE=3;
export function lineasPdf(items=[]) {
  const ordered=[...items].filter(i=>typeof i.text==="string"&&Number.isFinite(i.y)&&Number.isFinite(i.x))
    .sort((a,b)=>a.y-b.y||a.x-b.x);
  const rows=[];
  for(const item of ordered) {
    const last=rows[rows.length-1];
    if(last&&Math.abs(last.y-item.y)<=ITEM_Y_TOLERANCE)last.items.push(item);
    else rows.push({y:item.y,items:[item]});
  }
  return rows.map(r=>({y:r.y,text:r.items.map(i=>i.text).join(" "),normalized:normalizar(r.items.map(i=>i.text).join(" "))}));
}
export function almacenesDePagina(items=[]) {
  // Evitar depender de nombres de archivo o codigos inferidos por el reloj.
  const text=items.map(i=>String(i.text||"")).join(" ").toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const hits=[...text.matchAll(/ALMACEN\s*:\s*(COR[\s_-]*0?[12][\s_-]*[A-Z]{3})/g)];
  return [...new Set(hits.map(hit=>normalizeWarehouseCode(hit[1])).filter(Boolean))];
}
const tipoLimite=text=>
  text.includes("TOTALREFERENCIASPROD")||text.includes("TOTALREFERENCIAS")?"total":
  text.includes("CONTROLENVASES")||text==="PALETS"||text.includes("CONFORMIDADCARGA")?"sin-mercancia":null;

export function planificarRecortesMercancia(pages,{warehouse,maxPages=24}={}) {
  const destino=normalizeWarehouseCode(warehouse);
  if(!["COR_01_COR","COR_02_NAR"].includes(destino))throw Error("Almacen de prueba no reconocido.");
  if(!Array.isArray(pages)||!pages.length||pages.length>maxPages)
    throw Error("PDF sin paginas validas o demasiado extenso para el piloto.");
  const segments=[];
  let activo=null,started=false,finished=false,confirmedGoods=false;
  for(const page of pages) {
    if(!Number.isFinite(page.height)||page.height<100||
       !Number.isInteger(page.number)||page.number<1||!Array.isArray(page.items))
      throw Error("Geometria del PDF no verificable.");
    const mentions=almacenesDePagina(page.items);
    if(mentions.length>1)throw Error("PDF con mas de un almacen en la misma pagina: no se imprime.");
    if(mentions.length)activo=mentions[0];
    if(activo!==destino) {
      if(started&&!finished)throw Error("Cambio de almacen sin cierre de MERCANCIA: no se imprime.");
      continue;
    }
    if(finished)continue;
    const lines=lineasPdf(page.items);
    const hasTitle=lines.some(x=>x.normalized.includes("MERCANCIA"));
    const hasSKU=lines.some(x=>/PRD\d{7}/.test(x.normalized));
    if(!started&&!hasTitle&&!hasSKU)continue;
    started=true;
    confirmedGoods ||= hasTitle||hasSKU;
    const titleLine=lines.find(x=>x.normalized.includes("MERCANCIA"));
    const candidates=lines.map(x=>({...x,type:tipoLimite(x.normalized)}))
      .filter(x=>x.type&&(!titleLine||x.y>titleLine.y));
    const stop=candidates.sort((a,b)=>a.y-b.y)[0];
    if(stop) {
      const bottom=stop.type==="total"?stop.y+16:stop.y-15;
      if(!Number.isFinite(bottom)||bottom<=70||bottom>page.height)
        throw Error("Limite de MERCANCIA imposible de recortar con seguridad.");
      segments.push({pageNumber:page.number,top:0,bottom,marker:stop.type});
      finished=true;
    } else {
      // Si no hay limite en esta pagina, solo puede ser una continuacion.
      segments.push({pageNumber:page.number,top:0,bottom:page.height,marker:null});
    }
  }
  if(!started||!confirmedGoods||!segments.length)throw Error("No se ha reconocido la seccion MERCANCIA del almacen elegido.");
  if(!finished)throw Error("No se ha identificado el final de MERCANCIA; impresion cancelada.");
  return {warehouse:destino,pages:segments,finished,verifiedBoundary:true};
}

export function validarParidadDocumento(parsed,{codigo,warehouse}={}) {
  const destino=normalizeWarehouseCode(warehouse);
  if(!codigo||!destino||!parsed||parsed.id!==codigo||parsed.warehouse!==destino)
    throw Error("El PDF no coincide con el codigo de carga y almacen seleccionados.");
  if(parsed.verified!==true||!Array.isArray(parsed.products)||parsed.products.length===0)
    throw Error("La mercancia del PDF no esta verificada: no se imprime.");
  return true;
}
