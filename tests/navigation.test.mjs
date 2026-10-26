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
  assert.equal(version,"0.3.33");
  assert.equal(JSON.parse(read("package.json")).version,version);
  assert.equal(JSON.parse(read("package-lock.json")).version,version);
  assert.ok(read("src/config.mjs").includes(`APP_VERSION="${version}"`));
  assert.ok(html.includes(`id="appVersion">${version}<`));
  assert.match(read("sw.js"),/kontrola-integral-visura-v066/);
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

test("Mi actividad muestra solo contadores, sin listado de eventos con fecha y hora",()=>{
 assert.match(html,/id="operatorSummary"/);
 assert.doesNotMatch(html,/id="operatorActivity"/);
 const start=app.indexOf("async function refreshOperatorDashboard()");
 const end=app.indexOf("async function initialize()",start);
 assert.ok(start>=0&&end>start);
 const dashboard=app.slice(start,end);
 assert.match(dashboard,/kontrola_resumen_zona/);
 assert.doesNotMatch(dashboard,/kontrola_actividad|creado_en|toLocaleString/);
});

test("inicio visual inspirado en INVENTA conserva rutas, permisos y estados",()=>{
  assert.match(html,/class="home-grid inventa-inspired-home"/);
  for(const id of ["openPreparation","openReview","openCargas","openAdmin"]){
    assert.match(html,new RegExp('id="'+id+'"[^>]*class="feature'));
    assert.match(app,new RegExp('\\$\\("'+id+'"\\)\\.addEventListener'));
  }
  assert.match(html,/id="openAdmin"[^>]*hidden/);
  assert.match(html,/id="operatorSummary"/);
  assert.match(html,/id="homeWarehouse"/);
  assert.match(css,/inventa-inspired-home/);
});

test("KONTROLA usa cuatro imágenes 3D exclusivas, distintas y precargadas sin conexión",()=>{
 const names=["preparacion","verificacion","control-cargas","administracion"];
 const images=names.map(name=>{
   const asset="assets/home/kontrola-"+name+"-3d.webp";
   const official={preparacion:"preparacion",verificacion:"control-cargas","control-cargas":"operaciones",administracion:"administracion"}[name];
   assert.match(html,new RegExp('src="\\./assets/home/visura-prepara-'+official+'-3d\\.webp"'));
   assert.match(read("sw.js"),new RegExp('\\./assets/home/visura-prepara-'+official+'-3d\\.webp'));
   const bytes=readFileSync(new URL("../"+asset,import.meta.url));
   assert.ok(bytes.length>10000,asset+" debe tener contenido gráfico");
   assert.equal(bytes.subarray(0,4).toString("ascii"),"RIFF");
   assert.equal(bytes.subarray(8,12).toString("ascii"),"WEBP");
   return bytes.toString("base64");
 });
 assert.equal(new Set(images).size,4,"No repetir diseños entre tarjetas");
 assert.equal(html.includes("raw.githubusercontent.com/josegude-ux/INVENTA-"),false);
 assert.doesNotMatch(read("sw.js"),/ORIGINAL_INVENTA_IMAGES/);
 for(const id of ["openPreparation","openReview","openCargas","openAdmin"]){
   assert.match(html,new RegExp('id="'+id+'"[^>]*class="feature'));
 }
 assert.match(html,/id="openAdmin"[^>]*hidden/);
});

test("preparación recupera inicio automático con reloj del servidor y consulta sin mutaciones",()=>{
  assert.match(html,/id="prepClock"[^>]*role="timer"/);
  assert.match(app,/async function startCurrentPreparation\(\)/);
  assert.match(app,/p_request_id:crypto\.randomUUID\(\)/);
  assert.match(app,/if\(!currentReadOnly&&!currentPreparation\.active&&!currentPreparation\.finalized&&load\.estado==="publicada"\)/);
  assert.match(app,/await startCurrentPreparation\(\)/);
  assert.match(app,/currentReadOnly=readOnly\|\|assignedToOther/);
  assert.match(app,/formatPreparationDuration\(current\.preparacion_inicio/);
  assert.match(app,/setInterval\(\(\)=>/);
  assert.match(app,/if\(id!=="detailView"\)stopPreparationClock\(\)/);
  assert.match(app,/function openLoadsMenu\(parent="homeView",mode="preparacion"\)/);
  assert.match(app,/openLoadsMenu\("cargasMenuView","consulta"\)/);
});
test("Volver fijo arriba a la izquierda es común a todas las vistas operativas",()=>{
  assert.match(html,/id="globalBack"[^>]*hidden/);
  assert.match(css,/#shell \.topbar \.topbar-back/);
  assert.match(css,/#shell \.view \.page-heading>\.back-button\{display:none\}/);
  assert.match(css,/\.report-view \.report-controls\{position:sticky/);
  for(const id of ["cargasHistoryView","loadsView","detailView","reviewLoadsView","reviewDetailView"]){
    assert.match(app,new RegExp(id+':"back'));
  }
  assert.match(app,/view==="adminView"\)switchView\(adminParent\)/);
  assert.match(app,/\$\("globalBack"\)\.hidden=id==="homeView"/);
});
test("las cargas nunca se indican como borradas cuando falla el resumen o se cambia de almacén",()=>{
  assert.match(html,/id="operatorSummaryStatus"/);
  assert.match(html,/id="homeWarehouse"/);
  assert.match(html,/id="refreshHomeSummary"/);
  assert.match(app,/No se han podido consultar las cargas de/);
  assert.match(app,/Los datos del servidor no se han borrado/);
  assert.match(app,/mostrar cero no significa que los datos se hayan eliminado/);
  assert.match(app,/warehouses\.find\(item=>item\.codigo===warehouse\)/);
});

test("almacenes visibles y filtros claros",()=>{
 for(const id of ["loadsWarehouseHint","reviewWarehouseHint"])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/function updateWarehouseLabels/);
 assert.match(app,/No hay cargas publicadas en /);
 assert.match(app,/No hay cargas verificables por este usuario en /);
 assert.match(html,/Al seleccionar una carga publicada se inicia automáticamente/);
 assert.match(app,/\$\("loadSearch"\)\.value=""/);
 assert.match(app,/\$\("reviewSearch"\)\.value=""/);
});

test("preparación muestra la matrícula destacada y el cálculo desglosado existente",()=>{
  assert.match(app,/desglosarBultos\(r\.productos\)/);
  assert.match(app,/Bultos desglosados:/);
  assert.match(app,/Sin desglose disponible/);
  assert.doesNotMatch(app,/bundles\.textContent="Bultos: "/);
  assert.match(app,/plateValue\.textContent=r\.matricula/);
  assert.match(css,/\.load-plate-label\{/);
  assert.match(css,/\.load-plate-value\{/);
});

test("la preparación sitúa bultos totales sobre el peso con la misma jerarquía visual",()=>{
  const start=app.indexOf("function renderLoadList()");
  const end=app.indexOf("// Historial de lectura",start);
  const preparation=app.slice(start,end);
  assert.match(preparation,/totalBultosDelDesglose\(breakdown\)/);
  assert.match(preparation,/total\.textContent=totalBultos===null\?"— bultos"/);
  assert.ok(preparation.indexOf("summary.append(total,weight)")>0);
  assert.match(css,/#loadsList \.load-card-summary\{/);
  assert.match(css,/#loadsList \.load-bundles-total\{font-weight:800;font-size:16px/);
  assert.match(css,/\.load-weight\{font-weight:800;font-size:16px/);
});

test("los huecos del camión aparecen junto a matrícula con G y P",()=>{
  const start=app.indexOf("function renderLoadList()");
  const end=app.indexOf("// Historial de lectura",start);
  const preparation=app.slice(start,end);
  assert.match(preparation,/vehicle\.append\(plate,pallets\)/);
  assert.match(preparation,/palletsValue\.textContent=formatearHuecosPalets\(r\.huecos_palets_grandes,r\.huecos_palets_pequenos,r\.huecos_palets_total\)/);
  assert.match(preparation,/HUECOS PALÉS/);
  assert.doesNotMatch(preparation,/palets_para_carga/);
  assert.match(css,/#loadsList \.load-vehicle\{/);
  assert.match(css,/#loadsList \.load-pallets\{/);
});

test("la lista usa la cabecera de la revisión vigente del mismo almacén",()=>{
  const refresh=app.slice(app.indexOf("async function refreshLoads()"),app.indexOf("function renderLoadList()"));
  assert.match(refresh,/\.from\("kontrola_carga_revisiones"\)/);
  assert.match(refresh,/\.eq\("vigente",true\)\.eq\("almacen",warehouse\)/);
  assert.match(refresh,/if\(!validRequest\(warehouse,userId\)\)return/);
  assert.match(refresh,/observaciones:carga_datos->>observaciones/);
  assert.match(refresh,/huecos_palets_grandes:carga_datos->>huecos_palets_grandes/);
  const list=app.slice(app.indexOf("function renderLoadList()"),app.indexOf("// Historial de lectura"));
  assert.match(list,/id\.textContent=r\.codigo\+\(observaciones\?" - "\+observaciones:""\)/);
  assert.match(list,/r\.observaciones/);
  assert.doesNotMatch(list,/innerHTML/);
});

test("la importación conserva las observaciones y los huecos del PDF sin migraciones",()=>{
  const admin=read("src/admin.mjs");
  assert.match(admin,/observaciones:parsed\.observations\?\.trim\(\)\|\|null/);
  assert.match(admin,/huecos_palets_grandes:parsed\.palletsLarge/);
  assert.match(admin,/huecos_palets_pequenos:parsed\.palletsSmall/);
  assert.match(admin,/observations:payload\.observaciones/);
  assert.match(read("src/core.mjs"),/leerObservacionesCabecera\(pages\)/);
});
