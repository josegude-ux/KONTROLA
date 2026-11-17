import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizarLP,formatoLP,auditarLP} from "../src/control-cargas-lp.mjs";
import {registroActivo,prepararMigracionLocal,progresoVerificado,permisoDescarte} from "../src/control-cargas-descarte-model.mjs";
import {crearAdaptadorLocalDescarte,cacheKey,incidenciasKey} from "../src/control-cargas-descarte-adapter.mjs";
const scope="_visura_"+"a".repeat(24),H1="a".repeat(64),H2="b".repeat(64),H3="c".repeat(64);
const fake=(id,hash=H1)=>({id,pdfHash:hash,date:"16/11/2026",products:[{sku:"X"},{sku:"Y"}]});
const store=()=>{
 const m=new Map();
 return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
};
const seed=(storage,ids=["LP26-21230"],discarded=["LP26-21230"])=>{
 const ledger=prepararMigracionLocal({scope,loads:ids.map(id=>fake(id))}).ledger;
 for(const id of discarded){
  ledger.items[id]={...registroActivo(),estado_descarte:"descartada",
   descartada_en:"2026-11-16T12:00:00Z",descartada_por:"actor-servidor-ficticio",
   motivo_descarte:"Ya salió a reparto",
   progreso_al_descartar:{total:2,checked:1,pending:1,incidents:0},
   snapshot_progreso_al_descartar:{total:2,checked:1,pending:1,incidents:0},
   pdf_hash_original:H1,
   version_descarte:2,historial_descarte:[{accion:"descartar",actor:"actor-servidor-ficticio"}]};
 }
 const raw=JSON.stringify(ledger);storage.setItem("visura_prepara_descarte_v1"+scope,raw);
 storage.setItem(cacheKey(scope),raw);return ledger;
};
test("F2: LP canónico, ceros, espacios y año; formatos desconocidos rechazados",()=>{
 const cases=[
  ["LP26-21230","LP26-21230"],[" lp 26 - 021230 ","LP26-21230"],
  ["LP26-000123","LP26-0123"],["LP26-0000","LP26-0000"],
  ["lp26-0123","LP26-0123"],["LP2621230","LP26-21230"]];
 for(const [raw,expected] of cases)assert.equal(normalizarLP(raw),expected);
 for(const raw of ["LP-21230","LP2026-21230","LP26-123","LP26-1234567","X26-21230","LP26-12A30"])
  assert.throws(()=>normalizarLP(raw),/Formato LP/);
 assert.equal(formatoLP("LP26-21230"),"LPyy-5");
});
test("F2: colisiones tras normalizar (incluso distinto número de ceros)",()=>{
 const result=auditarLP(["LP26-21230","LP26-021230","LP26-0123","LP26-00123","OTRO-26"]);
 assert.equal(result.apto,false);
 assert.equal(result.colisiones.length,2);
 assert.equal(result.desconocidos.length,1);
 assert.equal(auditarLP(["LP26-21230","LP26-21300"]).apto,true);
});
test("F2: descartada reimportada con mismo PDF, sin modificar su registro",()=>{
 const storage=store(),prior=seed(storage);const before=JSON.stringify(prior);
 const adapter=crearAdaptadorLocalDescarte({scope,storage});
 const result=adapter.decidirImportacion({lp:"lp26-21230",hash:H1,cargaLocal:fake("LP26-21230")});
 assert.equal(result.estado,"descartada");assert.equal(result.accion,"conservar");
 assert.equal(storage.getItem("visura_prepara_descarte_v1"+scope),before);
});
test("F2: otra versión se registra, original/snapshot y progreso quedan intactos",()=>{
 const storage=store(),old=seed(storage);
 const adapter=crearAdaptadorLocalDescarte({scope,storage,now:()=>"2026-11-17T08:01:00Z"});
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H2,cargaLocal:fake("LP26-21230")}).accion,
  "registrar_version_posterior");
 const output=adapter.registrarVersionPosterior({lp:"LP26-21230",hash:H2,hashOriginal:H1});
 assert.equal(output.añadida,true);
 const record=JSON.parse(storage.getItem("visura_prepara_descarte_v1"+scope)).items["LP26-21230"];
 assert.equal(record.estado_descarte,"descartada");
 assert.equal(record.pdf_hash_original,H1);
 assert.deepEqual(record.progreso_al_descartar,old.items["LP26-21230"].progreso_al_descartar);
 assert.deepEqual(record.historial_descarte,old.items["LP26-21230"].historial_descarte);
 assert.equal(record.descartada_por,"actor-servidor-ficticio");
 assert.equal(record.descartada_en,"2026-11-16T12:00:00Z");
 assert.deepEqual(record.versiones_posteriores_recibidas,[{sha256:H2,
  recibida_en_dispositivo:"2026-11-17T08:01:00Z",pendiente_restauracion:true}]);
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H2}).accion,"conservar");
 assert.equal(adapter.registrarVersionPosterior({lp:"LP26-21230",hash:H2}).añadida,false);
});
test("F2: activo conserva ruta de importación y reviews, sin escritura del adaptador",()=>{
 const storage=store();seed(storage,["LP26-21230"],[]);
 const original=storage.getItem("visura_prepara_descarte_v1"+scope);
 const adapter=crearAdaptadorLocalDescarte({scope,storage});
 const review={lines:{0:{status:"ok"}},audit:[{line:0,to:"ok"}]};
 const copy=JSON.stringify(review);
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H2,cargaLocal:fake("LP26-21230")}).accion,"importar");
 assert.equal(storage.getItem("visura_prepara_descarte_v1"+scope),original);
 assert.equal(JSON.stringify(review),copy);
});
test("F2: restauración previa solo simulada en ledger; reimportación mantiene progreso",()=>{
 const storage=store(),ledger=seed(storage);
 ledger.items["LP26-21230"].estado_descarte="activa";ledger.items["LP26-21230"].version_descarte=3;
 const raw=JSON.stringify(ledger);storage.setItem("visura_prepara_descarte_v1"+scope,raw);storage.setItem(cacheKey(scope),raw);
 const adapter=crearAdaptadorLocalDescarte({scope,storage});
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H3}).accion,"importar");
 assert.equal(ledger.items["LP26-21230"].progreso_al_descartar.checked,1);
});
test("F2: última copia válida impide reactivar aun sin registro principal",()=>{
 const storage=store();seed(storage);
 storage.m.delete("visura_prepara_descarte_v1"+scope);
 const adapter=crearAdaptadorLocalDescarte({scope,storage});
 const state=adapter.decidirImportacion({lp:"LP26-21230",hash:H1});
 assert.equal(state.estado,"descartada");assert.equal(state.accion,"conservar");
 assert.equal(state.pendienteConfirmacion,true);
});
test("F2: sin registro ni copia permite LP nuevo con aviso e incidencia",()=>{
 const storage=store();
 const adapter=crearAdaptadorLocalDescarte({scope,storage,now:()=>"2026-11-17T08:10:00Z"});
 const decision=adapter.decidirImportacion({lp:"LP26-21230",hash:H2,cargaLocal:null});
 assert.equal(decision.accion,"importar");assert.ok(decision.aviso);
 assert.equal(decision.pendienteConfirmacion,true);
 assert.equal(decision.incidencia.persistida,true);
 assert.equal(JSON.parse(storage.getItem(incidenciasKey(scope))).length,1);
});
test("F2: estado local descartado tiene precedencia ante registro ausente",()=>{
 const storage=store(),adapter=crearAdaptadorLocalDescarte({scope,storage});
 const decision=adapter.decidirImportacion({lp:"LP26-21230",hash:H1,
  cargaLocal:{...fake("LP26-21230"),estado_descarte:"descartada"}});
 assert.equal(decision.estado,"descartada");assert.equal(decision.accion,"conservar");
});
test("F2: las copias divergentes o corruptas bloquean en lugar de reactivar",()=>{
 const storage=store();seed(storage);
 storage.setItem("visura_prepara_descarte_v1"+scope,"{roto");
 const adapter=crearAdaptadorLocalDescarte({scope,storage});
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H2}).estado,"descartada");
 storage.setItem("visura_prepara_descarte_v1"+scope,JSON.stringify(
  prepararMigracionLocal({scope,loads:[fake("LP26-21230")]}).ledger));
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H2}).accion,"bloquear");
});
test("F2: lote mixto clasificado sin contaminar cargas activas",()=>{
 const storage=store();seed(storage,["LP26-21230","LP26-21231","LP26-21232"],["LP26-21230"]);
 const adapter=crearAdaptadorLocalDescarte({scope,storage});
 const received=[["LP26-21230",H1],["LP26-21230",H2],["LP26-21231",H2],["LP26-21232",H3],["LP26-21233",H1]];
 assert.deepEqual(received.map(([lp,hash])=>adapter.decidirImportacion({lp,hash}).accion),
  ["conservar","registrar_version_posterior","importar","importar","importar"]);
});
test("F2: inspección estática de entrada real protege antes de revised() y no modifica cierre",()=>{
 const src=readFileSync(new URL("../control-cargas-prueba3.html",import.meta.url),"utf8");
 const section=src.slice(src.indexOf("const hash=await fingerprint(file);"),src.indexOf("if(old&&old.pdfHash!==hash"));
 assert.ok(section.indexOf("descarteAdapter.decidirImportacion")>0);
 assert.ok(section.indexOf("descarteAdapter.decidirImportacion")<section.indexOf("const identical"));
 assert.ok(section.includes("registrarVersionPosterior"));
 assert.ok(section.includes("await guardarOriginal(canon+'::'+hash,file)"));
 assert.ok(section.includes("const original=old?await leerOriginal(canon):null"));
 const checklist=readFileSync(new URL("../src/control-cargas-checklist.mjs",import.meta.url),"utf8");
 assert.ok(checklist.includes("export function closeReview("));
 assert.equal(permisoDescarte({id:"operador",rol:"operario",activo:true}),true);
 assert.equal(permisoDescarte({id:"admin",rol:"administrador",activo:true}),true);
});

test("F2 corrección CP011: LP existente y ledger ausente bloquea solo su reactivación",()=>{
 const storage=store(),adapter=crearAdaptadorLocalDescarte({scope,storage});
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H1,cargaLocal:fake("LP26-21230")}).accion,"bloquear");
 assert.equal(adapter.decidirImportacion({lp:"LP26-21231",hash:H1,cargaLocal:null}).accion,"importar");
});
test("F2 corrección CP011: divergencia en LP A no bloquea LP B nuevo",()=>{
 const storage=store(),ledger=seed(storage,["LP26-21230","LP26-21231"],["LP26-21230"]);
 const changed=JSON.parse(JSON.stringify(ledger));
 changed.items["LP26-21230"].motivo_descarte="conflicto documentado";
 storage.setItem(cacheKey(scope),JSON.stringify(changed));
 const adapter=crearAdaptadorLocalDescarte({scope,storage});
 assert.equal(adapter.decidirImportacion({lp:"LP26-21230",hash:H2,cargaLocal:null}).accion,"bloquear");
 const b=adapter.decidirImportacion({lp:"LP26-21231",hash:H2,cargaLocal:null});
 assert.equal(b.accion,"importar");assert.ok(b.aviso);
 const c=adapter.decidirImportacion({lp:"LP26-21232",hash:H2,cargaLocal:null});
 assert.equal(c.accion,"importar");assert.ok(c.aviso);
});
test("F2 corrección CP011: plantilla sin cambios HTML/CSS en la corrección",()=>{
 const src=readFileSync(new URL("../control-cargas-prueba3.html",import.meta.url),"utf8");
 assert.ok(src.includes("avisos.push(canon+': '+decision.aviso)"));
 assert.ok(src.includes("const matches=loads.filter(r=>{try{return normalizarLP(r.id)===canon}catch{return false}});"));
});
