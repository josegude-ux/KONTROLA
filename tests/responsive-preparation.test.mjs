import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPreparationReport} from "../src/report.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("styles.css");
const app=read("src/app.mjs");

test("matrícula y huecos ocupan una fila completa independiente de peso y bultos",()=>{
  const list=app.slice(app.indexOf("function renderLoadList()"),app.indexOf("// Historial de lectura"));
  assert.match(list,/a\.className="load-card-info"/);
  assert.match(list,/b\.append\(a,summary,vehicle,bundles\)/);
  assert.match(list,/summary\.append\(total,weight\)/);
  assert.match(list,/vehicle\.append\(plate,pallets\)/);
  assert.match(css,/#loadsList \.load-card\{\s*display:grid/);
  assert.match(css,/grid-template-areas:"info summary" "vehicle vehicle" "breakdown breakdown"/);
  assert.match(css,/#loadsList \.load-vehicle\{\s*grid-area:vehicle;display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css,/#loadsList \.load-bundles\{grid-area:breakdown/);
});

test("hoja procesada se lee en fichas en pantalla estrecha sin tocar tabla impresa",()=>{
  const marker="/* La hoja A4 conserva sus tablas en PDF/impresión.";
  const responsive=css.slice(css.indexOf(marker),css.indexOf("/* Subtotales de pasillo visibles",css.indexOf(marker)));
  assert.match(responsive,/@media screen and \(max-width:700px\)/);
  assert.match(responsive,/grid-template-areas:"reference quantity unit" "description description description" "location location location"/);
  assert.match(responsive,/\.report-aisle>table tbody td:nth-child\(3\)/);
  assert.match(responsive,/\.report-aisle>table tfoot th/);
  assert.doesNotMatch(responsive,/@media print/);
  const html=buildPreparationReport({
    codigo:"LP26-19523",almacen:"COR_01_COR",matricula:"2554JRM",productos:[
      {location:"K03-P02",sku:"PRD0012596",description:"GINEBRA BALLANTINES 70CL 1U",qty:1,unit:"BOTELLA"}
    ]
  });
  assert.match(html,/<table><thead><tr><th>Ubicación<\/th><th>Referencia<\/th><th>Descripción<\/th><th>Cantidad<\/th><th>Unidad<\/th><\/tr><\/thead>/);
  assert.match(html,/<td>K03-P02<\/td><td>PRD0012596<\/td><td>GINEBRA BALLANTINES 70CL 1U<\/td><td class="number">1<\/td><td>BOTELLA<\/td>/);
  assert.match(html,/TOTAL PASILLO K · 1 referencia\(s\) · 1 BOTELLA/);
});
