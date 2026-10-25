import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeDocument,
  applyLineCorrection,
  publicationReadiness,
  warehouseZone
} from "../src/document-review.mjs";

const parsed={
  id:"LP26-12345",
  warehouse:"COR_01_COR",
  products:[
    {sku:"PRD0000001",description:"Caja",location:"A101-1",qty:2,unit:"CAJA",sourceContext:""},
    {sku:"PRD0000002",description:"Dudosa ?",location:"",qty:1,unit:"",sourceContext:"marca ? en unidad"}
  ],
  refs:2,declaredTotal:3,actualTotal:3,warnings:[]
};

test("classifies warehouses without guessing unknown codes",()=>{
  assert.deepEqual(warehouseZone("COR_01_COR"),{code:"COR_01_COR",zone:"coruna",label:"A Coruña",known:true});
  assert.deepEqual(warehouseZone("COR_02_NAR"),{code:"COR_02_NAR",zone:"ferrol",label:"Ferrol",known:true});
  assert.deepEqual(warehouseZone("COR_99_XYZ"),{code:"COR_99_XYZ",zone:"pending",label:"Pendiente de clasificar",known:false});
  assert.equal(warehouseZone(null).zone,"pending");
});

test("document findings preserve special marker context and severity",()=>{
  const findings=analyzeDocument(parsed);
  assert.ok(findings.some(item=>item.code==="missing_location"&&item.severity==="warning"&&item.line===2));
  assert.ok(findings.some(item=>item.code==="missing_unit"&&item.severity==="error"&&item.line===2));
  const marker=findings.find(item=>item.code==="special_marker");
  assert.equal(marker.severity,"warning");
  assert.match(marker.context,/unidad/);
});

test("corrections preserve PDF values and append actor/time audit",()=>{
  const result=applyLineCorrection(parsed,2,{unit:"CAJA",location:"B101-1"},"admin-1","2026-10-25T01:00:00Z");
  assert.equal(result.products[1].unit,"CAJA");
  assert.equal(result.products[1].pdfOriginal.unit,"");
  assert.equal(result.products[1].pdfOriginal.location,"");
  assert.deepEqual(result.corrections[0],{
    line:2,field:"unit",before:"",after:"CAJA",by:"admin-1",at:"2026-10-25T01:00:00Z"
  });
  assert.equal(parsed.products[1].unit,"");
});

test("quantity corrections recalculate the extracted total",()=>{
  const result=applyLineCorrection(parsed,1,{qty:"5"},"admin-1","2026-10-25T01:00:00Z");
  assert.equal(result.actualTotal,6);
  assert.ok(analyzeDocument(result).some(item=>item.code==="quantity_total_mismatch"));
});

test("unverified parser output and parser warnings block publication",()=>{
  const reviewed={...parsed,products:parsed.products.map(product=>({...product,unit:"CAJA",location:product.location||"B101-1"})),verified:false,warnings:["Fila ilegible"]};
  const findings=analyzeDocument(reviewed);
  assert.ok(findings.some(item=>item.code==="parser_warning"&&item.severity==="warning"));
  assert.ok(findings.some(item=>item.code==="unverified_document"&&item.severity==="warning"));
  assert.equal(publicationReadiness(findings,[]).ready,false);
  assert.equal(publicationReadiness(findings,findings.map(item=>item.id)).ready,true);
});

test("missing documentary totals block publication",()=>{
  const findings=analyzeDocument({...parsed,refs:null,declaredTotal:null,verified:false});
  assert.ok(findings.some(item=>item.code==="missing_reference_total"&&item.severity==="error"));
  assert.ok(findings.some(item=>item.code==="missing_quantity_total"&&item.severity==="error"));
});

test("mixed warehouse documents must be split and reprocessed",()=>{
  const findings=analyzeDocument({...parsed,mixedWarehouse:true,availableWarehouses:["COR_01_COR","COR_02_NAR"]});
  assert.ok(findings.some(item=>item.code==="mixed_warehouse"&&item.severity==="error"));
});

test("publication blocks errors and requires acknowledgement for warnings",()=>{
  const findings=analyzeDocument(parsed);
  assert.equal(publicationReadiness(findings,[]).ready,false);
  const corrected=applyLineCorrection(parsed,2,{unit:"CAJA"},"admin-1","2026-10-25T01:00:00Z");
  const warnings=analyzeDocument(corrected);
  assert.equal(publicationReadiness(warnings,[]).ready,false);
  assert.equal(publicationReadiness(warnings,warnings.filter(item=>item.severity==="warning").map(item=>item.id)).ready,true);
});
