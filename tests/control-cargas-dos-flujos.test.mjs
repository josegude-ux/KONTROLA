import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {fechaAcreditada,fechaCargaAcreditada,fechaRecepcionAcreditada,fechaOperativa,verificablesHoy,sinFechaVerificables,pendientesRecepcion,resetJornada,esVerificablePor} from '../src/control-cargas-jornada.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(resolve(root,f),'utf-8');
const html=read('index.html'),js=read('src/app.mjs'),css=read('styles.css'),sw=read('sw.js');
const warehouse='COR_01_COR', otherWarehouse='COR_02_FER', userId='verificador-1';
const load=(code,fecha,extra={})=>({codigo:code,fecha,almacen:warehouse,preparador_id:'preparador-1',verificador_id:null,estado:'preparada',incidencias_pendientes:0,...extra});

test('las dos acciones del submenú exterior son únicamente En preparación y En recepción',()=>{
 const node=html.match(/<section id="controlCargasFlujosView"[\s\S]*?<\/section>/)?.[0];assert.ok(node);
 assert.deepEqual([...node.matchAll(/<button id="(controlEnPreparacion|controlEnRecepcion)"/g)].map(x=>x[1]),['controlEnPreparacion','controlEnRecepcion']);
 assert.match(js,/\$\("openReview"\)\.addEventListener\("click",\(\)=>openControlFlujos\(\)\)/);
});
test('no se alteran id y recursos de la tarjeta principal',()=>{
 const original=read('RESPALDO_R1L3/index.html');
 const card=x=>x.match(/<button id="openReview"[\s\S]*?<\/button>/)?.[0];
 assert.equal(card(html),card(original));
});
test('navegación original de Operaciones y submenú Preparación permanece',()=>{
 assert.match(js,/\$\("cargasVerificar"\)\.addEventListener\("click",\(\)=>openReviewMenu\("cargasMenuView"\)\)/);
 assert.match(js,/\$\("openCargas"\)\.addEventListener\("click",\(\)=>switchView\("cargasMenuView"\)\)/);
 assert.match(js,/\$\("openPreparation"\)\.addEventListener\("click",\(\)=>switchView\("preparacionMenuView"\)\)/);
 assert.match(js,/reviewLoadsParent=parent/);assert.match(js,/switchView\(reviewLoadsParent\)/);
 assert.match(js,/controlCargasFlujosView:"backFromControlFlujos"/);
 assert.match(js,/controlRecepcionView:"backFromControlRecepcion"/);
});
test('solo cuenta cargas verificables con fecha acreditada y almacén autorizado',()=>{
 const rows=[load('A','2026-11-05'),load('B','2026-11-05'),load('C','2026-11-05'),load('AYER','2026-11-04'),load('SIN_FECHA',''),load('OTRO_ALMACEN','2026-11-05',{almacen:otherWarehouse}),load('OTRO_USUARIO','2026-11-05',{preparador_id:userId}),load('OTRO_VERIFICADOR','2026-11-05',{verificador_id:'otro'})];
 assert.deepEqual(verificablesHoy(rows,{hoy:'2026-11-05',almacen:warehouse,userId}).map(x=>x.codigo),['A','B','C']);
 assert.deepEqual(sinFechaVerificables(rows,{almacen:warehouse,userId}).map(x=>x.codigo),['SIN_FECHA']);
});
test('si el día no tiene carga el contador es 0; poner a cero dos veces no borra las tres',()=>{
 const rows=['A','B','C'].map(x=>load(x,'2026-11-05'));
 assert.equal(verificablesHoy(rows,{hoy:'2026-11-06',almacen:warehouse,userId}).length,0);
 for(let i=0;i<2;i++){
   const state=resetJornada({instant:new Date('2026-11-05T10:00:00Z')});
   assert.deepEqual(state,{fecha:'2026-11-05',busqueda:''});
   assert.equal(verificablesHoy(rows,{hoy:state.fecha,almacen:warehouse,userId}).length,3);
 }
 assert.equal(rows.length,3);
});
test('la fecha no se infiere desde reloj ni una fecha inexistente',()=>{
 assert.equal(fechaCargaAcreditada(load('X','',{preparacion_inicio:'2026-11-05T09:00:00+01:00'})),null);
 assert.equal(fechaAcreditada('2026-02-29'),null);
 assert.equal(fechaAcreditada('2024-02-29'),'2024-02-29');
 assert.equal(fechaAcreditada('2026-11-05T09:00:00Z'),null);
 assert.equal(fechaCargaAcreditada(load('X','2026-11-05',{fecha_carga:'2026-11-04'})),null);
});
test('el cambio de fecha Europe/Madrid y el horario de verano no usan UTC ingenuo',()=>{
 assert.equal(fechaOperativa(new Date('2026-11-05T23:30:00Z')),'2026-11-06');
 assert.equal(fechaOperativa(new Date('2026-03-29T22:30:00Z')),'2026-03-30');
 assert.equal(fechaOperativa(new Date('2026-03-28T23:30:00Z')),'2026-03-29');
});
test('incidencias abiertas siguen pendientes tras cerrar la carga',()=>{
 const rows=[load('A','2026-11-04',{estado:'cerrada',incidencias_pendientes:2}),load('B','2026-11-03',{estado:'cerrada',incidencias_pendientes:0}),load('C','2026-11-01',{estado:'preparada'}),load('D','2026-11-05',{estado:'verificacion_en_curso'}),load('E','2026-11-05',{estado:'publicada'})];
 assert.deepEqual(pendientesRecepcion(rows,{almacen:warehouse}).map(x=>x.codigo),['A','C','D']);
 assert.equal(rows[0].incidencias_pendientes,2);
});
test('en recepción nunca se inventa una fecha de llegada',()=>{
 assert.equal(fechaRecepcionAcreditada(load('A','2026-11-05')),null);
 assert.equal(fechaRecepcionAcreditada(load('A','2026-11-05',{fecha_recepcion:'2026-11-06'})),'2026-11-06');
 assert.equal(fechaRecepcionAcreditada(load('A','2026-11-05',{fecha_recepcion:'ayer'})),null);
});
test('roles: no se permite verificarse a sí mismo ni otra persona ya asignada',()=>{
 assert.equal(esVerificablePor(load('A','2026-11-05'),userId),true);
 assert.equal(esVerificablePor(load('A','2026-11-05',{preparador_id:userId}),userId),false);
 assert.equal(esVerificablePor(load('A','2026-11-05',{verificador_id:'otra'}),userId),false);
 assert.equal(esVerificablePor(load('A','2026-11-05',{verificador_id:userId}),userId),true);
});
test('no hay llamadas operativas de escritura en el helper de jornada',()=>{
 const helper=read('src/control-cargas-jornada.mjs');
 assert.doesNotMatch(helper,/\.rpc\(|\.insert\(|\.delete\(|\.update\(|\.upsert\(|localStorage|sessionStorage|fetch\(/);
 assert.match(js,/\$\("resetReviewDay"\)\.addEventListener\("click",/);
 assert.match(js,/refreshReviewLoads\(\)\.catch/);
});
test('en recepción solo consulta panel existente, no activa cerrar entrega o incidencia',()=>{
 const block=js.slice(js.indexOf('async function refreshControlRecepcion()'),js.indexOf('async function openAdminMenu('));
 assert.match(block,/client\.rpc\("kontrola_panel_cargas",\{p_almacen:warehouse\}\)/);
 assert.doesNotMatch(block,/\.from\(|\.upsert\(|\.insert\(|\.delete\(|\.update\(|finalizar_verificacion|registrar_linea|cierre_reparto/);
 assert.match(js,/if\(profile\?\.rol==="administrador"\)openAdminMenu\("controlRecepcionView"\)/);
});
test('el acceso al historial guarda el padre y conserva días anteriores',()=>{
 assert.match(js,/function openHistoryFrom\(parent\)/);
 assert.match(js,/historyParent=parent/);
 assert.match(js,/switchView\(historyParent\)/);
 assert.match(js,/\$\("recepcionHistorial"\)\.addEventListener/);
 assert.match(js,/\$\("reviewHistory"\)\.addEventListener/);
});
test('filtros de almacén y resultados tardíos tienen guardas de identidad',()=>{
 assert.match(js,/if\(!validRequest\(warehouse,userId\)\)return/);
 assert.match(js,/pendientesRecepcion\(data\|\|\[\],\{almacen:warehouse\}\)/);
 assert.match(js,/verificablesHoy\(reviewLoads,\{hoy,almacen:selectedWarehouse,userId:user\?\.id\}\)/);
});
test('revisión accesible: tab, botones táctiles, estilos y precache preservados',()=>{
 for(const id of ['controlEnPreparacion','controlEnRecepcion','resetReviewDay','reviewHistory','recepcionHistorial','backFromControlFlujos','backFromControlRecepcion'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(css,/#controlCargasFlujosView \.submenu-card:focus-visible/);
 assert.match(css,/min-height:44px/);
 assert.match(sw,/src\/control-cargas-jornada\.mjs/);
 assert.match(sw,/v083-control-dos-flujos-r1l3-lab-0345/);
});
test('no se cambia la maqueta del submenú Preparación A',()=>{
 const original=read('RESPALDO_R1L3/index.html');
 const section=x=>x.match(/<section id="preparacionMenuView"[\s\S]*?<\/section>/)?.[0];
 assert.equal(section(html),section(original));
});
