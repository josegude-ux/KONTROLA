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
  for(const id of ["cargasConsultar","cargasPreparar","cargasVerificar","cargasAdministrar"]){
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.match(app,new RegExp('\\$("'+id+'"\\)\\.addEventListener'));
  }
  assert.match(app,/openLoadsMenu\("cargasMenuView"\)/);
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
});

test("La versión y el caché están preparados para instalar nuevas pantallas",()=>{
  const version=JSON.parse(read("version.json")).version;
  assert.equal(version,"0.3.2");
  assert.equal(JSON.parse(read("package.json")).version,version);
  assert.equal(JSON.parse(read("package-lock.json")).version,version);
  assert.match(read("src/config.mjs"),/APP_VERSION="0\.3\.2"/);
  assert.match(html,/id="appVersion">0\.3\.2</);
  assert.match(read("sw.js"),/kontrola-integral-v033/);
});
