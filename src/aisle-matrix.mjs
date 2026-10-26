// Modelo de lectura, sin persistencia: recupera la matriz por pasillos de ControlDeCargas v1.3.
// No confundir unidades heterogéneas: se presentan por formato, sin convertir a "bultos" físicos.
import {agruparPasillos} from "./logic.mjs";

const PRIORIDAD=["CAJA","BOTELLA","PACK","PAQUETE"];
const numero=value=>Number(value);
const esCantidad=qty=>Number.isFinite(numero(qty))&&numero(qty)>0;
const unidad=value=>String(value||"SIN UNIDAD").trim().toUpperCase()||"SIN UNIDAD";
export const etiquetaUnidad=u=>({CAJA:"CAJAS",BOTELLA:"BOTELLAS",PACK:"PACK",PAQUETE:"PAQUETES"}[u]||u);

export function crearMatrizPasillos(products=[]){
  const groups=agruparPasillos(products);
  const rawUnits=new Set();
  const totalPorUnidad=new Map();
  const detallesSinUbicacion=[];
  let referencias=0;
  for(const group of groups)for(const product of group.lineas){
    if(!esCantidad(product.qty))continue;
    const key=unidad(product.unit),qty=numero(product.qty);
    rawUnits.add(key);
    totalPorUnidad.set(key,(totalPorUnidad.get(key)||0)+qty);
    referencias++;
    if(group.nombre==="SIN UBICACIÓN")detallesSinUbicacion.push({
      sku:product.sku,description:product.description,qty,unit:key,location:"SIN UBICACIÓN"
    });
  }
  const unidades=[...rawUnits].sort((a,b)=>{
    const ra=PRIORIDAD.indexOf(a),rb=PRIORIDAD.indexOf(b);
    return (ra<0?PRIORIDAD.length:ra)-(rb<0?PRIORIDAD.length:rb)||a.localeCompare(b,"es");
  });
  const pasillos=groups.map(group=>{
    const valores=Object.fromEntries(unidades.map(u=>[u,0]));
    for(const line of group.lineas){
      if(esCantidad(line.qty))valores[unidad(line.unit)]+=numero(line.qty);
    }
    return {nombre:group.nombre,referencias:group.lineas.length,valores,
      total:unidades.reduce((acc,u)=>acc+valores[u],0),
      lineas:group.lineas.map(line=>({...line}))};
  });
  return {
    unidades,pasillos,totales:Object.fromEntries(unidades.map(u=>[u,totalPorUnidad.get(u)||0])),
    referencias,zonas:pasillos.length,
    total:unidades.reduce((acc,u)=>acc+(totalPorUnidad.get(u)||0),0),
    sinUbicacion:detallesSinUbicacion
  };
}

export function crearListadoPasillosA4(load){
  if((load?.almacen||load?.warehouse)!=="COR_01_COR")
    throw Error("La hoja de preparación A4 solo admite COR1; COR2 es un informe independiente.");
  const products=load.productos||load.products||[];
  const matriz=crearMatrizPasillos(products);
  if(!matriz.referencias)throw Error("No hay líneas de mercancía COR1 para imprimir.");
  if(matriz.unidades.length>9)throw Error("Más de 9 tipos de unidad: no caben legiblemente en una sola hoja A4.");
  if(matriz.pasillos.length>27)throw Error("Más de 27 pasillos o zonas: no caben legiblemente en una sola hoja A4.");
  return {tipo:"resumen_pasillos",codigo:String(load.codigo||load.id||""),
    fecha:String(load.fecha||load.date||"—"),repartidor:String(load.repartidor||load.driver||"—"),
    almacen:"COR_01_COR",...matriz};
}
