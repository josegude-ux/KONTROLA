import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('./AUDITOR_F3A_IPHONE_SOLO_LECTURA.js',import.meta.url),'utf8');
const token='a'.repeat(24), scope='_visura_'+token;
function run(data={},search='?visura_scope='+token){
 let append=null,reads=[],writes=0;
 const store={getItem(k){reads.push(k);return data[k]??null;},setItem(){writes++;throw Error('PROHIBIDO');}};
 const ctx={location:{search},URLSearchParams,localStorage:store,Date,
  document:{createElement(tag){return {tag,style:{},append(...items){this.children=items;},remove(){this.removed=true}};},body:{append(node){append=node;}}},
  navigator:{clipboard:{writeText:async()=>{throw Error('SIN PERMISO');}}}};
 vm.runInNewContext(code,ctx,{timeout:1000});
 return {report:append?.children?.[1]?.value,reads,writes};
}
test('iPhone 1: no clave ni scope no se interpretan como cero sin advertencia',()=>{
 const r=run({},'');assert.match(r.report,/NO ENCONTRADO/);
 assert.match(r.report,/no asumir ausencia/);assert.equal(r.writes,0);
});
test('iPhone 2: dos checks en auditoría válida generan recuentos coherentes',()=>{
 const load={id:'LP26-21230',pdfHash:'a'.repeat(64),products:[
  {sku:'A',qty:1,unit:'CAJA'},{sku:'B',qty:2,unit:'CAJA'}]};
 const signature=JSON.stringify({id:load.id,pdfHash:load.pdfHash,
  products:load.products.map((p,i)=>({line:i,sku:p.sku,location:'',description:'',qty:p.qty,unit:p.unit}))});
 const review={schema:1,loadId:load.id,sourceSignature:signature,
  lines:{0:{status:'ok'}},audit:[{line:0,from:'pending',to:'ok'}]};
 const data={['control_cargas_prueba_integrada_2'+scope]:JSON.stringify([load]),
  ['visura_control_revision_v1'+scope]:JSON.stringify({[load.id]:review}),
  ['visura_prepara_descarte_v1'+scope]:JSON.stringify({schema:1,scope,items:{}}),
  ['visura_prepara_descarte_cache_v1'+scope]:JSON.stringify({schema:1,scope,items:{}})};
 const r=run(data);assert.match(r.report,/revisiones_coherentes: 1/);
 assert.match(r.report,/cargas_con_pendientes: 1/);
 assert.match(r.report,/LP divergentes entre copias: 0/);
 assert.equal(r.writes,0);assert.equal(r.reads.length,4);
});
test('iPhone 3: firma distinta y ledger ausente no certifican progresos',()=>{
 const lp='LP26-21230',data={['control_cargas_prueba_integrada_2'+scope]:JSON.stringify([{id:lp,products:[{sku:'X'}]}]),
  ['visura_control_revision_v1'+scope]:JSON.stringify({[lp]:{schema:1,loadId:lp,sourceSignature:'OTRO',lines:{},audit:[]}})};
 const r=run(data);assert.match(r.report,/revisiones_desactualizadas: 1/);
 assert.match(r.report,/INDETERMINADO/);assert.equal(r.writes,0);
});
