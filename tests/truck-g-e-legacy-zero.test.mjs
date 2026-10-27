import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {extraerFormatoCamion} from "../src/core.mjs";
import {cargaHuecosPendientes,cabeceraLeida} from "../src/legacy-header.mjs";
import {capacidadDeCarga,evaluarHuecosCamion} from "../src/palet-viabilidad.mjs";
import {formatearHuecosPalets} from "../src/logic.mjs";

const validRoute="documentos/LP26-19735/"+"a".repeat(64)+".pdf";
const load={codigo:"LP26-19735",almacen:"COR_01_COR",documento_ruta:validRoute,
  huecos_palets_total:"0",huecos_palets_grandes:null,huecos_palets_pequenos:null};

test("camión 8G 4E del original prevalece sobre campo independiente de huecos cero",()=>{
 const parsed=extraerFormatoCamion("CR4863JPP CAMION VOLDIS-8G 4E","0");
 assert.deepEqual(parsed,{palletsLarge:8,palletsSmall:null,palletsEuropean:4,palletsTotal:null});
 assert.equal(formatearHuecosPalets(8,null,null,4),"8 G · 4 E");
});
test("G y E admite formato pegado, con separador o espacios",()=>{
 for(const label of ["8G4E","8G 4E","8G-4E","8G/4E","8 G 4 E"]){
   const result=extraerFormatoCamion("Camion modelo "+label,"0");
   assert.equal(result.palletsLarge,8,label);
   assert.equal(result.palletsEuropean,4,label);
   assert.equal(result.palletsSmall,null,label);
 }
});
test("8G 4P permanece pequeño P, nunca europeo E",()=>{
 const result=extraerFormatoCamion("8G 4P","0");
 assert.equal(result.palletsLarge,8);
 assert.equal(result.palletsSmall,4);
 assert.equal(result.palletsEuropean,null);
 assert.equal(formatearHuecosPalets(8,4,null),"8 G · 4 P");
});
test("G sin segundo formato no inventa europeos ni pequeños",()=>{
 const result=extraerFormatoCamion("CAMION 8G","0");
 assert.equal(result.palletsLarge,8);
 assert.equal(result.palletsSmall,null);
 assert.equal(result.palletsEuropean,null);
});
test("un cero almacenado no impide recuperar el PDF con ruta verificada",()=>{
 assert.equal(cargaHuecosPendientes(load),true);
 assert.equal(cargaHuecosPendientes({...load,huecos_palets_europeos:4}),false);
 assert.equal(cargaHuecosPendientes({...load,documento_ruta:"otra-ruta.pdf"}),false);
 const read=cabeceraLeida(load,{id:load.codigo,warehouse:load.almacen,
   palletsLarge:8,palletsEuropean:4,palletsSmall:null,palletsTotal:null},load.almacen);
 assert.equal(read.huecos_palets_grandes,8);
 assert.equal(read.huecos_palets_europeos,4);
 assert.equal(read.huecos_palets_pequenos,null);
 assert.equal(cabeceraLeida(load,{id:"LP26-99999",warehouse:load.almacen},load.almacen),null);
});
test("la capacidad 8G 4E es del camión; NO autoriza adivinar palés actuales",()=>{
 const cap=capacidadDeCarga({huecos_palets_grandes:"8",huecos_palets_europeos:"4",huecos_palets_total:null});
 assert.equal(cap.modo,"desglose");
 assert.equal(cap.segundoTipo,"E");
 assert.equal(cap.grandes,8);
 assert.equal(cap.europeos,4);
 assert.equal(evaluarHuecosCamion({modo:"desglose",segundoTipo:"E",previas:"no",
   capacidadG:8,capacidadP:4,actualG:"",actualP:""}).estado,"incompleto");
 const result=evaluarHuecosCamion({modo:"desglose",segundoTipo:"E",previas:"si",
   capacidadG:8,capacidadP:4,anterioresG:6,anterioresP:1,actualG:2,actualP:3});
 assert.equal(result.estado,"viable");
 assert.deepEqual(result.filas.map(x=>x.restantes),[0,0]);
});
test("cero genérico en revisión nunca basta para declarar huecos viables",()=>{
 const cap=capacidadDeCarga({huecos_palets_total:"0"});
 assert.equal(cap.modo,"sin_datos");
 assert.equal(evaluarHuecosCamion({modo:"total",previas:"no",capacidadTotal:"0",actualTotal:"0"}).estado,"incompleto");
});
test("la UI muestra E/P y no mezcla capacidades tras cambiar formato",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const app=readFileSync(new URL("../src/app.mjs",import.meta.url),"utf8");
 for(const id of ["truckSecondKind","truckSecondKindRow","truckCapacityPLabel","truckPreviousPLabel","truckCurrentPLabel"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/huecos_palets_europeos:carga_datos->>huecos_palets_europeos/);
 assert.match(app,/cargaHuecosPendientes\(load\)\)recoverTruckCapacityFromPdf/);
 assert.match(app,/const formatos=\["huecos_palets_grandes","huecos_palets_europeos","huecos_palets_pequenos"\]/);
 assert.match(app,/truckSecondKind"\)\.addEventListener\("change"/);
 assert.match(app,/if\(!truckCapacityTouched\)/);
 assert.match(app,/Nunca se reescribe una revisión de Supabase/);
});
