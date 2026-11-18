/** VISURA PREPARA 15 R1/L6 — expediente de evidencia SINTÉTICA, solo LAB.
 * La huella SHA256 detecta cambios accidentales; NO es firma ni autentica procedencia.
 * Nunca crea movimientos, fechas acreditadas, permisos, eventos ni peticiones de red.
 */
export const SCHEMA_EXPEDIENTE_LAB='visura.prepara.recepcion.lab.expediente.v1';
const fail=message=>{throw new Error(message);};
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const onlyDate=x=>x===null||x===undefined||(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x));
const validIso=x=>typeof x==='string'&&!Number.isNaN(Date.parse(x))&&x.includes('T');
const copy=x=>structuredClone(x);
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const expectedLines=load=>load.originalLines?.map(l=>({lineId:String(l.lineId),sku:String(l.sku),quantityText:String(l.quantity),unit:String(l.unit)}))??null;

function comprobarContenido(p){
  if(!p||p.schema!==SCHEMA_EXPEDIENTE_LAB||p.ambito!=='LAB_SINTETICO_SIN_VALIDEZ_EMPRESARIAL')fail('Expediente no pertenece al laboratorio');
  const {carga,recepcion}=p;
  if(!carga||!nonempty(carga.loadId)||!nonempty(carga.warehouse)||!onlyDate(carga.fechaCarga)||!onlyDate(carga.fechaRecepcionAcreditada))fail('Identidad o fechas acreditadas inválidas');
  if(!Array.isArray(carga.originalLines)&&carga.originalLines!==null)fail('Hoja original inválida');
  if(carga.originalLines&&(!nonempty(carga.originalEvidenceId)||new Set(carga.originalLines.map(x=>x.lineId)).size!==carga.originalLines.length))fail('Hoja sintética sin evidencia o duplicada');
  if(!validIso(p.exportadoEn))fail('Instante de exportación no válido');
  if(recepcion===null)return true;
  if(!recepcion||recepcion.recordId!==`RET-LAB:${carga.warehouse}|${carga.loadId}`||recepcion.loadId!==carga.loadId||recepcion.warehouse!==carga.warehouse)fail('Ficha pertenece a otra carga/almacén');
  if(!carga.originalLines||!exact(recepcion.originalLines,carga.originalLines))fail('Ficha sin hoja original intacta');
  if(!['DRAFT','CLOSED_OPERATIONAL'].includes(recepcion.status)||!Array.isArray(recepcion.incidents)||!Array.isArray(recepcion.history)||!Array.isArray(recepcion.stockCheckCandidates))fail('Estado o trazabilidad de ficha inválidos');
  const closeEvents=recepcion.history.filter(h=>h.type==='RETURN_CLOSED_OPERATIONAL');
  if(recepcion.status==='CLOSED_OPERATIONAL'){
    if(!validIso(recepcion.closedAt)||!nonempty(recepcion.closedBy)||closeEvents.length!==1)fail('Cierre sin evidencia de operación');
    if(recepcion.incidents.some(i=>i.resolution!=='OPEN')&&recepcion.incidentStatus==='OPEN')fail('Estado de incidencias incongruente');
    if(recepcion.incidentStatus!==(recepcion.incidents.some(i=>i.resolution==='OPEN')?'OPEN':'NONE'))fail('Incidencias OPEN no coinciden con ficha');
  }else if(closeEvents.length||recepcion.closedAt||recepcion.closedBy)fail('Borrador aparenta un cierre');
  if(new Set(recepcion.incidents.map(i=>i.incidentId)).size!==recepcion.incidents.length)fail('Incidencias duplicadas');
  return true;
}
const sha256=async content=>{
  if(!globalThis.crypto?.subtle?.digest)fail('WebCrypto no disponible: no se exporta sin huella');
  const buf=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
};
export async function crearExpedienteRecepcionLab({load,record,exportadoEn=new Date().toISOString()}){
  if(!load||!nonempty(load.warehouse)||!nonempty(load.loadId))fail('Carga sintética no acreditada');
  if(load.originalEvidence&&!['LAB_SYNTHETIC_SHEET'].includes(load.originalEvidence.kind))fail('No se admiten hojas empresariales');
  const p={schema:SCHEMA_EXPEDIENTE_LAB,ambito:'LAB_SINTETICO_SIN_VALIDEZ_EMPRESARIAL',
    aviso:'SHA256 verifica integridad del contenido, NO demuestra autenticidad, autorización ni recepción real.',
    exportadoEn,
    carga:{loadId:load.loadId,warehouse:load.warehouse,fechaCarga:load.fechaCarga??null,
      fechaRecepcionAcreditada:load.fechaRecepcionAcreditada??null,
      originalEvidenceId:load.originalEvidence?.documentId??null,originalLines:expectedLines(load)},
    recepcion:record===null?null:copy(record)};
  comprobarContenido(p);
  return {contenido:p,sha256:await sha256(JSON.stringify(p))};
}
export async function verificarExpedienteRecepcionLab(obj){
  if(!obj||!Object.prototype.hasOwnProperty.call(obj,'contenido')||!/^[a-f0-9]{64}$/.test(obj.sha256??''))fail('Envoltorio de evidencia incorrecto');
  comprobarContenido(obj.contenido);
  const digest=await sha256(JSON.stringify(obj.contenido));
  if(digest!==obj.sha256)fail('HUELLA SHA256 INCORRECTA: fichero modificado');
  return {verificado:true,ambito:obj.contenido.ambito,carga:obj.contenido.carga.loadId,
    almacen:obj.contenido.carga.warehouse,estado:obj.contenido.recepcion?.status??'PENDING',
    incidenciasOpen:obj.contenido.recepcion?.incidents.filter(i=>i.resolution==='OPEN').length??0,
    advertencia:'Integridad técnica, no autenticidad empresarial ni firma digital'};
}
