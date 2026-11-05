import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p));
const html=read('index.html').toString();
const sw=read('sw.js').toString();
const app=read('src/app.mjs').toString();
const kitCss=read('assets/css/visura15-subpreparacion-a-r1l1.css').toString();
const mainCss=read('styles.css').toString();
const expected={
 'assets/css/visura15-subpreparacion-a-r1l1.css':'9c66729a8744cbb4ad372a71fb1b35d6015570883b1d73543d6f5f7344180575',
 'assets/preparacion-a-r1l1/hero.webp':'6ee786d3b802d72b9f1901b4c97ebbeed7d9f570d588feceebb2e079e4270289',
 'assets/preparacion-a-r1l1/cargas.webp':'96172ef3b699f6cd3d33c89bd5d271120882bb0f7584e07cba6f9bc640518628',
 'assets/preparacion-a-r1l1/consulta.webp':'943eb08cf3a8489532bb213be936c881f2cb13d7559bfb1acc8f6c0114420f81',
 'assets/preparacion-a-r1l1/movimientos.webp':'7490769c1d067042ba2166ddd353456081917ed30ce462dae7e59431842986ee'
};
for(const [path,sha] of Object.entries(expected)) {
 test(`asset íntegro en LAB: ${path}`,()=>{
   assert.ok(existsSync(resolve(root,path)));
   const bytes=read(path);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
   if(path.endsWith('.webp')){
     assert.equal(bytes.toString('ascii',0,4),'RIFF');
     assert.equal(bytes.toString('ascii',8,12),'WEBP');
   }
 });
}
test('el CSS entregado se mantiene idéntico y acotado a v15-subprep',()=>{
 assert.match(kitCss,/\.v15-subprep__hero/);
 assert.match(kitCss,/\.v15-subprep__card--cargas/);
 assert.match(kitCss,/\.v15-subprep__card--consulta/);
 assert.match(kitCss,/\.v15-subprep__card--movimientos/);
 assert.doesNotMatch(kitCss,/#homeView|#cargasMenuView|#tanques|#inventa/i);
});
test('el CSS de acoplamiento solo alcanza al submenú, no al principal',()=>{
 const suffix=mainCss.slice(mainCss.indexOf('/* VISURA-15-SUBMENU-PREPARACION-MAQUETACION-A-001'));
 assert.match(suffix,/#preparacionMenuView\.v15-subprep/);
 assert.doesNotMatch(suffix,/#homeView|#cargasMenuView|#tanques|#inventa/i);
});
test('el submenú real tiene tres botones reutilizados en el orden aprobado',()=>{
 const s=html.match(/<section id="preparacionMenuView"[\s\S]*?<\/section>/)?.[0];
 assert.ok(s);
 assert.match(s,/class="view v15-subprep" hidden/);
 const ids=[...s.matchAll(/<button id="(preparacion(?:Cargas|Articulos|Movimientos))"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['preparacionCargas','preparacionArticulos','preparacionMovimientos']);
 assert.match(s,/<h1 class="v15-subprep__heading">Preparación<\/h1>/);
 assert.match(s,/data-back="home"/);
});
for(const [id,klass,title] of [
 ['preparacionCargas','cargas','Preparación de cargas'],
 ['preparacionArticulos','consulta','Consulta de artículos'],
 ['preparacionMovimientos','movimientos','Movimientos']
]){
 test(`${id} conserva su botón, nombre accesible y clase gráfica`,()=>{
  const markup=html.match(new RegExp(`<button id="${id}"[^>]*>[\\s\\S]*?<\\/button>`))?.[0];
  assert.ok(markup);assert.match(markup,/type="button"/);
  assert.ok(markup.includes(`v15-subprep__card--${klass}`));
  assert.ok(markup.includes(title));
  assert.match(markup,/aria-hidden="true"/);
  assert.match(markup,/<svg/);
  assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
 });
}
test('conserva listeners existentes, lectura permitida y borrador sin mutar BC',()=>{
 assert.match(app,/\$\("preparacionCargas"\)\.addEventListener\("click",\(\)=>openLoadsMenu\("preparacionMenuView"\)\)/);
 assert.match(app,/\$\("preparacionArticulos"\)\.addEventListener\("click"/);
 assert.match(app,/\$\("preparacionMovimientos"\)\.addEventListener\("click"/);
 assert.match(app,/preparacionArticulosView:"backFromPreparacionArticulos"/);
 assert.match(app,/preparacionMovimientosView:"backFromPreparacionMovimientos"/);
 const lib=read('src/prepara-consulta.mjs').toString();
 assert.doesNotMatch(lib,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
});
test('la base JS de Preparación A está respaldada y sus listeners originales se conservan',()=>{
 const bytes=read('RESPALDO_R1L3/src/app.mjs');
 const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
 assert.equal(blob,'bf14055fc92f59add5e139e1ea3b8f52620342fe');
 for(const id of ['preparacionCargas','preparacionArticulos','preparacionMovimientos']){
  assert.match(app,new RegExp('\\$\\("'+id+'"\\)\\.addEventListener'));
 }
});
test('no cambia la cabecera, ajustes ni el pie de página',()=>{
 assert.match(html,/<button type="button" id="globalBack"/);
 assert.match(html,/id="connectionStatus"/);
 assert.match(html,/id="openSettings"/);
 assert.match(html,/Los datos de picking se gestionan en Business Central/);
});
test('estilos y precaché de 5 recursos se referencian una única vez',()=>{
 assert.equal(html.split('<link rel="stylesheet" href="./assets/css/visura15-subpreparacion-a-r1l1.css">').length-1,1);
 for(const path of Object.keys(expected)){
  assert.equal(sw.split('"./'+path+'"').length-1,1,path);
 }
 assert.match(sw,/kontrola-integral-visura-v083-control-dos-flujos-r1l3-lab-0345/);
});
test('contraste mínimo AA de blanco sobre fondos de tarjetas',()=>{
 const lum=(hex)=>{
  const values=hex.match(/.{2}/g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
 };
 for(const hex of ['b60d17','0069b9','7534a9','0b365a'])assert.ok(1.05/(lum(hex)+0.05)>=4.5,hex);
});
