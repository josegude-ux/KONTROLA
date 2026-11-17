// VISURA PREPARA ALMACEN FASE 3A · PREPARACION INERTE (NO UI, NO RPC).
// Esta pieza solamente compone checklist y outbox ya existentes.
// No importar desde la PWA activa ni habilitar hasta autorizacion posterior.
import {getReview,markLine,saveReview,verificationAllowed} from './control-cargas-checklist.mjs';
import {crearCoordinadorCheckF3A,crearRepositorioIndexedDBChecksF3A} from './control-cargas-f3a-outbox.mjs';

const SCOPE=/^_visura_[a-f0-9]{24}$/;
const LP=/^LP[0-9]{2}-[0-9]{4,6}$/;
const HASH=/^[a-f0-9]{64}$/;
const STATES=new Set(['pending','ok','incident']);
const stop=message=>{throw Error('F3A puente inerte: '+message);};

export const F3A_CHECKLIST_HABILITADO=false;

// Un adaptador sin efecto cuando disabled; no crea IndexedDB ni lee localStorage.
// enabled=true es SOLO para ensayos locales explicitamente inyectados; no hay conexion de red.
export function crearPuenteChecklistF3A({enabled=false,scope,storage,repo,uuid,now}={}){
 if(enabled!==true)return Object.freeze({estado:'desactivado',
  async marcar(){stop('funcionalidad desactivada');}});
 if(!SCOPE.test(scope||'')||!storage||typeof storage.getItem!=='function'||
    typeof storage.setItem!=='function'||typeof uuid!=='function')stop('dependencias incompletas');
 const coordinator=crearCoordinadorCheckF3A({scope,repo:repo??crearRepositorioIndexedDBChecksF3A({scope})});
 const inFlight=new Set();
 async function marcar({carga,linea,estado,actualQty=null,nota=''}){
  if(!carga||!LP.test(carga.id||'')||!HASH.test(carga.pdfHash||'')||
     !verificationAllowed(carga)||!Number.isSafeInteger(carga.refs)||
     carga.refs!==carga.products.length)stop('carga PRUEBA_3 sin identidad, PDF o referencias acreditables');
  if(!Number.isInteger(linea)||linea<0||linea>=carga.products.length||!STATES.has(estado))
   stop('linea o estado invalidos');
  if(inFlight.has(carga.id))stop('operacion local para LP ya en curso');
  inFlight.add(carga.id);
  try{
   const {review,stale}=getReview(storage,scope,carga);
   if(stale||review.closedAt)stop('revision obsoleta o cerrada');
   if((review.lines[linea]?.status||'pending')===estado)stop('estado redundante');
   const next=markLine(review,carga,linea,estado,actualQty,nota,now?now():new Date().toISOString());
   const operacionId=uuid();
   const identity={almacen:'COR_01_COR',lp:carga.id,pdfHash:carga.pdfHash};
   // Intencion duradera antes de modificar la revision local.
   await coordinator.guardarIntencion({identity,operacionId,linea,estado,
    auditIndex:review.audit.length,sourceSignature:review.sourceSignature});
   // Si falla localStorage, permanece intencion sin acreditar, nunca una RPC enviada.
   saveReview(storage,scope,next);
   // Si falla IDB despues del guardado, tampoco se envia y requiere conciliacion.
   await coordinator.acreditarRegistroLocal({identity,operacionId,revision:next});
   return Object.freeze({estado:'local_pendiente_servidor',operacionId,
    linea,revision:resumenLocal(next)});
  }finally{inFlight.delete(carga.id);}
 }
 // Solo se devuelven metadatos locales. Ningun resumen de dispositivo es prueba remota.
 function resumenLocal(r){return {loadId:r.loadId,auditLength:r.audit.length};}
 return Object.freeze({estado:'preparado_solo_local',marcar});
}
