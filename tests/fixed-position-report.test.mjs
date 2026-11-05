import test from "node:test";
import assert from "node:assert/strict";
import {classifyFixedPositions,filterFixedRows,fixedReportCsv,safeCsvCell,FIXED_CATEGORIES} from "../src/fixed-position-report.mjs";

const meta={authorized:true,warehouse:"COR_01_COR",stockComplete:true,catalogComplete:true,
  positionsComplete:true,locationsComplete:true,absentStockIsZero:false,sourceFile:"BC-demo.xlsx",
  importedAt:"2026-10-27T10:00:00Z",exportedAt:"2026-10-27T08:00:00Z",
  publishedAt:"2026-10-27T11:00:00Z",truncated:false,stale:false};
const p=(code="PRD001",unit="UD")=>({code,description:"Artículo "+code,unit});
const f=(loc="A01-P01",code="PRD001")=>({product_code:code,location_code:loc});
const s=(loc,quantity,lot="L1",code="PRD001")=>({product_code:code,location_code:loc,lot,quantity,unit:"UD"});
const classify=(options={})=>{
  const assignments=options.fixed||[],lines=options.stock||[];
  const codes=new Set([...assignments.map(x=>x.location_code),...lines.map(x=>x.location_code)]);
  const locations=options.locations??[...codes].filter(Boolean).map(code=>({code}));
  return classifyFixedPositions({warehouse:"COR_01_COR",products:[p()],fixed:[],stock:[],meta,...options,locations});
};
const count=(report,key)=>report.byCategory[key].references;
test("sin fija con stock positivo se clasifica una vez y conserva ubicaciones",()=>{
  const x=classify({stock:[s("B01-P01",12)]});
  assert.equal(count(x,"sin_fija"),1);
  assert.equal(x.rows[0].warehouseQuantity,"12");
  assert.equal(x.rows[0].locations[0].location,"B01-P01");
});
test("sin fija con línea explícita a cero",()=>{
  const x=classify({stock:[s("B01-P01",0)]});
  assert.equal(count(x,"sin_fija"),1);
  assert.equal(x.rows[0].warehouseQuantity,"0");
});
test("solo catálogo, sin fija, no se pierde ni se inventa stock",()=>{
  const x=classify();assert.equal(count(x,"sin_fija"),1);
  assert.equal(x.rows[0].warehouseQuantity,null);
});
test("fija a cero con reserva genera aviso de reposición",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",0),s("B04-P03",200)]});
  assert.equal(count(x,"cero"),1);assert.equal(x.rows[0].positionQuantity,"0");
  assert.equal(x.rows[0].warehouseQuantity,"200");assert.equal(x.rows[0].otherQuantity,"200");
  assert.equal(x.rows[0].replenishment,true);
});
test("fija a cero también cuando todo almacén está a cero",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",0)]});
  assert.equal(count(x,"cero"),1);assert.equal(x.rows[0].otherQuantity,"0");
  assert.equal(x.rows[0].replenishment,false);
});
test("fija negativa aunque stock de reserva compense",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",-3),s("B01-P01",50)]});
  assert.equal(count(x,"negativo"),1);assert.equal(x.rows[0].warehouseQuantity,"47");
});
test("fijas múltiples, una cero y otra negativa, referencia única",()=>{
  const x=classify({fixed:[f("A01-P01"),f("A01-P02")],
    stock:[s("A01-P01",0),s("A01-P02",-2)]});
  assert.equal(count(x,"cero"),1);assert.equal(count(x,"negativo"),1);
  assert.equal(x.affectedReferences,1);assert.equal(x.affectedPositions,2);
});
test("varios lotes y decimales no redondean a cero",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01","0.1","L1"),s("A01-P01","-0.1","L2")]});
  assert.equal(count(x,"cero"),1);
  assert.equal(x.rows[0].positionQuantity,"0");
});
test("lotes agregados negativos y positivos, suma negativa",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",-1.25,"L1"),s("A01-P01","0.24","L2")]});
  assert.equal(x.rows[0].positionQuantity,"-1.01");
});
test("posición positiva no es incidencia",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",10)]});
  assert.equal(x.rows.length,0);
});
test("sin importación BC fija carece de información, no es cero",()=>{
  const x=classify({fixed:[f()],meta:{...meta,sourceFile:"",importedAt:null}});
  assert.equal(count(x,"insuficientes"),1);assert.equal(count(x,"cero"),0);
});
test("posición sin línea: desconocido salvo contrato explícito de ceros omitidos",()=>{
  const x=classify({fixed:[f()]});
  assert.equal(count(x,"insuficientes"),1);
  const y=classify({fixed:[f()],meta:{...meta,absentStockIsZero:true}});
  assert.equal(count(y,"cero"),1);
});
test("inventario y catálogo incompletos no producen falsos ceros ni sin fija",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",0)],
    meta:{...meta,stockComplete:false,catalogComplete:false}});
  assert.equal(count(x,"insuficientes"),1);
  const y=classify({meta:{...meta,positionsComplete:false}});
  assert.equal(count(y,"sin_fija"),0);
});
test("duplicado de lote idéntico no dobla cantidad",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",-2),s("A01-P01",-2)]});
  assert.equal(x.rows[0].positionQuantity,"-2");
});
test("duplicado de lote con cantidades contradictorias se bloquea",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",-2),s("A01-P01",-5)]});
  assert.equal(count(x,"insuficientes"),1);
});
test("no mezcla almacenes y rechaza peticiones no autorizadas",()=>{
  assert.throws(()=>classify({stock:[{...s("A01-P01",0),warehouse:"COR_02_NAR"}]}),/otro almacén/);
  assert.throws(()=>classify({meta:{...meta,authorized:false}}),/autorización/);
});
test("unidades incompatibles o cantidad inválida impiden conclusión falsa",()=>{
  let x=classify({fixed:[f()],stock:[{...s("A01-P01",0),unit:"CAJA"}]});
  assert.equal(count(x,"insuficientes"),1);
  x=classify({fixed:[f()],stock:[s("A01-P01","abc")]});
  assert.equal(count(x,"insuficientes"),1);
});
test("filtros de gravedad, referencia, ubicación y existencia en reserva",()=>{
  const x=classify({products:[p(),p("PRD002")],fixed:[f(),f("B01-P01","PRD002")],
    stock:[s("A01-P01",0),s("Z01-P01",20),s("B01-P01",-1,"L1","PRD002")]});
  assert.equal(filterFixedRows(x.rows,{other:"si"}).length,1);
  assert.equal(filterFixedRows(x.rows,{category:"negativo"}).length,1);
  assert.equal(filterFixedRows(x.rows,{search:"prd002"}).length,1);
  assert.equal(filterFixedRows(x.rows,{aisle:"B01"}).length,1);
});
test("CSV Excel: formula injection, BOM UTF-8 y no se corta a 100 ni 1000",()=>{
  assert.equal(safeCsvCell("=HYPERLINK('evil')"),"\"'=HYPERLINK('evil')\"");
  assert.equal(safeCsvCell("@SUM(A1)"),"\"'@SUM(A1)\"");
  const products=Array.from({length:1205},(_,i)=>p("PRD"+String(i).padStart(4,"0")));
  const result=classify({products});
  assert.equal(result.rows.length,1205);
  const csv=fixedReportCsv(result.rows,{warehouse:"COR_01_COR",
    sourceFile:"BC.xlsx",importedAt:"2026-10-27",generatedAt:"2026-10-27"});
  assert.equal(csv.charCodeAt(0),65279);assert.match(csv,/PRD1204/);
  assert.equal(csv.split("\r\n").filter(line=>/^"sin_fija";"PRD\d{4}";/.test(line)).length,1205);
});
test("contrato de lectura nunca referencia stock físico, recuentos o movimientos",()=>{
  const x=classify({fixed:[f()],stock:[{...s("A01-P01",0),physical_quantity:300,difference:300}]});
  assert.equal(x.rows[0].positionQuantity,"0");
});
test("solo los lotes del almacén designado y filtros no mutan el informe",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",-2),s("B01-P01",2)]});
  const snapshot=JSON.stringify(x.rows);filterFixedRows(x.rows,{sort:"quantity"});
  assert.equal(JSON.stringify(x.rows),snapshot);
});

test("posición o línea fuera de ubicaciones validadas se clasifica como insuficiente",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",0)],locations:[]});
  assert.equal(count(x,"insuficientes"),1);
  assert.equal(count(x,"cero"),0);
});
test("ubicaciones sin certificado de completitud impiden falsos resultados",()=>{
  const x=classify({fixed:[f()],stock:[s("A01-P01",0)],meta:{...meta,locationsComplete:false}});
  assert.equal(count(x,"insuficientes"),1);
  assert.equal(x.complete,false);
});
