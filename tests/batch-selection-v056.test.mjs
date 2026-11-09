import test from "node:test";
import assert from "node:assert/strict";
import {filtrarFilasImpresion,seleccionarTodasImpresion,marcarVisiblesImpresion,conciliarSeleccionImpresion,evaluarLoteImpresion} from "../src/batch-selection-v056.mjs";
import {readFileSync} from "node:fs";

const filas=[
  {codigo:"LP-A",ruta:"Norte",repartidor:"Álvaro",matricula:"1234ABC"},
  {codigo:"LP-B",ruta:"Sur",repartidor:"Beatriz",matricula:"5678DEF"},
  {codigo:"LP-C",ruta:"Norte",repartidor:"Carmen",matricula:"9012GHI"}
];

test("v0.5.6: seleccionar todas no depende del filtro visible",()=>{
  assert.deepEqual([...seleccionarTodasImpresion(filas)],["LP-A","LP-B","LP-C"]);
  assert.deepEqual([...filtrarFilasImpresion(filas,"sur")].map(x=>x.codigo),["LP-B"]);
});

test("v0.5.6: marcar visibles suma solamente las filtradas y conserva otras",()=>{
  const inicio=new Set(["LP-A"]);
  const seleccion=marcarVisiblesImpresion(inicio,filtrarFilasImpresion(filas,"sur"));
  assert.deepEqual([...seleccion],["LP-A","LP-B"]);
  assert.equal(inicio.size,1);
});

test("v0.5.6: desmarcar limpia toda la seleccion, incluso los ocultos",()=>{
  const seleccion=seleccionarTodasImpresion(filas);
  seleccion.clear();
  assert.equal(seleccion.size,0);
  assert.equal(evaluarLoteImpresion(seleccion).puedePreparar,false);
});

test("busqueda compatible con acentos, mayusculas y varios terminos",()=>{
  assert.deepEqual(filtrarFilasImpresion(filas,"alvaro norte").map(x=>x.codigo),["LP-A"]);
  assert.deepEqual(filtrarFilasImpresion(filas,"1234abc").map(x=>x.codigo),["LP-A"]);
});

test("cambio de almacen o elegibilidad descarta solo IDs no permitidos",()=>{
  const anteriores=new Set(["LP-A","LP-B","LP-Z"]);
  assert.deepEqual([...conciliarSeleccionImpresion(anteriores,[filas[1]])],["LP-B"]);
});

test("mas de 20: todas siguen seleccionadas pero no se envia lote parcial",()=>{
  const muchas=Array.from({length:25},(_,i)=>({codigo:"LP-"+i}));
  const seleccion=seleccionarTodasImpresion(muchas);
  const evalua=evaluarLoteImpresion(seleccion,20);
  assert.equal(seleccion.size,25);
  assert.equal(evalua.puedePreparar,false);
  assert.equal(evalua.superaLimite,true);
  assert.equal(evaluarLoteImpresion(new Set(["LP-1","LP-2"]),20).puedePreparar,true);
});

test("duplicados de ID no aumentan recuento",()=>{
  assert.equal(seleccionarTodasImpresion([filas[0],filas[0]]).size,1);
});

test("interfaz LAB enlaza las acciones y no imprime sobre 20",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const code=readFileSync(new URL("../src/admin-print-batch.mjs",import.meta.url),"utf8");
  for(const id of ["batchPrintSearch","batchPrintSelectAll","batchPrintMarkVisible","batchPrintClear","batchPrintSelectVisible"]){
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.ok(code.includes('"'+id+'"'),"falta conectar "+id);
  }
  assert.match(code,/evaluarLoteImpresion\(selected,MAX_HOJAS_ARCHIVO\)/);
  assert.match(code,/chosen\.length>MAX_HOJAS_ARCHIVO/);
  assert.match(code,/getWarehouse\(\)!==warehouse/);
  assert.match(code,/getUser\(\)\?\.id!==session/);
});
