import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const sql=await readFile(new URL("../supabase/migrations/20261026_kontrola_operacion_integral.sql",import.meta.url),"utf8");
const app=await readFile(new URL("../src/app.mjs",import.meta.url),"utf8");

test("warehouse separation is persisted and enforced by backend helpers",()=>{
  assert.match(sql,/insert into public\.kontrola_almacenes[\s\S]*COR_01_COR[\s\S]*COR_02_NAR/i);
  assert.match(sql,/add column if not exists almacen text references public\.kontrola_almacenes/i);
  assert.match(sql,/public\.kontrola_puede_almacen\(almacen\)/i);
  assert.match(sql,/kontrola_configurar_acceso_almacen/i);
});

test("consultation is separate from explicit idempotent preparation",()=>{
  assert.match(app,/rpc\(["']kontrola_panel_cargas["']/);
  assert.match(app,/rpc\(["']kontrola_iniciar_preparacion["']/);
  assert.doesNotMatch(app,/rpc\(["']kontrola_abrir_carga["']/);
  assert.match(sql,/kontrola_iniciar_preparacion\(p_codigo text,p_request_id uuid\)/i);
  assert.match(sql,/inicio_request_id uuid/i);
});

test("document import keeps immutable revisions and blocks replacement after work starts",()=>{
  assert.match(sql,/create table if not exists public\.kontrola_importaciones/i);
  assert.match(sql,/create table if not exists public\.kontrola_carga_revisiones/i);
  assert.match(sql,/No se sustituye un documento asociado a una carga iniciada/i);
  assert.match(sql,/documento_hash text not null unique/i);
});

test("warehouse restrictions fail closed once any membership is configured",()=>{
  assert.match(sql,/not exists\s*\(\s*select 1 from public\.kontrola_usuario_almacenes ua\s*where ua\.usuario_id=\(select auth\.uid\(\)\)\s*\)/i);
  assert.match(sql,/exists\s*\(\s*select 1 from public\.kontrola_usuario_almacenes ua[\s\S]*ua\.activo\s*\)/i);
  assert.match(sql,/Acceso al almacén revocado/i);
  assert.match(sql,/kontrola_verificacion_lineas_lectura[\s\S]*kontrola_puede_almacen/i);
});

test("review corrections persist warehouse and publication validates documentary totals",()=>{
  assert.match(sql,/kontrola_corregir_importacion[\s\S]*almacen_detectado\s*=\s*v_almacen/i);
  assert.match(sql,/v_data->>'actual_total'/i);
  assert.match(sql,/v_data->>'declared_total'/i);
  assert.match(sql,/sum\(\(p->>'qty'\)::numeric\)/i);
});

test("verification closure also closes an open preparation transactionally",()=>{
  assert.match(sql,/cierre_motivo='Finalización de verificación'/i);
  assert.match(sql,/estado='cerrada'/i);
  assert.match(sql,/incidencias_pendientes/i);
});

test("attention and internal alerts are persisted without external delivery",()=>{
  assert.match(sql,/create table if not exists public\.kontrola_avisos/i);
  assert.match(sql,/create or replace function public\.kontrola_necesitan_atencion/i);
  assert.doesNotMatch(sql,/https?:\/\/|net\.http|webhook/i);
});
