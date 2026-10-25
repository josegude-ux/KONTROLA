import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {clasificarClaveOriginal,resumirClavesOriginales,inventariarOriginalesLocales} from "../src/legacy-originals.mjs";

const hash="a".repeat(64);
test("distingue claves vigentes y revisiones del IndexedDB original",()=>{
  assert.deepEqual(clasificarClaveOriginal("LP26-12345"),{tipo:"vigente",codigo:"LP26-12345"});
  assert.deepEqual(clasificarClaveOriginal("LP26-12345::"+hash),{
    tipo:"version",codigo:"LP26-12345",huellaEnClave:hash
  });
  assert.equal(clasificarClaveOriginal("LP26-12345::abc").tipo,"desconocida");
  assert.equal(clasificarClaveOriginal(["LP26-12345"]).tipo,"desconocida");
});
test("cuenta revisiones sin interpretar una clave como validación del PDF",()=>{
  const inv=resumirClavesOriginales([
    "LP26-12345","LP26-12345::"+hash,"LP26-12345::"+"b".repeat(64),
    "LP26-22222::"+hash,"no-reconocida"
  ]);
  assert.equal(inv.total,5);assert.equal(inv.vigentes,1);
  assert.equal(inv.versiones,3);assert.equal(inv.desconocidas,1);
  assert.deepEqual(inv.porCarga,[
    {codigo:"LP26-12345",vigente:true,versiones:2},
    {codigo:"LP26-22222",vigente:false,versiones:1}
  ]);
});
test("sin IndexedDB devuelve ausencia de acceso sin declarar pérdida de datos",async()=>{
  const result=await inventariarOriginalesLocales(null);
  assert.equal(result.disponible,false);
  assert.match(result.razon,/navegador/);
});
test("si la base local no existe cancela su creación y no escribe nada",async()=>{
  let aborted=false,request;
  const fake={open(name){
    assert.equal(name,"control_cargas_movil_originales");
    request={transaction:{abort(){aborted=true;}}};
    queueMicrotask(()=>{
      request.onupgradeneeded();
      request.onerror();
    });
    return request;
  }};
  const inv=await inventariarOriginalesLocales(fake);
  assert.equal(aborted,true);assert.equal(inv.disponible,false);
  assert.match(inv.razon,/No existe/);
});
test("usa SOLO una transacción de lectura y un cursor de claves",()=>{
  const source=readFileSync(new URL("../src/legacy-originals.mjs",import.meta.url),"utf8");
  const view=readFileSync(new URL("../src/admin-originals.mjs",import.meta.url),"utf8");
  const admin=readFileSync(new URL("../src/admin.mjs",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(source,/db\.transaction\(STORE,"readonly"\)/);
  assert.match(source,/\.openKeyCursor\(\)/);
  assert.match(source,/onupgradeneeded=\(\)=>\{/);
  assert.match(source,/request\.transaction\?\.abort\(\)/);
  assert.doesNotMatch(source,/\.put\(|\.delete\(|\.clear\(|"readwrite"/);
  assert.doesNotMatch(view,/\.rpc\(|\.upload\(|\.from\(|fetch\(/);
  assert.match(view,/active!==current\|\|getUser\(\)\?\.id!==session/);
  assert.match(admin,/legacyOriginals\.clear\(\)/);
  assert.match(html,/id="legacyOriginalsScan"/);
});
