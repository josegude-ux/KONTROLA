import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const app=read("src/admin.mjs"),html=read("index.html");
const sql=read("supabase/proposals/kontrola_pdf_provisionales_b01.sql");

test("un código LP no verificado crea provisional y nunca publica desde la importación",()=>{
  const block=app.slice(app.indexOf("async function processSinglePdf("),app.indexOf("async function processPdf("));
  assert.match(block,/return await storeProvisionalPdf\(file,parsed\)/);
  assert.match(block,/return await storeProvisionalPdf\(file,\{\},message\)/);
  assert.match(block,/no se pudo verificar el año/);
  assert.doesNotMatch(block,/kontrola_publicar_importacion/);
  assert.match(app,/kontrola_reservar_provisional_pdf/);
  assert.match(app,/kontrola_completar_provisional_pdf/);
  assert.match(app,/contentType:"application\/pdf",upsert:false/);
});
test("la bandeja es exclusiva de administración y recupera los originales privados",()=>{
  assert.match(html,/id="provisionalPdfSection"/);
  assert.match(html,/id="provisionalPdfList"/);
  assert.match(html,/no son cargas publicadas/);
  assert.match(app,/async function refreshProvisionalDrafts/);
  assert.match(app,/\.from\("kontrola_pdf_provisionales"\)/);
  assert.match(app,/\.download\(row\.documento_ruta\)/);
  assert.match(app,/refreshProvisionalDrafts\(\)/);
});
test("contrato SQL impide publicación implícita y rechaza acceso de operario",()=>{
  assert.match(sql,/create table if not exists public\.kontrola_pdf_provisionales/);
  assert.match(sql,/create policy "kontrola_provisionales_admin_lectura"/);
  assert.match(sql,/for select to authenticated using \(public\.kontrola_es_administrador\(\)\)/);
  assert.match(sql,/for insert to authenticated with check/);
  assert.match(sql,/documento_ruta='provisionales\/'\|\|documento_hash\|\|'\.pdf'/);
  assert.match(sql,/p_hash text,p_archivo text,p_tamano bigint/);
  assert.doesNotMatch(sql,/insert into public\.kontrola_cargas/);
  assert.doesNotMatch(sql,/kontrola_publicar_importacion/);
  assert.match(sql,/from public,anon/);
});
