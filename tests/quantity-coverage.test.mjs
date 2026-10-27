import test from "node:test";
import assert from "node:assert/strict";
import {
 applyValidatedQuantityCorrection,applyLineCorrection,analyzeDocument,
 hasDocumentedBCQuantityOverride
} from "../src/document-review.mjs";

const fixture=()=>({
 warehouse:"COR_01_COR",refs:2,declaredTotal:5,actualTotal:5,verified:true,warnings:[],
 products:[
  {sku:"PRD0000001",description:"Caja A",location:"A101-1",qty:2,unit:"CAJA"},
  {sku:"PRD0000002",description:"Caja B",location:"A101-2",qty:3,unit:"CAJA"}
 ],corrections:[]
});
const bc={type:"dato_pdf_bc",evidence:"Se ha contrastado manualmente esta referencia en Business Central."};
const lectura={type:"lectura_pdf",evidence:"Se ha releído el PDF y contrastado el total con Business Central."};
const actor="00000000-0000-0000-0000-000000000001";

test("una línea BC justificada NO cubre una segunda línea cambiada sin evidencia",()=>{
 const one=applyValidatedQuantityCorrection(fixture(),1,"4",bc,actor,"2026-10-27T10:00:00Z");
 const bad=applyLineCorrection(one,2,{qty:9},actor,"2026-10-27T10:05:00Z");
 assert.equal(hasDocumentedBCQuantityOverride(one),true);
 assert.equal(hasDocumentedBCQuantityOverride(bad),false);
 assert.ok(analyzeDocument(bad).some(f=>f.code==="quantity_total_mismatch"&&f.severity==="error"));
});

test("todas las líneas modificadas con evidencia BC individual sí conservan advertencia",()=>{
 const one=applyValidatedQuantityCorrection(fixture(),1,"4",bc,actor,"2026-10-27T10:00:00Z");
 const two=applyValidatedQuantityCorrection(one,2,"9",bc,actor,"2026-10-27T10:05:00Z");
 assert.equal(hasDocumentedBCQuantityOverride(two),true);
 assert.ok(analyzeDocument(two).some(f=>f.code==="quantity_total_mismatch"&&f.severity==="warning"));
 assert.equal(two.products[0].pdfOriginal.qty,2);
 assert.equal(two.products[1].pdfOriginal.qty,3);
 assert.equal(two.corrections.length,2);
});

test("corrección de lectura documentada puede coexistir con BC sin amparar terceros",()=>{
 const one=applyValidatedQuantityCorrection(fixture(),1,"4",bc,actor,"2026-10-27T10:00:00Z");
 const two=applyValidatedQuantityCorrection(one,2,"9",lectura,actor,"2026-10-27T10:05:00Z");
 assert.equal(hasDocumentedBCQuantityOverride(two),true);
});

test("corrección obsoleta no vale para la última cantidad registrada",()=>{
 const one=applyValidatedQuantityCorrection(fixture(),1,"4",bc,actor,"2026-10-27T10:00:00Z");
 const stale=applyLineCorrection(one,1,{qty:5},actor,"2026-10-27T10:15:00Z");
 assert.equal(hasDocumentedBCQuantityOverride(stale),false);
});

test("sin ninguna corrección BC no se rebaja el error de total",()=>{
 const justReading=applyValidatedQuantityCorrection(fixture(),1,"4",lectura,actor,"2026-10-27T10:00:00Z");
 assert.equal(hasDocumentedBCQuantityOverride(justReading),false);
 assert.ok(analyzeDocument(justReading).some(f=>f.code==="quantity_total_mismatch"&&f.severity==="error"));
});
