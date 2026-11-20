// VISURA PREPARA · núcleo R7 sin estado de navegador ni almacenamiento paralelo.
// Los datos de destino y TOTAL solo se usan cuando están acreditados.
export const LIMITE_LOTE_R7=20;

export function destinoAcreditado(row){
  const raw=String(row?.destino??row?.destino_reparto??"").trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  return raw==="CORUNA"?"CORUÑA":raw==="FERROL"?"FERROL":null;
}

export function totalMercanciaAcreditado(row){
  if(destinoAcreditado(row)!=="FERROL"||
    !(row?.verified===true||row?.parser_metadata?.verified===true))return null;
  const value=row?.total_mercancia??row?.total_declarado??row?.declared_total;
  if(value===null||value===undefined||value==="")return null;
  const n=typeof value==="number"?value:Number(String(value).replace(",","."));
  return Number.isFinite(n)&&n>=0?n:null;
}

export function ordenarCargasR7(rows){
  if(!Array.isArray(rows))throw Error("Lista de cargas inválida");
  const peso=[...rows].sort((a,b)=>{
    const wa=a?.peso_kg??a?.weight,wb=b?.peso_kg??b?.weight;
    const va=wa!==null&&wa!==undefined&&Number.isFinite(Number(wa))?Number(wa):-Infinity;
    const vb=wb!==null&&wb!==undefined&&Number.isFinite(Number(wb))?Number(wb):-Infinity;
    return vb-va||String(a?.codigo??a?.id??"").localeCompare(String(b?.codigo??b?.id??""),"es");
  });
  // R7: no desplazar ninguna carga CORUÑA respecto del orden general por peso.
  // Solo reordenar FERROL dentro de las posiciones FERROL existentes.
  const ferrol=peso.filter(row=>destinoAcreditado(row)==="FERROL").sort((a,b)=>{
    const ta=totalMercanciaAcreditado(a),tb=totalMercanciaAcreditado(b);
    if(ta===null&&tb!==null)return 1;
    if(tb===null&&ta!==null)return -1;
    return (tb??0)-(ta??0)||String(a?.codigo??a?.id??"").localeCompare(String(b?.codigo??b?.id??""),"es");
  });
  let index=0;
  return peso.map(row=>destinoAcreditado(row)==="FERROL"?ferrol[index++]:row);
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
