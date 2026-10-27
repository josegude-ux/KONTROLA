// VISURA PREPARA: cálculo conservador de huecos del camión.
// No infiere palés necesarios a partir de bultos ni equipara huecos G/P.
const count=value=>{
  if(value===null||value===undefined||value==="")return null;
  const string=String(value);
  if(!/^\d{1,3}$/.test(string))return null;
  const number=Number(string);
  return Number.isSafeInteger(number)&&number<=999?number:null;
};

export function capacidadDeCarga(carga={}){
  const g=count(carga.huecos_palets_grandes);
  const p=count(carga.huecos_palets_pequenos);
  const e=count(carga.huecos_palets_europeos);
  const total=count(carga.huecos_palets_total);
  return {grandes:g,pequenos:p,europeos:e,total,segundoTipo:e!==null?"E":"P",
    modo:g!==null||p!==null||e!==null?"desglose":total!==null&&total>0?"total":"sin_datos",
    fuente:g!==null||p!==null||e!==null||total!==null?"PDF o revisión":"pendiente de confirmación"};
}

export function evaluarHuecosCamion({modo,previas,segundoTipo="P",capacidadTotal,capacidadG,capacidadP,
  anterioresTotal,anterioresG,anterioresP,actualTotal,actualG,actualP}={}){
  if(!["total","desglose"].includes(modo)||!["si","no"].includes(previas)||!["E","P"].includes(segundoTipo)){
    return {estado:"incompleto",detalle:"Indica si el camión lleva cargas anteriores y el tipo de huecos.",filas:[]};
  }
  const slots=modo==="desglose"?
    [{nombre:"Grandes (G)",capacidad:capacidadG,anteriores:anterioresG,actual:actualG},
      {nombre:segundoTipo==="E"?"Europeos (E)":"Pequeños (P)",capacidad:capacidadP,anteriores:anterioresP,actual:actualP}]:
    [{nombre:"Huecos totales",capacidad:capacidadTotal,anteriores:anterioresTotal,actual:actualTotal}];
  const filas=slots.map(item=>{
    const rawCapacidad=count(item.capacidad);
    const capacidad=rawCapacidad!==null&&rawCapacidad>0?rawCapacidad:null;
    const anteriores=previas==="no"?0:count(item.anteriores);
    const actual=count(item.actual);
    const disponibles=capacidad!==null&&anteriores!==null?capacidad-anteriores:null;
    const restantes=disponibles!==null&&actual!==null?disponibles-actual:null;
    return {nombre:item.nombre,capacidad,anteriores,actual,disponibles,restantes};
  });
  if(filas.some(row=>row.capacidad===null||row.anteriores===null||row.actual===null)){
    return {estado:"incompleto",detalle:"Faltan cantidades de capacidad, cargas anteriores o palés de esta carga. No se puede confirmar la viabilidad.",filas};
  }
  if(filas.some(row=>row.restantes<0)){
    return {estado:"inviable",detalle:"NO VIABLE POR HUECOS: faltan posiciones para los palés indicados. Revisar con el responsable del transporte.",filas};
  }
  return {estado:"viable",detalle:"VIABLE POR HUECOS: las posiciones indicadas alcanzan. No valida peso, medidas, distribución ni seguridad del transporte.",filas};
}
