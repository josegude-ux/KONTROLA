// VISURA PREPARA · FASE 2 · adaptador LOCAL / SIN RED.
// Contrato remoto F3 (NO implementado aquí): consultarEstado, registrarVersionPosterior,
// descartarLote y restaurar mediante RPC con auth.uid(), clock_timestamp(), CAS y RLS.
// Este módulo NO importa Supabase, no modifica revisiones, preparación ni BC.
import {normalizarLP} from "./control-cargas-lp.mjs";
import {descarteKey,registroActivo,revisarRegistro,DESCARTE_SCHEMA} from "./control-cargas-descarte-model.mjs";
export const cacheKey=scope=>"visura_prepara_descarte_cache_v1"+scope;
export const incidenciasKey=scope=>"visura_prepara_descarte_incidencias_v1"+scope;
const copy=value=>JSON.parse(JSON.stringify(value));
const HASH=/^[a-f0-9]{64}$/;
function validateLedger(value,scope){
 if(!value||value.schema!==DESCARTE_SCHEMA||value.scope!==scope||
    !value.items||typeof value.items!=="object"||Array.isArray(value.items))
  throw Error("Copia de descartes incompatible");
 for(const [key,entry] of Object.entries(value.items)){
  if(normalizarLP(key)!==key)throw Error("Clave LP no canónica en el registro");
  revisarRegistro(entry);
 }
 return value;
}
function readSlot(storage,key,scope){
 try{
  const raw=storage.getItem(key);
  if(raw===null)return {estado:"ausente"};
  return {estado:"legible",ledger:validateLedger(JSON.parse(raw),scope)};
 }catch(error){return {estado:"error",detalle:String(error?.message||error)};}
}
export function crearAdaptadorLocalDescarte({scope,storage,now=()=>new Date().toISOString()}){
 const primaryKey=descarteKey(scope),secondaryKey=cacheKey(scope),issueKey=incidenciasKey(scope);
 if(!storage||typeof storage.getItem!=="function"||typeof storage.setItem!=="function")
  throw Error("Almacenamiento local no disponible");
 function leer(){
  const principal=readSlot(storage,primaryKey,scope),cache=readSlot(storage,secondaryKey,scope);
  if(principal.estado==="error"&&cache.estado!=="legible")
   return {estado:"indeterminado",motivo:"Registro principal ilegible y sin copia local válida"};
  if(principal.estado==="legible"&&cache.estado==="legible"){
   const x=JSON.stringify(principal.ledger),y=JSON.stringify(cache.ledger);
   if(x!==y){
    // Una divergencia afecta a los LP con diferencias, no a todas las cargas.
    const keys=new Set([...Object.keys(principal.ledger.items),...Object.keys(cache.ledger.items)]);
    const codigosAfectados=[...keys].filter(key=>
     JSON.stringify(principal.ledger.items[key])!==JSON.stringify(cache.ledger.items[key]));
    return {estado:"parcial",ledger:principal.ledger,codigosAfectados,
     pendienteConfirmacion:true,motivo:"Copias divergentes; se aíslan LP afectados"};
   }
   return {estado:"disponible",ledger:principal.ledger,pendienteConfirmacion:false};
  }
  if(principal.estado==="legible")return {estado:"disponible",ledger:principal.ledger,
   pendienteConfirmacion:true,motivo:"Sin copia de reserva; confirmar en servidor cuando exista"};
  if(cache.estado==="legible")return {estado:"disponible",ledger:cache.ledger,
   pendienteConfirmacion:true,motivo:"Solo copia local de reserva; confirmar cuando exista servidor"};
  return {estado:"indeterminado",motivo:"No existe registro de descartes ni copia local"};
 }
 function registrarIncidencia({lp,motivo,hash=null}){
  const codigo=normalizarLP(lp);
  const entry={codigo,origen:"F2-dispositivo",en_dispositivo:now(),
   motivo:String(motivo).slice(0,200),hash:HASH.test(String(hash))?hash:null,
   pendiente_confirmar:true};
  try{
   let existing=JSON.parse(storage.getItem(issueKey)||"[]");
   if(!Array.isArray(existing))existing=[];
   const next=[...existing.slice(-99),entry];storage.setItem(issueKey,JSON.stringify(next));
   return {...entry,persistida:true};
  }catch{return {...entry,persistida:false};}
 }
 // ÚNICO método de lectura para importación, descarte futuro y restauración futura.
 function consultarEstado(lp,{cargaLocal=null}={}){
  const codigo=normalizarLP(lp),res=leer();
  if(cargaLocal?.estado_descarte==="descartada"){
   return {codigo,estado:"descartada",registro:res.ledger?.items?.[codigo]||copy(cargaLocal),
    pendienteConfirmacion:res.estado!=="disponible"||res.pendienteConfirmacion,
    motivo:res.motivo||"Descarte conservado en carga local"};
  }
  if(res.estado==="indeterminado"||
     (res.estado==="parcial"&&res.codigosAfectados.includes(codigo))){
   return {codigo,estado:"indeterminado",registro:null,afectado:
    res.estado==="parcial"&&res.codigosAfectados.includes(codigo),
    pendienteConfirmacion:true,motivo:res.motivo};
  }
  const entry=res.ledger.items[codigo];
  return {codigo,estado:entry?.estado_descarte||"activa",
   registro:entry||registroActivo(),
   pendienteConfirmacion:res.pendienteConfirmacion||false,
   motivo:res.motivo||null};
 }
 function decidirImportacion({lp,hash,cargaLocal=null}){
  const estado=consultarEstado(lp,{cargaLocal});
  if(!HASH.test(String(hash)))throw Error("SHA-256 de PDF inválido");
  if(estado.estado==="indeterminado"){
   const incidencia=registrarIncidencia({lp,motivo:estado.motivo,hash});
   // Carga realmente NUEVA: permitir importación y avisar, sin afirmar estado del ledger.
   // LP existente o detectado en copias contradictorias: NO reactivar.
   if(!cargaLocal&&!estado.afectado){
    return {...estado,estado:"nueva_pendiente_confirmacion",
     accion:"importar",aviso:estado.motivo,incidencia};
   }
   return {...estado,accion:"bloquear",incidencia};
  }
  if(estado.estado==="descartada"){
   const original=String(cargaLocal?.pdfHash||estado.registro?.pdf_hash_original||"").toLowerCase();
   const misma=hash===original ||
    estado.registro?.versiones_posteriores_recibidas?.some(v=>v.sha256===hash);
   return {...estado,accion:misma?"conservar":"registrar_version_posterior",
    hashOriginal:original||null};
  }
  return {...estado,accion:"importar",
   aviso:estado.pendienteConfirmacion?estado.motivo:null};
 }
 function registrarVersionPosterior({lp,hash,hashOriginal=null}){
  const codigo=normalizarLP(lp);
  if(!HASH.test(String(hash)))throw Error("SHA-256 inválido");
  const state=leer();
  if(state.estado!=="disponible")throw Error("Registro no disponible: no se guarda versión");
  const entry=state.ledger.items[codigo];
  if(entry?.estado_descarte!=="descartada")throw Error("La carga ya no está descartada");
  if(hash===hashOriginal||hash===entry.pdf_hash_original)return {codigo,añadida:false};
  if(entry.versiones_posteriores_recibidas?.some(v=>v.sha256===hash))
   return {codigo,añadida:false};
  const next=copy(state.ledger);
  const record=next.items[codigo];
  record.pdf_hash_original=record.pdf_hash_original||hashOriginal||null;
  record.versiones_posteriores_recibidas=[
   ...(record.versiones_posteriores_recibidas||[]),
   {sha256:hash,recibida_en_dispositivo:now(),pendiente_restauracion:true}
  ];
  record.pendiente_confirmacion=true;
  // Ni el usuario/fecha de descarte ni su snapshot de progreso se reescriben.
  // Actualizar primero la copia de reserva: en fallo, la versión principal continúa.
  const json=JSON.stringify(next);
  storage.setItem(secondaryKey,json);
  storage.setItem(primaryKey,json);
  return {codigo,añadida:true,registro:copy(record)};
 }
 return Object.freeze({consultarEstado,decidirImportacion,registrarVersionPosterior,
  registrarIncidencia,leer,contrato:"local-sin-red-f2"});
}
// F3: SupabaseAdapter debe implementar los métodos anteriores y RPC server-auth;
// las operaciones de descarte/restauración serán exclusivas de RPC, no del cliente.
