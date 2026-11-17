import {normalizarLP} from "./control-cargas-lp.mjs";
// VISURA PREPARA · FASE 2, modelo inerte y compatible con F1.
// Módulo puro: NO modifica almacenamiento, interfaz, BC, Supabase ni registros reales.
// Registro separado del array importado de PRUEBA_3 para evitar reactivaciones.
export const DESCARTE_SCHEMA=1;
export const DESCARTE_ESTADOS=Object.freeze({ACTIVA:"activa",DESCARTADA:"descartada"});
export const DESCARTE_PREFIX="visura_prepara_descarte_v1";
export const scopeValido=scope=>/^_visura_[a-f0-9]{24}$/.test(scope);
export const descarteKey=scope=>{
 if(!scopeValido(scope))throw Error("Ámbito de usuario no válido");
 return DESCARTE_PREFIX+scope;
};
const objeto=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const copia=v=>JSON.parse(JSON.stringify(v));
export function codigoEstable(load){
 return normalizarLP(load);
}
export function registroActivo(){
 return {estado_descarte:"activa",descartada_en:null,descartada_por:null,
  motivo_descarte:null,progreso_al_descartar:null,
  // El progreso es un SNAPSHOT (no el estado vivo). F3: capturado y sellado en servidor.
  snapshot_progreso_al_descartar:null,
  // Solo la futura RPC puede fijar descartada_por=auth.uid() y descartada_en=clock_timestamp().
  // El dato del dispositivo, si se admite, será exclusivamente informativo.
  versiones_posteriores_recibidas:[],pendiente_confirmacion:false,
  version_descarte:0,historial_descarte:[]};
}
export function revisarRegistro(v){
 if(!objeto(v)||!Object.values(DESCARTE_ESTADOS).includes(v.estado_descarte)||
  !Number.isSafeInteger(v.version_descarte)||v.version_descarte<0||
  !Array.isArray(v.historial_descarte)||
  (v.versiones_posteriores_recibidas!==undefined&&!Array.isArray(v.versiones_posteriores_recibidas)))
  throw Error("Registro de descarte inválido");
 if(v.estado_descarte==="descartada"&&
  (!v.descartada_en||!v.descartada_por||!objeto(v.progreso_al_descartar)))
  throw Error("Descarte sin trazabilidad");
 return v;
}
export function progresoVerificado(load,review){
 if(!Array.isArray(load?.products))throw Error("Mercancía de carga inválida");
 const lines=objeto(review?.lines)?review.lines:{};
 let checked=0,incidents=0;
 for(let i=0;i<load.products.length;i++){
  const state=lines[i]?.status||"pending";
  if(!["pending","ok","incident"].includes(state))throw Error("Estado de comprobación inválido");
  if(state!=="pending")checked++;
  if(state==="incident")incidents++;
 }
 return {total:load.products.length,checked,pending:load.products.length-checked,
  incidents,revision_actualizada_en:review?.updatedAt??null};
}
export function validacionDescarte(load,review){
 const progress=progresoVerificado(load,review);
 if(review?.closedAt)return {apta:false,motivo:"La revisión está cerrada",progreso:progress};
 if(progress.total===0)return {apta:false,motivo:"No hay líneas verificables",progreso:progress};
 if(progress.pending===0)return {apta:false,motivo:"Todos los artículos están comprobados",progreso:progress};
 return {apta:true,motivo:null,progreso:progress};
}
export function permisoDescarte({id,rol,activo}={}){
 // Solo comprobación preparatoria: la autorización REAL será auth.uid()+rol+almacén en SQL.
 // La petición explícita de F2 admite tanto operario como administrador.
 return typeof id==="string"&&id.length>0&&activo===true&&
  (rol==="operario"||rol==="administrador");
}
// FASE 1: vista previa puramente aditiva. No llama storage.setItem ni ejecuta SQL.
// El ledger independiente evita que revised() de PRUEBA_3 borre el descarte.
export function prepararMigracionLocal({scope,loads,reviews={},ledgerAnterior=null}){
 descarteKey(scope);
 if(!Array.isArray(loads)||!objeto(reviews))throw Error("Origen inválido");
 const previous=ledgerAnterior;
 if(previous!==null&&(!objeto(previous)||previous.schema!==DESCARTE_SCHEMA||
  previous.scope!==scope||!objeto(previous.items)))
  throw Error("Ledger previo incompatible; no se sobrescribe");
 const items=Object.create(null);
 for(const [id,entry] of Object.entries(previous?.items??{})){
  const canonico=normalizarLP(id);
  if(Object.hasOwn(items,canonico))throw Error("Colisión de LP del registro previo: "+canonico);
  revisarRegistro(entry);
  items[canonico]=copia(entry);
 }
 let nuevos=0,preservados=0;
 const seen=new Set();
 for(const load of loads){
  const key=codigoEstable(load);
  if(seen.has(key))throw Error("LP duplicado en el origen: "+key);
  seen.add(key);
  if(!Array.isArray(load.products))throw Error("Productos no válidos para "+key);
  if(Object.hasOwn(items,key))preservados++;
  else{items[key]=registroActivo();nuevos++;}
  if(Object.hasOwn(reviews,key)&&!objeto(reviews[key]))
   throw Error("Revisión incompatible para "+key);
 }
 return {ledger:{schema:DESCARTE_SCHEMA,scope,items},
  diagnostico:{totalCargas:loads.length,nuevos,preservados,
   entradasConservadasSinCarga:Object.keys(items).filter(id=>!seen.has(id)).length,
   revisionAnteriorIntacta:true,aplicada:false,requiereBackup:true}};
}
export function proyectarDescarte(load,ledger){
 const id=codigoEstable(load);
 const state=ledger?.items?.[id]??registroActivo();
 revisarRegistro(state);
 return {...load,...copia(state)};
}
