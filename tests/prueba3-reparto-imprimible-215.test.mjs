import test from 'node:test';
import assert from 'node:assert/strict';
import {renderHojaRepartoUnica} from '../src/prueba3-reparto-unico.mjs';
const r=(id,driver,weight,cold=[],other={})=>({id,driver,weight,cold,warehouse:'COR_01_COR',hasCor:true,verified:true,mixedWarehouse:false,date:'17/11/2026',truck:'CR001',...other});
const frio=[{location:'ZFRIO',qty:2}];
test('impresión y resumen cuentan solo ganadora y clasifican frío ganador',()=>{
 const x=renderHojaRepartoUnica([r('A','Ana',30,frio),r('B','ANA',20),r('C','Luis',15)],{skipped:2});
 assert.match(x.html,/Con frio: 1 \| Sin frio: 1 \| Incidencias: 0/);
 assert.match(x.summary,/Coruña: 2 repartidores/);assert.match(x.summary,/2 de Ferrol omitidas/);
 assert.equal((x.html.match(/<tr><td>CR001/g)||[]).length,2);
});
test('peso desconocido genera incidencia visible en la hoja imprimible',()=>{
 const x=renderHojaRepartoUnica([r('A','Ana',80),r('B','Ana',null)]);
 assert.match(x.html,/INCIDENCIAS \(1\)/);assert.match(x.html,/RESUMEN: 0 repartidores/);
 assert.equal((x.html.match(/<tr><td>/g)||[]).length,0);
});
test('exclusiones eliminan filas, resumen, y fechas vacías',()=>{
 const x=renderHojaRepartoUnica([r('A','Ana',10),r('B','B',20,[],{truck:'CRALM21',date:'18/11/2026'}),r('C','C',22,[],{truck:'CRVEN'})]);
 assert.match(x.summary,/1 repartidores/);assert.doesNotMatch(x.html,/18\/11\/2026/);
});
test('múltiples días se mantienen en páginas independientes',()=>{
 const x=renderHojaRepartoUnica([r('A','Ana',10),r('B','Ana',20,frio,{date:'18/11/2026'})]);
 assert.equal((x.html.match(/<article class="lst-page">/g)||[]).length,2);
});
test('el HTML escapa datos y no incluye cargas excluidas',()=>{
 const x=renderHojaRepartoUnica([r('A','<script>',10),r('B','Ana',20,[],{truck:'CRALM999'})]);
 assert.doesNotMatch(x.html,/<script>/);assert.match(x.html,/&lt;script&gt;/);
 assert.doesNotMatch(x.html,/CRALM999/);
});
test('incidencia no aparece como fila de sin frío',()=>{
 const x=renderHojaRepartoUnica([r('A','Ana',null)]);
 assert.match(x.html,/CAMIONES SIN FRIO \(0\)/);
 assert.match(x.html,/Incidencias: 1/);
});
test('mismos nombres en fechas distintas conservan contador total',()=>{
 const x=renderHojaRepartoUnica([r('A','Ana',10),r('B','Ana',20,[],{date:'18/11/2026'})]);
 assert.equal(x.seleccion.total,2);assert.equal(x.seleccion.sinFrio,2);
});
test('salida destinada a PDF idéntica a la vista HTML',()=>{
 const x=renderHojaRepartoUnica([r('A','Ana',10)]);
 const originalPages={innerHTML:x.html};const captured=originalPages.innerHTML;
 assert.equal(captured,x.html);assert.equal((captured.match(/<tr><td>/g)||[]).length,1);
});
