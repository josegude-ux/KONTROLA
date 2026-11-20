import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const r7=read("lab/visura-prepara-impresion-r7.html");
const html=read("index.html");
const admin=read("src/admin.mjs");
const app=read("src/app.mjs");
const sw=read("sw.js");
const workflow=read(".github/workflows/pages.yml");

test("R7 original integrado sin replicar los algoritmos de impresión",()=>{
 assert.match(r7,/Fuente HTML SHA256: 4d427ee7c3bf774d884600423d933a4a0e8fce0bd127a80dbc62f6abe32a3745/);
 for(const fn of ["parseDocumentPages","recortarMercancia","planCombined",
   "planHojasFrioCoruna","crearDocumentoDuplex","printPrepared","platesByWeightHTML",
   "deliverySheetHTML","registrarListadosGenerados"]){
   assert.match(r7,new RegExp("\\b"+fn+"\\b"));
 }
 assert.match(r7,/id="generateAll"/);
 assert.match(r7,/id="coldDestinations"/);
});

test("datos R7 locales aislados por usuario+almacén, nunca claves antiguas",()=>{
 assert.match(r7,/VISURA_SCOPE = new URLSearchParams\(location.search\)/);
 assert.match(r7,/\^\[a-f0-9\]\{24\}\$/);
 assert.match(r7,/DB_NAME='visura_prepara_r7_originales_'\+VISURA_SCOPE/);
 assert.match(r7,/KEY='visura_prepara_r7_cargas_'\+VISURA_SCOPE/);
 assert.match(r7,/OPKEY='visura_prepara_r7_operarios_'\+VISURA_SCOPE/);
 assert.doesNotMatch(r7,/const KEY='control_cargas_prueba_integrada_2'/);
 assert.doesNotMatch(r7,/const DB_NAME='control_cargas_originales_prueba_integrada_2'/);
});

test("un solo acceso principal dentro de Administración > Impresión",()=>{
 assert.equal(html.split('id="visuraR7PrintFrame"').length-1,1);
 assert.match(html,/id="adminSection2"[\s\S]*id="visuraR7PrintFrame"[\s\S]*id="batchPrintPanel"/);
 assert.match(html,/id="visuraLegacyPrintDetails"/);
 assert.equal(html.split('id="preparacionImpresionR7Shortcut"').length-1,1);
 assert.match(app,/visible\(\$\("preparacionImpresionR7Shortcut"\),ownProfile\.rol==="administrador"\)/);
 assert.match(app,/\$\("preparacionImpresionR7Shortcut"\)\.addEventListener/);
 assert.match(app,/document\.querySelector\('\[data-admin-tab="2"\]'\)\?\.click\(\)/);
 assert.match(html,/No se sincronizan todavía/);
 assert.match(admin,/async function mostrarMotorR7/);
 assert.match(admin,/getUser\(\)\?\.id/);
 assert.match(admin,/new TextEncoder\(\)\.encode\("visura-prepara-r7:"\+current\+":"\+warehouse\)/);
 assert.match(admin,/frame\.src="\.\/lab\/visura-prepara-impresion-r7\.html\?visura_scope="\+scope/);
 assert.match(admin,/cerrarMotorR7\(\)/);
 assert.doesNotMatch(admin,/postMessage\([^\n]*access_token|session\.access_token/);
});

test("el deploy de VISURA empaqueta y precarga el R7 original",()=>{
 assert.match(workflow,/cp lab\/visura-prepara-impresion-r7\.html dist\/lab\//);
 assert.match(sw,/"\.\/lab\/visura-prepara-impresion-r7\.html"/);
 assert.match(workflow,/test -s dist\/lab\/visura-prepara-impresion-r7\.html/);
});
