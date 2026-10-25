import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {revisarSustitucion} from "../src/import-policy.mjs";

const original={codigo:"LP26-50001",estado:"publicada",revision:2,
  documento_hash:"a".repeat(64),almacen:"COR_01_COR"};

test("una carga nueva no necesita confirmación adicional",()=>{
  assert.equal(revisarSustitucion(null,"b".repeat(64)).tipo,"nueva");
});
test("documento idéntico no activa sustitución ni genera nueva revisión",()=>{
  assert.equal(revisarSustitucion(original,"a".repeat(64)).tipo,"repetida");
});
test("carga existente con contenido nuevo exige aceptación antes de reservar",()=>{
  const decision=revisarSustitucion(original,"b".repeat(64));
  assert.equal(decision.tipo,"confirmar");
  assert.match(decision.mensaje,/LP26-50001/);
  assert.match(decision.mensaje,/revisión 2/);
  assert.match(decision.mensaje,/historial/);
  assert.match(decision.mensaje,/¿Quieres importar/);
});
test("no ofrece sustitución de cargas en curso, preparadas o cerradas",()=>{
  for(const estado of ["preparacion_en_curso","preparada","verificacion_en_curso","cerrada"]){
    const decision=revisarSustitucion({...original,estado},"b".repeat(64));
    assert.equal(decision.tipo,"bloqueada",estado);
  }
});
test("la revisión inicial consulta el servidor, el usuario confirma y las RPC siguen autorizando",()=>{
  const admin=readFileSync(new URL("../src/admin.mjs",import.meta.url),"utf8");
  const sql=readFileSync(new URL("../supabase/migrations/20261027_kontrola_revision_documental_segura.sql",import.meta.url),"utf8");
  assert.match(admin,/\.from\("kontrola_cargas"\)/);
  assert.match(admin,/window\.confirm\(decision\.mensaje\)/);
  assert.ok(admin.indexOf("window.confirm(decision.mensaje)")<admin.indexOf("kontrola_reservar_importacion"));
  assert.match(sql,/v_existing\.codigo<>p_codigo/);
  assert.match(sql,/c\.documento_hash=v_i\.documento_hash/);
  assert.match(sql,/No se sustituye un documento asociado a una carga iniciada/);
});
