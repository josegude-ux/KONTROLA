import test from "node:test";
import assert from "node:assert/strict";
import {almacenesDePagina,lineasPdf,planificarRecortesMercancia,validarParidadDocumento} from "../src/mercancia-v056.mjs";
const row=(y,...parts)=>parts.map((text,i)=>({text,x:25+i*85,y}));
const page=(n,items,height=842)=>({number:n,height,items});
const fixture=()=>{
 const cor1=page(1,[
  ...row(20,"Almacén:","COR_01_COR"),
  ...row(80,"M E R C A N C Í A"),
  ...row(140,"PRD0000001","A101","CAJA"),
  ...row(620,"Total","referencias","prod.","1"),
  ...row(665,"CONTROL ENVASES"),
  ...row(712,"PALETS")
 ]);
 const cor2=page(2,[
  ...row(20,"Almacén:","COR_02_NAR"),
  ...row(80,"MERCANCÍA"),
  ...row(140,"PRD0000002","B101","CAJA"),
  ...row(600,"Total referencias prod.","1"),
  ...row(630,"CONTROL ENVASES")
 ]);
 return [cor1,cor2];
};
test("las lineas reconstruyen marcadores fragmentados del PDF",()=>{
 const lines=lineasPdf(fixture()[0].items);
 assert.ok(lines.some(x=>x.normalized.includes("TOTALREFERENCIASPROD")));
});
test("recorta hasta final MERCANCIA y excluye envases, palets y otro almacen",()=>{
 const plan=planificarRecortesMercancia(fixture(),{warehouse:"COR_01_COR"});
 assert.equal(plan.pages.length,1);
 assert.equal(plan.pages[0].pageNumber,1);
 assert.equal(plan.pages[0].marker,"total");
 assert.equal(plan.pages[0].bottom,636);
 assert.ok(plan.pages[0].bottom<665);
});
test("seleccion de Ferrol no arrastra paginas de Coruña",()=>{
 const plan=planificarRecortesMercancia(fixture(),{warehouse:"COR_02_NAR"});
 assert.deepEqual(plan.pages.map(x=>x.pageNumber),[2]);
 assert.equal(plan.pages[0].bottom,616);
});
test("nombres de almacen fragmentados se reconocen",()=>{
 assert.deepEqual(almacenesDePagina(row(22,"Almacén:","COR 01 COR")),["COR_01_COR"]);
});
test("si falta marcador de fin, se cancela antes de imprimir",()=>{
 const bad=page(1,[...row(20,"Almacén:","COR_01_COR"),...row(80,"MERCANCÍA"),...row(130,"PRD0000001")]);
 assert.throws(()=>planificarRecortesMercancia([bad],{warehouse:"COR_01_COR"}),/final de MERCANCIA/);
});
test("si solo aparece CONTROL ENVASES, recorta por encima de su titulo",()=>{
 const p=page(1,[...row(20,"Almacén:","COR_01_COR"),...row(80,"MERCANCÍA"),...row(130,"PRD0000001"),...row(600,"CONTROL ENVASES")]);
 const x=planificarRecortesMercancia([p],{warehouse:"COR_01_COR"});
 assert.equal(x.pages[0].bottom,585);
});
test("rechaza dos almacenes en una misma pagina",()=>{
 const p=page(1,[...row(20,"Almacén:","COR_01_COR"),...row(40,"Almacén:","COR_02_NAR"),...row(80,"MERCANCÍA"),...row(130,"PRD0000001"),...row(600,"TOTAL REFERENCIAS PROD")]);
 assert.throws(()=>planificarRecortesMercancia([p],{warehouse:"COR_01_COR"}),/mas de un almacen/);
});
test("rechaza cambio de almacen antes de marcador de fin",()=>{
 const p1=page(1,[...row(20,"Almacén:","COR_01_COR"),...row(80,"MERCANCÍA"),...row(140,"PRD0000001")]);
 assert.throws(()=>planificarRecortesMercancia([p1,fixture()[1]],{warehouse:"COR_01_COR"}),/Cambio de almacen/);
});
test("rechaza documento no validado, codigo y almacen distintos",()=>{
 const parsed={id:"LP26-11111",warehouse:"COR_01_COR",verified:true,products:[{sku:"PRD0000001"}]};
 assert.equal(validarParidadDocumento(parsed,{codigo:parsed.id,warehouse:parsed.warehouse}),true);
 assert.throws(()=>validarParidadDocumento({...parsed,verified:false},{codigo:parsed.id,warehouse:parsed.warehouse}),/no esta verificada/);
 assert.throws(()=>validarParidadDocumento(parsed,{codigo:"LP26-22222",warehouse:parsed.warehouse}),/no coincide/);
 assert.throws(()=>validarParidadDocumento(parsed,{codigo:parsed.id,warehouse:"COR_02_NAR"}),/no coincide/);
});
test("el plan no altera su entrada ni recoge paginas sin datos del almacen",()=>{
 const pages=fixture();
 const snap=JSON.stringify(pages);
 planificarRecortesMercancia(pages,{warehouse:"COR_01_COR"});
 assert.equal(JSON.stringify(pages),snap);
});
