import test from "node:test";
import assert from "node:assert/strict";
import {buildPreparationReport,filterProducts} from "../src/report.mjs";

const load={
  codigo:"LP26-12345",fecha:"2026-10-25",matricula:"1234ABC",ruta:"Norte",
  repartidor:"Ana",almacen:"COR_02_NAR",peso_kg:1200,referencias:2,
  productos:[
    {sku:"PRD0000001",description:"Caja uno",location:"A101-1",qty:2,unit:"CAJA"},
    {sku:"PRD0000002",description:"Frío",location:"ZFRIO",qty:3,unit:"PACK"}
  ]
};

test("processed preparation sheet contains identification and aisle detail",()=>{
  const html=buildPreparationReport(load);
  for(const value of ["LP26-12345","COR_02_NAR","1234ABC","PRD0000001","A101-1","Caja uno","2","CAJA"]){
    assert.match(html,new RegExp(value));
  }
  assert.doesNotMatch(html,/CONTROL ENVASES|PALETS/i);
});

test("document search matches reference, location and description",()=>{
  assert.equal(filterProducts(load.productos,"prd0000002").length,1);
  assert.equal(filterProducts(load.productos,"a101").length,1);
  assert.equal(filterProducts(load.productos,"frío").length,1);
  assert.equal(filterProducts(load.productos,"inexistente").length,0);
});

test("report output escapes untrusted document text",()=>{
  const html=buildPreparationReport({...load,repartidor:"<img src=x onerror=alert(1)>"}); 
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img/);
});

test("Informe impreso respeta cajas antes de botellas y cantidad descendente",()=>{
 const html=buildPreparationReport({...load,productos:[
  {sku:"BOT1",location:"A101-1",qty:20,unit:"BOTELLA"},
  {sku:"CAJA2",location:"A101-2",qty:2,unit:"CAJA"},
  {sku:"CAJA1",location:"A101-3",qty:9,unit:"CAJA"},
  {sku:"BOT2",location:"A101-4",qty:4,unit:"BOTELLA"}
 ]});
 assert.ok(html.indexOf("CAJA1")<html.indexOf("CAJA2"));
 assert.ok(html.indexOf("CAJA2")<html.indexOf("BOT1"));
 assert.ok(html.indexOf("BOT1")<html.indexOf("BOT2"));
});
