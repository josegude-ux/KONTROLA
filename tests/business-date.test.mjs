import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fechaAlmacen} from "../src/business-date.mjs";

test("la fecha de Galicia no corresponde necesariamente al día UTC",()=>{
 assert.equal(fechaAlmacen(new Date("2026-07-01T22:30:00Z")),"2026-07-02");
 assert.equal(fechaAlmacen(new Date("2026-01-01T23:30:00Z")),"2026-01-02");
});
test("gestiona el cambio de hora de octubre en España",()=>{
 assert.equal(fechaAlmacen(new Date("2026-10-24T23:30:00Z")),"2026-10-25");
 assert.equal(fechaAlmacen(new Date("2026-10-25T23:30:00Z")),"2026-10-26");
});
test("los dos resúmenes emplean zona de Madrid y no UTC",()=>{
 for(const path of ["../src/app.mjs","../src/admin.mjs"]){
   const source=readFileSync(new URL(path,import.meta.url),"utf8");
   assert.match(source,/p_dia:fechaAlmacen\(\)/);
   assert.doesNotMatch(source,/new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
 }
});
test("administración ignora respuestas del almacén o usuario anterior",()=>{
 const source=readFileSync(new URL("../src/admin.mjs",import.meta.url),"utf8");
 for(const fn of ["async function refreshAttention()","async function refreshSummary()"]){
   const start=source.indexOf(fn);
   assert.ok(start>=0);
   assert.match(source.slice(start,start+1250),/\$\("adminWarehouse"\)\.value!==warehouse\|\|getUser\(\)\?\.id!==session/);
 }
});
