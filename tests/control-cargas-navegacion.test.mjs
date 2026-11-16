import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Control de Cargas no abre PRUEBA_3 ni altera Operaciones",()=>{
 const app=read("src/app.mjs"),html=read("index.html");
 assert.ok(app.includes('$("openReview").addEventListener("click",()=>{void openChecklist();});'));
 assert.ok(app.includes('$("preparacionPrueba3").addEventListener("click",()=>{void openPrueba3Cargas();});'));
 assert.ok(app.includes('$("openCargas").addEventListener("click",()=>{void openPrueba3Cargas();});'));
 for(const id of ["preparacionPrueba3","controlChecklistView","controlChecklistRoot","backFromChecklist"])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});
test("el cierre de sesión elimina la vista anterior y preserva datos persistidos",()=>{
 const app=read("src/app.mjs");
 assert.ok(app.includes("checklistUi?.clear?.();checklistUi=null;"));
 assert.ok(!app.includes('localStorage.removeItem("visura_control_revision_v1"'));
});
test("los módulos nuevos forman parte de la precarga PWA",()=>{
 const sw=read("sw.js");
 assert.ok(sw.includes('"./src/control-cargas-checklist.mjs"'));
 assert.ok(sw.includes('"./src/control-cargas-checklist-ui.mjs"'));
});
