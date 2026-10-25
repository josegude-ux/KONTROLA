import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const verificationSql=await readFile(new URL("../supabase/migrations/20261025_kontrola_verificacion.sql",import.meta.url),"utf8");
const phaseOneSql=await readFile(new URL("../supabase/migrations/20261024_kontrola_preparacion.sql",import.meta.url),"utf8");
const app=await readFile(new URL("../src/app.mjs",import.meta.url),"utf8");

test("profile authorization is server-owned and the browser does not query usuarios_app directly",()=>{
  assert.match(phaseOneSql,/create or replace function public\.kontrola_mi_perfil\(\)/i);
  assert.doesNotMatch(app,/\.from\(["']usuarios_app["']\)/);
  assert.match(app,/\.rpc\(["']kontrola_mi_perfil["']\)/);
});

test("verification mutations are RPC-only for authenticated users",()=>{
  for(const table of ["kontrola_verificaciones","kontrola_verificacion_lineas","kontrola_incidencias","kontrola_verificacion_eventos"]){
    assert.match(verificationSql,new RegExp(`revoke all on public\\.${table} from anon, authenticated`,"i"));
  }
  assert.doesNotMatch(verificationSql,/grant\s+(?:insert|update|delete)[^;]*to authenticated/i);
  for(const rpc of ["kontrola_abrir_verificacion","kontrola_registrar_linea","kontrola_finalizar_verificacion","kontrola_regularizar_incidencia"]){
    assert.match(verificationSql,new RegExp(`grant execute on function public\\.${rpc}`,"i"));
  }
});

test("preparation can be explicitly completed without trusting a browser timestamp",()=>{
  assert.match(phaseOneSql,/create or replace function public\.kontrola_finalizar_preparacion\(p_codigo text\)/i);
  assert.match(phaseOneSql,/v_now timestamptz := now\(\)/i);
  assert.match(phaseOneSql,/operario_id = v_user/i);
});

test("the database rejects self-verification and serializes load changes",()=>{
  assert.match(verificationSql,/v_preparador\s*=\s*v_user[\s\S]{0,180}No puedes verificar una carga que has preparado/i);
  assert.match(verificationSql,/pg_advisory_xact_lock[\s\S]{0,120}carga:/i);
  assert.match(verificationSql,/for update/i);
  assert.match(verificationSql,/and \(v\.id is null or v\.verificador_id = v_user\)/i);
});

test("line recording is traceable and incidents stay grouped by load",()=>{
  assert.match(verificationSql,/create table if not exists public\.kontrola_verificacion_eventos/i);
  assert.match(verificationSql,/registrado_en timestamptz not null default now\(\)/i);
  assert.match(verificationSql,/create table if not exists public\.kontrola_incidencias[\s\S]*codigo text not null/i);
  assert.match(verificationSql,/unique\s*\(verificacion_id,linea\)/i);
});

test("finishing closes the load even when unresolved incidents exist",()=>{
  assert.match(verificationSql,/set fin = v_now, estado = 'finalizada'/i);
  assert.match(verificationSql,/set cerrada_en = coalesce\(cerrada_en,v_now\)/i);
  assert.doesNotMatch(verificationSql,/where not exists\s*\([^;]*kontrola_incidencias/i);
});

test("the client reads current server state before enabling a verification",()=>{
  assert.match(app,/rpc\(["']kontrola_iniciar_verificacion["']/);
  assert.match(app,/finished:started\.estado===["']finalizada["']/);
});

test("only an active administrator can mark a pending incident as regularized",()=>{
  assert.match(verificationSql,/create or replace function public\.kontrola_regularizar_incidencia\(p_incidencia uuid\)/i);
  assert.match(verificationSql,/not public\.kontrola_es_administrador\(\)/i);
  assert.match(verificationSql,/set estado = 'regularizada'[\s\S]{0,180}actualizada_por = v_user/i);
});
