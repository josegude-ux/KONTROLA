import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRecepcionLabService,memoryLabStorage} from '../src/cierre-recepcion-lab-service.mjs';
import {LAB_LOADS,LAB_ACTORS} from '../lab/recepcion-fixtures.mjs';
const mk=(extra={})=>createRecepcionLabService({fixtures:LAB_LOADS,actors:LAB_ACTORS,storage:memoryLabStorage(),clock:()=>"2026-11-05T17:00:00.000Z",...extra});
const w='COR_01_COR', load='LAB-COR-001',actorId='lab-almacen';
const op=(s,id='open-1',who=actorId,code=load,warehouse=w)=>s.open({actorId:who,loadId:code,warehouse,actionId:id});
const close=(s,id='close-1',confirmed=true,who=actorId,code=load,warehouse=w)=>s.close({actorId:who,loadId:code,warehouse,actionId:id,noIncidentsConfirmed:confirmed});
const incident=(s,id='inc-1',body={kind:'QUANTITY_DIFFERENCE',originalLineId:'1',reportedActualQuantity:'7'},who=actorId)=>s.incident({actorId:who,loadId:load,warehouse:w,actionId:id,incident:body});
const throws=(f,exp)=>assert.throws(f,exp);

test('LAB: hojas y IDs de carga permanecen acreditados como sintéticos',()=>{
 const s=mk(),r=op(s);
 assert.equal(r.loadId,load);assert.equal(r.warehouse,w);assert.equal(r.recordId,`RET-LAB:${w}|${load}`);
 assert.equal(r.originalLines[0].sku,'MAH-LAB-A');assert.equal(r.originalLines[0].quantityText,'10');
 assert.equal(s.get(actorId,load,w).load.originalEvidence.documentId,'HOJA-SINTETICA-001');
});
test('LAB: no abre cierre si no se acredita hoja sintética original',()=>{
 throws(()=>op(mk(),'open-x',actorId,'LAB-COR-003'),/Hoja original no acreditada/);
});
test('LAB: cierre sin incidencias exige confirmación y permiso explícitos',()=>{
 const s=mk();op(s);
 throws(()=>close(s,'cl1',false),/SIN INCIDENCIAS/);
 const r=close(s,'cl2',true);
 assert.equal(r.status,'CLOSED_OPERATIONAL');assert.equal(r.incidentStatus,'NONE');assert.equal(r.incidents.length,0);
});
test('LAB: no permite cerrar sin abrir borrador',()=>throws(()=>close(mk()),/No hay ficha/));
test('LAB: cierre con diferencia conserva incidencia OPEN y trazabilidad',()=>{
 const s=mk();op(s);incident(s);
 const r=close(s,'cl1',false);
 assert.equal(r.status,'CLOSED_OPERATIONAL');assert.equal(r.incidentStatus,'OPEN');
 assert.equal(r.incidents[0].resolution,'OPEN');assert.equal(r.history.at(-1).type,'RETURN_CLOSED_OPERATIONAL');
 assert.equal(r.stockCheckCandidates[0].state,'PENDING_BRIDGE');
});
test('LAB: se impide declarar sin incidencias si existen diferencias',()=>{
 const s=mk();op(s);incident(s);throws(()=>close(s,'cl1',true),/No se puede declarar/);
});
test('LAB: referencia incorrecta crea propuestas para ambas SKU, nunca stock real',()=>{
 const s=mk();op(s);incident(s,'i1',{kind:'WRONG_REFERENCE',originalLineId:'1',reportedActualSku:'OTRA-LAB',reportedActualQuantity:'10',reportedActualUnit:'CAJA'});
 const r=close(s,'cl1',false);assert.deepEqual(r.stockCheckCandidates.map(c=>c.sku).sort(),['MAH-LAB-A','OTRA-LAB']);
 assert.ok(r.stockCheckCandidates.every(c=>c.state==='PENDING_BRIDGE'));
});
test('LAB: incidencia de cantidad afecta únicamente a la SKU original',()=>{
 const s=mk();op(s);incident(s);assert.deepEqual(close(s,'cl1',false).stockCheckCandidates.map(c=>c.sku),['MAH-LAB-A']);
});
test('LAB: impedir duplicar ficha de la misma carga y almacén',()=>{
 const s=mk();op(s);throws(()=>op(s,'open-2'),/ya iniciada/);
});
test('LAB: idempotencia: mismo comando reintentado no duplica cierre ni historial',()=>{
 const s=mk();op(s);const once=close(s,'close-1');const twice=close(s,'close-1');
 assert.deepEqual(once,twice);assert.equal(s.get(actorId,load,w).record.history.filter(x=>x.type==='RETURN_CLOSED_OPERATIONAL').length,1);
});
test('LAB: misma clave con payload o actor diferente se rechaza',()=>{
 const s=mk();op(s);assert.deepEqual(op(s,'open-1'),s.get(actorId,load,w).record);
 throws(()=>op(s,'open-1','lab-supervisor'),/ID de comando reutilizado/);
});
test('LAB: IDs de incidencias duplicados se bloquean con payload diferente',()=>{
 const s=mk();op(s);incident(s);throws(()=>incident(s,'inc-1',{kind:'QUANTITY_DIFFERENCE',originalLineId:'1',reportedActualQuantity:'3'}),/ID de comando reutilizado/);
});
test('LAB: no se permite generar otra operación tras cierre',()=>{
 const s=mk();op(s);close(s);throws(()=>close(s,'close-otro'),/dos veces/);
 throws(()=>incident(s,'i2'),/Solo se añaden incidencias/);
});
test('LAB: lector sin permiso no abre ni añade ni cierra, aunque la UI ofrezca botones',()=>{
 const s=mk();throws(()=>op(s,'x','lab-lector'),/RETURN_OPEN/);
 op(s);throws(()=>close(s,'y',true,'lab-lector'),/RETURN_CLOSE/);
 throws(()=>incident(s,'z',undefined,'lab-lector'),/RETURN_INCIDENT_ADD/);
});
test('LAB: cuenta inactiva no consulta ni modifica',()=>{
 const s=mk();throws(()=>s.list('lab-inactivo',w),/Identidad LAB/);
 throws(()=>op(s,'y','lab-inactivo'),/Identidad LAB/);
});
test('LAB: separación de almacenes en lectura, apertura y cierre',()=>{
 const s=mk();throws(()=>s.list(actorId,'COR_02_FER'),/Almacén no autorizado/);
 throws(()=>op(s,'o','lab-ferrol',load,w),/Almacén no autorizado/);
 const r=op(s,'ferro','lab-ferrol','LAB-FER-004','COR_02_FER');assert.equal(r.warehouse,'COR_02_FER');
 const f=close(s,'cierro',true,'lab-ferrol','LAB-FER-004','COR_02_FER');assert.equal(f.incidentStatus,'NONE');
});
test('LAB: pendientes de ayer y sin hoja permanecen en listado',()=>{
 const s=mk();const a=s.list(actorId,w);
 assert.deepEqual(a.map(x=>x.loadId),['LAB-COR-001','LAB-COR-002','LAB-COR-003']);
 assert.equal(a[1].fechaCarga,'2026-11-03');assert.equal(a[2].hojaOriginalLab,false);
});
test('LAB: cierre limpio sale de pendientes; incidente OPEN de ayer sigue visible',()=>{
 const s=mk();op(s);close(s);
 op(s,'o2',actorId,'LAB-COR-002');
 s.incident({actorId,loadId:'LAB-COR-002',warehouse:w,actionId:'i2',incident:{kind:'MISSING',originalLineId:'1',reportedActualQuantity:'0'}});
 close(s,'c2',false,actorId,'LAB-COR-002');
 const p=s.list(actorId,w);
 assert.equal(p.some(x=>x.loadId==='LAB-COR-001'),false);
 assert.equal(p.find(x=>x.loadId==='LAB-COR-002').incidenciasAbiertas,1);
});
test('LAB: cierre no inventa fecha acreditada de recepción',()=>{
 const s=mk();op(s);const r=close(s);const f=s.get(actorId,load,w).load;
 assert.equal(f.fechaRecepcionAcreditada,null);
 assert.equal(r.closedAt,'2026-11-05T17:00:00.000Z');
});
test('LAB: fuente original no se reescribe ante una diferencia',()=>{
 const s=mk();const r=op(s);incident(s);const n=s.get(actorId,load,w).record;
 assert.deepEqual(n.originalLines,r.originalLines);assert.equal(n.originalLines[0].quantityText,'10');
});
test('LAB: persistencia local sintética sobre recarga de servicio',()=>{
 const storage=memoryLabStorage();const s=mk({storage});op(s);incident(s);
 const again=mk({storage});assert.equal(again.get(actorId,load,w).record.incidents.length,1);
 assert.equal(close(again,'c2',false).incidentStatus,'OPEN');
});
test('LAB: checkpoint con hoja original modificada se rechaza',()=>{
 const storage=memoryLabStorage();op(mk({storage}));
 const altered=structuredClone(LAB_LOADS);altered[0].originalLines[0].quantity='999';
 throws(()=>mk({fixtures:altered,storage}),/hoja original LAB cambió/);
});
test('LAB: fallo del almacenamiento no confirma cambios en memoria',()=>{
 let fail=true;const storage={load:()=>null,save:()=>{if(fail)throw Error('DISCO_LAB_NO_DISPONIBLE');}};
 const s=mk({storage});throws(()=>op(s),/DISCO_LAB/);fail=false;
 assert.equal(op(s).status,'DRAFT');
});
test('LAB: campos ausentes no se confunden con cantidad cero',()=>{
 const s=mk();op(s);throws(()=>incident(s,'i1',{kind:'QUANTITY_DIFFERENCE',originalLineId:'1',reportedActualQuantity:''}),/Cantidad/);
});
test('LAB: la misma SKU en distinta unidad no colapsa candidatos',()=>{
 const fixtures=structuredClone(LAB_LOADS);fixtures[0].originalLines.push({lineId:'3',sku:'MAH-LAB-A',quantity:'30',unit:'BOTELLA'});
 const s=mk({fixtures});op(s);incident(s,'i1');incident(s,'i2',{kind:'QUANTITY_DIFFERENCE',originalLineId:'3',reportedActualQuantity:'29'});
 const r=close(s,'c1',false);assert.deepEqual(r.stockCheckCandidates.map(c=>c.unit).sort(),['BOTELLA','CAJA']);
});
test('LAB: no modifica activos empresariales ni crea métodos de red',()=>{
 const service=readFileSync(new URL('../src/cierre-recepcion-lab-service.mjs',import.meta.url),'utf8');
 const domain=readFileSync(new URL('../src/cierre-reparto-domain.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(service+domain,/fetch\(|\.rpc\(|\.from\(|\.insert\(|\.upsert\(|\.delete\(/);
});
