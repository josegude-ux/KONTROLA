import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {generarPdfHojas,nombrePdfInforme} from "../src/print-pdf.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const load=(n=1)=>({
  tipo:"carga",titulo:"HOJA DE PREPARACIÓN POR PASILLOS",
  cabecera:["Carga: LP26-19519","Fecha: 2026-10-23","Almacén: COR_01_COR","Peso: 2920,8 kg"],
  pasillos:[{titulo:"Pasillo A",lineas:Array.from({length:n},(_,i)=>({
    referencia:"PRD000"+i,descripcion:"PEPSI REGULAR VIDRIO RET CAJA 24U Ñ áéíóú",
    ubicacion:"A00-P03",cantidad:"6",unidad:"CAJA"
  })),total:"TOTAL PASILLO A"}],
  pie:"Picking en Business Central"
});

test("iOS export genera PDF auténtico A4 con referencias, datos y caracteres españoles",()=>{
  const buf=Buffer.from(generarPdfHojas([load()]));
  assert.equal(buf.subarray(0,8).toString(),"%PDF-1.4");
  assert.match(buf.toString(),/\/Type \/Catalog/);
  assert.match(buf.toString(),/\/MediaBox \[0 0 595\.28 841\.89\]/);
  assert.match(buf.toString(),/LP26-19519/);
  assert.match(buf.toString(),/PRD0000/);
  assert.match(buf.toString(),/xref\n0 /);
  assert.match(buf.toString(),/%%EOF/);
  assert.equal(nombrePdfInforme("Hoja procesada · LP26-19519"),"Hoja_procesada_LP26-19519.pdf");
});

test("exportación multipágina: 107 referencias y portada de un lote de 20 cargas",()=>{
  const data=[{tipo:"portada",titulo:"RELACIÓN DE HOJAS",detalles:["Almacén COR_01_COR"],filas:["1 · LP26-19519"]},
    ...Array.from({length:20},()=>load(107))];
  const buf=Buffer.from(generarPdfHojas(data));
  const match=buf.toString().match(/\/Count (\d+) >>/);
  assert.ok(match);
  assert.ok(Number(match[1])>20,"debe paginar cargas extensas");
  assert.ok(buf.length>100000);
});

test("rechaza reportes sin hojas y demasiados documentos",()=>{
  assert.throws(()=>generarPdfHojas([]),/no válida/);
  assert.throws(()=>generarPdfHojas(Array.from({length:22},()=>load())),/no válida/);
});

test("la PWA precarga PDF offline y la exportación en iOS usa Web Share Files",()=>{
  const sw=read("sw.js"),admin=read("src/admin.mjs");
  const html=read("index.html");
  assert.match(sw,/src\/print-pdf\.mjs/);
  assert.match(sw,/kontrola-integral-visura-v072/);
  assert.match(admin,/navigator\.share\(\{files:\[file\]/);
  assert.match(admin,/navigator\.standalone===true/);
  assert.match(admin,/if\(!ios\)\{window\.print\(\);return;\}/);
  assert.match(html,/id="reportPrintStatus"/);
});
