import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {crearListadoPasillosA4} from "../src/aisle-matrix.mjs";
import {generarPdfHojas} from "../src/print-pdf.mjs";

// Regresión del A4 validado por el usuario: LP26-19735, 88 referencias y 13 zonas.
// El material de prueba es sintético; jamás se solicita ni se modifica la carga real.
const datos=[
 ["A","CAJA",[18,12,10,7,6,5,3,3,3,2,2,1]],
 ["B","CAJA",[5,1]],["C","CAJA",[1]],["E","CAJA",[9,3,3,2,1,1]],
 ["F","CAJA",[10,6,3,1,1]],["F","UD",[2]],
 ["G","CAJA",[14,6,6,2,2,1,1]],
 ["H","CAJA",[32,6,5,2,2,2,1,1,1,1]],
 ["I","CAJA",[6,4,4,2,1,1]],["J","CAJA",[6,2,1,1]],
 ["K","BOTELLA",[33,8,6,6,6,6,6,4,4,4,3,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1]],
 ["L","CAJA",[3,1]],["L","PACK",[1,1]],["T","BARRIL",[1,1]],
 ["SIN UBICACIÓN","GAS",[1]]
];
const productos=[];
for(const [aisle,unit,qtys] of datos){
 for(const qty of qtys){
  const n=productos.length+1;
  productos.push({sku:"PRD"+String(n).padStart(7,"0"),
    location:aisle==="SIN UBICACIÓN"?"":aisle+"01-P01",
    description:aisle==="SIN UBICACIÓN"?"CARBUROS METALICOS CO2 GAS BOMBONA RET 10KG 1U":"Mercancía control "+aisle,
    qty,unit});
 }
}
const carga={codigo:"LP26-19735",almacen:"COR_01_COR",fecha:"2026-10-27",
 matricula:"4863JPP",repartidor:"DC2 LEO, DF23 CARLOS ALBERTO",productos};

test("A4 COR1 conserva matrícula y 88 referencias del ejemplo real",()=>{
 const sheet=crearListadoPasillosA4(carga);
 assert.equal(sheet.matricula,"4863JPP");
 assert.equal(sheet.referencias,88);
 assert.equal(sheet.zonas,13);
 assert.deepEqual(sheet.totales,{CAJA:236,BOTELLA:109,PACK:2,BARRIL:2,GAS:1,UD:2});
});

test("A4 sigue siendo una página e identifica matrícula, referencias y seis formatos",async()=>{
 const sheet=crearListadoPasillosA4(carga);
 const bytes=generarPdfHojas([sheet]);
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),1);
 const raw=new TextDecoder().decode(bytes);
 for(const value of ["4863JPP","Referencias COR1: 88","LP26-19735","PRD0000088","PASILLO","BOTELLAS","BARRIL","GAS","UD","HECHO","236","109"]){
  assert.ok(raw.includes(value),"Falta dato de impresión: "+value);
 }
 assert.doesNotMatch(raw,/\(352\) Tj/,"No sumar cajas, botellas y otros formatos como un total de bultos");
 const squares=[...raw.matchAll(/(?:\d+\.\d+) (?:\d+\.\d+) (\d+) \1 re S Q/g)].map(match=>Number(match[1]));
 assert.ok(squares.filter(n=>n>=18).length>=13,"Cada pasillo debe tener una casilla HECHO grande");
});

test("un repartidor largo se adapta o avisa, sin superponerse a la matrícula",()=>{
 const sheet=crearListadoPasillosA4({...carga,repartidor:"EQUIPO DE DOS CONDUCTORES CON NOMENCLATURA AMPLIADA DE TRANSPORTE REGIONAL NOROESTE"});
 const bytes=generarPdfHojas([sheet]);
 assert.ok(bytes.length>1000);
});

test("no hay total mixto ni en la matriz HTML, preservando la fila por formato",async()=>{
 const {readFileSync}=await import("node:fs");
 const app=readFileSync(new URL("../src/app.mjs",import.meta.url),"utf8");
 assert.ok(app.includes('["Tipos de unidad",matriz.unidades.length]'));
 assert.ok(app.includes('for(const header of ["PASILLO",...matriz.unidades.map(etiquetaUnidad)])'));
 assert.ok(!app.includes('fmt(matriz.total);totalsRow.appendChild'));
});
