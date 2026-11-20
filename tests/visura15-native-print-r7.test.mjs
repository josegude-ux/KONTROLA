import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {generarPdfHojas} from "../src/print-pdf.mjs";
import {ordenarCargasR7,seleccionarNuevasR7,destinoAcreditado,totalMercanciaAcreditado} from "../src/visura-print-r7-core.mjs";
import {seleccionarCorteMercancia,validarPaginasCor1} from "../src/visura-r7-corte-mercancia.mjs";
import {comprobarRutaOriginalCor1} from "../src/visura-r7-original-preview.mjs";

const code=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const sample=(codigo,destino,total,peso_kg)=>({codigo,destino,declared_total:total,peso_kg,verified:true});

test("destino de reparto nunca se inventa desde el almacén COR1",()=>{
  assert.equal(destinoAcreditado({almacen:"COR_01_COR",matricula:"FR1234"}),null);
  assert.equal(destinoAcreditado({destino:"Ferrol"}),"FERROL");
  assert.equal(destinoAcreditado({destino:"Coruña"}),"CORUÑA");
});

test("TOTAL de mercancía FERROL descendente; no sustituir por peso ni referencias",()=>{
  const rows=[sample("LP26-00001","FERROL",10,900),sample("LP26-00002","FERROL",50,100),
    sample("LP26-00003","CORUÑA",2,1000),sample("LP26-00004","FERROL",null,2000)];
  assert.deepEqual(ordenarCargasR7(rows).map(x=>x.codigo),
    ["LP26-00002","LP26-00003","LP26-00001","LP26-00004"]);
  assert.equal(totalMercanciaAcreditado({destino:"FERROL",declared_total:null,verified:true}),null);
  assert.equal(totalMercanciaAcreditado({destino:"FERROL",declared_total:100}),null);
  assert.equal(totalMercanciaAcreditado({destino:"FERROL",declared_total:"3,5",verified:true}),3.5);
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

test("corte R7 evita Total referencias de cabecera y se detiene antes de CONTROL ENVASES",()=>{
 const lines=[{text:"Total referencias prod. 4",top:52},{text:"PRD00001",top:130},
   {text:"Total referencias prod. 4",top:430},{text:"CONTROL ENVASES",top:465}];
 assert.deepEqual(seleccionarCorteMercancia(lines,841),{tipo:"seccion",bottom:461});
 assert.deepEqual(seleccionarCorteMercancia(lines.slice(0,3),841),{tipo:"total",bottom:447});
 assert.equal(seleccionarCorteMercancia(lines.slice(0,1),841),null);
});
test("páginas COR1 verificadas: rechazar duplicados, fuera de rango o invertidas",()=>{
 assert.deepEqual(validarPaginasCor1([1,2],3),[1,2]);
 for(const ids of [[],[2,1],[1,1],[0],[4]])assert.throws(()=>validarPaginasCor1(ids,3));
});
test("ruta original privada ligada a LP y almacén COR1",()=>{
 const hash="a".repeat(64),path="documentos/LP26-12345/"+hash+".pdf";
 assert.deepEqual(comprobarRutaOriginalCor1({codigo:"LP26-12345",almacen:"COR_01_COR",documento_ruta:path}),{path,hash});
 assert.throws(()=>comprobarRutaOriginalCor1({codigo:"LP26-12345",almacen:"COR_02_NAR",documento_ruta:path}));
 assert.throws(()=>comprobarRutaOriginalCor1({codigo:"LP26-12345",almacen:"COR_01_COR",documento_ruta:"documentos/LP26-99999/"+hash+".pdf"}));
});
test("original BC: sin CDN, sin almacenamiento paralelo y sin registrar generación",()=>{
 const crop=read("src/visura-r7-corte-mercancia.mjs"),adapter=read("src/visura-r7-original-preview.mjs");
 const logic=read("src/admin-print-batch.mjs"),html=read("index.html"),admin=read("src/admin.mjs");
 assert.match(crop,/vendor\/pdf\.min\.mjs/);
 assert.doesNotMatch(crop,/https?:\/\//);
 assert.match(adapter,/crypto\.subtle\.digest/);
 assert.match(adapter,/storage\.from\(bucket\)\.download/);
 assert.match(logic,/prepararVistaOriginalR7/);
 assert.match(admin,/configurarLoteImpresion\(\{client,getUser,errorText,bucket/);
 for(const id of ["adminSection2","batchPrintPanel","batchOriginalPreview"])
   assert.equal(html.split('id="'+id+'"').length-1,1);
 assert.doesNotMatch(adapter,/\.upload\(|\.insert\(|\.update\(/);
});
