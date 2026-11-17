// VISURA PREPARA ALMACEN · F3A · evidencia de dispositivo (NO autoridad de servidor).
// NO importa Supabase, NO toca la PWA, NO llama APIs. Solo validación pura y
// reconciliación defensiva de dos copias del ledger F2 desde un estado remoto ya autenticado.
// Los hashes y el historial proporcionados por cliente NO prueban un check físico.
import {normalizarLP} from './control-cargas-lp.mjs';
import {sourceSignature,verificationAllowed} from './control-cargas-checklist.mjs';

const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPE=/^_visura_[a-f0-9]{24}$/;
const STATES=new Set(['pending','ok','incident']);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=msg=>{throw new Error('F3A: '+msg)};
const clone=o=>JSON.parse(JSON.stringify(o));
const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const finiteInt=x=>Number.isSafeInteger(x)&&x>=0;

export function auditarChecksDispositivo({carga,revision,servidor}){
 if(!carga||!revision||!servidor)fail('faltan fuentes');
 const lp=normalizarLP(carga.id);
 if(lp!==carga.id || !HASH.test(carga.pdfHash||'') || !verificationAllowed(carga))
  fail('LP/PDF/productos locales no verificables');
 if(revision.schema!==1 || revision.loadId!==carga.id || revision.sourceSignature!==sourceSignature(carga))
  fail('revisión no corresponde a la versión exacta del PDF');
 if(revision.closedAt!==null || !validTime(revision.createdAt) || !validTime(revision.updatedAt))
  fail('revisión cerrada o sin marcas temporales');
 if(servidor.codigo!==lp || servidor.pdf_hash!==carga.pdfHash ||
    servidor.almacen!=='COR_01_COR' || servidor.referencias!==carga.products.length ||
    !['sin_iniciar','en_preparacion'].includes(servidor.estado) || servidor.fin!==null)
  fail('LP/PDF/total/estado no coinciden con registro remoto PRUEBA_3');
 if(!object(revision.lines)||!Array.isArray(revision.audit))fail('revisión sin líneas/auditoría');
 const n=carga.products.length;
 const estado=Array(n).fill('pending');
 let anterior=null;
 for(const e of revision.audit){
  if(!object(e)|| !Number.isInteger(e.line)||e.line<0||e.line>=n||
   !STATES.has(e.from)||!STATES.has(e.to)||e.from!==estado[e.line]||!validTime(e.at))
   fail('secuencia de auditoría incompatible');
  if(anterior!==null&&Date.parse(e.at)<anterior)fail('auditoría con hora retrocedida');
  anterior=Date.parse(e.at);
  if(e.to==='incident'){
   const q=e.actualQty;
   if(!Number.isFinite(q)||q<0||q===Number(carga.products[e.line].qty))
    fail('incidencia sin cantidad diferente');
  }
  estado[e.line]=e.to;
 }
 for(const key of Object.keys(revision.lines)){
  if(!/^(0|[1-9][0-9]*)$/.test(key) || !Number.isSafeInteger(Number(key)) ||
     Number(key)>=n)fail('índice de línea inválido');
 }
 for(let i=0;i<n;i++){
  const saved=revision.lines[i];
  if(estado[i]==='pending'){
   if(saved!==undefined)fail('línea pendiente marcada como verificada');
  }else if(!object(saved)||saved.status!==estado[i]||
    (estado[i]==='incident'&&(!Number.isFinite(saved.actualQty)||
    saved.actualQty<0||saved.actualQty===Number(carga.products[i].qty))))
   fail('estado final no coincide con auditoría');
 }
 const checked=estado.filter(s=>s!=='pending').length;
 const incidents=estado.filter(s=>s==='incident').length;
 const pending=n-checked;
 if(pending===0)fail('carga ya totalmente comprobada');
 return Object.freeze({apta:true,lp,pdf_hash:carga.pdfHash,
  resumen:Object.freeze({total:n,checked,pending,incidents,cerrada:false}),
  evidencia:'consistencia_estructural_local_no_acreditada_por_servidor',
  estado_servidor:'identidad_y_total_coinciden_no_certifica_checks'});
}

const ledgerNuevo=scope=>({schema:1,scope,items:{}});
function validarLedger(ledger,scope){
 if(!object(ledger)||ledger.schema!==1||ledger.scope!==scope||!object(ledger.items))
  fail('ledger de otro usuario o incompatible');
 for(const [lp,record] of Object.entries(ledger.items)){
  if(normalizarLP(lp)!==lp || !object(record) || !finiteInt(record.version_descarte)||
     !['activa','descartada'].includes(record.estado_descarte))fail('ledger previo corrupto');
 }
 return ledger;
}
function leerCopia(storage,key,scope){
 const raw=storage.getItem(key);
 if(raw===null)return {estado:'ausente'};
 try{return {estado:'valida',datos:validarLedger(JSON.parse(raw),scope)};}
 catch{return {estado:'corrupta'};}
}
function conciliarUno(ledger,e){
 const previo=ledger.items[e.lp];
 if(previo&&e.version<previo.version_descarte)fail('respuesta remota más antigua que ledger');
 if(previo&&e.version===previo.version_descarte&&previo.estado_descarte!==e.estado)
  fail('mismo número de versión con estado incompatible');
 if(previo?.estado_descarte==='descartada'&&previo.pdf_hash_original&&
    previo.pdf_hash_original!==e.pdf_hash)fail('PDF original distinto; revisión manual');
 const nueva=clone(ledger);
 const local=clone(previo||{estado_descarte:'activa',descartada_en:null,
  descartada_por:null,motivo_descarte:null,progreso_al_descartar:null,
  snapshot_progreso_al_descartar:null,versiones_posteriores_recibidas:[],
  pendiente_confirmacion:false,version_descarte:0,historial_descarte:[]});
 if(e.estado==='descartada'){
  const s=e.snapshot_resumen;
  if(!object(s)||s._progreso_fuente!=='dispositivo_no_acreditado'||
     !finiteInt(s.total)||s.total<1||s.total>3000||!finiteInt(s.checked)||
     !finiteInt(s.pending)||s.pending<1||!finiteInt(s.incidents)||
     s.checked+s.pending!==s.total||s.incidents>s.checked)
    fail('snapshot remoto sin procedencia o sumas válidas');
  local.descartada_en=e.hora_descarte;
  local.descartada_por=e.actor_descarte;
  local.progreso_al_descartar={total:s.total,checked:s.checked,pending:s.pending,incidents:s.incidents};
  local.snapshot_progreso_al_descartar=clone(local.progreso_al_descartar);
  local.pdf_hash_original=e.pdf_hash;
 }
 local.estado_descarte=e.estado;
 local.version_descarte=e.version;
 local.pendiente_confirmacion=false;
 if(!Array.isArray(local.historial_descarte))fail('historial anterior inválido');
 if(!Array.isArray(local.versiones_posteriores_recibidas))fail('versiones posteriores inválidas');
 if(!previo||previo.version_descarte<e.version){
  local.historial_descarte.push({accion:'conciliar_estado_servidor',
   version:e.version,estado:e.estado,fuente:'consulta_autenticada_sin_certificar_checks'});
 }
 nueva.items[e.lp]=local;
 return nueva;
}
export function prepararConfirmacionServidor({scope,storage,estadoServidor}){
 if(!SCOPE.test(scope)||!storage||typeof storage.getItem!=='function')fail('ámbito o almacenamiento inválidos');
 const principal='visura_prepara_descarte_v1'+scope;
 const respaldo='visura_prepara_descarte_cache_v1'+scope;
 const a=leerCopia(storage,principal,scope),b=leerCopia(storage,respaldo,scope);
 if((a.estado==='corrupta'&&b.estado!=='valida')||
    (b.estado==='corrupta'&&a.estado!=='valida'))fail('ledger corrupto sin copia fiable');
 const e=estadoServidor;
 if(!object(e)||e.almacen!=='COR_01_COR'||normalizarLP(e.lp)!==e.lp||
    !HASH.test(e.pdf_hash||'')|| !['activa','descartada'].includes(e.estado)||
    !Number.isSafeInteger(e.version)||e.version<1||
    (e.estado==='descartada'&&(!UUID.test(e.actor_descarte||'')||!validTime(e.hora_descarte))))
  fail('respuesta del servidor inválida');
 // Si difieren LP A y LP B, no se permite sobreescribir datos de A al sincronizar B.
 // Se mantiene intacta la divergencia de A; F2 continúa bloqueando solamente ese LP.
 if(a.estado==='valida'&&b.estado==='valida'&&
    JSON.stringify(a.datos.items[e.lp])!==JSON.stringify(b.datos.items[e.lp]))
   fail('copias divergentes en el LP solicitado');
 const seed=a.datos||b.datos||ledgerNuevo(scope);
 const main=conciliarUno(a.datos||seed,e);
 const cache=conciliarUno(b.datos||seed,e);
 return Object.freeze({ledger:main,ledgerRespaldo:cache,
  primaryKey:principal,secondaryKey:respaldo,
  changed:JSON.stringify(a.datos)!==JSON.stringify(main)||
    JSON.stringify(b.datos)!==JSON.stringify(cache),
  alerta:'El estado procede de servidor, el progreso de dispositivo sin certificación'});
}

export function guardarConfirmacionServidor({scope,storage,estadoServidor}){
 if(!storage||typeof storage.setItem!=='function')fail('almacenamiento de escritura no disponible');
 const p=prepararConfirmacionServidor({scope,storage,estadoServidor});
 if(!p.changed)return {...p,guardado:false};
 // Dos fases y copias independientes: otros LP divergentes quedan intactos.
 // Una interrupción puede dejar divergente solo el LP pendiente y F2 lo bloqueará.
 storage.setItem(p.secondaryKey,JSON.stringify(p.ledgerRespaldo));
 storage.setItem(p.primaryKey,JSON.stringify(p.ledger));
 return {...p,guardado:true};
}
