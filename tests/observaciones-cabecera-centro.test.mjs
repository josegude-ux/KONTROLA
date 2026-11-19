import test from "node:test";
import assert from "node:assert/strict";
import {leerObservacionesCabecera} from "../src/core.mjs";

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
