import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/proposals/kontrola_archivo_logico.sql",import.meta.url),"utf8");
test("archivo requiere 90 dias desde cierre",()=>assert.match(sql,/cerrada_en>now\(\)-interval '90 days'/));
test("archivo rechaza acciones nulas",()=>assert.match(sql,/p_archivar is null/));
test("archivo restringido a administracion",()=>assert.match(sql,/kontrola_es_administrador\(\)/));
test("archivo usa bloqueo de fila",()=>assert.match(sql,/for update/));
test("archivo exige verificacion finalizada",()=>assert.match(sql,/v\.estado='finalizada'/));
test("archivo bloquea incidencias pendientes pero permite descartadas",()=>assert.match(sql,/i\.estado='pendiente'/));
test("archivo registra eventos",()=>assert.match(sql,/insert into public\.kontrola_archivo_eventos/));
test("archivo no contiene borrado automatico",()=>assert.doesNotMatch(sql,/\bdelete\s+from\b/i));
test("archivo no concede RPC a anon",()=>assert.match(sql,/revoke all on function public\.kontrola_cambiar_archivo\(text,boolean\) from public,anon/));

test("archivo rechaza verificacion sin lineas",()=>assert.match(sql,/not exists\(select 1 from public\.kontrola_verificacion_lineas/));
test("archivo comprueba preparaciones abiertas",()=>assert.match(sql,/p\.fin is null/));
test("archivo comprueba avisos activos",()=>assert.match(sql,/a\.activo=true/));
test("archivo conserva eventos al restaurar",()=>assert.match(sql,/case when p_archivar then 'archivar' else 'restaurar' end/));

test("archivo solo acepta cargas cerradas",()=>assert.match(sql,/v_c\.estado is distinct from 'cerrada'/));
test("archivo requiere fecha de cierre",()=>assert.match(sql,/v_c\.cerrada_en is null/));
test("archivo no archiva verificaciones en curso",()=>assert.match(sql,/v\.estado is distinct from 'finalizada' or v\.fin is null/));
test("restauracion queda auditada",()=>assert.match(sql,/restaurado_en=now\(\),restaurado_por=v_user/));
