import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve,dirname } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(resolve(root,p),"utf8");
const html=read("index.html"),app=read("src/app.mjs"),css=read("styles.css");
const ids=["preparacionCargas","preparacionArticulos","preparacionMovimientos"];
test("Preparación abre un submenú y no directamente cargas",()=>{
  assert.match(app,/\$\("openPreparation"\)\.addEventListener\("click",\(\)=>switchView\("preparacionMenuView"\)\)/);
  assert.match(html,/id="preparacionMenuView" class="view v15-subprep" hidden/);
  assert.equal(ids.map(id=>html.indexOf(`id="${id}"`)).every(x=>x>0),true);
  assert.deepEqual(ids.map(id=>html.indexOf(`id="${id}"`)),[...ids.map(id=>html.indexOf(`id="${id}"`))].sort((a,b)=>a-b));
});
test("Preparación de cargas reutiliza flujo existente con retorno a submenú",()=>{
  assert.match(app,/\$\("preparacionCargas"\)\.addEventListener\("click",\(\)=>openLoadsMenu\("preparacionMenuView"\)\)/);
  assert.match(app,/\$\("backFromLoads"\)\.addEventListener\("click",\(\)=>switchView\(loadsParent\)\)/);
  assert.match(app,/function openLoadsMenu\(parent="homeView",mode="preparacion"\)/);
});
test("Consulta de artículos y Movimientos tienen paneles funcionales sin escrituras",()=>{
  for(const [btn,view] of [["preparacionArticulos","preparacionArticulosView"],["preparacionMovimientos","preparacionMovimientosView"]]) {
    assert.match(app,new RegExp('\\$\\("'+btn+'"\\)\\.addEventListener\\("click"'));
    assert.match(html,new RegExp('id="'+view+'" class="view" hidden'));
  }
  assert.match(html,/No se muestran existencias inventadas/);
  assert.match(html,/no registra, confirma ni ejecuta movimientos/);
  assert.doesNotMatch(read("src/prepara-consulta.mjs"),/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
});
test("La vuelta funciona por botón superior sin alterar Control de Cargas",()=>{
  for(const id of ["preparacionArticulosView","preparacionMovimientosView","preparacionMenuView"])
    assert.match(app,new RegExp(id));
  assert.match(app,/if\(view==="preparacionMenuView"\|\|view==="cargasMenuView"/);
  assert.match(app,/preparacionArticulosView:"backFromPreparacionArticulos"/);
  assert.match(app,/preparacionMovimientosView:"backFromPreparacionMovimientos"/);
  assert.match(app,/\$\("cargasPreparar"\)\.addEventListener\("click",\(\)=>openLoadsMenu\("cargasMenuView"\)\)/);
});
test("Submenú accesible con botones no submit, diseño móvil y originales intactos",()=>{
  for(const id of ids)assert.match(html,new RegExp('id="'+id+'" type="button" class="submenu-card prepara-submenu-card v15-subprep__card'));
  assert.match(html,/aria-label="Funciones de Preparación"/);
  assert.match(css,/\.prepara-submenu-grid/);
  assert.match(css,/@media \(max-width:650px\)/);
  assert.match(html,/id="openAdmin"[^>]*hidden/);
  assert.match(app,/function openReviewMenu\(parent="homeView"\)/);
  assert.match(app,/function openAdminMenu\(parent="homeView"\)/);
});
