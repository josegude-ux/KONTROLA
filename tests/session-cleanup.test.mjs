import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("cerrar sesión purga los paneles y descarta importaciones pendientes de finalización",()=>{
 const app=read("src/app.mjs"),admin=read("src/admin.mjs");
 assert.match(app,/adminController\?\.clearSensitive\?\.\(\)/);
 assert.match(app,/adminController\?\.isBusy\?\.\(\)/);
 assert.match(admin,/function clearSensitive\(\)/);
 assert.match(admin,/draft=null;busy=false/);
 assert.match(admin,/revisionControl\.clear\(\)/);
 assert.match(admin,/operatorStats\.clear\(\)/);
 assert.match(admin,/printBatch\.clear\(\)/);
 assert.match(admin,/legacyAudit\.clear\(\)/);
 assert.match(admin,/\$\("reportView"\)\.hidden=true/);
});
test("la recuperación asíncrona no restablece un documento tras cambiar de usuario",()=>{
 const admin=read("src/admin.mjs");
 const block=admin.slice(admin.indexOf("async function loadImport("),admin.indexOf("function renderDraft(",admin.indexOf("async function loadImport(")));
 assert.match(block,/const session=getUser\(\)\?\.id/);
 assert.match(block,/if\(getUser\(\)\?\.id!==session\)return/);
 const incidents=admin.slice(admin.indexOf("async function refreshIncidents("),admin.indexOf("async function open()",admin.indexOf("async function refreshIncidents(")));
 assert.match(incidents,/if\(getUser\(\)\?\.id!==session\)return/);
});
test("los módulos invalidan solicitudes y eliminan datos confidenciales al limpiar",()=>{
 for(const path of ["src/admin-revisions.mjs","src/admin-stats.mjs","src/admin-print-batch.mjs","src/admin-legacy.mjs"]){
  const s=read(path);
  assert.match(s,/clear:/);
 }
 assert.match(read("src/admin-revisions.mjs"),/requestId\+\+;requestedUser=null/);
 assert.match(read("src/admin-print-batch.mjs"),/seq\+\+;reset\(\)/);
});
