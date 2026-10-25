import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {filtrarCargasArchivo,validarPeriodoArchivo,nombreSugeridoArchivo,portadaLoteArchivo} from "../src/archive-period.mjs";
const sample=[
 {codigo:"LP26-10001",fecha:"2026-10-21",ruta:"A Coruña",productos:[]},
 {codigo:"LP26-10002",fecha:"24/10/2026",ruta:"Ferrol",productos:[]},
 {codigo:"LP26-10003",fecha:"2026-11-01",ruta:"Local",productos:[]},
 {codigo:"LP26-10004",fecha:"",ruta:"Sin fecha",productos:[]}
];

test("el periodo es opcional, inclusivo y nunca inventa fechas ausentes",()=>{
 assert.equal(filtrarCargasArchivo(sample).length,4);
 assert.deepEqual(filtrarCargasArchivo(sample,"2026-10-21","2026-10-24").map(x=>x.codigo),[
  "LP26-10001","LP26-10002"
 ]);
 assert.deepEqual(filtrarCargasArchivo(sample,"","2026-10-23").map(x=>x.codigo),["LP26-10001"]);
 assert.deepEqual(filtrarCargasArchivo(sample,"2026-11-01","").map(x=>x.codigo),["LP26-10003"]);
});
test("rechaza fecha invertida o imposible antes de preparar archivo",()=>{
 assert.throws(()=>validarPeriodoArchivo("2026-10-26","2026-10-25"),/inicio no puede/);
 assert.throws(()=>validarPeriodoArchivo("2026-02-30",""),/inicio.*no es válida/);
 assert.throws(()=>validarPeriodoArchivo("","2026-13-01"),/fin.*no es válida/);
 assert.deepEqual(validarPeriodoArchivo("",""),{desde:"",hasta:""});
});
test("ofrece un nombre de PDF para guardar, sin fingir que ya se ha descargado",()=>{
 const file=nombreSugeridoArchivo("COR_01_COR","2026-10-21","2026-10-24","2026-10-25");
 assert.equal(file,"KONTROLA_HOJAS_COR_01_COR_2026-10-21_2026-10-24.pdf");
 assert.doesNotMatch(nombreSugeridoArchivo("../mal","", "", "2026-10-25"),/\.\.\//);
});
test("carátula indica códigos, datos del periodo y destino manual; escapa entradas PDF",()=>{
 const result=portadaLoteArchivo([
  {codigo:"LP26-10001",fecha:"2026-10-21",ruta:'R&L <img onerror="1">'},
  {codigo:"LP26-10002",fecha:"2026-10-24",ruta:"Ruta B"}
 ],{almacen:"COR_01_COR",desde:"2026-10-21",hasta:"2026-10-24",fechaGeneracion:"2026-10-25"});
 assert.match(result,/RELACIÓN DE HOJAS DE PREPARACIÓN/);
 assert.match(result,/KONTROLA_HOJAS_COR_01_COR_2026-10-21_2026-10-24\.pdf/);
 assert.match(result,/LP26-10001/);
 assert.match(result,/LP26-10002/);
 assert.match(result,/R&amp;L &lt;img/);
 assert.doesNotMatch(result,/<img/);
 assert.match(result,/No constituye justificante de archivo efectuado/);
});
test("carátula rechaza vacíos, más de diez y duplicados",()=>{
 assert.throws(()=>portadaLoteArchivo([]),/entre 1 y 10/);
 assert.throws(()=>portadaLoteArchivo(Array.from({length:11},(_,i)=>({codigo:"LP26-"+i}))),/entre 1 y 10/);
 assert.throws(()=>portadaLoteArchivo([{codigo:"A"},{codigo:"A"}]),/repetidos/);
});
test("el módulo de archivo no registra ni borra cargas y se conserva el límite de 10",()=>{
 const src=readFileSync(new URL("../src/admin-print-batch.mjs",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../src/admin.mjs",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(src,/filtrarCargasArchivo\(allRows,from,to\)/);
 assert.match(src,/portadaLoteArchivo\(chosen,/);
 assert.match(src,/selected\.size>=10/);
 assert.match(src,/id/); // controles de selección por código de carga
 assert.match(ui,/id="batchPrintFrom"/);
 assert.match(ui,/id="batchPrintTo"/);
 assert.match(ui,/id="batchPrintSelectVisible"/);
 assert.match(ui,/id="batchArchiveName"/);
 assert.doesNotMatch(src,/client\.from\(|\.upload\(|\.upsert\(|\.delete\(/);
 assert.doesNotMatch(admin,/configurarInventarioOriginales|configurarAuditoriaLegacy|configurarConciliacionLegacy/);
});
