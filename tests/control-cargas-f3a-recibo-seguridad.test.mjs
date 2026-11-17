import test from 'node:test';
import assert from 'node:assert/strict';
import {crearCoordinadorCheckF3A} from '../src/control-cargas-f3a-outbox.mjs';

const scope='_visura_'+'a'.repeat(24);
const identity={almacen:'COR_01_COR',lp:'LP26-21230',pdfHash:'a'.repeat(64)};
const op='a71d3ee7-181f-4c2a-9000-000000000001';
const tab='a71d3ee7-181f-4c2a-9000-000000000002';
function fixture(estado='ok'){
 const rows=new Map();
 const repo={
  async read(key){return rows.has(key)?structuredClone(rows.get(key)):null},
  async atomicUpdate(key,fn){const r=fn(rows.has(key)?structuredClone(rows.get(key)):null);if(r?.next)rows.set(key,structuredClone(r.next));return r?.value}
 };
 const o=crearCoordinadorCheckF3A({scope,repo,now:()=>1000});
 return {o,estado};
}
async function ready(estado='ok'){
 const {o}=fixture(estado);
 await o.guardarIntencion({identity,operacionId:op,linea:0,estado,auditIndex:0,sourceSignature:'sig'});
 await o.acreditarRegistroLocal({identity,operacionId:op,revision:{sourceSignature:'sig',audit:[{line:0,to:estado}]}});
 await o.reservarEnvio({identity,tabId:tab,online:true,versionServidor:0});
 return o;
}
function receipt(estado='ok'){
 return {operacion_id:op,almacen:identity.almacen,lp:identity.lp,
  pdf_hash:identity.pdfHash,linea:0,estado,version:1,
  procedencia:'evento_registrado_en_servidor',verificacion_fisica_acreditada:false,
  actor:'a71d3ee7-181f-4c2a-9000-000000000009',hora_servidor:'2026-11-17T10:00:00Z',
  total:3,checked:estado==='pending'?0:1,pending:estado==='pending'?3:2,incidents:estado==='incident'?1:0};
}
async function submit(o,recibo){return o.aceptarRecibo({identity,operacionId:op,tabId:tab,recibo})}

test('R1: recibo realista y completo confirma el evento',async()=>{
 const o=await ready();assert.equal((await submit(o,receipt())).status,'confirmada');
});
test('R2: sin recuentos devueltos por RPC no se confirma',async()=>{
 const o=await ready();const r=receipt();delete r.pending;
 await assert.rejects(submit(o,r),/recibo no acreditado/);
 assert.equal((await o.estado({identity})).pendientes[0].status,'incierta');
});
test('R3: total 3 y checked 10 / pending 20 se rechaza',async()=>{
 const o=await ready();const r={...receipt(),checked:10,pending:20};
 await assert.rejects(submit(o,r),/recibo no acreditado/);
});
test('R4: incidents no puede exceder checked',async()=>{
 const o=await ready();const r={...receipt(),incidents:2};
 await assert.rejects(submit(o,r),/recibo no acreditado/);
});
test('R5: tipos corruptos y límites de total no se confirman',async()=>{
 const o=await ready();
 for(const r of [{...receipt(),total:'3'},{...receipt(),total:3001},{...receipt(),pending:-1},
                 {...receipt(),checked:1.5},{...receipt(),incidents:NaN}]){
  await assert.rejects(submit(o,r),/recibo no acreditado/);
 }
});
test('R6: incidente exige al menos una incidencia en contadores',async()=>{
 const o=await ready('incident');const bad={...receipt('incident'),incidents:0};
 await assert.rejects(submit(o,bad),/recibo no acreditado/);
 assert.equal((await submit(o,receipt('incident'))).status,'confirmada');
});
