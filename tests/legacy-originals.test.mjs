import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {clasificarClaveOriginal,resumirClavesOriginales,inventariarOriginalesLocales,recuperarPdfOriginalLocal} from "../src/legacy-originals.mjs";
import {webcrypto} from "node:crypto";

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

function fakeReadOnlyDatabase(file){
  const modes=[],keys=[],dbName=[];
  let closed=0;
  const idb={open(name){
    dbName.push(name);
    const open={};
    queueMicrotask(()=>{
      open.result={
        objectStoreNames:{contains:name=>name==="originales"},
        close(){closed++;},
        transaction(name,mode){
          modes.push(mode);
          const tx={
            objectStore(store){
              assert.equal(store,"originales");
              return {get(key){
                keys.push(key);
                const read={};
                queueMicrotask(()=>{
                  read.result=file;
                  read.onsuccess();
                  queueMicrotask(()=>tx.oncomplete());
                });
                return read;
              }};
            }
          };
          return tx;
        }
      };
      open.onsuccess();
    });
    return open;
  }};
  return {idb,modes,keys,dbName,getClosed:()=>closed};
}
test("recupera un original PDF sin escribir en IndexedDB y valida SHA-256",async()=>{
 const blob=new Blob(["%PDF-1.4\nArchivo inventado de prueba"],{type:"application/pdf"});
 const hash=[...new Uint8Array(await webcrypto.subtle.digest("SHA-256",await blob.arrayBuffer()))]
   .map(x=>x.toString(16).padStart(2,"0")).join("");
 const mocked=fakeReadOnlyDatabase(blob);
 const result=await recuperarPdfOriginalLocal("LP26-12345::"+hash,mocked.idb,webcrypto);
 assert.strictEqual(result.blob,blob);
 assert.equal(result.hash,hash);
 assert.equal(result.codigo,"LP26-12345");
 assert.deepEqual(mocked.modes,["readonly"]);
 assert.deepEqual(mocked.dbName,["control_cargas_movil_originales"]);
 assert.equal(mocked.getClosed(),1);
});
test("una revisión con PDF distinto a su SHA-256 no puede descargarse",async()=>{
 const blob=new Blob(["%PDF-1.4\ncontenido modificado"],{type:"application/pdf"});
 const mocked=fakeReadOnlyDatabase(blob);
 await assert.rejects(
   recuperarPdfOriginalLocal("LP26-12345::"+"f".repeat(64),mocked.idb,webcrypto),
   /huella SHA-256 no coincide/
 );
 assert.deepEqual(mocked.modes,["readonly"]);
});
test("rechaza una clave inválida y archivos que no son PDF",async()=>{
 await assert.rejects(recuperarPdfOriginalLocal("../secret",null,webcrypto),/Clave de PDF no válida/);
 const mocked=fakeReadOnlyDatabase(new Blob(["No es PDF"],{type:"application/pdf"}));
 await assert.rejects(recuperarPdfOriginalLocal("LP26-12345",mocked.idb,webcrypto),/cabecera PDF/);
});
test("la recuperación solo se inicia desde botón y nunca sube PDF",()=>{
 const view=readFileSync(new URL("../src/admin-originals.mjs",import.meta.url),"utf8");
 const source=readFileSync(new URL("../src/legacy-originals.mjs",import.meta.url),"utf8");
 assert.match(view,/download\.addEventListener\("click",async\(\)=>\{/);
 assert.match(view,/URL\.createObjectURL\(file\.blob\)/);
 assert.match(view,/file\.hash\.slice\(0,12\)/);
 assert.match(source,/db\.transaction\(STORE,"readonly"\)/);
 assert.doesNotMatch(source,/\.put\(|\.delete\(|\.clear\(|"readwrite"/);
 assert.doesNotMatch(view,/\.upload\(|\.upsert\(|\.rpc\(|fetch\(/);
});

test("inventario real simulado de IndexedDB enumera claves con transacción readonly",async()=>{
  const keys=["LP26-12345","LP26-12345::"+"a".repeat(64),"clave desconocida"];
  const modes=[];let closed=false;
  const fake={open(){
    const request={};
    queueMicrotask(()=>{
      request.result={
        objectStoreNames:{contains:name=>name==="originales"},
        close(){closed=true;},
        transaction(name,mode){
          assert.equal(name,"originales");modes.push(mode);
          const tx={
            objectStore(){
              return {openKeyCursor(){
                const req={};let index=0;
                const next=()=>queueMicrotask(()=>{
                  if(index>=keys.length){
                    req.result=null;req.onsuccess();
                    queueMicrotask(()=>tx.oncomplete());
                  }else{
                    req.result={key:keys[index++],continue:next};
                    req.onsuccess();
                  }
                });
                next();return req;
              }};
            }
          };
          return tx;
        }
      };
      request.onsuccess();
    });return request;
  }};
  const result=await inventariarOriginalesLocales(fake);
  assert.equal(result.disponible,true);assert.equal(result.cantidad,3);
  assert.equal(result.vigentes,1);assert.equal(result.versiones,1);
  assert.equal(result.desconocidas,1);
  assert.deepEqual(result.claves.map(item=>item.tipo),["vigente","version"]);
  assert.deepEqual(modes,["readonly"]);assert.equal(closed,true);
});
