// VISURA PREPARA · Integración nativa del flujo R7, sin estado ni E/S de navegador.
// Fuente autoritativa: las RPC existentes de KONTROLA. NO usar localStorage.
export const LIMITE_LOTE_R7=20;

export function destinoAcreditado(row){
  const text=String(row?.destino??row?.destino_reparto??"").trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  if(text==="CORUNA")return "CORUÑA";
  if(text==="FERROL")return "FERROL";
  return null; // No confundir almacén de origen COR1 con destino del reparto.
}

export function totalMercanciaAcreditado(row){
  const value=row?.total_mercancia??row?.total_declarado??row?.declared_total;
  if(value===null||value===undefined||value==="")return null;
  const n=typeof value==="number"?value:Number(String(value).replace(",","."));
  return Number.isFinite(n)&&n>=0?n:null;
}

export function ordenarCargasR7(rows){
  if(!Array.isArray(rows))throw Error("Lista de cargas inválida");
  const out=[...rows];
  // Si el destino no está acreditado, no reinterpretar matrícula, almacén ni ruta.
  out.sort((a,b)=>{
    const da=destinoAcreditado(a),db=destinoAcreditado(b);
    if(da!==db)return da==="CORUÑA"?-1:db==="CORUÑA"?1:da==="FERROL"?-1:db==="FERROL"?1:0;
    if(da==="FERROL"){
      const ta=totalMercanciaAcreditado(a),tb=totalMercanciaAcreditado(b);
      if(ta!==null&&tb!==null&&ta!==tb)return tb-ta;
      if((ta===null)!==(tb===null))return ta===null?1:-1;
    }else if(da==="CORUÑA"){
      const wa=Number(a?.peso_kg),wb=Number(b?.peso_kg);
      if(a?.peso_kg!=null&&b?.peso_kg!=null&&Number.isFinite(wa)&&Number.isFinite(wb)&&wa!==wb)return wb-wa;
    }
    return String(a?.codigo??"").localeCompare(String(b?.codigo??""),"es");
  });
  return out;
}

export function seleccionarNuevasR7(rows,counts,max=LIMITE_LOTE_R7){
  if(!Array.isArray(rows)||!(counts instanceof Map)||!Number.isInteger(max)||max<1||max>LIMITE_LOTE_R7)
    throw Error("Selección de impresión inválida");
  const selected=[],seen=new Set();
  for(const row of rows){
    const id=String(row?.codigo??"");
    if(!id||seen.has(id))continue;
    seen.add(id);
    if((Number(counts.get(id))||0)>0)continue;
    selected.push(id);
    if(selected.length===max)break;
  }
  return selected;
}
