import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const r7=read("lab/visura-prepara-impresion-r7.html");
const controller=read("src/visura-r7-shared-import.mjs");
function getRegisterFunction(){
 const source=r7.split("function registrarListadosGenerados(cargas){")[1]
   ?.split("\n}\n// «TOTAL»")[0];
 assert.ok(source);
 const fn=new Function("loads","persist","selectedIds","list","window","location","VISURA_SCOPE",
   "return function registrarListadosGenerados(cargas){"+source+"\n};");
 return fn;
}

test("R7 emite aviso limitado SOLO tras persistir listado, sin modificar PDF",()=>{
 const calls=[],row={id:"LP26-00001",pdfHash:"a".repeat(64)};
 const scope="a".repeat(24);
 const window={parent:{postMessage:(body,target)=>calls.push({body,target})}};
 const get=getRegisterFunction();
 const fn=get([row],()=>true,new Set(["LP26-00001"]),()=>{},window,
   {origin:"https://visura.test"},scope);
 assert.equal(fn([row]),1);
 assert.equal(calls.length,1);
 assert.equal(calls[0].target,"https://visura.test");
 assert.deepEqual(calls[0].body,{
  type:"visura:r7:listados-generados",scope,codigos:["LP26-00001"]
 });
 assert.equal(row.listadoGeneradoHash,row.pdfHash);
});

test("error de persistencia R7 cancela aviso y restaura el estado local",()=>{
 const row={id:"LP26-00001",pdfHash:"a".repeat(64)},calls=[];
 const fn=getRegisterFunction()([row],()=>false,new Set(["LP26-00001"]),()=>{},
   {parent:{postMessage:msg=>calls.push(msg)}},{origin:"https://visura.test"},"a".repeat(24));
 assert.throws(()=>fn([row]),/No se pudo conservar/);
 assert.equal(calls.length,0);
 assert.equal(row.listadoGeneradoAt,undefined);
});

test("contenedor rechaza avisos de otro origen, ventana o ámbito",()=>{
 assert.match(controller,/event\.origin!==window\.location\.origin/);
 assert.match(controller,/event\.source!==frame\.contentWindow/);
 assert.match(controller,/frame\.dataset\.scope!==data\.scope/);
 assert.match(controller,/ctx\.warehouse!=="COR_01_COR"/);
 assert.match(controller,/new TextEncoder\(\)\.encode/);
 assert.match(controller,/new Set\(codes\)\.size!==codes\.length/);
 assert.doesNotMatch(controller,/client\.rpc\("kontrola_registrar_generacion_r7"/);
});

test("preflight de escritura no activado en navegador LAB",()=>{
 const source=read("src/visura-r7-sync-preflight.mjs");
 assert.match(source,/ESCRITURA_R7_HABILITADA=false/);
 assert.match(controller,/ESCRITURA DESACTIVADA EN LAB/);
 assert.doesNotMatch(source,/\.rpc\(/);
});
