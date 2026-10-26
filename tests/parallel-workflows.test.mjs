import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {cargaVisibleParaVerificacion,estadoVerificacionVisible,estadoTrasVerificar,estadoTrasPreparar} from "../src/parallel-workflows.mjs";

const carga={codigo:"LP26-19519",estado:"publicada",preparador_id:null,verificador_id:null,preparacion_inicio:null,preparacion_fin:null,verificacion_fin:null};

test("publicación: preparación y verificación quedan disponibles sin picking ni preparador en VISURA",()=>{
  assert.equal(cargaVisibleParaVerificacion(carga,"verificador-1"),true);
  assert.equal(estadoVerificacionVisible(carga),"Verificación disponible");
});
test("segregación: un preparador registrado no verifica su propia carga",()=>{
  assert.equal(cargaVisibleParaVerificacion({...carga,preparador_id:"operario-1"},"operario-1"),false);
  assert.equal(cargaVisibleParaVerificacion({...carga,preparador_id:"operario-1"},"operario-2"),true);
});
test("concurrencia de verificación: solo el asignado puede continuar",()=>{
  const iniciada={...carga,estado:"verificacion_en_curso",verificador_id:"verificador-1"};
  assert.equal(cargaVisibleParaVerificacion(iniciada,"verificador-1"),true);
  assert.equal(cargaVisibleParaVerificacion(iniciada,"verificador-2"),false);
  assert.equal(estadoVerificacionVisible(iniciada),"Continuar verificación");
});
test("finalización de verificación no termina una preparación abierta",()=>{
  const paralela={...carga,estado:"verificacion_en_curso",preparacion_inicio:"2026-10-26T10:00:00Z",preparacion_fin:null};
  assert.equal(estadoTrasVerificar(paralela),"preparacion_en_curso");
  assert.equal(estadoTrasPreparar({...paralela,verificacion_fin:"2026-10-26T10:30:00Z"}),"cerrada");
});
test("sin sesión de preparación local, el cierre de toda la verificación puede cerrar la carga",()=>{
  assert.equal(estadoTrasVerificar(carga),"cerrada");
});
test("estados independientes: terminar preparación conserva verificación en curso",()=>{
  assert.equal(estadoTrasPreparar({...carga,verificador_id:"verificador-1"}),"verificacion_en_curso");
  assert.equal(estadoTrasPreparar(carga),"preparada");
});
test("carga cerrada no se adjudica a otro verificador",()=>{
  const cerrada={...carga,estado:"cerrada",verificador_id:"verificador-1",verificacion_fin:"2026-10-26T10:30:00Z"};
  assert.equal(cargaVisibleParaVerificacion(cerrada,"verificador-1"),true);
  assert.equal(cargaVisibleParaVerificacion(cerrada,"verificador-2"),false);
  assert.equal(estadoVerificacionVisible(cerrada),"Verificación finalizada");
});
test("SQL de propuesta: no exige preparación para verificar y no cierra la preparación ajena",()=>{
  const sql=readFileSync(new URL("../supabase/proposals/kontrola_prepara_verificacion_paralelas.sql",import.meta.url),"utf8");
  assert.ok(sql.includes("La preparación se gestiona en BC")||sql.includes("El picking se realiza en BC"));
  assert.ok(!sql.includes("La carga no tiene preparación"));
  assert.ok(!sql.includes("set fin=v_now,cierre_motivo='Finalización de verificación'"));
  assert.ok(sql.includes("or exists(select 1 from public.kontrola_verificaciones"));
  assert.ok(sql.includes("preparacion_registrada_activa"));
});
