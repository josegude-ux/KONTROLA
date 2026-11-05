import test from "node:test";
import assert from "node:assert/strict";
import {parseDocumentPages} from "../src/core.mjs";
import {analyzeDocument} from "../src/document-review.mjs";
import {buildPreparationReport} from "../src/report.mjs";

function page(warehouse,number,sku,qty){
  const t=[
    ["Almacén: "+warehouse,20,12],["Fecha carga: 26/10/2026",20,30],
    ["M E R C A N C Í A",20,76],
    ["A101-1 "+sku,80,108],["Producto "+warehouse,310,108],
    [String(qty),700,108],["CAJA",900,108],
    ["Total referencias prod. 1",20,183],["TOTAL:",500,183],[String(qty),700,183]
  ];
  return {number,width:1000,items:t.map(([text,x,y])=>({text,x,y}))};
}
const cor1=()=>page("COR_01_COR",1,"PRD0000001",3);
const cor2=()=>page("COR_02_NAR",2,"PRD0000002",5);

test("C19711: se procesan e imprimen SOLO referencias COR1 y no COR2",()=>{
 const p=parseDocumentPages([cor2(),cor1()],"C19711.pdf");
 assert.equal(p.id,"LP26-19711");
 assert.equal(p.warehouse,"COR_01_COR");
 assert.equal(p.mixedWarehouse,false);
 assert.deepEqual(p.availableWarehouses,["COR_02_NAR","COR_01_COR"]);
 assert.equal(p.refs,1);
 assert.equal(p.actualTotal,3);
 assert.deepEqual(p.products.map(x=>x.sku),["PRD0000001"]);
 assert.equal(analyzeDocument(p).some(x=>x.code==="mixed_warehouse"),false);
 const report=buildPreparationReport({codigo:p.id,almacen:p.warehouse,productos:p.products,referencias:p.refs});
 assert.match(report,/COR_01_COR/);
 assert.match(report,/PRD0000001/);
 assert.doesNotMatch(report,/PRD0000002|COR_02_NAR/);
});
test("F19711: preparación COR1 aunque la carga también contiene Ferrol",()=>{
 const p=parseDocumentPages([cor2(),cor1()],"F19711.pdf");
 assert.equal(p.id,"LP26-19711");
 assert.equal(p.warehouse,"COR_01_COR");
 assert.equal(p.mixedWarehouse,false);
 assert.equal(p.refs,1);
 assert.equal(p.actualTotal,3);
 assert.deepEqual(p.products.map(x=>x.sku),["PRD0000001"]);
 assert.equal(analyzeDocument(p).some(x=>x.code==="mixed_warehouse"),false);
 const report=buildPreparationReport({codigo:p.id,almacen:p.warehouse,productos:p.products,referencias:p.refs});
 assert.match(report,/PRD0000001|COR_01_COR/);
 assert.doesNotMatch(report,/PRD0000002|COR_02_NAR/);
});
test("sin prefijo ni selección: el documento mixto continúa bloqueado",()=>{
 const p=parseDocumentPages([cor2(),cor1()],"LP26-19711.pdf");
 assert.equal(p.mixedWarehouse,true);
 assert.equal(p.products.length,0);
 assert.ok(analyzeDocument(p).some(x=>x.code==="mixed_warehouse"));
});
test("reprocesar original mixto por COR1 sin prefijo solo produce COR1",()=>{
 const p=parseDocumentPages([cor2(),cor1()],"LP26-19711.pdf",{warehouse:"COR_01_COR"});
 assert.equal(p.mixedWarehouse,false);
 assert.equal(p.warehouse,"COR_01_COR");
 assert.deepEqual(p.products.map(x=>x.sku),["PRD0000001"]);
});
test("si una página contiene dos almacenes no permite imprimir mezclados",()=>{
 const p=cor1();p.items.push({text:"Almacén: COR_02_NAR",x:20,y:65});
 assert.throws(()=>parseDocumentPages([p],"C19711.pdf"),/misma página/);
});
test("reprocesado rechaza seleccionar un almacén que no figura en el original",()=>{
 assert.throws(()=>parseDocumentPages([cor2()],"LP26-19711.pdf",{warehouse:"COR_01_COR"}),/no aparece en el PDF/);
});
