import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPreparationReport} from "../src/report.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("las hojas procesadas consecutivas contienen cargas distintas y textos escapados",()=>{
 const first=buildPreparationReport({codigo:"LP26-11111",almacen:"COR_01_COR",
   productos:[{sku:"PRD0000001",qty:1,description:"<script>",location:"A1",unit:"CAJA"}]});
 const second=buildPreparationReport({codigo:"LP26-22222",almacen:"COR_01_COR",
   productos:[{sku:"PRD0000002",qty:2,description:"Caja",location:"B1",unit:"CAJA"}]});
 assert.match(first,/LP26-11111/);
 assert.match(second,/LP26-22222/);
 assert.doesNotMatch(first,/<script>/);
 assert.match(first,/&lt;script&gt;/);
});
test("la impresión selecciona cargas autorizadas del almacén sin alterar documentos originales",()=>{
 const code=read("src/admin-print-batch.mjs");
 const html=read("index.html");
 const css=read("styles.css");
 assert.match(code,/client\.rpc\("kontrola_panel_cargas_impresion",\{p_almacen:warehouse\}\)/);
 assert.match(code,/getWarehouse\(\)!==warehouse/);
 assert.match(code,/getUser\(\)\?\.id!==session/);
 assert.match(code,/selected\.size>=MAX_HOJAS_ARCHIVO/);
 assert.match(code,/buildPreparationReport\(row\)/);
 assert.doesNotMatch(code,/\.upload\(|\.insert\(|\.update\(|client\.from\(|createSignedUrl/);
 assert.match(html,/id="batchPrintPanel"/);
 assert.match(html,/id="batchPrintOpen"[^>]*disabled/);
 assert.match(css,/report-batch-sheet:last-child/);
});
test("la impresión por lotes se actualiza al cambiar el almacén administrativo",()=>{
 const admin=read("src/admin.mjs");
 assert.match(admin,/configurarLoteImpresion/);
 assert.match(admin,/printBatch\.refresh\(\)/);
});

test("la impresión de lotes usa únicamente la fecha del almacén sin filtros de periodo",()=>{
 const code=read("src/admin-print-batch.mjs");
 const html=read("index.html");
 assert.match(code,/row\.estado==="publicada"&&row\.publicado_en/);
 assert.match(code,/timeZone:"Europe\/Madrid"/);
 assert.match(code,/allRows\.filter\(row=>publicadaHoy\(row,today\)\)/);
 assert.ok(code.includes("const today=fechaAlmacen()"));
 assert.doesNotMatch(code,/batchPrintFrom|batchPrintTo/);
 assert.doesNotMatch(html,/id="batchPrintFrom"|id="batchPrintTo"/);
});

// Regresión: si todas las cargas del día ya se imprimieron, debe poder activarse Reimprimir.
test("permite activar reimpresión aunque no queden hojas nuevas por imprimir",()=>{
 const code=read("src/admin-print-batch.mjs");
 assert.match(code,/batchPrintReprint"\)\.closest\("label"\)\.hidden=!allRows\.some\(row=>publicadaHoy\(row,today\)/);
 assert.match(code,/\(printCounts\.get\(row\.codigo\)\|\|0\)>0/);
 assert.doesNotMatch(code,/batchPrintReprint"\)\.closest\("label"\)\.hidden=rows\.length===0&&!reprintMode/);
});
