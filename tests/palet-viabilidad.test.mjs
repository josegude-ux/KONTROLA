import test from "node:test";
import assert from "node:assert/strict";
import {capacidadDeCarga,evaluarHuecosCamion} from "../src/palet-viabilidad.mjs";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("resta huecos de cargas anteriores y de la carga actual",()=>{
 const result=evaluarHuecosCamion({modo:"total",previas:"si",capacidadTotal:12,anterioresTotal:4,actualTotal:7});
 assert.equal(result.estado,"viable");
 assert.equal(result.filas[0].disponibles,8);
 assert.equal(result.filas[0].restantes,1);
});
test("déficit de posiciones es no viable",()=>{
 const result=evaluarHuecosCamion({modo:"total",previas:"si",capacidadTotal:10,anterioresTotal:6,actualTotal:5});
 assert.equal(result.estado,"inviable");assert.equal(result.filas[0].restantes,-1);
});
test("sin carga anterior pone cero, pero respuesta ausente no equivale a no",()=>{
 assert.equal(evaluarHuecosCamion({modo:"total",previas:"no",capacidadTotal:9,actualTotal:9}).estado,"viable");
 assert.equal(evaluarHuecosCamion({modo:"total",previas:"",capacidadTotal:9,actualTotal:9}).estado,"incompleto");
});
test("G y P son huecos diferentes y no se compensan",()=>{
 const result=evaluarHuecosCamion({modo:"desglose",previas:"si",capacidadG:8,capacidadP:2,
   anterioresG:4,anterioresP:1,actualG:5,actualP:0});
 assert.equal(result.estado,"inviable");
 assert.equal(result.filas[0].restantes,-1);
 assert.equal(result.filas[1].restantes,1);
});
test("8G no implica 0P y la viabilidad completa permanece desconocida",()=>{
 const cap=capacidadDeCarga({huecos_palets_grandes:"8",huecos_palets_pequenos:null,huecos_palets_total:null});
 assert.equal(cap.modo,"desglose");assert.equal(cap.pequenos,null);
 assert.equal(evaluarHuecosCamion({modo:"desglose",previas:"no",capacidadG:cap.grandes,
  capacidadP:cap.pequenos,actualG:2,actualP:0}).estado,"incompleto");
});
test("la capacidad ausente requiere introducir el dato manual",()=>{
 assert.equal(capacidadDeCarga({}).modo,"sin_datos");
 assert.equal(evaluarHuecosCamion({modo:"total",previas:"no",capacidadTotal:"",actualTotal:1}).estado,"incompleto");
 assert.equal(evaluarHuecosCamion({modo:"total",previas:"no",capacidadTotal:6,actualTotal:1}).estado,"viable");
});
test("rechaza fracciones, negativos, números desmesurados y vacíos",()=>{
 for(const invalid of ["-1","1.5","abc","",null,1000]){
  assert.equal(evaluarHuecosCamion({modo:"total",previas:"si",capacidadTotal:12,anterioresTotal:invalid,actualTotal:1}).estado,"incompleto",String(invalid));
 }
 assert.equal(evaluarHuecosCamion({modo:"total",previas:"no",capacidadTotal:12,actualTotal:""}).estado,"incompleto");
});
test("cálculo sin escrituras y protección del inicio, con cache PWA",()=>{
 const app=read("src/app.mjs"),html=read("index.html"),sw=read("sw.js");
 for(const id of ["truckPreviousChoice","truckCurrentTotal","truckPreviousG","truckCapacityResult","truckCapacityStart"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/truckCapacitySession\.clear\(\)/);
 assert.match(app,/if\(result\.estado!=="viable"\)/);
 assert.match(app,/await startCurrentPreparation\(\)/);
 assert.match(app,/if\(assessment\(\)\.estado!=="viable"\)/);
 assert.match(app,/recoverTruckCapacityFromPdf\(load\)/);
 assert.match(sw,/src\/palet-viabilidad\.mjs/);
 assert.match(sw,/kontrola-integral-visura-v070/);
});
