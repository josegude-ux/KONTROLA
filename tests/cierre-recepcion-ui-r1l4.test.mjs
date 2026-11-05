import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),app=read('src/app.mjs'),css=read('styles.css'),ui=read('src/cierre-recepcion-ui-lab.mjs'),sw=read('sw.js');
const excerpt=(begin,end)=>app.slice(app.indexOf(begin),app.indexOf(end));
test('UI LAB integrada en la pantalla REAL de recepción, sin duplicar el submenú',()=>{
 assert.equal((html.match(/id="controlRecepcionView"/g)||[]).length,1);
 assert.equal((html.match(/id="recepcionCierreLabView"/g)||[]).length,1);
 assert.match(html,/<section id="recepcionCierreLabView" class="view" hidden/);
 assert.match(app,/if\(RECEPCION_LAB\)labRecepcionUi\.open\(load\.codigo\)/);
});
test('UI recepción mantiene acceso de solo lectura empresarial original',()=>{
 assert.match(app,/else openLoad\(load\.codigo,\{source:recepcionRows,returnTo:"controlRecepcionView",readOnly:true\}\)/);
 assert.match(app,/client\.rpc\("kontrola_panel_cargas",\{p_almacen:warehouse\}\)/);
 assert.match(app,/if\(profile\?\.rol==="administrador"\)openAdminMenu\("controlRecepcionView"\)/);
});
test('LAB se ejecuta solo con query y hostname loopback; no modifica auth productivo',()=>{
 assert.match(app,/\["localhost","127\.0\.0\.1","\[::1\]"\]\.includes\(location\.hostname\)/);
 assert.match(app,/new URLSearchParams\(location\.search\)\.get\("visura15_recepcion_lab"\)==="1"/);
 assert.match(app,/if\(RECEPCION_LAB\)\{[\s\S]+?return;[\s\S]+?status\("authMessage","Conectando con el servidor…"\)/);
 assert.match(app,/client=createClient\(SUPABASE_URL,SUPABASE_KEY/);
});
test('LAB bloquea RPC empresariales de escritura mediante lista cerrada de lectura',()=>{
 const boot=excerpt('async function initialize()','$("loginForm").addEventListener');
 assert.match(boot,/if\(name!=='kontrola_panel_cargas'\)return \{data:null,error:Error\('RPC no disponible en LAB sintético'\)\}/);
 assert.doesNotMatch(boot,/supabase\.auth\.signIn|\.insert\(|\.update\(|\.upsert\(/);
});
test('LAB no registra service worker para evitar caché o persistencia empresarial',()=>{
 assert.match(app,/if\(!RECEPCION_LAB&&"serviceWorker" in navigator\)/);
 assert.match(sw,/v083-control-dos-flujos-r1l3-lab-0345/);
});
test('navegación permite volver a recepción y no cambia accesos de Operaciones',()=>{
 assert.match(app,/recepcionCierreLabView:"labVolverRecepcion"/);
 assert.match(ui,/id\('labVolverRecepcion'\)\.addEventListener/);
 assert.match(app,/\$\("cargasVerificar"\)\.addEventListener\("click",\(\)=>openReviewMenu\("cargasMenuView"\)\)/);
 assert.match(app,/\$\("openPreparation"\)\.addEventListener\("click",\(\)=>switchView\("preparacionMenuView"\)\)/);
});
test('UI cierre distingue acciones sin y con incidencias y mantiene ambas etiquetas',()=>{
 for(const id of ['labAbrir','labIncidenciaTipo','labLineaOriginal','labIncidenciaCantidad','labAgregarIncidencia','labCerrarSinIncidencias','labCerrarConIncidencias','labCierreHistorico','labCierreStatus'])
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(ui,/noIncidentsConfirmed:true/);assert.match(ui,/noIncidentsConfirmed:false/);
});
test('no se crea una RPC ni almacén sintético en el menú principal real',()=>{
 const original=read('RESPALDO_R1L4/index.html');
 const section=x=>x.match(/<section id="preparacionMenuView"[\s\S]*?<\/section>/)?.[0];
 assert.equal(section(html),section(original));
 const mainCard=x=>x.match(/<button id="openReview"[\s\S]*?<\/button>/)?.[0];
 assert.equal(mainCard(html),mainCard(original));
});
test('estilos accesibles LAB táctiles y foco visible sin alterar Maquetación A',()=>{
 assert.match(css,/#recepcionCierreLabView button\{min-height:44px/);
 assert.match(css,/#recepcionCierreLabView button:focus-visible/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.match(html,/id="labRecepcionBanner"[^>]*hidden/);
});
test('no hay conexión BC ni Supabase en controlador UI LAB o fixtures',()=>{
 const fixtures=read('lab/recepcion-fixtures.mjs');
 assert.doesNotMatch(ui+fixtures,/\.rpc\(|createClient\(|supabase\.co|businesscentral|\.insert\(|\.update\(|\.upsert\(|fetch\(/i);
});
