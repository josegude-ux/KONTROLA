// VISURA PREPARA ALMACEN F3A · contrato minimo de eventos de check.
// PROPUESTA aislada: sin red, sin UI, sin escrituras en Supabase, sin prueba fisica.
// El servidor debe validar autentificacion/autorizacion e imponer hora/version/actor propios.
import {auditarChecksDispositivo} from './control-cargas-descarte-f3a-evidencias.mjs';

const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const estados=new Set(['pending','ok','incident']);
const entero=v=>Number.isSafeInteger(v)&&v>=0;
const objetov=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fail=s=>{throw Error('F3A checks: '+s);};

// Debe invocarse DESPUES de markLine y saveReview, por cada accion puntual,
// reutilizando el mismo p_operacion en reintentos de red. No reenvio retroactivo masivo.
export function prepararEventoCheck({carga,revision,servidor,linea,estado,versionEsperada,operacionId,conectado}){
 if(conectado!==true)fail('sin conexion: check local no acreditado ni enviable como confirmado');
 if(!entero(versionEsperada))fail('version de servidor no acreditada');
 if(!UUID.test(String(operacionId||'')))fail('ID de operacion invalido');
 if(!entero(linea)||linea>=carga?.products?.length||!estados.has(estado))fail('linea/estado invalidos');
 const verificado=auditarChecksDispositivo({carga,revision,servidor});
 if(!verificado.apta||!HASH.test(verificado.pdf_hash))fail('fuente invalida');
 if(!Array.isArray(revision.audit)||!revision.audit.length)fail('sin evento local inmediato');
 const ultimo=revision.audit.at(-1);
 if(ultimo.line!==linea||ultimo.to!==estado)fail('evento no corresponde al ultimo cambio local');
 return Object.freeze({
  p_almacen:servidor.almacen,
  p_lp:carga.id,
  p_pdf_hash:carga.pdfHash,
  p_linea:linea,
  p_estado:estado,
  p_version_esperada:versionEsperada,
  p_operacion:operacionId,
 });
}

// Simulacion de solo lectura del reducer que deberá implementar el servidor.
// EN NINGUN CASO sustituye una RPC/consulta autenticada ni certifica check fisico.
export function resumenDesdeEventos({total,eventos}){
 if(!entero(total)||total===0||total>3000||!Array.isArray(eventos))fail('total/eventos invalidos');
 const lines=new Map();const ids=new Set();let previous=0;
 for(const e of eventos){
  if(!objetov(e)||!entero(e.version)||e.version!==previous+1 ||
   !entero(e.linea)||e.linea>=total||!estados.has(e.estado)||
   !UUID.test(String(e.operacion_id||''))||ids.has(e.operacion_id)||
   !UUID.test(String(e.actor||''))||!Number.isFinite(Date.parse(e.hora_servidor||'')))
   fail('secuencia remota no acreditable');
  if((lines.get(e.linea)||'pending')===e.estado)fail('transicion de estado redundante');
  ids.add(e.operacion_id);lines.set(e.linea,e.estado);previous=e.version;
 }
 let checked=0,incidents=0;
 for(const estado of lines.values()){
  if(estado!=='pending')checked++;
  if(estado==='incident')incidents++;
 }
 return Object.freeze({total,checked,pending:total-checked,incidents,version:previous,
  fuente:'eventos_recibidos_servidor',acredita_verificacion_fisica:false});
}

// Gate previo a la futura RPC de descarte; nunca basta una cifra de dispositivo.
export function comprobarDescarteConEventos({cargaServidor,head,eventos,colaPendiente=0}){
 if(!objetov(cargaServidor)||!objetov(head)||!Array.isArray(eventos)||!entero(colaPendiente))fail('fuentes incompletas');
 if(cargaServidor.almacen!==head.almacen||cargaServidor.codigo!==head.lp||
  cargaServidor.pdf_hash!==head.pdf_hash||!HASH.test(head.pdf_hash)||
  cargaServidor.fin!==null||!['sin_iniciar','en_preparacion'].includes(cargaServidor.estado)||
  !entero(cargaServidor.referencias)||!entero(head.version)||
  head.version!==eventos.length)fail('identidad o version de fuente no acreditada');
 const r=resumenDesdeEventos({total:cargaServidor.referencias,eventos});
 if(colaPendiente!==0)fail('hay cambios de check locales sin confirmar');
 if(r.checked===0||r.pending===0)fail('debe existir un check confirmado y al menos un pendiente');
 return Object.freeze({...r,apta_para_solicitar_descarte:true});
}
