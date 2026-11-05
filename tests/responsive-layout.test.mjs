import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const section=css.slice(css.indexOf("/* BLOQUE 01 — ADAPTACIÓN MULTIDISPOSITIVO"));
test("las vistas usan contenedor ancho y menús con más columnas en escritorio",()=>{
  assert.ok(section.length>500,"Falta bloque responsive");
  assert.match(section,/@media screen and \(min-width:721px\)/);
  assert.match(section,/max-width:1480px/);
  assert.match(section,/\.submenu-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(section,/\.admin-tabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(section,/@media screen and \(min-width:1100px\)/);
  assert.match(section,/#homeView \.inventa-inspired-home\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(section,/#loadsList,#reviewLoadsList,#historyList/);
});
test("tablet y móvil preservan lectura fluida y controles accesibles",()=>{
  assert.match(section,/@media screen and \(min-width:721px\) and \(max-width:1099px\)/);
  assert.match(section,/@media screen and \(min-width:721px\) and \(max-width:960px\)/);
  assert.match(section,/@media screen and \(max-width:720px\)/);
  assert.match(section,/\.toolbar \.search-wrap\{flex-basis:100%;min-width:0\}/);
  assert.match(section,/\.verification-line-head\{flex-wrap:wrap\}/);
  assert.match(section,/\.incident-row\{grid-template-columns:minmax\(0,1fr\)\}/);
  for(const id of ["homeView","loadsView","detailView","reviewLoadsView","reviewDetailView","adminView","settingsView"]){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
});
test("los estilos de impresión/A4 y los elementos de navegación existentes se conservan",()=>{
  assert.match(css,/@media print/);
  assert.doesNotMatch(section,/@media print/);
  assert.match(html,/id="reportView"/);
  assert.match(html,/id="cargasMenuView"/);
  assert.match(html,/id="adminSection0"/);
});
