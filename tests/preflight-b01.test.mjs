import test from "node:test";
import assert from "node:assert/strict";
import {assess,report,SOURCES} from "../scripts/preflight-b01.mjs";

const fixture=()=>({
 parallel:{
  parallel:"estadoTrasVerificar if(load.preparador_id===userId)return false; picking real se registra en BC",
  sql:"kontrola_iniciar_verificacion kontrola_iniciar_preparacion"
 },
 responsive:{
  css:"max-width:1480px @media screen and (min-width:1100px) @media screen and (max-width:720px) max-width:1099px",
  admin:"vista de control"
 },
 documental:{
  css:"provisional-identity-form quantity-review",
  admin:"storeProvisionalPdf quantity-correction-form",
  review:"applyValidatedQuantityCorrection",
  parallel:"",
  sqlProvisional:"kontrola_pdf_provisionales",
  sqlTotal:"kontrola_total_bc_documentado declared_total actual_total public.kontrola_verificaciones v where v.codigo=v_i.codigo"
 }
});

test("comprueba contratos de origen sin confundirlos con integración",()=>{
 const checks=assess(fixture());
 assert.equal(checks.filter(x=>x.group!=="Integración").length,9);
 assert.ok(checks.filter(x=>x.group!=="Integración").every(x=>x.found));
 assert.equal(checks.filter(x=>x.group==="Integración"&&!x.found).length,3);
});
test("señala pérdida de contrato documental y no autoriza fusión",()=>{
 const bad=fixture();bad.documental.sqlTotal="";
 const checks=assess(bad);
 assert.ok(checks.some(x=>x.name==="Totales originales separados de BC"&&!x.found));
 const md=report({
  refs:Object.fromEntries(Object.keys(SOURCES).map(k=>[k,SOURCES[k].sha])),
  mergebases:{"Paralelismo ↔ Documental":"0".repeat(40)},
  shared:{"Paralelismo ↔ Documental":["styles.css","docs/CONTINUIDAD.md"]},
  checks
 });
 assert.match(md,/NO INTEGRADO/);
 assert.match(md,/NO FUSIONAR NI DESPLEGAR/);
 assert.match(md,/styles\.css/);
 assert.match(md,/No/);
 assert.match(md,/No se ejecutó merge/);
});
