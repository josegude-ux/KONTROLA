import test from 'node:test';
import assert from 'node:assert/strict';
import {crearCoordinadorCheckF3A} from '../src/control-cargas-f3a-outbox.mjs';

const actor='a71d3ee7-181f-4c2a-9000-000000000003';
const otro='a71d3ee7-181f-4c2a-9000-000000000004';
const uuid='a71d3ee7-181f-4c2a-9000-000000000001';
const tab='a71d3ee7-181f-4c2a-9000-000000000002';
const identity={almacen:'COR_01_COR',lp:'LP26-21230',pdfHash:'a'.repeat(64)};
function receipt(actorRecibo=actor){return {operacion_id:uuid,almacen:identity.almacen,lp:identity.lp,pdf_hash:identity.pdfHash,linea:0,estado:'ok',version:1,procedencia:'evento_registrado_en_servidor',verificacion_fisica_acreditada:false,actor:actorRecibo,hora_servidor:'2026-11-17T11:50:00Z',total:3,checked:1,pending:2,incidents:0}}
async function setup(){
 const m=new Map();const repo={
  async read(k){return structuredClone(m.get(k)??null)},
  async atomicUpdate(k,fn){const r=fn(structuredClone(m.get(k)??null));if(r?.next)m.set(k,structuredClone(r.next));return structuredClone(r?.value)}
 };
 const o=crearCoordinadorCheckF3A({scope:'_visura_'+'a'.repeat(24),repo,now:()=>1000});
 await o.guardarIntencion({identity,operacionId:uuid,linea:0,estado:'ok',auditIndex:0,sourceSignature:'sig'});
 await o.acreditarRegistroLocal({identity,operacionId:uuid,revision:{sourceSignature:'sig',audit:[{line:0,to:'ok'}]}});
 await o.reservarEnvio({identity,tabId:tab,online:true,versionServidor:0});
 return o;
}
const submit=(o,recibo,actorSesion)=>o.aceptarRecibo({identity,operacionId:uuid,tabId:tab,recibo,actorSesion});
test('A1 recibo de actor ajeno no confirma y mantiene operación incierta',async()=>{
 const o=await setup();await assert.rejects(submit(o,receipt(otro),actor),/recibo no acreditado/);
 assert.equal((await o.estado({identity})).pendientes[0].status,'incierta');
});
test('A2 ausencia de usuario autenticado impide confirmar',async()=>{
 const o=await setup();await assert.rejects(submit(o,receipt(),undefined),/recibo no acreditado/);
 assert.equal((await o.estado({identity})).pendientes[0].status,'incierta');
});
test('A3 actor de sesión idéntico al servidor confirma',async()=>{
 const o=await setup();const r=await submit(o,receipt(),actor);
 assert.deepEqual([r.status,r.version],['confirmada',1]);
});
test('A4 UUID actor representado en mayúsculas equivale a la misma identidad',async()=>{
 const o=await setup();const r=await submit(o,receipt(actor.toUpperCase()),actor);
 assert.equal(r.status,'confirmada');
});
test('A5 cambio de sesión tras reservar no acredita el recibo anterior',async()=>{
 const o=await setup();await assert.rejects(submit(o,receipt(actor),otro),/recibo no acreditado/);
 assert.equal((await o.estado({identity})).versionConfirmada,null);
});
test('A6 actor de sesión no UUID se rechaza',async()=>{
 const o=await setup();await assert.rejects(submit(o,receipt(), 'cuenta-sin-id'),/recibo no acreditado/);
 assert.equal((await o.estado({identity})).pendientes[0].status,'incierta');
});
