// Comprobación pura antes de generar el PDF. Detecta modificaciones de cargas
// producidas entre la selección y la impresión. No realiza escrituras.
const val=value=>value==null?null:value;
const snapshot=load=>({
  codigo:String(load?.codigo??load?.id??""),
  almacen:String(load?.almacen??load?.warehouse??""),
  fecha:val(load?.fecha??load?.date),
  ruta:val(load?.ruta??load?.route),
  matricula:val(load?.matricula??load?.plate),
  repartidor:val(load?.repartidor??load?.driver),
  peso_kg:val(load?.peso_kg??load?.weight),
  referencias:val(load?.referencias??load?.refs),
  productos:Array.isArray(load?.productos??load?.products)
    ?(load.productos??load.products).map(product=>({
      sku:val(product?.sku),location:val(product?.location),
      description:val(product?.description),qty:val(product?.qty),
      unit:val(product?.unit)
    }))
    :null
});
export function comprobarLoteActualizado(seleccion=[],consultadas=[],almacen=""){
  if(!Array.isArray(seleccion)||!Array.isArray(consultadas)||!almacen)
    throw Error("Datos insuficientes para verificar el lote.");
  if(!seleccion.length||seleccion.length>20)
    throw Error("Selecciona entre 1 y 20 cargas para el PDF.");
  const current=new Map();
  for(const row of consultadas){
    const key=String(row?.codigo??"");
    if(!key)continue;
    if(current.has(key))throw Error("Hay códigos duplicados en la consulta actual. Actualiza antes de imprimir.");
    current.set(key,row);
  }
  const unique=new Set(),verified=[];
  for(const selected of seleccion){
    const code=String(selected?.codigo??"");
    if(!code||unique.has(code))throw Error("La selección contiene códigos vacíos o repetidos.");
    unique.add(code);
    const row=current.get(code);
    if(!row)throw Error("La carga "+code+" ya no está disponible. Actualiza antes de imprimir.");
    if(row.almacen&&row.almacen!==almacen)
      throw Error("La carga "+code+" pertenece a otro almacén. No se generará el PDF.");
    if(!Array.isArray(row.productos)||!row.productos.some(product=>Number(product?.qty)>0))
      throw Error("La carga "+code+" no contiene cantidades positivas que imprimir. Revisa la publicación.");
    if(JSON.stringify(snapshot(selected))!==JSON.stringify(snapshot(row)))
      throw Error("La carga "+code+" ha cambiado desde la última consulta. Actualiza antes de imprimir.");
    verified.push(row);
  }
  return verified;
}
