import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceSignature} from '../src/control-cargas-checklist.mjs';
import {
 auditarChecksDispositivo,prepararConfirmacionServidor,guardarConfirmacionServidor
} from '../src/control-cargas-descarte-f3a-evidencias.mjs';
const scope='_visura_'+'a'.repeat(24), lp='LP26-21230', hash='a'.repeat(64);
const ACTOR='a71d3ee7-181f-4c2a-9000-000000000001';
const carga=()=>({id:lp,pdfHash:hash,verified:true,products:[
 {sku:'TEST-A',qty:3,unit:'CAJA',location:'P1',description:'Ficticio A'},
 {sku:'TEST-B',qty:2,unit:'CAJA',location:'P2',description:'Ficticio B'},
 {sku:'TEST-C',qty:5,unit:'CAJA',location:'P3',description:'Ficticio C'}
]});
const revision=(c=carga())=>({schema:1,loadId:lp,sourceSignature:sourceSignature(c),
 createdAt:'2026-11-17T10:00:00Z',updatedAt:'2026-11-17T10:02:00Z',closedAt:null,
 lines:{0:{status:'ok',actualQty:null,at:'2026-11-17T10:01:00Z'},
  1:{status:'incident',actualQty:1,at:'2026-11-17T10:02:00Z'}},
 audit:[{at:'2026-11-17T10:01:00Z',line:0,from:'pending',to:'ok',actualQty:null},
  {at:'2026-11-17T10:02:00Z',line:1,from:'pending',to:'incident',actualQty:1}]});
const servidor=()=>({almacen:'COR_01_COR',codigo:lp,pdf_hash:hash,
 referencias:3,estado:'sin_iniciar',fin:null});
const remoto=()=>({almacen:'COR_01_COR',lp,pdf_hash:hash,estado:'descartada',version:1,
 actor_descarte:ACTOR,hora_descarte:'2026-11-17T10:03:00Z',
 snapshot_resumen:{total:3,checked:2,pending:1,incidents:1,
  _progreso_fuente:'dispositivo_no_acreditado',_fuente_lp:'visura_p3_cargas'}});
const clone=x=>JSON.parse(JSON.stringify(x));
const store=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,
 setItem:(k,v)=>{map.set(k,v)}}};
const reject=(fn,word)=>assert.throws(fn,new RegExp(word));

test('F3A 1: revisión local coherente acredita estructura, NO trabajo físico de servidor',()=>{
 const r=auditarChecksDispositivo({carga:carga(),revision:revision(),servidor:servidor()});
 assert.equal(r.apta,true);
 assert.deepEqual(r.resumen,{total:3,checked:2,pending:1,incidents:1,cerrada:false});
 assert.match(r.evidencia,/no_acreditada/);
});
test('F3A 2: rechaza revision de otro PDF aunque las cifras cuadren',()=>{
 const c=carga(), r=revision(c); c.products[1].qty=9;
 reject(()=>auditarChecksDispositivo({carga:c,revision:r,servidor:servidor()}),'revisión');
});
test('F3A 3: rechaza fila marcada sin evento de auditoría',()=>{
 const r=revision();r.audit.splice(1,1);
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:r,servidor:servidor()}),'pendiente marcada');
});
test('F3A 4: rechaza transiciones imposibles y eventos fuera de orden',()=>{
 const r=revision();r.audit[1].from='ok';
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:r,servidor:servidor()}),'auditoría');
});
test('F3A 5: rechaza incidence sin cantidad distinta',()=>{
 const r=revision();r.lines[1].actualQty=2;
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:r,servidor:servidor()}),'coincide con auditoría');
});
test('F3A 6: no acredita carga completamente comprobada',()=>{
 const r=revision();r.lines[2]={status:'ok'};
 r.audit.push({at:'2026-11-17T10:02:01Z',line:2,from:'pending',to:'ok'});
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:r,servidor:servidor()}),'comprobada');
});
test('F3A 7: rechaza carga de otro almacén o PDF/hash no autorizado',()=>{
 const a=servidor();a.almacen='COR_02_FER';
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:revision(),servidor:a}),'coinciden');
 a.almacen='COR_01_COR';a.pdf_hash='b'.repeat(64);
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:revision(),servidor:a}),'coinciden');
});
test('F3A 8: rechaza total de servidor distinto y carga cerrada',()=>{
 const a=servidor();a.referencias=5;
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:revision(),servidor:a}),'coinciden');
 a.referencias=3;a.fin='2026-11-17T10:04:00Z';
 reject(()=>auditarChecksDispositivo({carga:carga(),revision:revision(),servidor:a}),'coinciden');
});
test('F3A 9: snapshots no se alteran por auditoría',()=>{
 const c=carga(),r=revision(),s=servidor(),before=JSON.stringify({c,r,s});
 auditarChecksDispositivo({carga:c,revision:r,servidor:s});
 assert.equal(JSON.stringify({c,r,s}),before);
});
test('F3A 10: conciliación de remoto descartada usa actor/hora del servidor y conserva copias',()=>{
 const s=store(),estado=remoto();
 const out=guardarConfirmacionServidor({scope,storage:s,estadoServidor:estado});
 assert.equal(out.guardado,true);
 const b=JSON.parse(s.getItem('visura_prepara_descarte_cache_v1'+scope));
 const a=JSON.parse(s.getItem('visura_prepara_descarte_v1'+scope));
 assert.deepEqual(a,b);
 assert.equal(a.items[lp].estado_descarte,'descartada');
 assert.equal(a.items[lp].descartada_en,estado.hora_descarte);
 assert.equal(a.items[lp].descartada_por,ACTOR);
 assert.equal(a.items[lp].pdf_hash_original,hash);
 assert.deepEqual(a.items[lp].snapshot_progreso_al_descartar,{total:3,checked:2,pending:1,incidents:1});
 assert.equal(JSON.stringify(estado),JSON.stringify(remoto()));
});
test('F3A 11: confirmar misma versión dos veces es idempotente',()=>{
 const s=store(),e=remoto();guardarConfirmacionServidor({scope,storage:s,estadoServidor:e});
 const before=s.getItem('visura_prepara_descarte_v1'+scope);
 assert.equal(guardarConfirmacionServidor({scope,storage:s,estadoServidor:e}).guardado,false);
 assert.equal(s.getItem('visura_prepara_descarte_v1'+scope),before);
});
test('F3A 12: restauración acreditada por version incrementada NO borra historial/snapshot',()=>{
 const s=store();guardarConfirmacionServidor({scope,storage:s,estadoServidor:remoto()});
 const active={...remoto(),estado:'activa',version:2};
 const out=guardarConfirmacionServidor({scope,storage:s,estadoServidor:active});
 const x=out.ledger.items[lp];
 assert.equal(x.estado_descarte,'activa');assert.equal(x.version_descarte,2);
 assert.equal(x.snapshot_progreso_al_descartar.checked,2);
 assert.equal(x.historial_descarte.length,2);
});
test('F3A 13: respuesta remota vieja no puede reactivar un descarte nuevo',()=>{
 const s=store();guardarConfirmacionServidor({scope,storage:s,estadoServidor:{...remoto(),version:3}});
 reject(()=>prepararConfirmacionServidor({scope,storage:s,estadoServidor:{...remoto(),estado:'activa',version:2}}),'antigua');
});
test('F3A 14: copia de respaldo y principal divergentes del LP objetivo exigen revisión',()=>{
 const s=store();guardarConfirmacionServidor({scope,storage:s,estadoServidor:remoto()});
 const alternate=clone(JSON.parse(s.getItem('visura_prepara_descarte_v1'+scope)));
 alternate.items[lp].motivo_descarte='DIVERGENCIA';
 s.setItem('visura_prepara_descarte_cache_v1'+scope,JSON.stringify(alternate));
 reject(()=>guardarConfirmacionServidor({scope,storage:s,estadoServidor:remoto()}),'divergentes');
});
test('F3A 15: copia principal fallida deja respaldo; no se declara éxito',()=>{
 const s=store();const base=s.setItem;
 s.setItem=(k,v)=>{if(k.startsWith('visura_prepara_descarte_v1'))throw Error('Cuota');base(k,v)};
 reject(()=>guardarConfirmacionServidor({scope,storage:s,estadoServidor:remoto()}),'Cuota');
 assert.ok(s.getItem('visura_prepara_descarte_cache_v1'+scope));
 assert.equal(s.getItem('visura_prepara_descarte_v1'+scope),null);
});
test('F3A 16: no aceptar snapshot remoto no acreditado o actor falso',()=>{
 const s=store(),e=remoto();e.snapshot_resumen._progreso_fuente='verificado_servidor';
 reject(()=>prepararConfirmacionServidor({scope,storage:s,estadoServidor:e}),'procedencia');
 e.snapshot_resumen._progreso_fuente='dispositivo_no_acreditado';e.actor_descarte='desconocido';
 reject(()=>prepararConfirmacionServidor({scope,storage:s,estadoServidor:e}),'inválida');
});
test('F3A 17: scope de usuario cambiado no lee ni escribe datos ajenos',()=>{
 const s=store();guardarConfirmacionServidor({scope,storage:s,estadoServidor:remoto()});
 const otro='_visura_'+'b'.repeat(24);
 assert.equal(prepararConfirmacionServidor({scope:otro,storage:s,estadoServidor:remoto()}).ledger.items[lp].version_descarte,1);
 assert.equal(s.getItem('visura_prepara_descarte_v1'+otro),null);
});

test('F3A 18: divergencia en LP A no bloquea sincronizar LP B ni pisa evidencias de A',()=>{
 const s=store();guardarConfirmacionServidor({scope,storage:s,estadoServidor:remoto()});
 const key='visura_prepara_descarte_cache_v1'+scope;
 const a=clone(JSON.parse(s.getItem(key)));
 a.items[lp].motivo_descarte='COPIA A SIN RECONCILIAR';
 s.setItem(key,JSON.stringify(a));
 const b={...remoto(),lp:'LP26-21231',pdf_hash:'b'.repeat(64),version:1};
 const r=guardarConfirmacionServidor({scope,storage:s,estadoServidor:b});
 assert.equal(r.guardado,true);
 const primary=JSON.parse(s.getItem('visura_prepara_descarte_v1'+scope));
 const cache=JSON.parse(s.getItem(key));
 assert.equal(primary.items[lp].motivo_descarte,null);
 assert.equal(cache.items[lp].motivo_descarte,'COPIA A SIN RECONCILIAR');
 assert.equal(primary.items['LP26-21231'].estado_descarte,'descartada');
 assert.equal(cache.items['LP26-21231'].estado_descarte,'descartada');
});
