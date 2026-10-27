import test from "node:test";
import assert from "node:assert/strict";
import {hasDocumentedBCQuantityOverride,analyzeDocument} from "../src/document-review.mjs";

const evidence=(line,after)=>({
 line,field:"qty",after,tipo:"dato_pdf_bc",
 by:"00000000-0000-0000-0000-000000000001",at:"2026-10-27T10:00:00Z",
 justificacion:"Comprobación manual del artículo y cantidad en Business Central"
});
const draft={
 id:"LP26-95002",warehouse:"COR_01_COR",refs:2,declaredTotal:5,actualTotal:13,
 products:[
  {sku:"PRD0000001",description:"Uno",location:"A101-1",qty:4,unit:"CAJA",pdfOriginal:{qty:2}},
  {sku:"PRD0000002",description:"Dos",location:"A101-2",qty:9,unit:"CAJA",pdfOriginal:{qty:3}}
 ],corrections:[evidence(1,4)],warnings:[]
};
const quantityFinding=x=>analyzeDocument(x).find(v=>v.code==="quantity_total_mismatch");

test("una sola evidencia no justifica dos cantidades BC cambiadas",()=>{
 assert.equal(hasDocumentedBCQuantityOverride(draft),false);
 assert.equal(quantityFinding(draft)?.severity,"error");
});
test("dos líneas cambiadas con ambas evidencias se consideran advertencia auditable",()=>{
 const input={...draft,corrections:[evidence(1,4),evidence(2,9)]};
 assert.equal(hasDocumentedBCQuantityOverride(input),true);
 assert.equal(quantityFinding(input)?.severity,"warning");
});
test("una cantidad sin diferencia no exige constancia de modificación",()=>{
 const input={...draft,products:[draft.products[0],{...draft.products[1],qty:3,pdfOriginal:{qty:3}}]};
 assert.equal(hasDocumentedBCQuantityOverride(input),true);
});
test("evidencia cruzada, escasa o de otra tipología no justifica cambio",()=>{
 const wrong=[evidence(1,4),evidence(2,8)];
 assert.equal(hasDocumentedBCQuantityOverride({...draft,corrections:wrong}),false);
 assert.equal(hasDocumentedBCQuantityOverride({...draft,corrections:[evidence(1,4),{...evidence(2,9),tipo:"lectura_pdf"}]}),false);
 assert.equal(hasDocumentedBCQuantityOverride({...draft,corrections:[evidence(1,4),{...evidence(2,9),justificacion:"corto"}]}),false);
 assert.equal(hasDocumentedBCQuantityOverride({...draft,corrections:[]}),false);
});
