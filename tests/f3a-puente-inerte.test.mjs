import test from 'node:test';
import assert from 'node:assert/strict';
import {crearPuenteChecklistF3A,F3A_CHECKLIST_HABILITADO} from '../src/control-cargas-f3a-puente-inerte.mjs';
import {getReview} from '../src/control-cargas-checklist.mjs';

const scope='_visura_'+'a'.repeat(24),hash='e'.repeat(64);
const load=()=>({id:'LP26-900101',pdfHash:hash,verified:true,refs:2,products:[
 {sku:'ABC-1',location:'A',description:'Caja A',qty:3,unit:'uds'},
 {sku:'ABC-2',location:'B',description:'Caja B',qty:1,unit:'uds'}]});
const newStorage=()=>{const d=new Map();return {d,getItem:k=>d.get(k)??null,setItem:(k,v)=>{d.set(k,v)}}};
const newRepo=()=>{const records=new Map();const copy=x=>x==null?null:structuredClone(x);return {records,
 async read(k){return copy(records.get(k))},
 async atomicUpdate(k,fn){let r=fn(copy(records.get(k)));if(r.next)records.set(k,copy(r.next));return r.value;}
 }};
const mk=(overrides={})=>{const storage=newStorage(),repo=newRepo();let i=0;return {storage,repo,
 bridge:crearPuenteChecklistF3A({enabled:true,scope,storage,repo,
 uuid:()=>`f5a6d001-0200-4000-8000-${String(++i).padStart(12,'0')}`,
 now:()=>new Date(1800000000000+i*1000).toISOString(),...overrides})};};

test('P01 bandera false y estado desactivado no toca dependencias ni crea IDB',async()=>{
 assert.equal(F3A_CHECKLIST_HABILITADO,false);
 const bridge=crearPuenteChecklistF3A();
 assert.equal(bridge.estado,'desactivado');
 await assert.rejects(bridge.marcar({}),/desactivada/);
});
test('P02 intención antes de revisión; marca pendiente no constituye acreditación remota',async()=>{
 const {bridge,storage,repo}=mk();
 const a=await bridge.marcar({carga:load(),linea:0,estado:'ok'});
 assert.equal(a.estado,'local_pendiente_servidor');
 assert.equal(getReview(storage,scope,load()).review.lines[0].status,'ok');
 const e=[...repo.records.values()][0].pendientes[0];
 assert.equal(e.status,'lista');assert.equal(e.id,a.operacionId);assert.equal(e.auditIndex,0);
 assert.equal([...storage.d.keys()].every(x=>x.includes('revision')),true);
});
test('P03 incidente exige cantidad distinta sin escribir ni en outbox ni en revisión',async()=>{
 const {bridge,storage,repo}=mk();
 await assert.rejects(bridge.marcar({carga:load(),linea:0,estado:'incident',actualQty:3}),/incidencia/);
 assert.equal(storage.d.size,0);assert.equal(repo.records.size,0);
});
test('P04 cambio de PDF o referencias desalineadas falla cerrado',async()=>{
 const {bridge,storage,repo}=mk();const l=load();l.refs=99;
 await assert.rejects(bridge.marcar({carga:l,linea:0,estado:'ok'}),/identidad/);
 assert.equal(storage.d.size,0);assert.equal(repo.records.size,0);
});
test('P05 error guardando revisión deja intención, sin acreditación y sin RPC',async()=>{
 const storage=newStorage(),repo=newRepo();storage.setItem=()=>{throw Error('cuota')};const {bridge}=mk({storage,repo});
 await assert.rejects(bridge.marcar({carga:load(),linea:0,estado:'ok'}),/cuota/);
 const e=[...repo.records.values()][0].pendientes[0];assert.equal(e.status,'intencion');
});
test('P06 revisión obsoleta no crea intención adicional',async()=>{
 const {bridge,storage,repo}=mk();await bridge.marcar({carga:load(),linea:0,estado:'ok'});
 const updated=load();updated.products[0].qty=8;
 await assert.rejects(bridge.marcar({carga:updated,linea:1,estado:'ok'}),/obsoleta/);
 assert.equal([...repo.records.values()][0].pendientes.length,1);
});
test('P07 rechazo de marcado redundante sin nuevos eventos',async()=>{
 const {bridge,repo}=mk();await bridge.marcar({carga:load(),linea:0,estado:'ok'});
 await assert.rejects(bridge.marcar({carga:load(),linea:0,estado:'ok'}),/redundante/);
 assert.equal([...repo.records.values()][0].pendientes.length,1);
});
test('P08 nueva marca local conserva segunda intención sin autoenvío',async()=>{
 const {bridge,repo}=mk();await bridge.marcar({carga:load(),linea:0,estado:'ok'});
 await bridge.marcar({carga:load(),linea:1,estado:'incident',actualQty:2});
 const e=[...repo.records.values()][0].pendientes;
 assert.equal(e.length,2);assert.equal(e[1].status,'lista');assert.equal(e[0].versionEsperada,null);
});
test('P09 fallo acreditando la intención tras guardar revisión no marca confirmación ni envía',async()=>{
 const storage=newStorage(),repo=newRepo(),orig=repo.atomicUpdate.bind(repo);
 let calls=0;repo.atomicUpdate=(k,fn)=>{calls++;if(calls===2)throw Error('fallo IDB transitorio');return orig(k,fn)};
 const bridge=crearPuenteChecklistF3A({enabled:true,scope,storage,repo,
  uuid:()=> 'f5a6d001-0200-4000-8000-000000001010',now:()=>new Date(1800000000000).toISOString()});
 await assert.rejects(bridge.marcar({carga:load(),linea:0,estado:'ok'}),/fallo IDB/);
 assert.equal(getReview(storage,scope,load()).review.lines[0].status,'ok');
 assert.equal([...repo.records.values()][0].pendientes[0].status,'intencion');
});
