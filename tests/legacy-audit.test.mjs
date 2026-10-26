import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditarCopiaCargas} from "../src/legacy-audit.mjs";
const wrapper=loads=>({format:"control-cargas-backup",version:"0.5.15",created:"2026-10-25T09:00:00Z",loads,operators:["Operario de prueba"]});
const row=(id,extras={})=>({id,date:"2026-10-25",status:"Finalizada",verified:true,pdfHash:"a".repeat(64),started:"2026-10-25T07:00:00Z",finished:"2026-10-25T08:00:00Z",...extras});
test("la copia original se analiza sin modificar sus datos",()=>{
 const data=wrapper([row("LP26-11111"),row("LP26-22222",{status:"Pendiente"})]);
 const original=JSON.stringify(data),result=auditarCopiaCargas(data);
 assert.equal(JSON.stringify(data),original);
 assert.equal(result.total,2);assert.equal(result.operarios,1);
 assert.equal(result.estados.Finalizada,1);assert.equal(result.estados.Pendiente,1);
 assert.equal(result.duplicatedCodes.length,0);
 assert.match(result.advertenciaPdf,/no incluye los PDF originales/);
});
test("detecta duplicados de carga, hashes cruzados e información incompleta",()=>{
 const hash="b".repeat(64);
 const copy=wrapper([
  row("LP26-11111",{pdfHash:hash}),
  row("LP26-11111",{date:"",verified:false,started:"",finished:"",pdfHash:"",status:"Pendiente"}),
  row("LP26-22222",{pdfHash:hash,finished:""})
 ]);
 const r=auditarCopiaCargas(JSON.stringify(copy));
 assert.deepEqual(r.duplicatedCodes,[{codigo:"LP26-11111",ocurrencias:2}]);
 assert.equal(r.crossHashes.length,1);
 assert.deepEqual(r.crossHashes[0].codigos,["LP26-11111","LP26-22222"]);
 assert.equal(r.missingDate,1);
 assert.equal(r.unverified,1);
 assert.equal(r.missingHash,1);
 assert.equal(r.incompleteTimes,1);
});
test("rechaza contenido incompatible y copias excesivas",()=>{
 assert.throws(()=>auditarCopiaCargas("{}"),/formato original/);
 assert.throws(()=>auditarCopiaCargas("{no"),SyntaxError);
 assert.throws(()=>auditarCopiaCargas({...wrapper([]),operators:null}),/formato original/);
 assert.throws(()=>auditarCopiaCargas(wrapper(new Array(50001).fill(null))),/límite/);
});
test("controla estados de origen no confiables y filas malformadas",()=>{
 const r=auditarCopiaCargas(wrapper([row("LP26-11111",{status:"__proto__"}),null,{}]));
 assert.equal(Object.getPrototypeOf(r.estados),null);
 assert.equal(r.estados["__proto__"],1);
 assert.equal(r.unknownRows,1);
 assert.ok(r.invalidCode>=1);
});
test("el análisis es local: no debe subir copias ni restaurar almacenamiento",()=>{
 const ui=readFileSync(new URL("../src/admin-legacy.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(ui,/await file\.text\(\)/);
 assert.match(ui,/auditarCopiaCargas\(/);
 assert.doesNotMatch(ui,/\.rpc\(|\.from\(|\.upload\(|localStorage|indexedDB|fetch\(/);
 assert.doesNotMatch(html,/id="legacyAuditPanel"/);
 assert.doesNotMatch(html,/id="legacyBackupFile"/);
});
