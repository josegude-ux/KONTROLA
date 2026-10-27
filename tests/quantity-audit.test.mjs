import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {applyValidatedQuantityCorrection,analyzeDocument} from "../src/document-review.mjs";

const fixture={
 id:"LP26-12345",warehouse:"COR_01_COR",refs:2,declaredTotal:3,actualTotal:3,
 products:[
  {sku:"PRD0000001",description:"Producto A",location:"A101-1",qty:2,unit:"CAJA"},
  {sku:"PRD0000002",description:"Producto B",location:"A101-2",qty:1,unit:"CAJA"}
 ],warnings:[],corrections:[]
};
const proof={type:"lectura_pdf",evidence:"Se comprobó el artículo y la cantidad contra el terminal de Business Central"};

test("corrige cantidad por lectura conservando valor original, responsable, fecha y evidencia",()=>{
 const r=applyValidatedQuantityCorrection(fixture,1,"2,500",proof,"admin-1","2026-10-27T10:00:00Z");
 assert.equal(r.products[0].qty,2.5);
 assert.equal(r.products[0].pdfOriginal.qty,2);
 assert.equal(r.actualTotal,3.5);
 assert.equal(r.verified,false);
 assert.deepEqual(r.corrections[0],{
  line:1,field:"qty",before:2,after:2.5,by:"admin-1",at:"2026-10-27T10:00:00Z",
  tipo:"lectura_pdf",justificacion:proof.evidence,fuente:"contraste_manual_bc"
 });
 assert.equal(fixture.products[0].qty,2);
 assert.equal(fixture.corrections.length,0);
});
test("distingue error en el PDF respecto a Business Central",()=>{
 const r=applyValidatedQuantityCorrection(fixture,2,"4",{
  type:"dato_pdf_bc",evidence:"La ficha de Business Central muestra cuatro unidades y el PDF indica una"
 },"admin-1","2026-10-27T10:30:00Z");
 assert.equal(r.corrections[0].tipo,"dato_pdf_bc");
 assert.equal(r.products[1].pdfOriginal.qty,1);
 assert.ok(analyzeDocument(r).some(x=>x.code==="quantity_total_mismatch"&&x.severity==="warning"));
});
test("una segunda corrección conserva siempre el primer valor documental",()=>{
 const first=applyValidatedQuantityCorrection(fixture,1,"3",proof,"admin-1","2026-10-27T10:00:00Z");
 const second=applyValidatedQuantityCorrection(first,1,"4",proof,"admin-2","2026-10-27T10:05:00Z");
 assert.equal(second.products[0].pdfOriginal.qty,2);
 assert.equal(second.corrections.length,2);
 assert.equal(second.corrections[1].before,3);
 assert.equal(second.corrections[1].after,4);
});
test("no registra corrección ficticia, peligrosa o sin justificación",()=>{
 for(const quantity of ["","-1","3.1234","1e4","Infinity","abc","2/3"]){
  assert.throws(()=>applyValidatedQuantityCorrection(fixture,1,quantity,proof,"admin-1"),/Cantidad/);
 }
 assert.throws(()=>applyValidatedQuantityCorrection(fixture,1,"2",proof,"admin-1"),/no ha cambiado/);
 assert.throws(()=>applyValidatedQuantityCorrection(fixture,1,"3",{type:"dato_pdf_bc",evidence:"poca"},"admin-1"),/Documenta/);
 assert.throws(()=>applyValidatedQuantityCorrection(fixture,1,"3",{type:"otro",evidence:proof.evidence},"admin-1"),/Indica/);
 assert.throws(()=>applyValidatedQuantityCorrection(fixture,1,"3",proof,null),/responsable/);
 assert.throws(()=>applyValidatedQuantityCorrection(fixture,8,"3",proof,"admin-1"),/no existe/);
});
test("no permite sobrescribir cantidades de carga publicada ni subir cambios directamente a BC",()=>{
 const app=readFileSync(new URL("../src/admin.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(app,/draft\.state!=="publicada"&&Array\.isArray\(draft\.parsed\.products\)/);
 assert.match(app,/warehouse\.disabled=draft\.state==="publicada"/);
 assert.match(app,/draft\.parsed=next/);
 assert.match(app,/draft\.findings=analyzeDocument\(next\)/);
 assert.match(app,/draft\.state="revision_requerida"/);
 assert.match(app,/Cantidad corregida localmente con evidencia/);
 assert.match(app,/Pulsa Guardar revisión/);
 assert.match(app,/applyValidatedQuantityCorrection/);
 assert.match(css,/\.quantity-review-row\.quantity-corrected/);
 assert.match(css,/@media screen and \(max-width:720px\)/);
});
