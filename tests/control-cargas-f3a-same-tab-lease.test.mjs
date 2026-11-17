import test from 'node:test';
import assert from 'node:assert/strict';
import {crearCoordinadorCheckF3A} from '../src/control-cargas-f3a-outbox.mjs';
const scope='_visura_'+'a'.repeat(24);
const identity={almacen:'COR_01_COR',lp:'LP26-21230',pdfHash:'a'.repeat(64)};
const op='a71d3ee7-181f-4c2a-9000-000000000001';
const tabA='a71d3ee7-181f-4c2a-9000-000000000010';
const tabB='a71d3ee7-181f-4c2a-9000-000000000011';
async function setup(){
 const rows=new Map();let clock=1000;
 const repo={async read(k){return rows.has(k)?structuredClone(rows.get(k)):null;},
  async atomicUpdate(k,update){const r=update(rows.has(k)?structuredClone(rows.get(k)):null);if(r?.next)rows.set(k,structuredClone(r.next));return r?.value;}};
 const o=crearCoordinadorCheckF3A({scope,repo,now:()=>clock});
 await o.guardarIntencion({identity,operacionId:op,linea:0,estado:'ok',auditIndex:0,sourceSignature:'fixture'});
 await o.acreditarRegistroLocal({identity,operacionId:op,revision:{sourceSignature:'fixture',audit:[{line:0,to:'ok'}]}});
 const send=(tabId=tabA)=>o.reservarEnvio({identity,tabId,online:true,versionServidor:0});
 return {o,rows,send,advance:ms=>clock+=ms};
}
test('N1 reserva doble en misma pestaña devuelve en_curso y conserva único UUID',async()=>{
 const {o,send}=await setup();const [a,b]=await Promise.all([send(),send()]);
 assert.equal(a.status,'reservada');assert.equal(b.status,'en_curso');
 assert.equal((await o.estado({identity})).pendientes[0].id,op);
});
test('N2 otra pestaña queda bloqueada durante lease activo',async()=>{
 const {send}=await setup();assert.equal((await send()).status,'reservada');
 assert.equal((await send(tabB)).status,'otra_pestana');
});
test('N3 timeout libera lease; mismo UUID/versión se recupera',async()=>{
 const {o,send}=await setup();const a=await send();
 await o.marcarSinRespuesta({identity,operacionId:op,tabId:tabA});
 const b=await send();assert.equal(b.status,'reservada');
 assert.deepEqual(b.peticion,a.peticion);
});
test('N4 vencimiento del lease permite reintentar desde otra pestaña sin rebase',async()=>{
 const {send,advance}=await setup();const a=await send();advance(12001);
 const b=await send(tabB);assert.equal(b.status,'reservada');
 assert.deepEqual(b.peticion,a.peticion);
});
