import test from 'node:test';
import assert from 'node:assert/strict';
import {seleccionarRepartoUnico} from '../src/prueba3-reparto-unico.mjs';
const row=(id,driver,weight,cold=[],patch={})=>({id,driver,weight,cold,warehouse:'COR_01_COR',date:'17/11/2026',hasCor:true,verified:true,mixedWarehouse:false,truck:'CR9981',pdfHash:'sha'+id,...patch});
const frio=[{location:'ZFRIO',qty:3}];
test('deduplicación y ganador de mayor peso frente al frío de perdedora',()=>{
 const r=seleccionarRepartoUnico([row('LP26-1','José Pérez',200),row('LP26-2',' jose  perez ',100,frio)]);
 assert.equal(r.total,1);assert.equal(r.conFrio,0);assert.equal(r.sinFrio,1);assert.equal(r.filas[0].carga.id,'LP26-1');
});
test('un único con frío cuando gana la de mayor peso',()=>{
 const r=seleccionarRepartoUnico([row('LP26-2','JOSÉ PÉREZ',200,frio),row('LP26-1','Jose Perez',100)]);
 assert.equal(r.total,1);assert.equal(r.conFrio,1);assert.equal(r.sinFrio,0);
});
test('excluye camiones CRALM, CRVEN y conductor CC0',()=>{
 const r=seleccionarRepartoUnico([row('1','A',10,[],{truck:'CRALM250'}),row('2','B',10,[],{truck:'CRVEN'}),row('3','CC0 - Prueba',10),row('4','C',10)]);
 assert.equal(r.total,1);assert.deepEqual(r.excluidas.map(x=>x.motivo),['CRALM','CRVEN','CC0']);
});
test('repartidor mismo nombre otra fecha se mantiene separado',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',10),row('2','Ana',20,[],{date:'18/11/2026'})]);assert.equal(r.total,2);
});
test('otro almacén no se fusiona ni se presenta en Coruña',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',10),row('2','Ana',20,[],{warehouse:'COR_02_NAR',hasCor:false})]);assert.equal(r.total,1);assert.equal(r.incidencias.length,1);
});
test('peso ausente de una candidata impide elegir falsa ganadora',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',10),row('2','Ana',null)]);assert.equal(r.total,0);assert.match(r.incidencias[0].motivo,/Pesos no comparables/);
});
test('peso numérico pero no verificado no puede ganar',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',10,[],{verified:false}),row('2','Ana',20)]);assert.equal(r.total,0);
});
test('peso global mixto no permite atribución por almacén',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',20,[],{mixedWarehouse:true})]);assert.equal(r.total,0);
});
test('desempate por LP y hash determinista con orden invertido',()=>{
 const a=row('LP26-20','Ana',200),b=row('LP26-10','Ana',200);
 const x=seleccionarRepartoUnico([a,b]),y=seleccionarRepartoUnico([b,a]);assert.equal(x.filas[0].carga.id,'LP26-10');assert.equal(x.filas[0].carga.id,y.filas[0].carga.id);
});
test('no muta cargas, frío ni pesos',()=>{
 const a=row('1','Ana',10,frio);const before=structuredClone(a);seleccionarRepartoUnico([a]);assert.deepEqual(a,before);
});
test('frío no documentado en ganadora genera incidencia sin moverla a sin frío',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',100,null),row('2','Ana',90,frio)]);assert.equal(r.total,0);assert.match(r.incidencias[0].motivo,/Frío no acreditado/);
});
test('sin reparto identificado no fusiona anónimos',()=>{
 const r=seleccionarRepartoUnico([row('1','',100),row('2','',200)]);assert.equal(r.total,0);assert.equal(r.incidencias.length,2);
});
test('contadores suman exactamente filas visibles',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',100,frio),row('2','Ana',50),row('3','Luis',25),row('4','Elena',40,frio)]);
 assert.equal(r.total,3);assert.equal(r.conFrio,2);assert.equal(r.sinFrio,1);assert.equal(r.conFrio+r.sinFrio,r.total);
});
test('unidades de peso cero reales son comparables, no negativas',()=>{
 const r=seleccionarRepartoUnico([row('1','Ana',0),row('2','Ana',-1)]);assert.equal(r.total,0);
});
test('diferencias de hash con LP idéntico exigen peso comparable y desempatan',()=>{
 const a=row('LP26-1','Ana',22,[],{pdfHash:'abc'});const b=row('LP26-1','Ana',22,[],{pdfHash:'def'});
 const r=seleccionarRepartoUnico([b,a]);assert.equal(r.total,1);assert.equal(r.filas[0].carga.pdfHash,'abc');
});
test('no confunde CC01 con CC0',()=>{
 const r=seleccionarRepartoUnico([row('1','CC01 Manuel',20)]);assert.equal(r.total,1);
});

test('CC0 con código auxiliar de repartidor también se excluye',()=>{const x=seleccionarRepartoUnico([row('1','DF12 CC0',30)]);assert.equal(x.total,0);assert.equal(x.excluidas[0].motivo,'CC0');});
