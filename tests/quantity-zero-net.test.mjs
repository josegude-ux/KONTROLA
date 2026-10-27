import test from "node:test";
import assert from "node:assert/strict";
import {analyzeDocument,hasDocumentedBCQuantityOverride} from "../src/document-review.mjs";

const corr=(line,before,after)=>({
  line,field:"qty",tipo:"dato_pdf_bc",before,after,
  by:"00000000-0000-0000-0000-000000000001",
  at:"2026-10-27T13:00:00Z",
  justificacion:"Cantidad contrastada manualmente contra Business Central y PDF"
});
const base={
  id:"LP26-96001",warehouse:"COR_01_COR",refs:2,declaredTotal:5,actualTotal:5,
  products:[
    {sku:"PRD0000001",description:"Caja A",location:"A101-1",qty:4,unit:"CAJA",pdfOriginal:{qty:2}},
    {sku:"PRD0000002",description:"Caja B",location:"A101-2",qty:1,unit:"CAJA",pdfOriginal:{qty:3}}
  ],
  verified:true,warnings:[],corrections:[corr(1,2,4)]
};
const bcFinding=(payload)=>analyzeDocument(payload).find(x=>x.code==="quantity_bc_evidence_missing");

test("los cambios compensados no ocultan falta de evidencia BC en otra línea",()=>{
 assert.equal(base.actualTotal,base.declaredTotal);
 assert.equal(hasDocumentedBCQuantityOverride(base),false);
 assert.equal(bcFinding(base)?.severity,"error");
});
test("las dos evidencias válidas permiten misma suma sin advertencia engañosa",()=>{
 const valid={...base,corrections:[corr(1,2,4),corr(2,3,1)]};
 assert.equal(hasDocumentedBCQuantityOverride(valid),true);
 assert.equal(bcFinding(valid),undefined);
});
test("evidencia BC incorrecta mantiene incidencia aunque cuadre el total",()=>{
 const wrong={...base,corrections:[corr(1,2,4),corr(2,3,2)]};
 assert.equal(bcFinding(wrong)?.severity,"error");
});
test("una corrección del PDF sin alegar BC no activa comprobación BC",()=>{
 const pdf={...base,corrections:[{...corr(1,2,4),tipo:"lectura_pdf"}]};
 assert.equal(bcFinding(pdf),undefined);
});
