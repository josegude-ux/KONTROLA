import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRecepcionLabService,memoryLabStorage} from '../src/cierre-recepcion-lab-service.mjs';
import {LAB_LOADS,LAB_ACTORS} from '../lab/recepcion-fixtures.mjs';
import {crearExpedienteRecepcionLab,verificarExpedienteRecepcionLab,SCHEMA_EXPEDIENTE_LAB} from '../src/cierre-recepcion-expediente-lab.mjs';
const at='2026-11-05T16:42:00.000Z';
const wh='COR_01_COR',who='lab-almacen',loadId='LAB-COR-001';
const mk=(storage=memoryLabStorage())=>createRecepcionLabService({fixtures:LAB_LOADS,actors:LAB_ACTORS,storage,clock:()=>at});
const get=(s,whoArg=who,whArg=wh,id=loadId)=>s.get(whoArg,id,whArg);
const make=(s)=>crearExpedienteRecepcionLab({...get(s),exportadoEn:at});
const open=(s)=>s.open({actorId:who,loadId,warehouse:wh,actionId:'open-r1l6'});
const incident=(s)=>s.incident({actorId:who,loadId,warehouse:wh,actionId:'incident-r1l6',incident:{kind:'QUANTITY_DIFFERENCE',originalLineId:'1',reportedActualQuantity:'4'}});
const close=(s,clean)=>s.close({actorId:who,loadId,warehouse:wh,actionId:'close-r1l6',noIncidentsConfirmed:clean});
const clone=x=>structuredClone(x);
const recalc=async x=>{x.sha256=createHash('sha256').update(JSON.stringify(x.contenido)).digest('hex');return x;};
test('L6: expediente sintético pendiente se exporta y verifica sin inventar fecha',async()=>{
 const x=await make(mk());const ver=await verificarExpedienteRecepcionLab(x);
 assert.equal(x.contenido.schema,SCHEMA_EXPEDIENTE_LAB);
 assert.equal(x.contenido.recepcion,null);assert.equal(x.contenido.carga.fechaRecepcionAcreditada,null);
 assert.equal(ver.estado,'PENDING');assert.equal(x.sha256.length,64);assert.match(ver.advertencia,/no autenticidad/);
});
test('L6: borrador conserva exactamente la hoja original sintética',async()=>{
 const s=mk();open(s);const x=await make(s);
 assert.equal(x.contenido.recepcion.status,'DRAFT');
 assert.deepEqual(x.contenido.recepcion.originalLines,x.contenido.carga.originalLines);
 await verificarExpedienteRecepcionLab(x);
});
test('L6: cierre limpio deja incidencia NONE y un solo evento de cierre',async()=>{
 const s=mk();open(s);close(s,true);const x=await make(s);
 assert.equal((await verificarExpedienteRecepcionLab(x)).estado,'CLOSED_OPERATIONAL');
 assert.equal(x.contenido.recepcion.incidentStatus,'NONE');
 assert.equal(x.contenido.recepcion.history.filter(z=>z.type==='RETURN_CLOSED_OPERATIONAL').length,1);
 assert.equal(x.contenido.carga.fechaRecepcionAcreditada,null);
});
test('L6: cierre con incidencia OPEN no la resuelve ni altera el instante de recepción',async()=>{
 const s=mk();open(s);incident(s);close(s,false);const x=await make(s);
 assert.equal((await verificarExpedienteRecepcionLab(x)).incidenciasOpen,1);
 assert.equal(x.contenido.recepcion.incidents[0].resolution,'OPEN');
 assert.equal(x.contenido.carga.fechaRecepcionAcreditada,null);
 assert.equal(x.contenido.recepcion.closedAt,at);
});
test('L6: dos exportaciones del mismo estado y hora son deterministas',async()=>{
 const s=mk();open(s);incident(s);close(s,false);
 const a=await make(s),b=await make(s);assert.deepEqual(a,b);
});
test('L6: no altera el almacenamiento, no genera nuevas órdenes ni historial',async()=>{
 const storage=memoryLabStorage(),s=mk(storage);open(s);incident(s);
 const before=storage.load();await make(s);assert.deepEqual(storage.load(),before);
});
test('L6: acceso denegado a otro almacén incluso para exportación',async()=>{
 const s=mk();assert.throws(()=>get(s,'lab-ferrol'),/Almacén no autorizado/);
});
test('L6: usuario inactivo no puede obtener documentos',()=>assert.throws(()=>get(mk(),'lab-inactivo'),/Identidad LAB/));
test('L6: Ferrol y Coruña generan expedientes inequívocos sin mezclar cargas',async()=>{
 const s=mk(),fer=await crearExpedienteRecepcionLab({...get(s,'lab-ferrol','COR_02_FER','LAB-FER-004'),exportadoEn:at});
 const cor=await make(s);assert.notEqual(fer.sha256,cor.sha256);
 assert.equal(fer.contenido.carga.warehouse,'COR_02_FER');await verificarExpedienteRecepcionLab(fer);
});
test('L6: hoja original ausente no se inventa en expediente pendiente',async()=>{
 const s=mk(),x=await crearExpedienteRecepcionLab({...get(s,who,wh,'LAB-COR-003'),exportadoEn:at});
 assert.equal(x.contenido.carga.originalEvidenceId,null);assert.equal(x.contenido.carga.originalLines,null);
 assert.equal(x.contenido.recepcion,null);await verificarExpedienteRecepcionLab(x);
});
test('L6: cambio de un solo byte detectado por SHA-256',async()=>{
 const x=await make(mk());const bad=clone(x);bad.contenido.carga.originalLines[0].sku='ADULTERADO';
 await assert.rejects(()=>verificarExpedienteRecepcionLab(bad),/HUELLA SHA256/);
});
test('L6: huella calculada de nuevo NO convalida identidad de otra carga',async()=>{
 const s=mk();open(s);const x=await make(s);x.contenido.recepcion.loadId='OTRA';
 await recalc(x);await assert.rejects(()=>verificarExpedienteRecepcionLab(x),/otra carga\/almacén/);
});
test('L6: huella recalculada NO convalida hoja original modificada',async()=>{
 const s=mk();open(s);const x=await make(s);x.contenido.recepcion.originalLines[0].quantityText='999';
 await recalc(x);await assert.rejects(()=>verificarExpedienteRecepcionLab(x),/hoja original intacta/);
});
test('L6: huella recalculada NO acredita cierre incompleto',async()=>{
 const s=mk();open(s);close(s,true);const x=await make(s);x.contenido.recepcion.history.pop();
 await recalc(x);await assert.rejects(()=>verificarExpedienteRecepcionLab(x),/Cierre sin evidencia/);
});
test('L6: huella recalculada NO oculta incidencias OPEN',async()=>{
 const s=mk();open(s);incident(s);close(s,false);const x=await make(s);
 x.contenido.recepcion.incidentStatus='NONE';await recalc(x);
 await assert.rejects(()=>verificarExpedienteRecepcionLab(x),/Incidencias OPEN/);
});
test('L6: no acepta duplicados de incidentId',async()=>{
 const s=mk();open(s);incident(s);const x=await make(s);
 x.contenido.recepcion.incidents.push(clone(x.contenido.recepcion.incidents[0]));await recalc(x);
 await assert.rejects(()=>verificarExpedienteRecepcionLab(x),/duplicadas/);
});
test('L6: ni hoja empresarial, ni fecha libre ni payload sin marca LAB',async()=>{
 const s=mk(),data=get(s);
 await assert.rejects(()=>crearExpedienteRecepcionLab({...data,load:{...data.load,originalEvidence:{kind:'PRODUCTION',documentId:'x'}}}),/empresariales/);
 const bad=await make(s);bad.contenido.ambito='PRODUCCION';await recalc(bad);
 await assert.rejects(()=>verificarExpedienteRecepcionLab(bad),/laboratorio/);
});
test('L6: CLI verifica copia JSON legítima y rechaza copia manipulada',async()=>{
 const d=mkdtempSync(join(tmpdir(),'visura15-expediente-'));
 try{
  const obj=await make(mk()),path=join(d,'expediente.json');writeFileSync(path,JSON.stringify(obj));
  const cli=join(process.cwd(),'lab/verificar-expediente-lab.mjs');
  const good=spawnSync(process.execPath,[cli,path],{encoding:'utf8'});
  assert.equal(good.status,0,good.stderr);assert.match(good.stdout,/"verificado": true/);
  obj.contenido.carga.fechaCarga='2026-11-03';writeFileSync(path,JSON.stringify(obj));
  const bad=spawnSync(process.execPath,[cli,path],{encoding:'utf8'});
  assert.equal(bad.status,1);assert.match(bad.stderr,/HUELLA SHA256/);
 }finally{rmSync(d,{recursive:true,force:true});}
});
test('L6: exportación no contiene conexión ni funciones de escritura remota',()=>{
 const source=readFileSync(new URL('../src/cierre-recepcion-expediente-lab.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/supabase|\.rpc\(|\.insert\(|\.upsert\(|fetch\(|\.delete\(/i);
});
