import test from 'node:test';
import assert from 'node:assert/strict';
import {crearCoordinadorCheckF3A} from '../src/control-cargas-f3a-outbox.mjs';
const scope='_visura_'+'a'.repeat(24);
const scopeB='_visura_'+'b'.repeat(24);
const uid=n=>'a71d3ee7-181f-4c2a-9000-'+String(n).padStart(12,'0');
const id={almacen:'COR_01_COR',lp:'LP26-21230',pdfHash:'a'.repeat(64)};
const audit=(index,line=0,state='ok')=>({sourceSignature:'firma-pdf-a',audit:Array.from({length:index+1},(_,i)=>({line:i===index?line:99,to:i===index?state:'ok'}))});
function make(){
 const rows=new Map(),mutex=new Map();let clock=1000;
 const repo={
  async read(key){return rows.has(key)?structuredClone(rows.get(key)):null},
  async atomicUpdate(key,fn){
   const prev=mutex.get(key)||Promise.resolve();let done;
   const lock=new Promise(resolve=>done=resolve);mutex.set(key,lock);
   await prev;
   try{const row=rows.has(key)?structuredClone(rows.get(key)):null;const res=fn(row);
    if(res?.next)rows.set(key,structuredClone(res.next));return structuredClone(res.value);
   }finally{done()}
  }
 };
 const coordinator=(s=scope)=>crearCoordinadorCheckF3A({scope:s,repo,now:()=>clock});
 return {repo,rows,coordinator,advance:t=>{clock+=t}};
}
const entry=(op=uid(1),line=0,state='ok',auditIndex=0)=>({identity:id,operacionId:op,linea:line,estado:state,auditIndex,sourceSignature:'firma-pdf-a'});
const receipt=(op=uid(1),version=1,line=0,state='ok')=>({operacion_id:op,almacen:id.almacen,lp:id.lp,pdf_hash:id.pdfHash,linea:line,estado:state,
 version,procedencia:'evento_registrado_en_servidor',verificacion_fisica_acreditada:false,
 actor:uid(900),hora_servidor:'2026-11-17T11:50:00Z'});
const send=(identity=id,tab=uid(500),version=0)=>({identity,tabId:tab,online:true,versionServidor:version});

test('Q1: crash tras guardar intención pero antes de saveReview no permite enviar',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 assert.equal((await o.reservarEnvio(send())).status,'intencion');
 assert.equal((await o.estado({identity:id})).pendientes[0].status,'intencion');
});
test('Q2: validación de audit local transforma intención en lista y produce solo 7 campos',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 const r=await o.reservarEnvio(send());
 assert.equal(r.status,'reservada');
 assert.deepEqual(Object.keys(r.peticion).sort(),['p_almacen','p_lp','p_pdf_hash','p_linea','p_estado','p_version_esperada','p_operacion'].sort());
 assert.equal(JSON.stringify(r.peticion).includes('firma-pdf-a'),false);
});
test('Q3: desconexión no envía y tampoco consume versión',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 assert.equal((await o.reservarEnvio({...send(),online:false})).status,'offline');
 assert.equal((await o.estado({identity:id})).pendientes[0].versionEsperada,null);
});
test('Q4: dos pestañas concurrentes solo una adquiere lease local',async()=>{
 const x=make(),a=x.coordinator(),b=x.coordinator();await a.guardarIntencion(entry());
 await a.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 const [ra,rb]=await Promise.all([a.reservarEnvio(send(id,uid(500))),b.reservarEnvio(send(id,uid(501)))]);
 assert.deepEqual([ra.status,rb.status],['reservada','otra_pestana']);
});
test('Q5: timeout conserva mismo UUID y versión en reintento de otra pestaña',async()=>{
 const x=make(),a=x.coordinator();await a.guardarIntencion(entry());
 await a.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 const first=await a.reservarEnvio(send(id,uid(500),0));
 await a.marcarSinRespuesta({identity:id,operacionId:uid(1),tabId:uid(500)});
 const again=await x.coordinator().reservarEnvio(send(id,uid(501),1));
 assert.equal(again.status,'reservada');assert.deepEqual(again.peticion,first.peticion);
});
test('Q6: respuesta válida se acredita, misma respuesta inyectada después se rechaza',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 await o.reservarEnvio(send());
 assert.equal((await o.aceptarRecibo({identity:id,operacionId:uid(1),tabId:uid(500),recibo:receipt()})).version,1);
 assert.equal((await o.estado({identity:id})).versionConfirmada,1);
 await assert.rejects(o.aceptarRecibo({identity:id,operacionId:uid(1),tabId:uid(500),recibo:receipt()}),/sin operacion reservada/);
});
test('Q7: recibo fraudulento, con actor ausente o versión incorrecta no confirma',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});await o.reservarEnvio(send());
 const bad={...receipt(),actor:null};
 await assert.rejects(o.aceptarRecibo({identity:id,operacionId:uid(1),tabId:uid(500),recibo:bad}),/recibo no acreditado/);
 assert.equal((await o.estado({identity:id})).pendientes[0].status,'incierta');
});
test('Q8: CAS servidor en conflicto no auto-rebase; bloquea hasta revisión humana',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});await o.reservarEnvio(send());
 const state=await o.bloquearConflicto({identity:id,operacionId:uid(1),tabId:uid(500)});
 assert.equal(state.requiereConciliacion,true);assert.equal((await o.reservarEnvio(send())).status,'bloqueada');
});
test('Q9: cola serial con dos checks offline, second usa versión 1 tras primer recibo',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 await o.guardarIntencion(entry(uid(2),1,'incident',1));await o.acreditarRegistroLocal({identity:id,operacionId:uid(2),revision:audit(1,1,'incident')});
 const one=await o.reservarEnvio(send(id,uid(500),0));assert.equal(one.peticion.p_operacion,uid(1));
 await o.aceptarRecibo({identity:id,operacionId:uid(1),tabId:uid(500),recibo:receipt()});
 const two=await o.reservarEnvio(send(id,uid(500),1));
 assert.equal(two.peticion.p_operacion,uid(2));assert.equal(two.peticion.p_version_esperada,1);
});
test('Q10: cambio de PDF impide envío y conserva la cola original',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 await assert.rejects(o.reservarEnvio(send({...id,pdfHash:'b'.repeat(64)})),/PDF cambiado/);
 assert.equal((await o.estado({identity:id})).pendientes.length,1);
});
test('Q11: ámbito por usuario no mezcla DB keys ni versiones',async()=>{
 const x=make(),a=x.coordinator(scope),b=x.coordinator(scopeB);
 await a.guardarIntencion(entry());assert.equal(await b.estado({identity:id}),null);
});
test('Q12: lease caducado no da autoridad; mantiene UUID y CAS',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 const original=await o.reservarEnvio(send(id,uid(500),0));x.advance(12001);
 const stale=await x.coordinator().reservarEnvio(send(id,uid(502),1));
 assert.deepEqual(stale.peticion,original.peticion);
});
test('Q13: recuperación con revisión de otro PDF no marca lista',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());
 await assert.rejects(o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:{...audit(0),sourceSignature:'otra'}}),/revision de otro PDF/);
 assert.equal((await o.estado({identity:id})).pendientes[0].status,'intencion');
});
test('Q14: versión del servidor incompatible impide auto-rebase en cola siguiente',async()=>{
 const x=make(),o=x.coordinator();await o.guardarIntencion(entry());await o.acreditarRegistroLocal({identity:id,operacionId:uid(1),revision:audit(0)});
 await o.reservarEnvio(send(id,uid(500),0));await o.aceptarRecibo({identity:id,operacionId:uid(1),tabId:uid(500),recibo:receipt()});
 await o.guardarIntencion(entry(uid(2),1,'ok',1));await o.acreditarRegistroLocal({identity:id,operacionId:uid(2),revision:audit(1,1,'ok')});
 assert.equal((await o.reservarEnvio(send(id,uid(500),17))).status,'reconciliacion_necesaria');
});
