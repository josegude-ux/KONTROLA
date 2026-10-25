import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const html=read("index.html");
const app=read("src/app.mjs");
const css=read("styles.css");

test("Control de Cargas aparece como submenú navegable sin duplicar operaciones",()=>{
  assert.match(html,/id="openCargas"[^>]*>/);
  assert.match(html,/id="cargasMenuView"[^>]*hidden/);
  for(const id of ["cargasConsultar","cargasPreparar","cargasVerificar","cargasHistorial","cargasAdministrar"]){
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.ok(app.includes('$("'+id+'").addEventListener'),"Falta el manejador "+id);
  }
  assert.match(app,/openLoadsMenu\("cargasMenuView","consulta"\)/);
  assert.match(app,/openReviewMenu\("cargasMenuView"\)/);
  assert.match(css,/\.submenu-grid\{/);
});

test("Tanques permanece totalmente oculto y sin acciones activas",()=>{
  assert.doesNotMatch(html,/tanques/i);
  assert.doesNotMatch(app,/openTanques|cargasTanques/i);
});

test("La administración se muestra únicamente a perfiles autorizados",()=>{
  assert.match(html,/id="cargasAdministrar"[^>]*hidden/);
  assert.match(app,/visible\(\$\("cargasAdministrar"\),ownProfile\.rol==="administrador"\)/);
  assert.match(app,/if\(profile\?\.rol!=="administrador"/);
});

test("La navegación conserva los accesos previos y los regresos al submenú",()=>{
  for(const id of ["openPreparation","openReview","openAdmin","openSettings","backFromLoads","backFromReviewLoads"]){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(app,/switchView\(loadsParent\)/);
  assert.match(app,/switchView\(reviewLoadsParent\)/);
  assert.match(app,/currentReadOnly\|\|currentPreparation\?\.active/);
  assert.match(html,/id="cargasHistoryView"[^>]*hidden/);
});

test("La versión y el caché están preparados para instalar nuevas pantallas",()=>{
  const version=JSON.parse(read("version.json")).version;
  assert.equal(version,"0.3.12");
  assert.equal(JSON.parse(read("package.json")).version,version);
  assert.equal(JSON.parse(read("package-lock.json")).version,version);
  assert.match(read("src/config.mjs"),/APP_VERSION="0\.3\.12"/);
  assert.match(html,/id="appVersion">0\.3\.12</);
  assert.match(read("sw.js"),/kontrola-integral-v043/);
});

test("Las consultas descartan respuestas de sesiones o almacenes anteriores",()=>{
  assert.match(app,/const validRequest=\(warehouse,userId\)=>selectedWarehouse===warehouse&&user\?\.id===userId/);
  for(const marker of ["async function refreshLoads()","async function refreshReviewLoads()","async function refreshOperatorDashboard()"]){
    const start=app.indexOf(marker);
    assert.ok(start>=0,"Falta función "+marker);
    assert.match(app.slice(start,start+1200),/if\(!validRequest\(warehouse,userId\)\)return;/);
  }
});

test("El historial exporta CSV e imprime solo registros filtrados",()=>{
  for(const id of ["historyDownload","historyPrint"]){
    assert.match(html,new RegExp('id="'+id+'"[^>]*disabled'));
    assert.ok(app.includes('$("'+id+'").addEventListener'),"Sin controlador "+id);
  }
  assert.match(app,/csvHistorial\(records,selectedWarehouse\)/);
  assert.match(app,/htmlResumenHistorial\(records,/);
  assert.match(read("sw.js"),/\.\/src\/history\.mjs/);
});
