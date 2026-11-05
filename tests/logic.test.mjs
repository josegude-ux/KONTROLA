import test from "node:test";
import assert from "node:assert/strict";
import {agruparPasillos, ordenarCargas, validacionPublicacion, fechaISO, rutaArchivo} from "../src/logic.mjs";
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
