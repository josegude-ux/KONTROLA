import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/cierre-recepcion-ui-lab.mjs'),css=read('styles.css'),service=read('src/cierre-recepcion-lab-service.mjs');
test('L6 UI: botón creado sólo en pantalla LAB de detalle',()=>{
 assert.match(ui,/function createEvidencePanel\(\)/);
 assert.match(ui,/id\('recepcionCierreLabView'\)\.appendChild\(panel\)/);
 assert.match(ui,/createReportPanel\(\);createEvidencePanel\(\);refreshReport\(\)/);
});
test('L6 UI: cada exportación vuelve a validar RETURN_READ y almacén',()=>{
 assert.match(ui,/service\.get\(actor\(\),current,warehouse\(\)\)/);
 assert.match(service,/permitted\(actorId,loadId,warehouse,'RETURN_READ'\)/);
});
test('L6 UI: descarga JSON es local, con nombre de archivo acotado',()=>{
 assert.match(ui,/new Blob\(\[JSON\.stringify\(evidence,null,2\)/);
 assert.match(ui,/application\/json;charset=utf-8/);
 assert.match(ui,/\.replace\(\/\[\^a-zA-Z0-9_-\]\/g,'_'\)/);
});
test('L6 UI: el botón no crea comandos ni modifica el cierre',()=>{
 const section=ui.slice(ui.indexOf('function createEvidencePanel()'),ui.indexOf('function refreshReport()'));
 assert.doesNotMatch(section,/service\.(open|incident|close)\(/);
 assert.doesNotMatch(section,/fetch\(|\.rpc\(|\.insert\(|\.delete\(/);
});
test('L6 UI: no duplica los botones de las tres funciones previas',()=>{
 const html=read('index.html'),app=read('src/app.mjs');
 for(const id of ['preparacionCargas','preparacionArticulos','preparacionMovimientos','openReview'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(app,/function openControlRecepcion\(/);
});
test('L6 UI: estado sin selección desactiva botón',()=>assert.match(ui,/id\('labExpedienteDescargar'\)\.disabled=!current/));
test('L6 UI: contorno de foco y altura táctil accesible',()=>{
 assert.match(css,/#labExpedientePanel button\{min-height:44px/);
 assert.match(css,/#labExpedientePanel button:focus-visible/);
});
