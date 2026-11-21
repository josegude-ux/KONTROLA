import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {prepararSincronizacionR7,ESCRITURA_R7_HABILITADA,MAX_PLAN_R7}
 from "../src/visura-r7-sync-preflight.mjs";
const hash=c=>c.repeat(64);
const rem=(n,day,h)=>({codigo:n,almacen:"COR_01_COR",estado:"publicada",
 fecha:day,publicado_en:day+"T00:00:00Z",documento_ruta:"documentos/"+n+"/"+hash(h)+".pdf"});
const loc=(n,h,datetime="2026-11-21T02:01:00.000Z")=>({id:n,pdfHash:hash(h),
 listadoGeneradoHash:hash(h),listadoGeneradoAt:datetime});
const params=(local,remote,counts=new Map())=>({localJSON:JSON.stringify(local),
 compartidas:remote,impresiones:counts,hoy:"2026-11-21"});

test("preflight prepara una LP completa pero NUNCA habilita registro",()=>{
 const result=prepararSincronizacionR7(params(
  [loc("LP26-12345","a")],[rem("LP26-12345","2026-11-21","a")]));
 assert.equal(ESCRITURA_R7_HABILITADA,false);
 assert.equal(result.escrituraHabilitada,false);
 assert.equal(result.estado,"PLAN_SIN_EJECUCION");
 assert.equal(result.rpcPrevista,"kontrola_registrar_generacion_r7");
 assert.deepEqual(result.candidatos,[{
  p_almacen:"COR_01_COR",p_codigo:"LP26-12345",p_documento_hash:hash("a"),
  p_local_generado_en:"2026-11-21T02:01:00.000Z"
 }]);
});

test("publicación anterior, marca vieja o historial sin hash no se preparan",()=>{
 const unknown=prepararSincronizacionR7(params(
  [loc("LP26-12345","a")],[rem("LP26-12345","2026-11-20","a")]));
 assert.equal(unknown.candidatos.length,0);
 assert.equal(unknown.audit.counts.bloqueoFecha,1);
 const backdated=prepararSincronizacionR7(params(
  [loc("LP26-12345","a")],[{...rem("LP26-12345","2026-11-20","a"),publicado_en:"2026-11-21T00:00:00Z"}]));
 assert.equal(backdated.candidatos.length,1);
 const older=prepararSincronizacionR7(params(
  [loc("LP26-12345","b")],[rem("LP26-12345","2026-11-21","a")]));
 assert.equal(older.candidatos.length,0);
 assert.equal(older.audit.counts.revisionDistinta,1);
 const already=prepararSincronizacionR7(params(
  [loc("LP26-12345","a")],[rem("LP26-12345","2026-11-21","a")],
  new Map([["LP26-12345",2]])));
 assert.equal(already.candidatos.length,0);
 assert.equal(already.audit.counts.servidorSinHash,1);
});

test("preflight limita cada lote a cinco LP diferentes",()=>{
 const arr=Array.from({length:9},(_,i)=>"LP26-"+String(i).padStart(5,"0"));
 const result=prepararSincronizacionR7(params(
  arr.map(id=>loc(id,"c")),arr.map(id=>rem(id,"2026-11-21","c"))));
 assert.equal(MAX_PLAN_R7,5);
 assert.equal(result.candidatos.length,5);
 assert.equal(result.pendientesExtra,4);
 assert.equal(new Set(result.candidatos.map(c=>c.p_codigo)).size,5);
});

test("SQL propuesta NO aplicada: agrega hash solo al historial existente y RPC idempotente",()=>{
 const sql=readFileSync(new URL(
  "../docs/sql/PROPUESTA-LAB-REGISTRO-IDEMPOTENTE-R7-20261121.sql",import.meta.url),"utf8");
 assert.match(sql,/NO APLICADO/);
 assert.match(sql,/alter table public\.kontrola_impresiones/);
 assert.doesNotMatch(sql,/create table/);
 assert.match(sql,/kontrola_impresiones_r7_codigo_hash_uidx/);
 assert.match(sql,/for update/);
 assert.match(sql,/documento_hash <> p_documento_hash/);
 assert.match(sql,/resultado:='YA_REGISTRADO'/);
 assert.match(sql,/v_carga\.publicado_en at time zone 'Europe\/Madrid'/);
 assert.match(sql,/get diagnostics v_insertadas = row_count/);
 assert.match(sql,/or not public\.kontrola_es_administrador\(\)/);
 assert.match(sql,/or not public\.kontrola_puede_almacen\(p_almacen\)/);
 assert.match(sql,/revoke all on function public\.kontrola_registrar_generacion_r7/);
 assert.match(sql,/histórica sin revisión verificable/);
});

test("controlador LAB no contiene escrituras, y UI sigue con R7 original",()=>{
 const frontend=readFileSync(new URL("../src/visura-r7-shared-import.mjs",import.meta.url),"utf8");
 const r7=readFileSync(new URL("../lab/visura-prepara-impresion-r7.html",import.meta.url),"utf8");
 assert.match(frontend,/prepararSincronizacionR7/);
 assert.doesNotMatch(frontend,/client\.rpc\("kontrola_registrar_generacion_r7"/);
 assert.match(r7,/function registrarListadosGenerados/);
 assert.match(frontend,/ESCRITURA DESACTIVADA EN LAB/);
});
