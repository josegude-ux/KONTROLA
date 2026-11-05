import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {duracionOperario} from "../src/admin-stats.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("las duraciones se expresan en horas y minutos y nunca son negativas",()=>{
 assert.equal(duracionOperario(0),"0 h 00 min");
 assert.equal(duracionOperario(3600),"1 h 00 min");
 assert.equal(duracionOperario(3675),"1 h 01 min");
 assert.equal(duracionOperario(null),"0 h 00 min");
 assert.equal(duracionOperario(-60),"0 h 00 min");
});
test("el panel no realiza escrituras ni carga información de otro almacén",()=>{
 const s=read("src/admin-stats.mjs");
 assert.match(s,/rpc\("kontrola_estadisticas_operarios"/);
 assert.match(s,/getWarehouse\(\)!==warehouse/);
 assert.match(s,/getUser\(\)\?\.id!==session/);
 assert.doesNotMatch(s,/\.insert\(|\.update\(|\.delete\(/);
 assert.match(read("index.html"),/id="operatorStatsPanel"/);
 assert.match(read("src/admin.mjs"),/operatorStats\.refresh\(\)/);
});
test("la RPC nominal exige administrador y filtra zona y fecha España",()=>{
 const sql=read("supabase/migrations/20261028_kontrola_estadisticas_operarios.sql");
 assert.match(sql,/not public\.kontrola_es_administrador\(\)/);
 assert.match(sql,/c\.almacen=p_almacen/g);
 assert.match(sql,/time zone 'Europe\/Madrid'/g);
 assert.match(sql,/grant execute on function public\.kontrola_estadisticas_operarios\(text,date\) to authenticated/);
 assert.doesNotMatch(sql,/grant (select|insert|update|delete) on /i);
});
