import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {reconciliarGeneracionesR7} from "../src/visura-r7-reconcile.mjs";
const hash=c=>c.repeat(64);
const row=(code,date,digest)=>({
 codigo:code,estado:"publicada",almacen:"COR_01_COR",
 documento_ruta:"documentos/"+code+"/"+hash(digest)+".pdf",fecha:date
});
const generated=(code,digest)=>({id:code,pdfHash:hash(digest),
 listadoGeneradoAt:"2026-11-21T08:35:00.000Z",listadoGeneradoHash:hash(digest)});
const current=[row("LP26-00001","2026-11-21","a"),row("LP26-00002","2026-11-20","b"),row("LP26-00003","2026-11-21","c")];
const reconcile=(localJSON,impresiones=new Map(),compartidas=current)=>
  reconciliarGeneracionesR7({localJSON:JSON.stringify(localJSON),compartidas,impresiones,hoy:"2026-11-21"});

test("R7 con PDF idéntico y sin historial servidor es un pendiente, no una escritura",()=>{
 const x=reconcile([generated("LP26-00001","a")]);
 assert.equal(x.counts.pendientes,1);
 assert.equal(x.escrituraAutorizada,false);
 assert.equal(x.items.find(i=>i.codigo==="LP26-00001").estado,"pendientes");
});

test("fecha BC anterior a hoy bloquea registro con RPC actual",()=>{
 const x=reconcile([generated("LP26-00002","b")]);
 assert.equal(x.counts.bloqueoFecha,1);
 assert.equal(x.counts.pendientes,0);
});

test("impresión compartida SIN hash no se certifica como misma versión",()=>{
 const x=reconcile([generated("LP26-00001","a")],new Map([["LP26-00001",3]]));
 assert.equal(x.counts.servidorSinHash,1);
 assert.equal(x.counts.pendientes,0);
 assert.equal(x.escrituraAutorizada,false);
});

test("reemplazo de PDF o marca local invalidada impide conciliación positiva",()=>{
 const replaced=reconcile([generated("LP26-00001","d")]);
 assert.equal(replaced.counts.revisionDistinta,1);
 const incorrect=[{...generated("LP26-00001","a"),listadoGeneradoHash:hash("f")}];
 assert.equal(reconcile(incorrect).counts.localInvalidado,1);
});

test("registro solo en servidor y carga local sin PDF generan estados diferenciados",()=>{
 const remoteOnly=reconcile([],new Map([["LP26-00003",2]]));
 assert.equal(remoteOnly.counts.soloServidor,1);
 assert.equal(remoteOnly.counts.pendienteImportar,2);
});

test("rechaza JSON, LP, hashes y contadores ambiguos",()=>{
 assert.throws(()=>reconciliarGeneracionesR7({
   localJSON:"{",compartidas:current,impresiones:new Map(),hoy:"2026-11-21"}),/ilegible/);
 assert.throws(()=>reconcile([generated("LP26-00001","a"),generated("LP26-00001","a")]),/duplicados/);
 assert.throws(()=>reconcile([generated("LP26-00001","a")],new Map([["LP26-00001",-1]])),/Contador/);
 assert.throws(()=>reconcile([],new Map(),[current[0],current[0]]),/duplicada/);
});

test("controlador solo lee Supabase y localStorage; nunca registra listados",()=>{
 const module=readFileSync(new URL("../src/visura-r7-shared-import.mjs",import.meta.url),"utf8");
 const reconciliation=readFileSync(new URL("../src/visura-r7-reconcile.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(module,/reconciliarGeneracionesR7/);
 assert.match(module,/window\.localStorage\.getItem/);
 assert.match(module,/visuraR7Compare/);
 assert.match(module,/kontrola_panel_cargas_impresion/);
 assert.match(module,/kontrola_estado_impresion/);
 assert.doesNotMatch(module,/client\.rpc\("kontrola_registrar_lote_impresion"/);
 assert.doesNotMatch(reconciliation,/\.insert\(|\.update\(|\.upload\(/);
 assert.match(html,/id="visuraR7CompareStatus"/);
 assert.match(html,/id="visuraR7CompareList"/);
});
