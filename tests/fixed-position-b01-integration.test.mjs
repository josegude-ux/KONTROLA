import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("B01 conserva importación, histórico y posiciones fijas",()=>{
 const s=file("src/admin.mjs");
 for(const x of ["configureAdminFixedPositions","fixedPositions.mount()","fixedPositions.refresh()","fixedPositions.clear()","refreshOldLoads()","palletsEuropean","applyValidatedQuantityCorrection"])
   assert.ok(s.includes(x),"falta "+x);
 assert.ok(s.includes("()=>Promise.all([refreshArchivedLoads(),refreshOldLoads()]),\n    ()=>fixedPositions.refresh()"));
});
test("Precarga offline contiene todas las dependencias del informe y B01",()=>{
 const s=file("sw.js");
 for(const x of ["./src/admin-fixed-positions.mjs","./src/fixed-position-report.mjs","./src/fixed-position-print.mjs","./src/fixed-position-xlsx.mjs","./src/admin.mjs","./src/legacy-header.mjs","./src/app.mjs","./version.json"])
   assert.ok(s.includes('"'+x+'"'),"falta "+x);
 assert.ok(s.includes("kontrola-integral-visura-v074-fijas-ge-cierre"));
});
test("La base de datos central sigue siendo propuesta sin ejecución",()=>{
 const sql=file("supabase/proposals/visura_posiciones_fijas_central_rpc.sql");
 assert.match(sql,/SECURITY INVOKER/i);
 assert.ok(file("src/admin-fixed-positions.mjs").includes('client.rpc("kontrola_admin_posiciones_fijas"'));
});
