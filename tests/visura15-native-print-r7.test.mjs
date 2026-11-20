import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {generarPdfHojas} from "../src/print-pdf.mjs";
import {ordenarCargasR7,seleccionarNuevasR7,destinoAcreditado,totalMercanciaAcreditado} from "../src/visura-print-r7-core.mjs";

const code=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const sample=(codigo,destino,total,peso_kg)=>({codigo,destino,declared_total:total,peso_kg});

test("destino de reparto nunca se inventa desde el almacén COR1",()=>{
  assert.equal(destinoAcreditado({almacen:"COR_01_COR",matricula:"FR1234"}),null);
  assert.equal(destinoAcreditado({destino:"Ferrol"}),"FERROL");
  assert.equal(destinoAcreditado({destino:"Coruña"}),"CORUÑA");
});

test("TOTAL de mercancía FERROL descendente; no sustituir por peso ni referencias",()=>{
  const rows=[sample("LP26-00001","FERROL",10,900),sample("LP26-00002","FERROL",50,100),
    sample("LP26-00003","CORUÑA",2,1000),sample("LP26-00004","FERROL",null,2000)];
  assert.deepEqual(ordenarCargasR7(rows).map(x=>x.codigo),
    ["LP26-00003","LP26-00002","LP26-00001","LP26-00004"]);
  assert.equal(totalMercanciaAcreditado({declared_total:null}),null);
  assert.equal(totalMercanciaAcreditado({declared_total:"3,5"}),3.5);
});

test("solo carga nueva sin generación previa; no reautoseleccionar duplicado",()=>{
  const rows=Array.from({length:25},(_,i)=>({codigo:"LP26-"+String(i).padStart(5,"0")}));
  const counts=new Map([["LP26-00000",1],["LP26-00001",2]]);
  const selected=seleccionarNuevasR7(rows,counts);
  assert.equal(selected.length,20);
  assert.equal(selected[0],"LP26-00002");
  assert.equal(new Set(selected).size,20);
  assert.deepEqual(seleccionarNuevasR7(rows,counts,2),["LP26-00002","LP26-00003"]);
});

test("PDF dúplex: carátula y LP ocupan pares de páginas; modo clásico intacto",()=>{
  const doc=[
    {tipo:"portada",titulo:"Relación",filas:["LP26-00001"]},
    {tipo:"carga",titulo:"Hoja de preparación",cabecera:["LP26-00001"],pasillos:[]}
  ];
  const pages=bytes=>[...new TextDecoder().decode(bytes).matchAll(/\/Type\s*\/Page\b/g)].length;
  const regular=generarPdfHojas(doc),duplex=generarPdfHojas(doc,{duplexPorCarga:true});
  assert.equal(pages(regular),2);
  assert.equal(pages(duplex),4);
  assert.equal(pages(duplex)%2,0);
});

test("UI se integra en Administración sin modificar flujo RPC ni crear app paralela",()=>{
  const html=code("index.html"),logic=code("src/admin-print-batch.mjs"),admin=code("src/admin.mjs");
  const css=code("styles.css");
  for(const id of ["batchPrintNewCount","batchPrintDoneCount","batchPrintSelectionCount","batchPrintSearch","batchDuplexSave"])
    assert.ok(html.includes('id="'+id+'"'));
  assert.match(logic,/client\.rpc\("kontrola_panel_cargas_impresion"/);
  assert.match(logic,/client\.rpc\("kontrola_estado_impresion"/);
  assert.match(logic,/client\.rpc\("kontrola_registrar_lote_impresion"/);
  assert.match(logic,/seleccionarNuevasR7/);
  assert.match(admin,/generarPdfHojas\(extraerHojasDeInforme\(source\),\{duplexPorCarga:true\}\)/);
  assert.match(css,/visura-print-panel/);
  assert.doesNotMatch(logic,/localStorage|sessionStorage|client\.from\(/);
});
