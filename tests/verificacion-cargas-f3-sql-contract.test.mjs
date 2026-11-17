import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const active=readFileSync(new URL("../docs/sql-no-ejecutar/VISURA_VERIFICACION_DESCARTES_F3_PROPUESTA.sql",import.meta.url),"utf8");
const historical=readFileSync(new URL("../docs/sql-no-ejecutar/HISTORICO_F2_REVISION_COMPLETA_NO_APROBADO.sql",import.meta.url),"utf8");
test("F3A: SQL con subida de revisiones retirado, no aplicable",()=>{
 assert.ok(active.includes("RAISE EXCEPTION 'SQL F2 RETIRADO"));
 assert.equal(active.includes("CREATE TABLE"),false);
 assert.equal(active.includes("CREATE OR REPLACE FUNCTION public.verificacion_cargas_sincronizar_revision"),false);
});
test("F2: SQL histórico preservado para auditoría sin autorizar su ejecución",()=>{
 assert.ok(historical.includes("verificacion_cargas_sincronizar_revision"));
 assert.ok(historical.includes("verificacion_cargas_revisiones"));
});
