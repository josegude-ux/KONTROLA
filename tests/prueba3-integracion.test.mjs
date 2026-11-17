import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("PRUEBA_3 reemplaza el panel y conserva las seis funciones anteriores",()=>{
 const html=read("index.html");
 assert.equal((html.match(/id="cargasMenuView"/g)||[]).length,1);
 for(const id of ["prueba3Frame","prueba3Fullscreen","cargasFlujosLegacy","cargasConsultar","cargasPreparar","cargasVerificar","cargasHistorial","cargasImportar","cargasAdministrar"])
   assert.ok(html.includes('id="'+id+'"'),id);
});
test("PRUEBA_3 se abre desde Preparación y Control de Cargas usa checklist",()=>{
 const app=read("src/app.mjs");
 assert.ok(app.includes('$("openReview").addEventListener("click",()=>{void openChecklist();});'));
 assert.ok(app.includes('$("preparacionPrueba3").addEventListener("click",()=>{void openPrueba3Cargas();});'));
 assert.ok(read("index.html").includes('id="controlChecklistRoot"'));
 assert.ok(app.includes('$("openCargas").addEventListener("click",()=>{void openPrueba3Cargas();});'));
 assert.ok(app.includes('$("cargasFlujosLegacy").addEventListener("click",()=>openControlFlujos());'));
 assert.ok(app.includes('function openControlRecepcion()'));
 assert.ok(app.includes('cargasFrame.src="about:blank"'));
});
test("PRUEBA_3 mantiene frío y separa persistencia por usuario",()=>{
 const source=read("control-cargas-prueba3.html");
 assert.ok(source.includes("Control de Cargas - Prueba integrada 3"));
 assert.ok(source.includes("FRÍO"));
 assert.ok(source.includes("if(!VISURA_SCOPE)"));
 for(const k of ["control_cargas_originales_prueba_integrada_2","control_cargas_prueba_integrada_2","control_cargas_operarios_prueba_2"])
   assert.ok(source.includes(k+"'"+ "+VISURA_SCOPE"),k);
});
test("Versión 0.3.51 y módulo incluidos en GitHub Pages",()=>{
 assert.equal(JSON.parse(read("version.json")).version,"0.3.51");
 assert.equal(JSON.parse(read("package.json")).version,"0.3.51");
 assert.ok(read("src/config.mjs").includes('APP_VERSION="0.3.51"'));
 assert.ok(read("sw.js").includes('"./control-cargas-prueba3.html"'));
 assert.ok(read(".github/workflows/pages.yml").includes("cp index.html styles.css manifest.webmanifest sw.js version.json control-cargas-prueba3.html dist/"));
});
