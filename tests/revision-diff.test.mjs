import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compararRevisiones} from "../src/revision-diff.mjs";

const doc=({fecha="2026-10-25",ruta="Ruta A",matricula="1111ABC",referencias=2,productos=[]}={})=>({
  carga_datos:{fecha,ruta,matricula,referencias,almacen:"COR_01_COR",productos}
});
const p=(sku,qty,location="A101-1",description="Producto")=>({sku,qty,location,description,unit:"CAJA"});

test("sin cambios documentales, comparación vacía",()=>{
  const d=doc({productos:[p("PRD0000001",3)]});
  assert.deepEqual(compararRevisiones(d,d),{
    campos:[],anadidos:[],eliminados:[],modificados:[],sinCambios:1,totalCambios:0
  });
});
test("identifica cambios de datos y de cantidades sin escribir en el original",()=>{
  const older=doc({ruta:"A",matricula:"1111ABC",productos:[p("PRD0000001",3)]});
  const newer=doc({ruta:"B",matricula:"2222DEF",productos:[p("PRD0000001",5,"B101-1")]});
  const original=JSON.stringify(older);
  const result=compararRevisiones(older,newer);
  assert.equal(result.campos.length,2);
  assert.deepEqual(result.campos.map(x=>x.campo),["matricula","ruta"]);
  assert.equal(result.modificados.length,1);
  assert.deepEqual(result.modificados[0].cambios.map(x=>x.campo),["location","qty"]);
  assert.equal(result.totalCambios,3);
  assert.equal(JSON.stringify(older),original);
});
test("productos añadidos y eliminados con referencias distintas",()=>{
  const a=doc({productos:[p("PRD0000001",2),p("PRD0000002",1)]});
  const b=doc({productos:[p("PRD0000001",2),p("PRD0000003",4)]});
  const r=compararRevisiones(a,b);
  assert.deepEqual(r.anadidos.map(x=>x.sku),["PRD0000003"]);
  assert.deepEqual(r.eliminados.map(x=>x.sku),["PRD0000002"]);
  assert.equal(r.sinCambios,1);
});
test("mantiene múltiples líneas con la misma referencia sin perder cantidades",()=>{
  const a=doc({productos:[p("PRD0000001",2),p("PRD0000001",4)]});
  const b=doc({productos:[p("PRD0000001",2),p("PRD0000001",5),p("PRD0000001",7)]});
  const r=compararRevisiones(a,b);
  assert.equal(r.sinCambios,1);
  assert.equal(r.modificados.length,1);
  assert.equal(r.modificados[0].ocurrencia,2);
  assert.equal(r.anadidos.length,1);
  assert.equal(r.anadidos[0].number,3);
});
test("comparación no presupone productos o campos cuando faltan datos",()=>{
  const r=compararRevisiones({carga_datos:null},{carga_datos:{}});
  assert.equal(r.totalCambios,0);
});
test("panel visual usa consultas con RLS, enlaces temporales y carece de escrituras",()=>{
  const source=readFileSync(new URL("../src/admin-revisions.mjs",import.meta.url),"utf8");
  const sql=readFileSync(new URL("../supabase/migrations/20261026_kontrola_operacion_integral.sql",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(source,/\.from\("kontrola_carga_revisiones"\)/);
  assert.match(source,/\.eq\("codigo",code\)/);
  assert.match(source,/createSignedUrl\(revision\.documento_ruta,120\)/);
  assert.doesNotMatch(source,/\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.match(sql,/create policy "kontrola_revisiones_lectura"[\s\S]*kontrola_puede_almacen\(almacen\)/);
  assert.match(html,/id="adminRevisionsPanel"/);
});
