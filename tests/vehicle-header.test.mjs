import test from "node:test";
import assert from "node:assert/strict";
import {extraerFormatoCamion,leerObservacionesCabecera} from "../src/core.mjs";

test("header 6G 1E wins over separate zero and E stays European",()=>{
 const cap=extraerFormatoCamion("CR1234ABC IVECO 100E-VOLDIS-6G 1E","0");
 assert.deepEqual(cap,{palletsLarge:6,palletsSmall:null,palletsEuropean:1,palletsTotal:null});
});
test("legacy 6G 4P retains P format",()=>{
 const cap=extraerFormatoCamion("CR1234ABC 9G 6P","6G 4P");
 assert.deepEqual(cap,{palletsLarge:6,palletsSmall:4,palletsEuropean:null,palletsTotal:null});
});
test("unqualified zero remains literal when no truck code exists",()=>{
 const cap=extraerFormatoCamion("Camión no codificado","0");
 assert.deepEqual(cap,{palletsLarge:null,palletsSmall:null,palletsEuropean:null,palletsTotal:0});
});
test("observations CENTRO 1* exclude following Devoluciones unidad table header",()=>{
 const page={width:800,items:[
  {x:22,y:125,text:"Huecos plts. camión: 0"},
  {x:20,y:140,text:"Almacén: COR_01_COR"},
  {x:185,y:140,text:"Observaciones: CENTRO 1*"},
  {x:465,y:159,text:"Devoluciones"},
  {x:481,y:170,text:"unidad"},
  {x:90,y:204,text:"MERCANCÍA"}
 ]};
 assert.equal(leerObservacionesCabecera([page]),"CENTRO 1*");
});
