import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {reconciliarGeneracionesR7} from "../src/visura-r7-reconcile.mjs";
import {prepararSincronizacionR7} from "../src/visura-r7-sync-preflight.mjs";

const LP="LP26-55001",HASH="a".repeat(64);
const local=[{id:LP,pdfHash:HASH,listadoGeneradoHash:HASH,listadoGeneradoAt:"2026-11-21T02:00:00Z"}];
const row={codigo:LP,almacen:"COR_01_COR",estado:"publicada",fecha:"2026-11-20",
 publicado_en:"2026-11-21T00:00:00Z",documento_ruta:`documentos/${LP}/${HASH}.pdf`};
const check=(versionados,attempts=1)=>reconciliarGeneracionesR7({
 localJSON:JSON.stringify(local),compartidas:[row],impresiones:new Map([[LP,attempts]]),
 versionados,hoy:"2026-11-21"
});

test("la nueva RPC puede acreditar misma versión sin duplicar estado",()=>{
 const v=check(new Map([[LP,{documento_hash:HASH,generaciones:1}]]));
 assert.equal(v.counts.sincronizados,1);
 assert.equal(v.counts.servidorSinHash,0);
 assert.equal(v.counts.pendientes,0);
 assert.equal(v.escrituraAutorizada,false);
});
test("la función heredada sin huella sigue siendo ambigua",()=>{
 const v=check(null);
 assert.equal(v.counts.sincronizados,0);
 assert.equal(v.counts.servidorSinHash,1);
});
test("la nueva RPC con hash distinto NO confirma documento",()=>{
 const v=check(new Map([[LP,{documento_hash:"b".repeat(64),generaciones:1}]]));
 assert.equal(v.counts.sincronizados,0);
 assert.equal(v.counts.servidorSinHash,1);
});
test("generaciones versionadas inconsistentes NO permiten falso positivo",()=>{
 const v=check(new Map([[LP,{documento_hash:HASH,generaciones:2}]]),1);
 assert.equal(v.counts.sincronizados,0);
 assert.equal(v.counts.servidorSinHash,1);
});
test("un historial versionado ya confirmado nunca entra en pendientes a registrar",()=>{
 const result=prepararSincronizacionR7({
   localJSON:JSON.stringify(local),compartidas:[row],impresiones:new Map([[LP,1]]),
   versionados:new Map([[LP,{documento_hash:HASH,generaciones:1}]]),hoy:"2026-11-21"
 });
 assert.equal(result.candidatos.length,0);
 assert.equal(result.audit.counts.sincronizados,1);
 assert.equal(result.escrituraHabilitada,false);
});
test("lectura versionada y escritura bloqueadas hasta homologación",()=>{
 const controller=readFileSync(new URL("../src/visura-r7-shared-import.mjs",import.meta.url),"utf8");
 const preflight=readFileSync(new URL("../src/visura-r7-sync-preflight.mjs",import.meta.url),"utf8");
 assert.match(controller,/CONSULTA_VERSIONADA_R7=false/);
 assert.match(controller,/kontrola_estado_generacion_r7/);
 assert.match(preflight,/ESCRITURA_R7_HABILITADA=false/);
 assert.doesNotMatch(controller,/client\.rpc\("kontrola_registrar_generacion_r7"/);
});
