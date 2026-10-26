import test from "node:test";
import assert from "node:assert/strict";
import {agruparPasillos, ordenarCargas, validacionPublicacion, fechaISO, rutaArchivo, formatearHuecosPalets, combinarHuecosConOrigen, textoHuecosConOrigen} from "../src/logic.mjs";
import {summarize} from "../src/core.mjs";
test("Aisles: no create phantom location, no checks for picker",()=>{
 const g=agruparPasillos([
 {sku:"PRD0000001",description:"Caja",location:"A101-3",qty:2,unit:"CAJA"},
 {sku:"PRD0000002",description:"Frío",location:"ZFRIO",qty:1,unit:"PACK"},
 {sku:"PRD0000003",description:"Sin ubicación",location:"",qty:3,unit:"CAJA"},
 {sku:"PRD0000004",description:"No solicitada",location:"A101-4",qty:0,unit:"CAJA"}
 ]);
 assert.deepEqual(g.map(x=>x.nombre),["A","FRÍO","SIN UBICACIÓN"]);
 assert.equal(g[0].lineas.length,1);
 assert.equal(g[2].lineas[0].sku,"PRD0000003");
 assert.deepEqual(Object.keys(g[0].lineas[0]).sort(),["description","location","qty","sku","unit"]);
});
test("Existing summary semantics remain unchanged",()=>{
 const p=[{sku:"1",location:"",qty:2,unit:"CAJA"},{sku:"2",location:"ZFRIO",qty:4,unit:"CAJA"}];
 assert.equal(summarize(p).unlocated.length,1);
 assert.equal(summarize(p).aisles["FRÍO"].CAJA,4);
});
test("Sorting by descending weight",()=>assert.deepEqual(ordenarCargas([{codigo:"1",peso_kg:20},{codigo:"2",peso_kg:35}]).map(x=>x.codigo),["2","1"]));
test("Dates",()=>{ assert.equal(fechaISO("24/10/2026"),"2026-10-24");assert.equal(fechaISO("24/10/26"),"2026-10-24");});
test("Unverified PDFs are never silently published",()=>{
 assert.match(validacionPublicacion({id:"LP01-00001",products:[{qty:2}],verified:false,warnings:["No coincide el total"]}),/No se publicará/);
 assert.equal(validacionPublicacion({id:"LP01-00001",products:[{qty:2}],verified:true}),"");
});
test("Storage routes are validated",()=>{
 assert.equal(rutaArchivo("LP01-000001","a".repeat(64)),"documentos/LP01-000001/"+"a".repeat(64)+".pdf");
 assert.throws(()=>rutaArchivo("../escape","a".repeat(64)));
});

test("Pasillos: cajas primero, botellas después y bultos descendentes por formato",()=>{
 const lines=[
  {sku:"BOT2",location:"A102-1",qty:8,unit:"BOTELLA"},
  {sku:"CAJA2",location:"A101-2",qty:3,unit:"CAJA"},
  {sku:"BOT1",location:"A102-2",qty:15,unit:"BOT"},
  {sku:"CAJA1",location:"A101-1",qty:12,unit:"CJ"},
  {sku:"OTRO",location:"A103-1",qty:100,unit:"PACK"}
 ];
 const ordered=agruparPasillos(lines)[0].lineas;
 assert.deepEqual(ordered.map(x=>x.sku),["CAJA1","CAJA2","BOT1","BOT2","OTRO"]);
 assert.deepEqual(lines.map(x=>x.sku),["BOT2","CAJA2","BOT1","CAJA1","OTRO"]);
});

test("huecos de palés distingue grandes y pequeños sin completarlos artificialmente",()=>{
 assert.equal(formatearHuecosPalets(6,4,null),"6 G · 4 P");
 assert.equal(formatearHuecosPalets(8,null,null),"8 G");
 assert.equal(formatearHuecosPalets(null,3,null),"3 P");
 assert.equal(formatearHuecosPalets(null,null,12),"12 huecos");
 assert.equal(formatearHuecosPalets(null,null,null),"—");
 assert.equal(formatearHuecosPalets("",null,null),"—");
 assert.equal(formatearHuecosPalets("9.5",null,null),"—");
 assert.equal(formatearHuecosPalets(0,0,null),"0 G · 0 P");
});

test("la ausencia real de huecos no se anuncia como capacidad cero",()=>{
 const carga={codigo:"LP26-19519",huecos_palets_total:0,matricula:"2554JRM"};
 const sinDatos=combinarHuecosConOrigen(carga);
 assert.equal(sinDatos.huecos_palets_total,null);
 assert.equal(textoHuecosConOrigen(sinDatos),"Sin dato");
 const desdePdf=combinarHuecosConOrigen(carga,null,{huecos_palets_total:0});
 assert.equal(desdePdf.huecos_origen,"pdf_leido");
 assert.equal(textoHuecosConOrigen(desdePdf),"0 en PDF · confirmar");
 const desdeRevision=combinarHuecosConOrigen(carga,{huecos_palets_grandes:6,huecos_palets_pequenos:4});
 assert.equal(textoHuecosConOrigen(desdeRevision),"6 G · 4 P");
});
test("la revisión prevalece sobre PDF local antiguo y permite completar G/P faltantes",()=>{
 const carga={codigo:"LP26-19531",huecos_palets_total:0,observaciones:"Anterior"};
 const merged=combinarHuecosConOrigen(carga,{huecos_palets_grandes:6,observaciones:"Vigente"},
   {huecos_palets_grandes:1,huecos_palets_pequenos:2,huecos_palets_total:10,observaciones:"PDF"});
 assert.equal(merged.huecos_palets_grandes,6);
 assert.equal(merged.huecos_palets_pequenos,2);
 assert.equal(merged.huecos_palets_total,10);
 assert.equal(merged.observaciones,"Vigente");
 assert.equal(merged.huecos_origen,"revision");
});
