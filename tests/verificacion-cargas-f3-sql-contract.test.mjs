import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../docs/sql-no-ejecutar/VISURA_VERIFICACION_DESCARTES_F3_PROPUESTA.sql",import.meta.url),"utf8");
test("F2 SQL propuesto: cinco tablas aisladas con RLS y ninguna ALTER de KONTROLA",()=>{
 assert.equal((sql.match(/create table if not exists public\.verificacion_cargas_/g)||[]).length,5);
 assert.equal((sql.match(/create policy vc_/g)||[]).length,5);
 assert.equal((sql.match(/enable row level security;/g)||[]).length,5);
 assert.equal(/\balter table public\.(kontrola_|cargas|usuarios_app|tanques_)/i.test(sql),false);
});
test("F2 SQL propuesto: RPC rechaza anónimo, acepta operario/admin activos por almacén",()=>{
 assert.ok(sql.includes("v_user uuid:=auth.uid()"));
 assert.ok((sql.match(/not public\.kontrola_usuario_activo\(\)/g)||[]).length>=4);
 assert.ok((sql.match(/not public\.kontrola_puede_almacen\(p_almacen\)/g)||[]).length>=4);
 assert.ok(!sql.includes("not public.kontrola_es_administrador()"));
 assert.ok(sql.includes("to authenticated;"));
 assert.ok(sql.includes("from public,anon,authenticated;"));
});
test("F2 SQL propuesto: actor y reloj salen solo del servidor, dispositivo informativo",()=>{
 assert.ok(sql.includes("auth.uid()"));assert.ok(sql.includes("clock_timestamp()"));
 assert.ok(sql.includes("actor_id uuid not null references auth.users(id)"));
 assert.ok(sql.includes("dispositivo_informativo text"));
 assert.equal(/\bp_actor\b|\bp_fecha\b|\bp_user_id\b/.test(sql),false);
});
test("F2 SQL propuesto: lote atómico, versiones CAS y recibo idempotente",()=>{
 assert.ok(sql.includes("for update"));
 assert.ok(sql.includes("on conflict (operacion_id) do nothing"));
 assert.ok(sql.includes("p_versiones->v_code->>'version_descarte'"));
 assert.ok(sql.includes("p_versiones->v_code->>'version_revision'"));
 assert.ok(sql.includes("v_op.respuesta is not null then return v_op.respuesta"));
 assert.ok(sql.includes("Segundo recorrido: una sola transacción Postgres"));
});
test("F2 SQL propuesto: impedir descarte de cerradas o completas, preservar snapshot",()=>{
 assert.ok(sql.includes("v_review.cerrada_en is not null"));
 assert.ok(sql.includes("v_review.comprobadas>=v_review.total"));
 assert.ok(sql.includes("'snapshot_progreso_al_descartar'"));
 assert.ok(sql.includes("set estado_descarte='activa',version_descarte=version_descarte+1"));
});
test("F2 SQL propuesto: auditoría append-only e independencia de BC/INVENTA",()=>{
 assert.ok(sql.includes("vc_eventos_append_only before update or delete"));
 assert.ok(sql.includes("Auditoría inmutable"));
 assert.equal(/\b(update|delete from)\s+(public\.)?(kontrola_|cargas|stock|inventario|business_central)/i.test(sql),false);
});
