import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {conciliarCargasLegacy} from "../src/legacy-reconcile.mjs";

const old=(id,extra={})=>({id,date:"25/10/2026",route:"Ruta A",plate:"1111ABC",driver:"Repartidor A",weight:500,...extra});
const actual=(codigo,extra={})=>({codigo,fecha:"2026-10-25",ruta:"Ruta A",matricula:"1111ABC",repartidor:"Repartidor A",peso_kg:500,...extra});

test("coincidir el código y metadatos NO certifica igualdad del PDF",()=>{
  const source=[old("LP26-12345")],current=[actual("LP26-12345")];
  const a=JSON.stringify(source),b=JSON.stringify(current);
  const r=conciliarCargasLegacy(source,current);
  assert.equal(r.porTipo.coincidencia_metadatos,1);
  assert.match(r.advertencia,/No verifica igualdad de PDF/);
  assert.equal(r.elementos[0].tipo,"coincidencia_metadatos");
  assert.equal(JSON.stringify(source),a);assert.equal(JSON.stringify(current),b);
});
test("detecta faltantes en un almacén sin presentarlos como ausentes globales",()=>{
  const r=conciliarCargasLegacy([old("LP26-12345")],[actual("LP26-99999")]);
  assert.equal(r.porTipo.no_encontrada,1);
  assert.deepEqual(r.soloEnKontrola,["LP26-99999"]);
  assert.match(r.elementos[0].detalles.join(" "),/puede existir en otra zona/);
});
test("compara diferencias sin interpretar campos ausentes como cambios acreditados",()=>{
  const r=conciliarCargasLegacy([old("LP26-12345",{route:"Ruta B",plate:"",weight:null})],
    [actual("LP26-12345",{repartidor:"Repartidor X",peso_kg:700})]);
  assert.equal(r.elementos[0].tipo,"revisar");
  assert.ok(r.elementos[0].detalles.some(x=>x.startsWith("Ruta: datos diferentes")));
  assert.ok(r.elementos[0].detalles.some(x=>x.startsWith("Peso: información incompleta")));
  assert.ok(r.elementos[0].detalles.some(x=>x.startsWith("Matrícula: información incompleta")));
});
test("normaliza fechas DD/MM/AAAA, mayúsculas y coma decimal",()=>{
  const r=conciliarCargasLegacy([old("lp26-12345",{date:"25/10/26",route:" ruta  a ",weight:"500,0"})],
    [actual("LP26-12345",{ruta:"RUTA A"})]);
  assert.equal(r.porTipo.coincidencia_metadatos,1);
});
test("códigos duplicados o inválidos bloquean cualquier conciliación automática",()=>{
  const r=conciliarCargasLegacy([
    old("LP26-12345"),old("LP26-12345"),old("123")],
    [actual("LP26-12345"),actual("LP26-99999"),actual("LP26-99999")]);
  assert.equal(r.porTipo.duplicado_legacy,1);
  assert.equal(r.porTipo.codigo_invalido,1);
  assert.equal(r.elementos.length,2);
  assert.equal(r.soloEnKontrola.length,1);
  const repeated=conciliarCargasLegacy([old("LP26-99999")],
    [actual("LP26-99999"),actual("LP26-99999")]);
  assert.equal(repeated.porTipo.duplicado_kontrola,1);
});
test("valida límites y entradas no compatibles",()=>{
  assert.throws(()=>conciliarCargasLegacy({},[]),/arrays/);
  assert.throws(()=>conciliarCargasLegacy([],new Array(50001).fill(null)),/máximo/);
  assert.equal(conciliarCargasLegacy([],[]).elementos.length,0);
});
test("la interfaz no envía el backup al servidor ni realiza mutaciones",()=>{
  const code=readFileSync(new URL("../src/admin-reconcile.mjs",import.meta.url),"utf8");
  const sql=readFileSync(new URL("../supabase/migrations/20261026_kontrola_operacion_integral.sql",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(code,/auditarCopiaCargas\(local\)/);
  assert.match(code,/client\.rpc\("kontrola_panel_cargas",\{p_almacen:warehouse\}\)/);
  assert.match(code,/getUser\(\)\?\.id!==session\|\|getWarehouse\(\)!==warehouse/);
  assert.doesNotMatch(code,/\.insert\(|\.update\(|\.delete\(|\.upload\(|\.upsert\(/);
  assert.match(sql,/if not public\.kontrola_puede_almacen\(p_almacen\)/);
  assert.match(html,/id="legacyCompareStart"/);
});
