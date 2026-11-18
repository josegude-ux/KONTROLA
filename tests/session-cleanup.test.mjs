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
 assert.doesNotMatch(admin,/configurarAuditoriaLegacy|legacyAudit|configurarConciliacionLegacy/);
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
 for(const path of ["src/admin-revisions.mjs","src/admin-stats.mjs","src/admin-print-batch.mjs"]){
  const s=read(path);
  assert.match(s,/clear:/);
 }
 assert.match(read("src/admin-revisions.mjs"),/requestId\+\+;requestedUser=null/);
 assert.match(read("src/admin-print-batch.mjs"),/seq\+\+;reset\(\)/);
});

test("salir del usuario purga datos ocultos y contraseñas retenidas",()=>{
 const app=read("src/app.mjs"),begin=app.indexOf("function loggedOut(message="),end=app.indexOf("async function authorize(",begin);
 assert.ok(begin>0&&end>begin);
 const block=app.slice(begin,end);
 for(const id of ["operatorSummary","operatorActivity","historyList","historySummary",
  "detailTitle","productList","verificationLines","reviewDetailTitle","reportPaper","globalMessage"]){
  assert.ok(block.includes('"'+id+'"'),"No se vacía "+id);
 }
 assert.match(block,/\$\("loginPassword"\)\.value=""/);
 assert.match(block,/\$\("historyPrint"\)\.disabled=true/);
});
test("un error al cerrar sesión nunca comunica al usuario que el cierre fue correcto",()=>{
 const app=read("src/app.mjs");
 const body=app.slice(app.indexOf('$("logout").addEventListener('));
 assert.match(body,/const \{error\}=await client\.auth\.signOut\(\)/);
 assert.match(body,/if\(error\)throw error/);
 assert.match(body,/No se pudo cerrar la sesión en el servidor/);
 assert.doesNotMatch(body,/signOut\(\)\.catch/);
});
