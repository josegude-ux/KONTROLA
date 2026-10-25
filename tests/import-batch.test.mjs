import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validarLotePdf,resumenLotePdf} from "../src/import-batch.mjs";
const pdf=(name="carga.pdf",size=1200,type="application/pdf")=>({name,size,type});

test("permite de uno a veinte PDF sin modificar los originales",()=>{
  const files=Array.from({length:20},(_,i)=>pdf("carga"+i+".pdf"));
  const snapshot=JSON.stringify(files);
  assert.equal(validarLotePdf(files).length,20);
  assert.equal(validarLotePdf([pdf()]).length,1);
  assert.equal(JSON.stringify(files),snapshot);
});
test("bloquea lotes vacíos, sobredimensionados o incompatibles",()=>{
  assert.throws(()=>validarLotePdf([]),/Selecciona/);
  assert.throws(()=>validarLotePdf(Array.from({length:21},()=>pdf())),/20 PDF/);
  assert.throws(()=>validarLotePdf([pdf("mal.txt")]),/deben ser PDF/);
  assert.throws(()=>validarLotePdf([pdf("archivo.pdf",0)]),/contenido/);
  assert.throws(()=>validarLotePdf([pdf("archivo.pdf",25*1024*1024+1)]),/25 MB/);
  assert.throws(()=>validarLotePdf([pdf("archivo.pdf",1000,"text/plain")]),/deben ser PDF/);
});
test("resumen de importación individual contabiliza todos los resultados",()=>{
  assert.deepEqual(resumenLotePdf([
    {estado:"nuevo"},{estado:"nuevo"},{estado:"recuperado"},
    {estado:"repetido"},{estado:"cancelado"},{estado:"error"}
  ]),{total:6,nuevos:2,recuperados:1,repetidos:1,cancelados:1,errores:1,hayErrores:true});
});
test("la interfaz no autopublica PDFs en el bucle ni descarta el historial",()=>{
  const code=readFileSync(new URL("../src/admin.mjs",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const start=code.indexOf("async function processPdf()");
  const end=code.indexOf("async function loadImport",start);
  assert.ok(start>0&&end>start);
  const body=code.slice(start,end);
  assert.match(body,/validarLotePdf\(\$\("pdfInput"\)\.files\)/);
  assert.match(body,/for\(let i=0;i<files\.length;i\+\+\)/);
  assert.match(body,/processSinglePdf\(file\)/);
  assert.doesNotMatch(body,/kontrola_publicar_importacion/);
  assert.match(body,/window\.confirm/);
  assert.match(html,/id="pdfInput" multiple/);
});
