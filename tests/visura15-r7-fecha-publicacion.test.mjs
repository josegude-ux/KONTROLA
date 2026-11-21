import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {prepararSincronizacionR7} from "../src/visura-r7-sync-preflight.mjs";

const CODE="LP26-01234",HASH="f".repeat(64),HOY="2026-11-21";
const local=(date="2026-11-21T01:30:00.000Z")=>({
  id:CODE,pdfHash:HASH,listadoGeneradoHash:HASH,listadoGeneradoAt:date
});
const remote=(fechaBC,publicadoEn)=>({
  codigo:CODE,fecha:fechaBC,publicado_en:publicadoEn,estado:"publicada",
  almacen:"COR_01_COR",documento_ruta:`documentos/${CODE}/${HASH}.pdf`
});
function plan({bc="2026-11-20",pub="2026-11-21T00:00:00Z",localTs="2026-11-21T01:30:00.000Z"}={}){
 return prepararSincronizacionR7({
   localJSON:JSON.stringify([local(localTs)]),
   compartidas:[remote(bc,pub)],impresiones:new Map(),hoy:HOY
 });
}
test("BC con fecha anterior, pero LP publicada hoy: candidata R7",()=>{
 const p=plan();assert.equal(p.candidatos.length,1);
 assert.equal(p.audit.counts.bloqueoFecha,0);
 assert.equal(p.escrituraHabilitada,false);
});
test("LP publicada ayer, aunque la fecha BC sea hoy: bloqueada",()=>{
 const p=plan({bc:HOY,pub:"2026-11-20T08:00:00Z"});
 assert.equal(p.candidatos.length,0);
 assert.equal(p.audit.counts.bloqueoFecha,1);
});
test("cambio de día a las 23:30 UTC equivale al día siguiente en España",()=>{
 const p=plan({pub:"2026-11-20T23:30:00Z"});
 assert.equal(p.candidatos.length,1);
});
test("una marca local anterior a la publicación no acredita registro",()=>{
 const p=plan({pub:"2026-11-21T10:00:00Z",localTs:"2026-11-21T00:00:00Z"});
 assert.equal(p.candidatos.length,0);
 assert.equal(p.audit.counts.localInvalidado,1);
});
test("sin publicado_en acreditado nunca prepara registro automático",()=>{
 const p=plan({pub:null});
 assert.equal(p.candidatos.length,0);
 assert.equal(p.audit.counts.bloqueoFecha,1);
});
test("SQL de LAB sigue sin aplicarse y verifica publicación madrileña",()=>{
 const sql=readFileSync(new URL(
  "../docs/sql/PROPUESTA-LAB-REGISTRO-IDEMPOTENTE-R7-20261121.sql",
  import.meta.url),"utf8");
 assert.match(sql,/SQL NO APLICADO/);
 assert.match(sql,/v_carga\.publicado_en at time zone 'Europe\/Madrid'/);
 assert.match(sql,/v_carga\.documento_hash <> p_documento_hash/);
 assert.match(sql,/p_local_generado_en < v_carga\.publicado_en/);
 assert.match(sql,/get diagnostics v_insertadas = row_count/);
 assert.match(sql,/resultado:='YA_REGISTRADO'/);
 assert.match(sql,/from public,anon,authenticated/);
});
