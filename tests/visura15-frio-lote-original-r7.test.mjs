import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planHojaFrioCorunaR7,dibujarHojaFrioCorunaR7} from "../src/visura-r7-frio-coruna.mjs";
import {componerLoteOriginalR7} from "../src/visura-r7-lote-original.mjs";

const sku=(code,qty=2)=>({sku:code,location:"ZFRIO",qty,unit:"CAJA",description:"Producto de frío "+code});
const carga=(code="LP26-12345",destino="CORUÑA",products=[sku("PRD1")])=>({
 codigo:code,almacen:"COR_01_COR",destino,repartidor:"BORJA FROIZ ARES",
 matricula:"1234ABC",fecha:"2026-11-20",productos:products
});
const parse=(load)=>({id:load.codigo,warehouse:"COR_01_COR",verified:true,
 pageNumbers:[1],products:load.productos});

test("ficha FRÍO CORUÑA exacta; FERROL y destino desconocido no la generan",()=>{
 const coruna=carga(),h=planHojaFrioCorunaR7(coruna,parse(coruna));
 assert.equal(h.repartidor,"BORJA FROIZ ARES");
 assert.equal(h.productos.length,1);
 assert.equal(planHojaFrioCorunaR7(carga("LP26-12345","FERROL"),parse(coruna)),null);
 assert.equal(planHojaFrioCorunaR7(carga("LP26-12345",null),parse(coruna)),null);
 assert.equal(planHojaFrioCorunaR7(carga("LP26-12345","CORUÑA",[]),parse(carga("LP26-12345","CORUÑA",[]))),null);
});

test("SKU, cantidad, verificación y límite de 42 bloquean datos no fiables",()=>{
 const load=carga();
 assert.throws(()=>planHojaFrioCorunaR7(load,{...parse(load),products:[sku("OTRO")]}),/ha cambiado/);
 assert.throws(()=>planHojaFrioCorunaR7(load,{...parse(load),products:[sku("PRD1",5)]}),/ha cambiado/);
 assert.throws(()=>planHojaFrioCorunaR7(load,{...parse(load),verified:false}),/no acredita/);
 const many=carga("LP26-12345","CORUÑA",Array.from({length:43},(_,i)=>sku("PRD"+i)));
 assert.throws(()=>planHojaFrioCorunaR7(many,parse(many)),/42/);
});

function pdfFont(){return {widthOfTextAtSize:(s,n)=>String(s).length*n*.51};}
function fakeDoc(){
 const pages=[];
 return {pages,embedFont:async()=>pdfFont(),
   addPage:size=>{const page={size,text:[],drawText:(s)=>page.text.push(s),drawRectangle:()=>{}};pages.push(page);return page}};
}
const opts={StandardFonts:{Helvetica:"Helvetica",HelveticaBold:"HelveticaBold"},rgb:(...args)=>args};
for(const n of [1,12,24,42]){
 test("folio individual horizontal para "+n+" productos, sin cortar LP",async()=>{
   const products=Array.from({length:n},(_,i)=>sku("PRD"+i));
   const load=carga("LP26-12345","CORUÑA",products);
   const pdf=fakeDoc();
   await dibujarHojaFrioCorunaR7(pdf,planHojaFrioCorunaR7(load,parse(load)),opts);
   assert.equal(pdf.pages.length,1);
   assert.ok(pdf.pages[0].size[0]>pdf.pages[0].size[1]);
   assert.ok(pdf.pages[0].text.includes("BORJA FROIZ ARES"));
   assert.ok(pdf.pages[0].text.includes("LP26-12345"));
 });
}

const pdfLib={
 PDFDocument:{
  create:async()=>{const pages=[];return {addPage:p=>pages.push(p),
    getPageCount:()=>pages.length,copyPages:async(from,ix)=>ix.map(i=>({page:i+1})),
    save:async()=>new Uint8Array([pages.length])};},
  load:async(bytes)=>({getPageCount:()=>bytes[0],
    getPageIndices:()=>Array.from({length:bytes[0]},(_,i)=>i)})
 }
};
const rows=[carga("LP26-00001"),carga("LP26-00002")];
test("lote original de dos LP con paridad independiente 4+6=10",async()=>{
 const result=await componerLoteOriginalR7({rows,pdfLib,
   preparar:async row=>({codigo:row.codigo,bytes:new Uint8Array([row.codigo.endsWith("1")?4:6]),
     hojasFrio:row.codigo.endsWith("1")?1:0})});
 assert.equal(result.paginas,10);
 assert.deepEqual(result.paginasPorLP.map(x=>x.paginas),[4,6]);
 assert.deepEqual(result.paginasPorLP.map(x=>x.hojasFrio),[1,0]);
});
test("nunca admite hojas impares ni mezcla LP duplicadas",async()=>{
 await assert.rejects(componerLoteOriginalR7({rows,pdfLib,
   preparar:async row=>({codigo:row.codigo,bytes:new Uint8Array([3])})}),/paridad/);
 await assert.rejects(componerLoteOriginalR7({rows:[rows[0],rows[0]],pdfLib,
   preparar:async()=>({codigo:rows[0].codigo,bytes:new Uint8Array([2])})}),/repetida/);
});
test("sesión revocada detiene el proceso antes de entregar documento",async()=>{
 let calls=0;
 await assert.rejects(componerLoteOriginalR7({rows,pdfLib,
   autorizado:()=>++calls<3,
   preparar:async row=>({codigo:row.codigo,bytes:new Uint8Array([2])})}),/sesión|almacén/);
});
test("la previsualización conjunta no invoca registrar impresión",()=>{
 const script=readFileSync(new URL("../src/admin-print-batch.mjs",import.meta.url),"utf8");
 const block=script.split("async function previewOriginalLote(){")[1]?.split('  $("batchOriginalLote").addEventListener')[0];
 assert.ok(block);
 assert.match(block,/comprobarLoteActualizado/);
 assert.match(block,/componerLoteOriginalR7/);
 assert.doesNotMatch(block,/kontrola_registrar_lote_impresion/);
});
