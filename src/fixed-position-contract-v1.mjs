// VISURA PREPARA 02 — guardia de forma del JSON del gateway V1.
// No es autenticación: roles, estado de sesión, origen BC y frescura se
// certifican exclusivamente en el servidor, nunca con banderas del navegador.
export const PREPARA_FIXED_READ_VERSION="visura-prepara-fixed-read-v1";
const fail=message=>{throw new TypeError(message);};
const requireThat=(condition,message)=>{if(!condition)fail(message);};
const iso=value=>typeof value==="string"&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const warehouseCode=/^[A-Z0-9_]{3,40}$/;
const decimal=/^-?\d{1,12}(?:\.\d{1,6})?$/;
const key=(...v)=>JSON.stringify(v);
const unique=(set,value,type)=>{
 requireThat(!set.has(value),"Registro duplicado: "+type);
 set.add(value);
};
export function assertPreparaFixedReadV1(payload,{warehouse}={}){
 requireThat(payload&&typeof payload==="object"&&
  typeof warehouse==="string"&&warehouseCode.test(warehouse),
  "Almacén solicitado inválido");
 requireThat(payload.warehouse===warehouse&&payload.meta?.warehouse===warehouse,
  "Datos de otro almacén");
 const meta=payload.meta;
 requireThat(meta.contractVersion===PREPARA_FIXED_READ_VERSION,
  "Contrato de lectura V1 ausente o incompatible");
 requireThat(meta.authorized===true,"Autorización del servidor no acreditada");
 requireThat(meta.truncated===false,"Respuesta truncada por el servidor");
 requireThat(typeof meta.stale==="boolean","Vigencia stale no acreditada");
 requireThat(typeof meta.importId==="string"&&meta.importId.length>0,
  "Lote publicado sin identidad");
 requireThat(Number.isSafeInteger(meta.stockRows)&&meta.stockRows>=0,
  "Conteo de filas BC sin validar");
 requireThat(meta.stockExpectedRows===null||
  (Number.isSafeInteger(meta.stockExpectedRows)&&meta.stockExpectedRows>=0),
  "Conteo esperado del lote BC no válido");
 for(const field of ["stockComplete","catalogComplete","positionsComplete",
  "locationsComplete","absentStockIsZero"])
  requireThat(typeof meta[field]==="boolean","Certificado incompleto: "+field);
 requireThat(meta.absentStockIsZero!==true||meta.stockComplete===true,
  "No se admiten ceros omitidos sin certificado de stock");
 for(const field of ["products","fixed","locations","stock"])
  requireThat(Array.isArray(payload[field])&&payload[field].length<=100000,
   "Colección inválida o truncada: "+field);
 requireThat(meta.stockRows===payload.stock.length,
  "Conteo de filas de stock distinto de la respuesta");
 if(meta.stockComplete===true){
  requireThat(meta.stockExpectedRows===payload.stock.length,
   "Conteo certificado de stock distinto del lote");
  requireThat(typeof meta.sourceFile==="string"&&meta.sourceFile.trim().length>0,
   "Origen BC no acreditado");
 }
 const {exportedAt,importedAt,publishedAt}=meta;
 const dates=[exportedAt,importedAt,publishedAt];
 const allDates=dates.every(iso);
 if(!allDates)requireThat(meta.stale===true&&meta.stockComplete===false,
  "Fecha de exportación BC, importación o publicación no acreditada");
 if(allDates)requireThat(exportedAt<=importedAt&&importedAt<=publishedAt,
  "Orden de fechas BC/exportación/importación/publicación incoherente");
 const products=new Map(),locations=new Set(),fixed=new Set(),lots=new Set();
 for(const item of payload.products){
  requireThat(item&&typeof item.code==="string"&&item.code.trim()&&
   typeof item.description==="string"&&item.description.trim()&&
   typeof item.unit==="string"&&item.unit.trim(),"Artículo maestro inválido");
  unique(products,item.code,"artículo");
  products.set(item.code,item.unit);
 }
 for(const item of payload.locations){
  requireThat(item&&item.warehouse===warehouse,"Ubicación de otro almacén");
  requireThat(typeof item.code==="string"&&item.code.trim(),"Ubicación sin código");
  unique(locations,item.code,"ubicación");
 }
 for(const item of payload.fixed){
  requireThat(item&&item.warehouse===warehouse,"Posición fija de otro almacén");
  requireThat(products.has(item.product_code)&&locations.has(item.location_code),
   "Posición fija sin artículo o ubicación maestra");
  unique(fixed,key(item.product_code,item.location_code),"posición fija");
 }
 for(const item of payload.stock){
  requireThat(item&&item.warehouse===warehouse,"Stock de otro almacén");
  requireThat(products.has(item.product_code)&&locations.has(item.location_code),
   "Stock con referencia o ubicación sin maestro");
  requireThat(typeof item.lot==="string"&&item.unit===products.get(item.product_code),
   "Lote o unidad de stock incompatible");
  requireThat(typeof item.quantity==="string"&&decimal.test(item.quantity),
   "Cantidad decimal BC inválida o convertida a Number");
  unique(lots,key(item.product_code,item.location_code,item.lot),"lote de stock");
 }
 return payload;
}
