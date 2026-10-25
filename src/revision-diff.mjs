// Comparación documental de solo lectura. Nunca escribe en Supabase.
// Los productos se emparejan por referencia y ocurrencia, sin perder referencias repetidas.
const value=x=>String(x??"").trim();
const numeric=x=>x==null||x===""?"":Number.isFinite(Number(x))?Number(x):value(x);
const comparable=(x,key)=>key==="qty"||key==="peso_kg"||key==="referencias"?numeric(x):value(x);
const fieldLabels={
 fecha:"Fecha de carga",matricula:"Matrícula",ruta:"Ruta",repartidor:"Repartidor",
 peso_kg:"Peso (kg)",referencias:"Referencias",almacen:"Almacén",
 description:"Descripción",location:"Ubicación",qty:"Cantidad",unit:"Unidad"
};
function productsInRevision(revision){
  const data=revision?.carga_datos||{};
  const raw=Array.isArray(data.productos)?data.productos:[];
  const occurrences=new Map();
  return raw.map((p,index)=>{
    const product=p&&typeof p==="object"?p:{};
    const sku=value(product.sku)||"(sin referencia) "+(index+1);
    const number=(occurrences.get(sku)||0)+1;
    occurrences.set(sku,number);
    return {key:sku+"#"+number,sku,number,...product};
  });
}
export function compararRevisiones(anterior,actual){
  const previous=anterior?.carga_datos||{},latest=actual?.carga_datos||{};
  const campos=["fecha","matricula","ruta","repartidor","peso_kg","referencias","almacen"]
    .filter(key=>comparable(previous[key],key)!==comparable(latest[key],key))
    .map(key=>({campo:key,etiqueta:fieldLabels[key],anterior:previous[key]??"",actual:latest[key]??""}));
  const before=new Map(productsInRevision(anterior).map(p=>[p.key,p]));
  const after=new Map(productsInRevision(actual).map(p=>[p.key,p]));
  const anadidos=[],eliminados=[],modificados=[];
  let sinCambios=0;
  for(const [key,now] of after){
    const old=before.get(key);
    if(!old){anadidos.push(now);continue;}
    const cambios=["description","location","qty","unit"]
      .filter(k=>comparable(old[k],k)!==comparable(now[k],k))
      .map(k=>({campo:k,etiqueta:fieldLabels[k],anterior:old[k]??"",actual:now[k]??""}));
    if(cambios.length)modificados.push({sku:now.sku,ocurrencia:now.number,antes:old,despues:now,cambios});
    else sinCambios++;
  }
  for(const [key,old] of before)if(!after.has(key))eliminados.push(old);
  return {campos,anadidos,eliminados,modificados,sinCambios,
    totalCambios:campos.length+anadidos.length+eliminados.length+modificados.length};
}
