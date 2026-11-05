import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=rd('src/cierre-recepcion-ui-lab.mjs'),app=rd('src/app.mjs'),css=rd('styles.css');
test('L5 UI: panel de informe aparece exclusivamente al cargar módulo LAB',()=>{
 assert.match(ui,/function createReportPanel\(\)/);assert.match(ui,/id\('controlRecepcionView'\)\.appendChild\(panel\)/);
 assert.match(app,/if\(RECEPCION_LAB\)\{/);assert.match(app,/await import\('\.\/cierre-recepcion-ui-lab\.mjs'\)/);
});
test('L5 UI: permisos de lectura se revalidan para descargar',()=>{
 assert.match(ui,/service\.list\(actor\(\),warehouse\(\),\{pendingOnly:false\}\)/);
 assert.match(ui,/service\.exportLab\(actor\(\),warehouse\(\)\)/);
});
test('L5 UI: cada operación actualiza informe sin alterar cierre',()=>{
 assert.match(ui,/render\(\);refreshReport\(\)/);
 assert.match(ui,/noIncidentsConfirmed:true/);assert.match(ui,/noIncidentsConfirmed:false/);
 assert.match(ui,/createReportPanel\(\);createEvidencePanel\(\);refreshReport\(\)/);
});
test('L5 UI: acceso denegado limpia estado del informe y bloquea descarga',()=>{
 assert.match(ui,/button\.disabled=true;summary\.textContent='Informe no disponible para esta selección\.'/);
 assert.match(ui,/catch\(error\)\{summary\.textContent='Informe no accesible: '/);
});
test('L5 UI: solo exporta CSV con Blob local y no invoca servicios externos',()=>{
 assert.match(ui,/new Blob\(\[csvInformeRecepcionLab\(report\)\]/);
 assert.match(ui,/URL\.createObjectURL\(blob\)/);assert.doesNotMatch(ui,/fetch\(|\.rpc\(|\.insert\(|\.upsert\(|\.delete\(/);
});
test('L5 UI: foco/tamaño táctil y scope CSS exclusivos de informe',()=>{
 assert.match(css,/#labInformePanel button\{min-height:44px/);
 assert.match(css,/#labInformePanel button:focus-visible/);
});
test('L5 UI: Maquetación A y menú Preparación sin modificación de HTML',()=>{
 assert.match(rd('index.html'),/id="recepcionCierreLabView"/);
 assert.doesNotMatch(app,/import .*cierre-recepcion-informe-lab/);
 assert.match(rd('index.html'),/id="preparacionMenuView"/);
 assert.match(rd('index.html'),/id="openReview"/);
});
