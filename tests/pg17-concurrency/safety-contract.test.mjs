import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const get=p=>readFileSync(resolve(root,p),'utf8');
const runner=get('scripts/ensayo-f3a-r41-dos-psql-pg17.sh');
const sql=get('docs/sql-no-ejecutar/VISURA_F3A_R4_1_FUENTE_CHECKS_CORRECCION_NO_EJECUTAR.sql');
const gitBlob=data=>createHash('sha1').update(`blob ${Buffer.byteLength(data)}\0`).update(data).digest('hex');

test('S01 candidato SQL exactamente identificado por blob git CP013',()=>{
 assert.equal(gitBlob(sql),'68db4e388a99ff8631d0de279879a707807d2b59');
});
test('S02 bloqueo opt-in doble y host/db/usuario PG17 explícitos',()=>{
 for(const x of ['EXPLICIT_ISOLATED_POSTGRES17','YES_VERIFIED','PGHOST:-','127.0.0.1','PGDATABASE:-','visura_f3a_qa_r41_20261117','PGUSER:-','current_setting(\'server_version_num\')'])assert.ok(runner.includes(x),x);
});
test('S03 no muta workflow ni claves ni servicios; solo cliente psql futuro',()=>{
 assert.ok(!/workflow_dispatch|gh workflow run|docker run|podman run|supabase db|service_role|SUPABASE_KEY/.test(runner));
 assert.ok(!/curl|wget|ssh|psql.*host=.*\.supabase\./.test(runner));
});
test('S04 dos sesiones, PID distintos, barrera, lock observada y ventanas',()=>{
 for(const x of ['run_pair','A_WRITTEN','B_ATTEMPT','A_COMMITTED','A_PID=','B_PID=','wait_event_type=\'Lock\'','LOCK_WAIT_OBSERVED=1'])assert.ok(runner.includes(x),x);
});
test('S05 CAS obsoleto y espera significativa con código 40001',()=>{
 const b=get('tests/pg17-concurrency/11_B_cas.sql');
 assert.match(b,/serialization_failure/);assert.match(b,/ms<350/);assert.match(b,/B_CAS_40001_WAIT_MS=/);
});
test('S06 UUID repetido conserva recibo bajo dos conexiones',()=>{
 const b=get('tests/pg17-concurrency/21_B_same_uuid.sql');
 assert.match(b,/r IS DISTINCT FROM orig/);assert.match(b,/ms<350/);assert.match(b,/B_SAME_UUID_IDENTICAL_WAIT_MS=/);
});
test('S07 recuperación final y RPC cerrada después de ambas carreras',()=>{
 const f=get('tests/pg17-concurrency/30_assert_and_recovery.sql');
 assert.match(f,/n1<>1 OR n2<>1/);assert.match(f,/n1<>2/);assert.match(f,/has_function_privilege\('authenticated'/);assert.match(f,/has_function_privilege\('anon'/);
});
test('S08 datos ficticios, QA DB exacta y sin tabla operativa',()=>{
 const f=get('tests/pg17-concurrency/00_fixture.sql');
 assert.match(f,/CREATE ROLE anon NOLOGIN/);assert.match(f,/CREATE ROLE authenticated NOLOGIN/);assert.match(f,/QA_DB_NOT_PRISTINE/);
 assert.match(f,/LP26-999901/);assert.match(f,/LP26-999902/);assert.ok(!f.includes('kontrola_cargas'));
});
test('S09 no se transforma el SQL R4.1 ni se usan credenciales embebidas',()=>{
 assert.match(sql,/CREATE FUNCTION public\.visura_f3a_registrar_check/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.visura_f3a_registrar_check/);
 for(const [k,v] of Object.entries({PGPASSWORD:'no',SERVICE_ROLE:'no'}))assert.ok(!get('tests/pg17-concurrency/README.md').includes(`${k}=`),k);
});
