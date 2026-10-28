import test from "node:test";
import assert from "node:assert/strict";
import {assertPreparaFixedReadV1} from "../src/fixed-position-contract-v1.mjs";

const valid=()=>({
 warehouse:"COR_01_COR",
 meta:{warehouse:"COR_01_COR",authorized:true,truncated:false,
   contractVersion:"visura-prepara-fixed-read-v1",importId:"batch-1",
   stockComplete:true,catalogComplete:true,positionsComplete:true,
   locationsComplete:true,absentStockIsZero:false,stale:false,
   sourceFile:"BC.xlsx",stockRows:2,stockExpectedRows:2,
   exportedAt:"2026-10-27T08:00:00.000Z",
   importedAt:"2026-10-27T09:00:00.000Z",
   publishedAt:"2026-10-27T10:00:00.000Z"},
 products:[{code:"000123",description:"Artículo",unit:"UD"}],
 locations:[{warehouse:"COR_01_COR",code:"A01",aisle:"A",zone:"Z"},
   {warehouse:"COR_01_COR",code:"RES 1",aisle:"R",zone:"Z"}],
 fixed:[{warehouse:"COR_01_COR",product_code:"000123",location_code:"A01"}],
 stock:[{warehouse:"COR_01_COR",product_code:"000123",location_code:"A01",
   lot:"L1",quantity:"-2.5",unit:"UD"},
   {warehouse:"COR_01_COR",product_code:"000123",location_code:"RES 1",
   lot:"L2",quantity:"2.5",unit:"UD"}]
});
const check=p=>assertPreparaFixedReadV1(p,{warehouse:"COR_01_COR"});

test("acepta formato V1, stock con compensación cero y ambas ubicaciones sin duplicar",()=>{
 const x=valid();
 assert.equal(check(x),x);
 assert.equal(x.stock.reduce((a,l)=>a+Number(l.quantity),0),0);
});
test("no acepta contrato anterior, autorización declarada ausente ni recorte",()=>{
 for(const change of [{contractVersion:"old"},{authorized:false},{truncated:true},
   {warehouse:"COR_02_NAR"}]){
  const x=valid();Object.assign(x.meta,change);
  assert.throws(()=>check(x));
 }
});
test("la caducidad debe basarse en exportación BC y fecha completa de origen",()=>{
 const x=valid();delete x.meta.exportedAt;
 assert.throws(()=>check(x),/export|fecha|fecha.*BC/i);
 const future=valid();future.meta.exportedAt="2026-10-27T11:00:00.000Z";
 assert.throws(()=>check(future),/fecha|orden|export/i);
 const imported=valid();imported.meta.importedAt=null;
 assert.throws(()=>check(imported),/fecha|import/i);
 const unverified=valid();delete unverified.meta.stale;
 assert.throws(()=>check(unverified),/stale|caducidad|vigencia/i);
});
test("lote sin certificación de fechas se permite SOLO como insuficiente y obsoleto",()=>{
 const x=valid();x.meta.stale=true;x.meta.stockComplete=false;
 x.meta.exportedAt=null;x.meta.importedAt=null;x.meta.publishedAt=null;
 assert.equal(check(x),x);
 x.meta.stale=false;
 assert.throws(()=>check(x));
});
test("no acepta stock ajeno, lotes duplicados ni cantidades redondeadas en Number",()=>{
 const wrong=valid();wrong.stock[0].warehouse="COR_02_NAR";
 assert.throws(()=>check(wrong),/almacén|warehouse/i);
 const duplicate=valid();duplicate.stock.push({...duplicate.stock[0]});
 duplicate.meta.stockRows=3;duplicate.meta.stockExpectedRows=3;
 assert.throws(()=>check(duplicate),/duplicad/i);
 const numeric=valid();numeric.stock[0].quantity=-2.5;
 assert.throws(()=>check(numeric),/decimal|cantidad/i);
});
test("valida la coherencia del puntero publicado declarado por el adaptador",()=>{
 const rows=valid();rows.meta.stockRows=1;
 assert.throws(()=>check(rows),/filas|conteo|stock/i);
 const incomplete=valid();incomplete.meta.stockComplete=false;
 incomplete.meta.stockExpectedRows=3;
 assert.equal(check(incomplete),incomplete);
 const wrongZero=valid();wrongZero.meta.stockComplete=false;
 wrongZero.meta.absentStockIsZero=true;
 assert.throws(()=>check(wrongZero),/cero|omis/i);
});
test("rechaza referencias sin maestros, duplicados y ubicaciones no fijas ajenas",()=>{
 const badProduct=valid();badProduct.stock[0].product_code="AJENO";
 assert.throws(()=>check(badProduct),/artículo|maestro|referencia/i);
 const badLocation=valid();badLocation.locations[1].warehouse="COR_02_NAR";
 assert.throws(()=>check(badLocation),/almacén|warehouse/i);
 const dupFixed=valid();dupFixed.fixed.push({...dupFixed.fixed[0]});
 assert.throws(()=>check(dupFixed),/duplicad/i);
});
