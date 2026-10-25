import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {comprobarLoteActualizado} from "../src/archive-snapshot.mjs";
const doc=(codigo,extras={})=>({
  codigo,almacen:"COR_01_COR",fecha:"2026-10-25",matricula:"1234ABC",ruta:"A",
  repartidor:"Operario",peso_kg:500,referencias:1,
  productos:[{sku:"SKU1",location:"A1",description:"Caja",qty:3,unit:"CAJA"}],
  ...extras
});
test("lote sin cambios devuelve las cargas frescas autorizadas sin mutarlas",()=>{
 const selected=[doc("LP26-10001"),doc("LP26-10002")];
 const fresh=structuredClone(selected),snapshot=JSON.stringify(fresh);
 assert.deepEqual(comprobarLoteActualizado(selected,fresh,"COR_01_COR"),fresh);
 assert.equal(JSON.stringify(fresh),snapshot);
});
test("impide imprimir carga con línea modificada o datos de transporte diferentes",()=>{
 const selected=[doc("LP26-10001")];
 for(const altered of [
   doc("LP26-10001",{productos:[{sku:"SKU1",location:"A1",description:"Caja",qty:4,unit:"CAJA"}]}),
   doc("LP26-10001",{matricula:"4444XYZ"}),
   doc("LP26-10001",{ruta:"B"}),
   doc("LP26-10001",{fecha:"2026-10-26"})
 ]){
   assert.throws(()=>comprobarLoteActualizado(selected,[altered],"COR_01_COR"),/ha cambiado/);
 }
});
test("bloquea desaparecidas, almacenes cruzados, códigos repetidos y mercancía vacía",()=>{
 const selected=[doc("LP26-10001")];
 assert.throws(()=>comprobarLoteActualizado(selected,[],"COR_01_COR"),/ya no está disponible/);
 assert.throws(()=>comprobarLoteActualizado(selected,[doc("LP26-10001",{almacen:"COR_02_NAR"})],"COR_01_COR"),/otro almacén/);
 assert.throws(()=>comprobarLoteActualizado(selected,[...selected,...selected],"COR_01_COR"),/códigos duplicados/);
 assert.throws(()=>comprobarLoteActualizado(selected,[doc("LP26-10001",{productos:[]})],"COR_01_COR"),/no contiene cantidades positivas/);
 assert.throws(()=>comprobarLoteActualizado(selected,[doc("LP26-10001",{productos:[{sku:"SKU1",location:"A1",description:"Vacío",qty:0,unit:"CAJA"}]})],"COR_01_COR"),/no contiene cantidades positivas/);
 assert.throws(()=>comprobarLoteActualizado([selected[0],selected[0]],selected,"COR_01_COR"),/repetidos/);
 assert.throws(()=>comprobarLoteActualizado([],selected,"COR_01_COR"),/entre 1 y 20/);
});
test("acepta 20 y rechaza 21 sin convertir la verificación en una escritura",()=>{
 const selected=Array.from({length:20},(_,i)=>doc("LP26-"+String(10001+i)));
 assert.equal(comprobarLoteActualizado(selected,structuredClone(selected),"COR_01_COR").length,20);
 assert.throws(()=>comprobarLoteActualizado([...selected,doc("LP26-10022")],selected,"COR_01_COR"),/entre 1 y 20/);
 const script=readFileSync(new URL("../src/admin-print-batch.mjs",import.meta.url),"utf8");
 assert.match(script,/const \{data,error\}=await client\.rpc\("kontrola_panel_cargas",\{p_almacen:warehouse\}\)/);
 assert.match(script,/comprobarLoteActualizado\(chosen,data\|\|\[\],warehouse\)/);
 assert.match(script,/selected\.size!==codes\.length\|\|codes\.some/);
 assert.match(script,/status\.textContent="No se ha generado el PDF:/);
 assert.doesNotMatch(script,/client\.from\(|\.insert\(|\.upsert\(|\.upload\(/);
});

test("la impresión protege líneas y repite la cabecera si veinte cargas ocupan varias páginas",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/preparation-report thead,.archive-cover thead\{display:table-header-group\}/);
 assert.match(html,/preparation-report tr,.archive-cover tr\{break-inside:avoid;page-break-inside:avoid\}/);
 assert.match(html,/report-batch-sheet\{break-after:page;page-break-after:always\}/);
});
