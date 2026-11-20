import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validarOriginalCompartidoR7,seleccionarCargasSinGenerarR7} from "../src/visura-r7-shared-import.mjs";
const path=(id,hash="a".repeat(64))=>"documentos/"+id+"/"+hash+".pdf";
const row=(id,fields={})=>({codigo:id,estado:"publicada",almacen:"COR_01_COR",documento_ruta:path(id),...fields});
const code=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("el adaptador no escribe en Supabase y conserva el importador nativo R7",()=>{
 const a=code("src/visura-r7-shared-import.mjs"),admin=code("src/admin.mjs"),html=code("index.html");
 assert.match(a,/kontrola_panel_cargas_impresion/);
 assert.match(a,/kontrola_estado_impresion/);
 assert.match(a,/client\.storage\.from\(bucket\)\.download/);
 assert.match(a,/DataTransfer/);
 assert.match(a,/input\.dispatchEvent\(new Event\("change"/);
 assert.doesNotMatch(a,/kontrola_registrar_lote_impresion|\.upload\(|\.insert\(|\.update\(|\.delete\(/);
 assert.match(admin,/crearImportadorCompartidoR7/);
 assert.match(html,/id="visuraR7SharedList"/);
 assert.match(html,/id="visuraR7SharedImport"/);
 assert.match(html,/id="visuraR7IncludeGenerated"/);
});
test("admite exclusivamente el original de LP publicada y COR1",()=>{
 const source=row("LP26-12345");
 assert.deepEqual(validarOriginalCompartidoR7(source,"COR_01_COR"),{
 codigo:"LP26-12345",path:source.documento_ruta,hash:"a".repeat(64)});
 assert.throws(()=>validarOriginalCompartidoR7(source,"COR_02_NAR"),/COR1/);
 assert.throws(()=>validarOriginalCompartidoR7({...source,estado:"revisada"},"COR_01_COR"),/publicada/);
 assert.throws(()=>validarOriginalCompartidoR7({...source,almacen:"COR_02_NAR"},"COR_01_COR"),/COR1/);
});
test("rechaza rutas desviadas o no verificables",()=>{
 const source=row("LP26-12345");
 for(const bad of ["../secretos.pdf","documentos/LP26-99999/"+"a".repeat(64)+".pdf",
  "documentos/LP26-12345/"+"g".repeat(64)+".pdf",
  "documentos/LP26-12345/"+"a".repeat(63)+".pdf",
  "documentos/LP26-12345/"+"a".repeat(64)+".txt"]){
  assert.throws(()=>validarOriginalCompartidoR7({...source,documento_ruta:bad},"COR_01_COR"),/ruta/);
 }
});
test("selección incremental de 5 LP, excluyendo listados ya generados",()=>{
 const rows=Array.from({length:9},(_,i)=>row("LP26-"+String(i).padStart(5,"0")));
 const counts=new Map([["LP26-00001",1],["LP26-00002",2],["LP26-00007",1]]);
 assert.deepEqual(seleccionarCargasSinGenerarR7(rows,counts),[
  "LP26-00000","LP26-00003","LP26-00004","LP26-00005","LP26-00006"]);
 assert.deepEqual(seleccionarCargasSinGenerarR7(rows,counts,{incluirGeneradas:true,max:2}),[
  "LP26-00000","LP26-00001"]);
});
test("documentos con códigos repetidos se seleccionan una sola vez",()=>{
 const rows=[row("LP26-00001"),row("LP26-00001"),row("LP26-00002")];
 assert.deepEqual(seleccionarCargasSinGenerarR7(rows,new Map()),["LP26-00001","LP26-00002"]);
});
test("la descarga valida huella SHA256, controla sesión y no confirma impresión física",()=>{
 const s=code("src/visura-r7-shared-import.mjs");
 assert.match(s,/crypto\.subtle\.digest\("SHA-256",await file\.arrayBuffer\(\)\)/);
 assert.match(s,/if\(hash!==origin\.hash\)/);
 assert.match(s,/getUser\(\)\?\.id/);
 assert.match(s,/frame\.dataset\.scope!==expectedScope/);
 assert.match(s,/frame\.contentWindow\?\.location\.search/);
 assert.match(s,/MAX_BATCH_BYTES=40\*1024\*1024/);
 assert.match(s,/Revalidar EN SERVIDOR justo antes de descargar/);
 assert.doesNotMatch(s,/session\.access_token|service_role|apikey/);
});
